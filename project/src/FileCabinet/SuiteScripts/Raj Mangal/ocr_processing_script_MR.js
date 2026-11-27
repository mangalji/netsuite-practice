    /**
     * @NApiVersion 2.1
     * @NScriptType MapReduceScript
     * @NModuleScope SameAccount
     */

    define(['N/record','N/search','N/log','N/runtime'], function(
        record,search,log,runtime
        ){

        function getInputData(){

            let rawData = runtime.getCurrentScript().getParameter({
                name: 'custscript_ocr_processing_bulk_data'
            });

            if (!rawData) {
                throw new Error('Invoice data is missing');
            }

            let invoiceData = JSON.parse(rawData);

            let invoiceId = invoiceData.invoiceId;

            if (!invoiceId || !Array.isArray(invoiceData.items)) {
                throw new Error('Invalid invoice data');
            }

            log.audit('invoice data recieved',{
                invoiceId:invoiceId,
                totalItems:invoiceData.items.length
            });

            return invoiceData.items.map(function(item,index){
                return {
                    invoiceId:invoiceId,
                    lineNumber:index+1,
                    itemData:item
                };
            });
        }

        function map(context){
            let data = JSON.parse(context.value);

            let invoiceId = data.invoiceId;
            let itemData = data.itemData;
            let itemLookup = findItemAndVendorName(itemData.description);

            // if(!itemLookup.itemId){
            //     throw new Error(
            //         'item not found: ' + itemData.description
            //     );
            // }

            let item = record.create({
                type:'customrecord1527',
                isDynamic:true
            });
            
            item.setValue({fieldId:'custrecord157',value:invoiceId});
            if (itemLookup.itemId){
                item.setValue({
                    fieldId: 'custrecord156',
                    value: itemLookup.itemId
                });
            } 
            // else {
            //     item.setValue({
            //         fieldId: 'custrecord_custrecord_remark',
            //         value: 'Item not found ' + itemData.description
            //     });
            // }

            item.setValue({
                fieldId: 'custrecord_custrecord_remark',
                value: itemLookup.itemId
                    ? itemLookup.matchStatus
                    : 'Item Not Found: ' + itemData.description
            });
            

            item.setValue({
                fieldId: 'custrecord158',
                value: itemData.quantity
            });

            item.setValue({
                fieldId: 'custrecord159',
                value: itemData.unitPrice
            });

            item.setValue({
                fieldId: 'custrecord160',
                value: itemData.total
            });

            // new remark field
            // item.setValue({
            //     fieldId:'custrecord_custrecord_remark',
            //     value: itemLookup.matchStatus
            // })
            

            let itemId = item.save();

            log.audit('item created ',{
                invoiceId:invoiceId,
                lineNumber:data.lineNumber,
                itemId:itemId,
                description:itemData.description,
                matchStatus:itemLookup.matchStatus
            });

            context.write({
                key: String(data.lineNumber),
                value: String(itemId)
            })
        }

            function findItemAndVendorName(description) {

                if (!description || !description.trim()) {

                    return {
                        itemId: null,
                        vendorName: null,
                        matchStatus:"Item not found"
                    };
                }

                var searchValue = description.trim();

                var exactResults = search.create({
                    type:search.Type.ITEM,
                    filters:[
                        ['itemid',search.Operator.IS,searchValue]
                    ],
                    columns:[search.createColumn({
                        name:'internalid',
                    }),'itemid','vendorname']
                }).run().getRange({
                    start:0,end:1
                });
                if(exactResults.length>0){
                    log.audit('Exact item matched',{
                        extractedName:description,
                        matchedItem:exactResults[0].getValue('itemid')
                    });

                    return {
                        itemId:exactResults[0].getValue('internalid'),
                        vendorName:exactResults[0].getValue('vendorname'),
                        matchStatus:'item matched'
                    };
                }

                var results = search.create({

                    type: search.Type.ITEM,

                    filters: [
                        ['itemid', search.Operator.CONTAINS, searchValue]
                    ],

                    columns: [
                        search.createColumn({
                            name: 'internalid',
                            sort: search.Sort.DESC
                        }),
                        'itemid',
                        'vendorname'
                    ]

                }).run().getRange({

                    start: 0,
                    end: 2

                });

                if (!results || results.length === 0) {

                    log.error('Item Not Found', description);

                    return {
                        itemId: null,
                        vendorName: null,
                        matchStatus: 'Item not found'
                    };
                }

                log.audit('multiple Item Matched', {
                    extractedName: description,
                    matchedItem: results[0].getValue('itemid'),
                    multipleMatches: results.length > 1
                });


                // if (results.length === 1){
                //     log.audit('single item matched',{
                //         extractedName:description,
                //         matchedItem:results[0].getValue('itemid')
                //     });

                return{
                    itemId:results[0].getValue('internalid'),
                    vendorName:results[0].getValue('vendorname'),
                    matchStatus: results.length === 1 ?'Item Matched' : 'Multiple Items Fetched'
                };
                // }
                // multiple matching
                // log.audit('multiple items matched',{
                //     extractedName:description,
                //     totalMatches:results.length,
                //     selectedItem:results[0].getValue('itemid')
                // });

                // return{
                //     itemId:results[0].getValue('internalid'),
                //     vendorName:results[0].getValue('vendorname'),
                //     matchStatus:'mutliple items fetched'
                // }
            }
        return {
            getInputData:getInputData,
            map:map,
        }
    });