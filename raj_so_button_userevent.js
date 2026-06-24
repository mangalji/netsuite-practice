/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/log', 'N/url'], (log, url) => {

    const beforeLoad = (context) => {
        try {
            if (context.type !== context.UserEventType.VIEW) return;

            log.debug('Step 1', 'VIEW mode confirmed');

            const suiteletURL = url.resolveScript({
                scriptId:     'customscriptcustomscript_raj_so',
                deploymentId: 'customdeploycustomscript_raj_so',
                params: {
                    soId: context.newRecord.id
                }
            });

            log.debug('Step 2', `URL: ${suiteletURL}`);

            context.form.addButton({
                id:           'custpage_btn_viewso',
                label:        'Custom Suitelet Page',
                functionName: `window.open('${suiteletURL}','_blank')`
            });

            log.debug('Step 3', 'Button added');

        } catch(e) {
            log.error('CAUGHT ERROR', e.message);
        }
    };

    return { beforeLoad };
});