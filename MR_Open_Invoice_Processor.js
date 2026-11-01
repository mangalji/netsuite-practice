/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */

define(['N/search'], (search) => {
    function getInputData(){
        return search.create({
            // type: search.type.INVOICE,
            type:'invoice',
            filters:[
                ['mainline','is','T'],
                // 'AND',
                // ['status','anyof','CustInvc:A']
            ],
            columns:[
                'internalid',
                'tranid',
                'entity',
                'amount'
            ]
        });
    };
        function map(context){
          // conosle.log(context)
            // log.debug(context)
            // log.audit({
            //     title: 'MAP CONTEXT - FULL DETAILS',
            //     details: JSON.stringify({
            //         key: context.key,
            //         value: context.value,
            //         isRestarted: context.isRestarted,
            //         executionNo: context.executionNo
            //     }, null, 2)
            // });

            const invoice = JSON.parse(context.value);
            // log.debug(invoice)
            const customerId = invoice.values.entity.value;
            // log.debug(customerId)
            const amount = Number(invoice.values.amount);

            context.write({
                key:customerId,
                value:amount
            });
            log.audit({
                title:'open invoice found',
                details: JSON.stringify({
                    invoiceId: invoice.id,
                    invoiceData: invoice.values
                })
            });

            // Future logic:
            // Validate invoice, calculate aging,
            // or prepare a customer follow-up report.
        }

        function reduce(context){
            // log.audit({
            //     title:'what reduce get in the context',
            //     details:context
            // })
            let totalAmount = 0;

            context.values.forEach((value)=>{
                totalAmount += Number(value);
            });
            log.audit({
                title:'customer invoice total',
                details:JSON.stringify({
                    customerId:context.key,
                    totalAmount:totalAmount
                })
            });
            context.write({
                key:context.key,
                value:totalAmount
            });
        }
        return {getInputData, map, reduce, summarize};
});