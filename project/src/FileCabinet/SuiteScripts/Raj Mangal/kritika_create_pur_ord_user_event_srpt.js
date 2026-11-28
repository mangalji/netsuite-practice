/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/ui/serverWidget'], function(serverWidget) {

    function beforeLoad(context) {
       
        if (context.type !== context.UserEventType.VIEW) return;

        var recordId = context.newRecord.id;
        if (!recordId) return;
        context.form.clientScriptModulePath = '/SuiteScripts/Kritika AGS/CLI_create_button.js';
        context.form.addButton({
            id:           'custpage_create_po_btn',
            label:        'Create Purchase Order',
            functionName: 'createPurchaseOrder'  
        });
    }

    return { beforeLoad: beforeLoad };
});