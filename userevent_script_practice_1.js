/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */

define(['N/log','N/runtime','N/ui/serverWidget','N/url'],(log,runtime,serverWidget,url)=>{
        const  beforeLoad = (context) => {
            if (context.type !== context.UserEventType.VIEW) return;

            const suiteletURL = url.resolveScript({
                scriptId: 'customscript_raj_so',
                deploymentId: 'customdeploy_raj_so',
                params : {
                    soId: context.newRecord.id
                }   
            });

            context.form.addButton({
                id: 'custompage_button_viewso',
                label: 'Custom Suitelet Page',
                functionName: `window.open('${suiteletURL}','_blank')`
            });

            log.debug('Button Added', `SO ID: ${context.newRecord.id}`);
        };
        return {beforeLoad};
});