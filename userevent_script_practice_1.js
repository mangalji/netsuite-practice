/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/log', 'N/ui/serverWidget', 'N/url'], (log, serverWidget, url) => {

    const beforeLoad = (context) => {
        try {
            if (context.type !== context.UserEventType.VIEW) return;

            log.debug('Step 1', 'Before VIEW check passed');

            const suiteletURL = url.resolveScript({
                scriptId:     'customscriptcustomscript_raj_so',
                deploymentId: 'customdeploycustomscript_raj_so',
                params: {
                    soId: context.newRecord.id
                }
            });

            log.debug('Step 2', `URL generated: ${suiteletURL}`);

            context.form.addButton({
                id:           'custpage_btn_viewso',
                label:        'Custom Suitelet Page',
                functionName: `window.open('${suiteletURL}','_blank')`
            });

            log.debug('Step 3', 'Button added successfully');

        } catch (e) {
            log.error('ERROR caught', `Message: ${e.message} | Stack: ${e.stack}`);
        }
    };

    return { beforeLoad };
});








// /**
//  * @NApiVersion 2.1
//  * @NScriptType UserEventScript
//  * @NModuleScope SameAccount
//  */

// define(['N/log','N/runtime','N/ui/serverWidget','N/url'],(log,runtime,serverWidget,url)=>{
//         const  beforeLoad = (context) => {
//             if (context.type !== context.UserEventType.VIEW) return;

//             const suiteletURL = url.resolveScript({
//                 scriptId: 'customscriptcustomscript_raj_so',
//                 deploymentId: 'customdeploycustomscript_raj_so',
//                 params : {
//                     soId: context.newRecord.id
//                 }   
//             });

//             context.form.addButton({
//                 id: 'custompage_button_view_so',
//                 label: 'Custom Suitelet Page',
//                 functionName: `window.open('${suiteletURL}','_blank')`
//             });

//             log.debug('Button Added', `SO ID: ${context.newRecord.id}`);
//         };
//         return {beforeLoad};
// });