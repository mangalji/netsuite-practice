/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */

define(['N/ui/serverWidget'],(serverWidget) =>{
    function onRequesthello(context){
        let request = context.request;
        let response = context.response;
        if (request.method === 'GET'){
            const form = serverWidget.createForm({
                title: 'My first suitelet form.'
            });

            // step 2 : add a field in the form.

            form.addField({
                id: 'custpage_name_by_raj',
                type: serverWidget.FieldType.TEXT,
                label:'Enter your Name'
            });

            // step 3: add a submit button in the form.

            form.addSubmitButton({
                label:'submit'
            });

            // Step 4: display Form on browser
            response.writePage(form);
        } else if(request.method === 'POST'){
            
            // step 5: get the name from submitted form.

            const name = request.parameters.custpage_name_by_raj || 'User';

            // step 6: display the response

            response.write('Hello, ' + name + ' Welcome to my first suitelet page.');

        }
    }
    return {
        onRequest:onRequesthello
    };
})