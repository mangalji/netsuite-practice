/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */

define(['N/ui/serverWidget','N/search'],(serverWidget,search)=>{
    function onRequestsearch(context){
        const request = context.request;
        const response = context.response;

        // create the form first
        const form = serverWidget.createForm({
            title:'Customer Search Suitelet Page'
        });

        // add customer name search field in the form
        const name = form.addField({
            id:'custpage_customer_name',
            type:serverWidget.FieldType.TEXT,
            label: 'Customer Name'
        });

        // preserve the entered value after submission
        if (request.method === 'POST'){
            name.defaultValue = request.parameters.custpage_customer_name || '';
        }
        
        // add submit button
        form.addSubmitButton({
            label:'Search Customers'    
        });

        // search only after form submission
        if (request.method==='POST'){
            const customerName = request.parameters.custpage_customer_name || '';
        
        const results = search.create({
            type:search.Type.CUSTOMER,
            filters:[
                ['entityid','contains',customerName]
            ],
            columns:[
                search.createColumn({name:"internalid"}),
                search.createColumn({name:"entityid"}),
                search.createColumn({name:"companyname"}),
                search.createColumn({name:"email"}),
            ]
        }).run().getRange({
            start:0,
            end:1000
        });
        
        // create a results sublist
        const sublist = form.addSublist({
            id:'custpage_customer_results',
            type:serverWidget.SublistType.LIST,
            label:'Customer Search Results'
        });
        sublist.addField({
            id:'custpage_internalid',
            type: serverWidget.FieldType.TEXT,
            label: 'Internal ID'
        });
        sublist.addField({
                id: 'custpage_entityid',
                type: serverWidget.FieldType.TEXT,
                label: 'Customer ID'
        });
        sublist.addField({
                id: 'custpage_companyname',
                type: serverWidget.FieldType.TEXT,
                label: 'Company Name'
        });
        sublist.addField({
            id: 'custpage_email',
            type: serverWidget.FieldType.TEXT,
            label: 'Email'
        });
        // fill the table with search results
        results.forEach((result,index)=>{
            const internalId = result.getValue({name:'internalid'});
            const entityId = result.getValue({name:'entityid'});
            const companyName = result.getValue({name:'companyname'});
            const email = result.getValue({name:'email'});
            if (internalId){
                sublist.setSublistValue({
                    id:'custpage_internalid',
                    line:index,
                    value:String(internalId)
                });
            }
            if (entityId){
                sublist.setSublistValue({
                    id:'custpage_entityid',
                    line:index,
                    value:String(entityId)
                })
            }
            if (companyName){
                sublist.setSublistValue({
                    id: 'custpage_companyname',
                    line: index,
                    value: String(companyName)
                });
            }
            if (email){
                sublist.setSublistValue({
                    id: 'custpage_email',
                    line: index,
                    value: String(email)
                });
            }
        });
        // show a message when no results are found
        if (results.length===0){
            form.addField({
                id:'custpage_no_results',
                type:serverWidget.FieldType.INLINEHTML,
                label:''
            }).defaultValue =  '<div>No customers found. Try another name.</div>';
        }
    }

        // dispaly the form and results
        response.writePage(form);
    }
    return {
        onRequest:onRequestsearch
    };
});