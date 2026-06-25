/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @ModuleScope SameAccount
 */

define([
    'N/search',
    'N/record',
    'N/log',
    'N/runtime',
    'N/format'
],(search,record,log,runtime,format)=>{
    // getInputData()

    const getInputData = ()=>{
        log.audit({
            title:'getInputData START',
            details:`Script: ${runtime.getCurrentScript().id} | Remaining Governance: ${runtime.getCurrentScript().getRemainingUsage()}`
        });
        return search.create({
            type:search.Type.SALES_ORDER,
            filters:[
                ['status','anyof','SalesOrd:B'],
                'AND',
                ['mainline','is','T']
            ],
            columns:[
                search.createColumn({
                    name:'internalid',label:"Internal ID"
                }),
                search.createColumn({name:'entity',label:'Customer'}),
                search.createColumn({name:'amount',label:'Amount'}),
                search.createColumn({name:'trandate',label:'Transaction Date'}),
                search.createColumn({name:'tranid',label:'Order Number'})                
            ]
        });
    }

    const map = (context)=>{
        const searchResult = JSON.parse(context.value);
        
        const customerId = searchResult.values.entity.value;

        const customerName = searchResult.values.entity.text;
        const amount = parseFloat(searchResult.values.amount) || 0;
        const orderId = searchResult.values.internalid;
        const orderNumber = searchResult.values.tranid;
        const trandate = searchResult.values.trandate;

        log.debug({
            title: `map() | Customer: ${customerName}`,
            details: `Order: ${orderNumber} | Amount: ${amount}`
        });

        context.write({
            key:customerId,
            value:JSON.stringify({
                customerName,
                orderId,
                orderNumber,
                amount,
                trandate
            })
        });
    };

    const reduce = (context)=>{
        const customerId = context.key;

        let totalAmount = 0;
        let orderCount = 0;
        let customerName = '';
        const orderIds = [];

        context.values.forEach((valueStr)=>{
            const data = JSON.parse(valueStr);
            totalAmount += data.amount;
            orderCount += 1;
            customerName = data.customerName;
            orderIds.push(data.orderId);
        });
        log.audit({
            title:`reduce() | Customer: ${customerName} (${customerId})`,
            details:`Orders: ${orderCount} | Total: ₹${totalAmount.toFixed(2)}`
        });

        try{
            const existingSearch = search.create({
                type:'customrecord_customer_order_summary',
                filters:[['custrecord_cos_customer','anyof',customerId]],
                columns:['internalid']
            });
            const existingResults = existingSearch.run().getRange({start:0,end:1});
            if (existingResults.length>0){
                const existingId = existingResults[0].id;
                record.submitFields({
                    type:'customrecord_customer_order_summary',
                    id:existingId,
                    values:{
                        custrecord_cos_total_amt: totalAmount,
                        custrecord_cos_total_count: orderCount,
                        custrecord_cos_last_run: new Date()
                    }
                });
                log.audit({
                    title:`reduce() | Updated record`,
                    details: `Record ID: ${existingId} for Customer: ${customerName}`
                });
            }
            else {
                const summaryRecord = record.create({
                    type:'customrecord_customer_order_summary)'
                });
                summaryRecord.setValue({fieldId:'custrecord_cos_customer',value:parseInt(customerId)});
                summaryRecord.setValue({fieldId:'custrecord_cos_total_amount',value:totalAmount});
                summaryRecord.setValue({fieldId:'custrecord_cos_order_count',value:orderCount});
                summaryRecord.setValue({fieldId:'custrecord_cos_last_run',value:new Date()});

                const newRecordId = summaryRecord.save();
                log.audit({
                    title:`reduce() | Created record`,
                    details: `New Record ID: ${newRecordId} for Customer: ${customerName}`
                });
            }
    
        }
        catch(e){
            log.error({
                title:`reduce() ERROR | CUSTOMER: ${customerId}`,
                details:e.message
            });
        }   
    };

    const summarize = (summary) => {
        const totalSeconds = summary.seconds;
        const inputKeys = summary.inputSummary.keys;
        const inputErrors = summary.inputSummary.errors;

        log.audit({
            title:`summarize() - Script Complete`,
            details:`Total time: ${totalSecond}s | Governance used: ${10000 - runtime.getCurrentScript().getRemainingUsage()} units`
        });
        // map stage errors
        let mapErrorCount = 0;
        summary.mapSummary.errors.iterator().each((key,error) => {
            const errobj = JSON.parse(error);
            log.error({
                title:`MAP ERROR | Key: ${key}`,
                details:`Type: ${errobj.Name} | Message: ${errobj.message}`
            });

            mapErrorCount++;
            return true;
        });

        // reduce stage errors

        let reduceErrorCount = 0;
        summary.reduceSummary.errors.iterator().each((key,error)=>{
            const errObj = JSON.parse(error);
            log.error({
                title: `REDUCE ERROR | Customer ID: ${key}`,
                details:`Type: ${errObj.name} | Message: ${errObj.message}`
            });
            reduceErrorCount++;
            return true;
        });

        log.audit({
            title:`summarize() - Final Report`,
            details: JSON.stringify({
                totalTimeSecs: totalSeconds,
                mapErrors: mapErrorCount,
                reduceErrors: reduceErrorCount,
                governanceLeft: runtime.getCurrentScript().getRemainingUsage()

            })
        });
    };
    return {getInputData, map, reduce, summarize}
})