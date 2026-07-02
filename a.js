/**
 * @NApiVersion 2.0
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
define([
    'N/search',
    'N/file',
    'N/log'
], function(search, file, log) {

    var OUTPUT_FOLDER_ID = 18515;

    var CREDIT_MEMO_SLABS = [
        { minAmount: 0,      maxAmount: 25000,    creditPct: 0,  label: 'Not Eligible'    },
        { minAmount: 25001,  maxAmount: 50000,    creditPct: 5,  label: '5% Credit Memo'  },
        { minAmount: 50001,  maxAmount: 100000,   creditPct: 10, label: '10% Credit Memo' },
        { minAmount: 100001, maxAmount: Infinity,  creditPct: 20, label: '20% Credit Memo' }
    ];

    function getSlab(totalAmount) {
        var result = null;
        for (var i = 0; i < CREDIT_MEMO_SLABS.length; i++) {
            if (totalAmount >= CREDIT_MEMO_SLABS[i].minAmount && totalAmount <= CREDIT_MEMO_SLABS[i].maxAmount) {
                result = CREDIT_MEMO_SLABS[i];
                break;
            }
        }
        return result || CREDIT_MEMO_SLABS[0];
    }

    function round2(num) {
        return Math.round((num + Number.EPSILON) * 100) / 100;
    }

    function getInputData() {

        log.audit('getInputData', 'Starting Sales Order search...');

        return search.create({
            type: search.Type.SALES_ORDER,
            filters: [
                ['mainline', 'is', 'T'],
                'AND',
                ['status', 'anyof', ['SalesOrd:H', 'SalesOrd:C']]
            ],
            columns: [
                search.createColumn({ name: 'internalid', label: 'SO Internal ID'   }),
                search.createColumn({ name: 'tranid',     label: 'SO Number'        }),
                search.createColumn({ name: 'entity',     label: 'Customer ID'      }),
                search.createColumn({ name: 'trandate',   label: 'Transaction Date' }),
                search.createColumn({ name: 'amount',     label: 'Amount'           }),
                search.createColumn({ name: 'altname',    join: 'customer', label: 'Customer Name' })
            ]
        });
    }

    function map(context) {

        try {

            var searchResult = JSON.parse(context.value);

            var soInternalId = searchResult.id;
            var soNumber     = searchResult.values['tranid'] || '';
            var entityVal    = searchResult.values['entity'];
            var customerId   = (entityVal && entityVal.value) ? entityVal.value : '';
            var customerName = searchResult.values['altname.customer'] ||
                               ((entityVal && entityVal.text) ? entityVal.text : 'Unknown');
            var tranDateStr  = searchResult.values['trandate'] || '';
            var amountRaw    = searchResult.values['amount']   || '0';

            if (!customerId || !tranDateStr) {
                log.warning('map:skip', 'SO ' + soInternalId + ' skipped — missing customer or date');
                return;
            }

            var amount = parseFloat(amountRaw.toString().replace(/,/g, '')) || 0;

            var dateParts = tranDateStr.split('/');
            var yearMonth = 'UNKNOWN';
            if (dateParts.length === 3) {
                var month = dateParts[0].length === 1 ? '0' + dateParts[0] : dateParts[0];
                var year  = dateParts[2];
                yearMonth = year + '-' + month;
            }

            var mapKey = customerId + '::' + yearMonth;

            context.write({
                key: mapKey,
                value: JSON.stringify({
                    soInternalId: soInternalId,
                    soNumber:     soNumber,
                    customerId:   customerId,
                    customerName: customerName,
                    yearMonth:    yearMonth,
                    amount:       amount
                })
            });

        } catch (e) {
            log.error('map:error', 'Error in map stage: ' + e.message + ' | Raw value: ' + context.value);
        }
    }

    function reduce(context) {

        try {
            var key    = context.key;
            var values = context.values;

            var totalAmount  = 0;
            var customerName = '';
            var customerId   = '';
            var yearMonth    = '';
            var soList       = [];

            for (var i = 0; i < values.length; i++) {
                var val = JSON.parse(values[i]);

                totalAmount  += val.amount;
                customerName  = val.customerName;
                customerId    = val.customerId;
                yearMonth     = val.yearMonth;

                soList.push(val.soNumber || val.soInternalId);
            }

            totalAmount = round2(totalAmount);

            var slab            = getSlab(totalAmount);
            var creditMemoAmount = round2(totalAmount * slab.creditPct / 100);

            log.audit('reduce:result', JSON.stringify({
                key:              key,
                customerId:       customerId,
                customerName:     customerName,
                yearMonth:        yearMonth,
                totalAmount:      totalAmount,
                slab:             slab.label,
                creditPct:        slab.creditPct,
                creditMemoAmount: creditMemoAmount,
                soCount:          soList.length
            }));

            context.write({
                key: key,
                value: JSON.stringify({
                    customerId:       customerId,
                    customerName:     customerName,
                    yearMonth:        yearMonth,
                    totalAmount:      totalAmount,
                    soCount:          soList.length,
                    soNumbers:        soList.join(' | '),
                    creditPct:        slab.creditPct,
                    slabLabel:        slab.label,
                    creditMemoAmount: creditMemoAmount
                })
            });

        } catch (e) {
            log.error('reduce:error', 'Key: ' + context.key + ' | Error: ' + e.message);
        }
    }

    function summarize(summary) {

        log.audit('summarize', 'MapReduce complete. Usage: ' + JSON.stringify(summary.usage));

        summary.mapSummary.errors.iterator().each(function(key, errStr) {
            log.error('summarize:mapError', 'Key: ' + key + ' | ' + errStr);
            return true;
        });

        summary.reduceSummary.errors.iterator().each(function(key, errStr) {
            log.error('summarize:reduceError', 'Key: ' + key + ' | ' + errStr);
            return true;
        });

        var csvLines = [];

        csvLines.push([
            'Customer ID',
            'Customer Name',
            'Month (YYYY-MM)',
            'Total Sales Amount (Rs)',
            'No. of Sales Orders',
            'SO Numbers',
            'Credit Memo Slab',
            'Credit %',
            'Credit Memo Amount (Rs)'
        ].join(','));

        summary.output.iterator().each(function(key, valStr) {
            try {
                var r = JSON.parse(valStr);

                function escape(val) {
                    return '"' + String(val).replace(/"/g, '""') + '"';
                }

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
                log.error('summarize:csvRow', 'Failed to parse output for key ' + key + ': ' + e.message);
            }
            return true;
        });

        try {
            var now       = new Date();
            var timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
            var fileName  = 'Customer_Credit_Memo_Report_' + timestamp + '.csv';

            var csvFile = file.create({
                name:     fileName,
                fileType: file.Type.CSV,
                contents: csvLines.join('\n'),
                folder:   OUTPUT_FOLDER_ID,
                isOnline: false
            });

            var savedFileId = csvFile.save();

            log.audit('summarize:csvSaved', 'Report saved! File ID: ' + savedFileId + ' | Name: ' + fileName + ' | Rows: ' + (csvLines.length - 1));

        } catch (e) {
            log.error('summarize:csvSave', 'Failed to save CSV: ' + e.message);
        }
    }

    return {
        getInputData: getInputData,
        map:          map,
        reduce:       reduce,
        summarize:    summarize
    };
});