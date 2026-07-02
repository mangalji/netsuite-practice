/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @ModuleScope SameAcocunt
 */

define(['N/search','N/record','N/log'], (search,record,log) => {
   
    // stage 1 of getting the data
    const getInputData = ()=>{
        // return search.load({
        //     id: "customsearch7100"
        // });
        log.audit('getInputData', 'Starting Sales Order search...');
 
        return search.create({
            type: search.Type.SALES_ORDER,
 
            filters: [
                // Only fully billed or closed SOs
                ['mainline', 'is', 'T'],               // Parent line only (avoid sublines)
                'AND',
                ['status', 'anyof', ['SalesOrd:H', 'SalesOrd:C']]
            ],
            columns: [
                search.createColumn({ name: 'internalid',   label: 'SO Internal ID'   }),
                search.createColumn({ name: 'tranid',       label: 'SO Number'         }),
                search.createColumn({ name: 'entity',       label: 'Customer ID'       }),
                search.createColumn({ name: 'trandate',     label: 'Transaction Date'  }),
                search.createColumn({ name: 'amount',       label: 'Amount'            }),
                search.createColumn({ name: 'altname',      join: 'customer', label: 'Customer Name' })
                // 'altname' on customer join gives the display name
            ]
        });
    };

    const map = (context)=>{
        try{
            const searchResult = JSON.parse(context.value);
            const customerId = searchResult.values.entity.value;
            const customerName = searchResult.values.entity.text;
            const salesOrderId = searchResult.id;
            let amount = parseFloat(searchResult.values.amount);
            
            if (amount && amount > 200000){
                let cashbackAmount = amount * 0.05;

                let creditMemo = record.create({
                    type:record.Type.CREDIT_MEMO,
                    isDynamic: true
                });

                creditMemo.setValue({fieldId: 'entity', value:customerId});
                creditMemo.setValue({fieldId:'memo',value:`cashback for SO #${salesOrderId}`});
                creditMemo.selectNewLine({sublistId:'item'});
                creditMemo.setCurrentSublistValue({sublistId:'item',fieldId:'item',value:'YOUR_CASHBACK_ITEM_ID'});
                creditMemo.setCurrentSublistValue({sublistId:'item',fieldId:'amount',value:cashbackAmount});
                creditMemo.commitLine({sublistId:'item'});
                
                let creditMemoId = creditMemo.save();
                log.audit({
                    title:'credit memo created successfully',
                    detials:`credit memo id: ${creditMemoId} for customer: (id: ${customerId},Name: ${customerName}), Amount: ${cashbackAmount}`
                });
            }
        }
        catch(e){
            log.error({
                title: 'error in map stage', 
                details: e
            });
        }
    };

    const reduce = (context)=>{}

    const summarize = (summary)=>{
        log.audit({
            title:'process completed',
            details:'total record processed.'
        });
        
    }
    return {
            getInputData: getInputData,
            map: map,
            reduce: reduce,
            summarize: summarize
        };

})