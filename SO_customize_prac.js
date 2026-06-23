/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
*/

define([],() => {

    function fieldChanged(context){

        let record = context.currentRecord;

        if(context.fieldId == 'custbody_location'){
            
            let location = record.getText({
                fieldId:'custbody_location',
            });
            if (location == 'Bengaluru'){
                record.setText({
                    fieldId:'partner',
                    text:'1 xyz Ltd'
                });
            }
            else if (location == 'Chennai'){
                record.setText({
                    fieldId:'partner',
                    text:'12 IID Partner 1'
                });
            }
        }
        
    return true;
    }
    
    function sublistChanged(context){
        var record = context.currentRecord;
        let lineCount = record.getLineCount({
            sublistId:'item'
        });
        let totalAmount = 0;
        for(let i=0;i<lineCount;i++){
            let amount = record.getSublistValue({
                sublistId:'item',
                fieldId:'amount',
                line:i
            });
        totalAmount += Number(amount);
        }
        record.setValue({
            fieldId:'custbody_amt_to_words',
            value: totalAmount + ' only'
        });
        return true;
    }

    function saveRecord(context){
        return true;
    }
    
    return {
        fieldChanged: fieldChanged,
        saveRecord: saveRecord,
        sublistChanged: sublistChanged

    };
    

})