/**
 * @NApiVersion 2.1
 * @NScriptType WorkflowActionScript
 */

define(['N/record','N/log'], (record,log) =>{

    const onAction = (context) => {

        const currentRecord = context.newRecord;

        const vendorName = currentRecord.getValue({
            fieldId:'entityid'
        });

        log.debug({
            title:"vendor name",
            details: vendorName
        });

        return vendorName;
    };

    return{
        onAction:onAction
    };
});