/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */

define(['N/log'],(log) => {
    function afterSubmit(context){

        // Run only when a Vendor is created
        if (context.type !== context.UserEventType.CREATE){
            return;
        }

        // Get the saved Vendor record
        const vendorRecord = context.newRecord;

        const vendorId = vendorRecord.id;

        const vendorName = vendorRecord.getValue({
            fieldId:'entityid'
        });

        log.audit({
            title:'Vendor Created Successfully',
            details:{
                vendorId:vendorId,
                vendorName:vendorName
            }
        });
    }
    return {
        afterSubmit:afterSubmit
    };
});