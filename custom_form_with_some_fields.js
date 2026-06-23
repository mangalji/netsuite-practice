/**
 * @N@NApiVersion 2.1
 * @NScriptType Userevent Script
 */

define(['N/url'], function(url){
    function beforeLoad(context){
        if (context.type == context.UserEventType.VIEW){
            var record = context.newRecord;
            var suiteletUrl = url.resolveScript({
                scriptId:'customscript_for_suitelet',
                deploymentId:'customdeploy_for_suitelet',
                params: {soid: record.id}
            });

            context.form.addButton({
                id:'custpage_open_button',
                label:'custom suitelet form',
                functionName:"window.open('" + suiteletUrl + "','_blank')"
            });  
        }
    }
    return {beforeLoad: beforeLoad};
});