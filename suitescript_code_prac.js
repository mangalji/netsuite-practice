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
        if (fieldName == 'custbody_location'){

            var location = record.getValue({
                fieldId:'custbody_location'
            });
            if (location == 'Bengaluru'){
                record.setValue({
                    fieldId:'partner',
                    value: '1 xyz limited'
                });
            } 
            else if (location == 'Delhi'){
                record.setValue({
                    fieldId:'partner',
                    value: '12 IID Partner 1'
                });
            }
        }

    //set total inside memo field
    record.setValue({
        // fieldId:'memo',
        fieldId:'custbody_amt_to_words',
        value:'Total without shipping:' + totalAmount + 'only'
    });
        
    var phone_record = record.getValue({
        fieldId:'custbody754'
    });
    if (phone_record && phone_record.length < 10){
        alert('phone number must have 10 digits.')
        return false;
    }   
    else if(phone_record && phone_record.length > 10){
        alert('phone number should only have 10 digits.')
        return false;
    }
    

    // allow record save
    return true;
    }
    return {
        saveRecord:saveRecord

    };
});


/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 */
define(['N/currentRecord'],function(currentRecord){    

    function fieldChanged(context){
        
        if (context.fieldId == 'custbody_location'){
            var record = currentRecord.get();
            var location = record.getText({
                fieldId:'custbody_location'
            });
            
            if (location == 'Bengaluru'){
                record.setText({
                    fieldId:'partner',
                    text:'1 xyz Ltd'
                });
            }
            else if (location == 'Delhi'){
                record.setText({fieldId:'partner',text:'12 IID Partner 1'});
            }
        }
    }

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

    //set total inside memo field
    record.setValue({
        // fieldId:'memo',
        fieldId:'custbody_amt_to_words',
        value:'Total without shipping:' + totalAmount + 'only'
    });
        
    var phone_record = record.getValue({
        fieldId:'custbody754'
    });
    if (phone_record && phone_record.length < 10){
        alert('phone number must have 10 digits.')
        return false;
    }   
    else if(phone_record && phone_record.length > 10){
        alert('phone number should only have 10 digits.')
        return false;
    }
    

    // allow record save
    return true;
    }
    
    return {
        fieldChanged: fieldChanged,
        saveRecord:saveRecord

    };
});

/**
* @NApiVersion 2.1
*@NScriptType ClientScript
*/
define([],() =>{
    function sublistChanged(context){
        if (context.sublistId != 'item'){
            return;
        }
        var record = context.currentRecord;
        var lineCount = record.getLineCount({
            sublistId:'item'
        });
        var totalAmount = 0;
        for (var i=0;i<lineCount;i++){
            var amount = record.getSublistValue({
                sublistId:'item',
                fieldId:'amount',
                line:i
            });
        totalAmount += Number(amount); 
        }
        record.setValue({
            // fieldId:'memo',
            fieldId:'custbody_amt_to_words',
            value:'Total Amount = ' + totalAmount + 'only'
        }); 
    }
    function fieldChanged(context){
        if (context.fieldId == 'custbody_location'){
            var record = context.currentRecord;
            var location = record.getText({
                fieldId:'custbody_location'
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
            else if (location == ''){
                record.setText({
                    fieldId:'partner',
                    text:''
                });
            }
        }
    }
    return {
        sublistChanged:sublistChanged,
        fieldChanged:fieldChanged
    };
});



