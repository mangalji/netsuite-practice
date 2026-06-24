/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 */

define(['N/email','N/runtime','N/serverWidget','N/record','N/http'],(email,runtime,serverWidget,record,http)=>{
    function onRequest(context){
        var form = serverWidget.createForm({
            title:'User Information Form'
        });

        var fieldContainer = form.addFieldGroup({
            id:'fieldContainer',
            label:'Field Container'
        });
        var nameField = form.addField({
            id:'cust_name_field',
            label:'Name',
            type:serverWidget.FieldType.TEXT
        });
        nameField.isMandatory = true;

        var field = form.addField({
            id: 'select_education',
            type: serverWidget.FieldType.SELECT,
            label: 'Select Education',
            source: 'customlist1905'
        });

        var sublist = form.addSublist({
            id: 'sublistId',
            type: serverWidget.SublistType.INLINEEDITOR,
            label:"Inline Editor Sublist"
        });

        sublist.addField({
            id:'sublist1',
            type:serverWidget.FieldType.TEXT,
            label: 'Text'
        });
        sublist.addField({
            id:'sublist2',
            type:serverWidget.FieldType.TEXTAREA,
            label: 'small description'
        });
        sublist.addField({
            id:'datefield',
            type:serverWidget.FieldType.DATE,
            label: 'Date'
        });


        form.addResetButtom({
            label:'Reset Button'
        });
        form.addSubmitButton({
            label:'Submit Button'
        });
        context.response.writepage(form);
    }
    return {
        onRequest:onRequest
    }
});