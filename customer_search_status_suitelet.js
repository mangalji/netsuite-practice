/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */

define(['N/ui/serverWidget','N/search','N/log'],(serverWidget,search,log) => {
    function onRequestCustomerSearch(context){
        const request = context.request
        const response = context.response   
        const params = request.parameters

        if (request.method ==='GET'){

            const form = serverWidget.createForm({
                title:'Customer Search form'
            })
            
            const name = form.addField({
                id:'custpage_customer__name',
                type:serverWidget.FieldType.TEXT,
                label:'customer name',
            })

            const status = form.addField({
                id:'custpage_customer_status',
                type:serverWidget.FieldType.SELECT,
                label:'status',
            })

            status.addSelectOption({
                value:'',
                text:'--select status--',
            })
            status.addSelectOption({
                value:'all',
                text:'All',
            })
            status.addSelectOption({
                value:'active',
                text:'Active',
            })
            status.addSelectOption({
                value:'inactive',
                text:'Inactive',
            })
            form.addSubmitButton({
                label:'Search Customer',
            })
        }

        else if ( request.method === 'POST'){
            
        }
        
    };

    return {
        onRequest:onRequestCustomerSearch
    };
});
