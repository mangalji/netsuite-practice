/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 */
define(['N/currentRecord'],function(currentRecord){    
    function saveRecord(context){

        // current invoice record
        var record = currentRecord.get();
        
        // declare total amount variable
        var totalAmount = 0;
        
        //count total item lines
        var linecount = record.getLineCount({
            sublistId:'item'
        });
        
        // loop through all item lines
        for(var i=0;i<linecount;i++){
        
            // get amount from each line
            var amount = record.getSublistValue({
                sublistId:'item',
                fieldId:'amount',
                line:i                   
            });
            
            // add amount into total
            totalAmount += Number(amount);
        }

        var fieldName = record.fieldId;

    //set total inside memo field
    record.setValue({
        fieldId:'memo',
        // fieldId:'custbody_amt_to_words',
        value:'Total without shipping:' + totalAmount + 'only'
    });
        return true;
    }
    return {
        saveRecord:saveRecord

    };
});