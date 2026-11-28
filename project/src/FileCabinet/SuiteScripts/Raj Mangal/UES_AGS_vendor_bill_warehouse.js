/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */

define([], function () {
    function beforeLoad(context){
        if(
            context.type !== context.UserEventType.CREATE &&
            context.type !== context.UserEventType.EDIT &&
            context.type !== context.UserEventType.COPY
        ){
            var warehouseField = context.form.getField({
            id: 'location'
            });

            if(warehouseField){
                warehouseField.isMandatory = false;
            }
        }
    }
    return {beforeLoad: beforeLoad};
}); 