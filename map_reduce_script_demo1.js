/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @ModuleScope SameAcocunt
 */

define([
    'N/search',
    'N/record',
    'N/log',
    'N/runtime',
    'N/file'
],(search,record,log,runtime,file)=>{

    const output_folder_id = 18515;
    const credit_memo_slabs = [
        {miniAmount:0,  maxAmount:25000,    creditRate:0,   label:'Not Eligiblem for reward points'},
        {miniAmount:25001,   maxAmount:50000,   creditRate:5,   label:'5% credit memo'},
        {miniAmount:50001,   maxAmount:100000,   creditRate:5,   label:'10% credit memo'},
        {miniAmount:100001,   maxAmount:Infinity,   creditRate:20,   label:'20% credit memo'},
    ];
    const getSlab = (totalAmount)=>{
        return credit_memo_slabs.find(
            slab => totalAmount >= slab.miniAmount && totalAmount <= slab.maxAmount) || credit_memo_slabs[0];
    };
    const round2 = (num) => Math.round((num+Number.EPSILON)*100)/100;

    const getInputData = ()=>{
        log.audit('getInputData','Starting Sales Order Search');

        return search.load({
            id:'customsearch7100'
        })
    }

    const map = (context)=>{
        try{
            const searchResult = JSON.parse(context.value);
            const soInternalId = searchResult.id;
            const soNumber = searchResult.values['tranid'] || '';
            const customerId     = searchResult.values['entity']?.value    || '';
            const customerName   = searchResult.values['altname.customer'] || 
                                   searchResult.values['entity']?.text     || 'Unknown';
            const tranDateStr    = searchResult.values['trandate']         || '';
            const amountRaw      = searchResult.values['amount']           || '0';
            if (!customerId || !tranDateStr) {
                log.warning('map:skip', `SO ${soInternalId} skipped — missing customer or date`);
                return;
            }
            const amount = parseFloat(amountRaw.toString().replace(/,/g, '')) || 0;
            const dateParts = tranDateStr.split('/'); // ["06", "15", "2025"]
            let yearMonth = 'UNKNOWN';
            if (dateParts.length === 3) {
                const month = dateParts[0].padStart(2, '0');
                const year  = dateParts[2];
                yearMonth   = `${year}-${month}`; // e.g., "2025-06"
            }
            const mapKey = `${customerId}::${yearMonth}`;
 
            // ── Emit to Reduce ──
            context.write({
                key: mapKey,
                value: JSON.stringify({
                    soInternalId,
                    soNumber,
                    customerId,
                    customerName,
                    yearMonth,
                    amount
                })
            });
        }
        catch(e){
            log.error('map:error', `Error in map stage: ${e.message} | Raw value: ${context.value}`);
        
        }
    }

    const reduce = (context)=>{
        try {
            const key = context.key; // e.g., "123::2025-06"
            const values = context.values; // Array of JSON strings from map stage
 
            let totalAmount   = 0;
            let customerName  = '';
            let customerId    = '';
            let yearMonth     = '';
            const soList      = []; // Collect all SO numbers for audit trail
 
            // ── Sum all SO amounts for this customer-month ──
            values.forEach(valStr => {
                const val = JSON.parse(valStr);
 
                totalAmount   += val.amount;
                customerName   = val.customerName; // Same for all entries in this key
                customerId     = val.customerId;
                yearMonth      = val.yearMonth;
 
                soList.push(val.soNumber || val.soInternalId);
            });
 
            totalAmount = round2(totalAmount);
 
            // ── Determine Credit Memo Slab ──
            const slab = getSlab(totalAmount);
            const creditMemoAmount = round2(totalAmount * slab.creditPct / 100);
 
            // ── Log for audit ──
            log.audit('reduce:result', JSON.stringify({
                key,
                customerId,
                customerName,
                yearMonth,
                totalAmount,
                slab: slab.label,
                creditPct: slab.creditPct,
                creditMemoAmount,
                soCount: soList.length
            }));
 
            // ── Write result for Summarize stage ──
            context.write({
                key: key,
                value: JSON.stringify({
                    customerId,
                    customerName,
                    yearMonth,
                    totalAmount,
                    soCount:          soList.length,
                    soNumbers:        soList.join(' | '),
                    creditPct:        slab.creditPct,
                    slabLabel:        slab.label,
                    creditMemoAmount
                })
            });
 
        } catch (e) {
            log.error('reduce:error', `Key: ${context.key} | Error: ${e.message}`);
        }
    };

    const summarize = (context)=>{
        log.audit('summarize', `MapReduce complete. Usage: ${JSON.stringify(summary.usage)}`);
 
        // ── 1. Log Map Errors ──
        summary.mapSummary.errors.iterator().each((key, errStr) => {
            log.error('summarize:mapError', `Key: ${key} | ${errStr}`);
            return true;
        });
 
        // ── 2. Log Reduce Errors ──
        summary.reduceSummary.errors.iterator().each((key, errStr) => {
            log.error('summarize:reduceError', `Key: ${key} | ${errStr}`);
            return true;
        });
 
        // ── 3. Build CSV from reduce output ──
        const csvLines = [];
 
        // CSV Header
        csvLines.push([
            'Customer ID',
            'Customer Name',
            'Month (YYYY-MM)',
            'Total Sales Amount (₹)',
            'No. of Sales Orders',
            'SO Numbers',
            'Credit Memo Slab',
            'Credit %',
            'Credit Memo Amount (₹)'
        ].join(','));
 
        // Collect all reduce output keys
        summary.output.iterator().each((key, valStr) => {
            try {
                const r = JSON.parse(valStr);
 
                // Escape fields that might contain commas
                const escape = (val) => `"${String(val).replace(/"/g, '""')}"`;
 
                csvLines.push([
                    escape(r.customerId),
                    escape(r.customerName),
                    escape(r.yearMonth),
                    r.totalAmount,
                    r.soCount,
                    escape(r.soNumbers),
                    escape(r.slabLabel),
                    r.creditPct,
                    r.creditMemoAmount
                ].join(','));
 
            } catch (e) {
                log.error('summarize:csvRow', `Failed to parse output for key ${key}: ${e.message}`);
            }
            return true; // Always return true to continue iteration
        });
 
        // ── 4. Save CSV to File Cabinet ──
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            const fileName  = `Customer_Credit_Memo_Report_${timestamp}.csv`;
 
            const csvFile = file.create({
                name:     fileName,
                fileType: file.Type.CSV,
                contents: csvLines.join('\n'),
                folder:   OUTPUT_FOLDER_ID,
                isOnline: false // Not publicly accessible
            });
 
            const savedFileId = csvFile.save();
 
            log.audit('summarize:csvSaved', `Report saved! File ID: ${savedFileId} | Name: ${fileName} | Rows: ${csvLines.length - 1}`);
 
        } catch (e) {
            log.error('summarize:csvSave', `Failed to save CSV: ${e.message}`);
        }
    };

    return {getInputData, map, reduce, summarize};
});


















        //         return search.load({
//             id: 'customsearch7099'
//         });
//     };

//     // stage 2 of mapping the data like perform looping on every row of sales order
//     const map = (context)=>{
//         try{
//             const searchResult = JSON.parse(context.value);
//             const customerId = searchResult.values.entity.value; 
//         }
//         catch(e){}
//     }
// })