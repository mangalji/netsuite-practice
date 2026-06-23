/**
* @NApiVersion 2.1
*@NScriptType ClientScript
*/

define([],() =>{
    function saveRecord(context){
        var record = context.currentRecord;
        var lineCount = record.getLineCount({
            sublistId:'item'
        });
        var totalAmount = 0;
        for (var i=0;i<LineCount;i++){
            var amount = record.getSublistValue({
                sublistId:'item',
                fieldId:'amount',
                line:i
            });
            totalAmount += Number(amount);
        }
        record.setValue({
            fieldId:'custbody_amt_to_words',
            value:totalAmount + 'only'
        });
        return true;
    };      
    return {
        saveRecord:saveRecord
    };
});