/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */

define(['N/error','N/log'], (error,log) => {
    function beforeSubmit(context) {
        
        // Run only when creating or editing a Vendor
        if (context.type !== context.UserEventType.CREATE && context.type !== context.UserEventType.EDIT){
            return ;
        }

        const vendorRecord = context.newRecord;

        // get vendor email

        email = vendorRecord.getValue({
            fieldId: "email"
        });
        
        // Stop saving if email is empty

        if (!email || !String(email).trim()){
            throw error.create({
                name:"vendor email required",
                message:"Please enter an email address for this Vendor."
            });
        }
        log.debug({
            title:"Vendor Email Validation",
            details:"Email Validation passed"
        });
    }

    function beforeLoad(context){
        if 
        (context.type === context.UserEventType.CREATE ||
        context.type === context.UserEventType.EDIT
            ){
                const emailField = context.form.getField({
                    id:"email"
                });
                if (emailField){
                    emailField.isMandatory = true;
                }
            }
    }

    return {
        beforeLoad:beforeLoad,
        beforeSubmit:beforeSubmit
    };
});