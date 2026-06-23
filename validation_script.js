/**
 * @NAPI_VERSION 2.0
 * @NScriptType ClientScript
 */

define([],() =>{

    function saveRecord(context){

        // current invoice record
        var record = currentRecord.get();
        var phone_record = record.getValue({
            fieldId:'custbody754'
        });
        
        if(phone_record && phone_record.length<10){
            alert('phone number must have 10 digits.')
            return false;
        }
        else if(phone_record && phone_record.length>10){
            alert('phone number should only have 10 digits.')
            return false;
        }
        return true;
    }
    return {
        saveRecord:saveRecord
    }

})
