/**
 * @NApiVersion 2.1 
 * @NScriptType ClientScript
 */
define(['N/ui/message'],function(msg) {
    function showErrorMessage(msgText) {
        var myMsg = msg.create({
            title: "Cannot Save Record",
            message: msgText,
            type: msg.Type.ERROR
        });

        myMsg.show({
             duration: 5000
        });
    }

    function saveRec(context) {
        var rec = context.currentRecord;
        var currentDate = new Date()
        var oneWeekAgo = new Date(currentDate - 1000 * 60 * 60 * 24 * 7);

        // Validate transaction date is not older than current time by one week
        if (rec.getValue({fieldId: 'trandate'}) < oneWeekAgo) {
            showErrorMessage("Cannot save sales order with trandate one week old.");
            return false;
        }

        // Validate total is greater than 0
        if (rec.getValue({fieldId: 'total'}) <= 0) {
            showErrorMessage("Cannot save sales order with negative total amount.");
            return false;
        }
        return true;
    }

    return {
        saveRecord: saveRec
    }
 });