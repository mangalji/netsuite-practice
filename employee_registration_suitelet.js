/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */

define(['N/ui/serverWidget'],(serverWidget)=>{
    function onRequestregister(context){
        const request = context.request;
        const response = context.response;
        
        // get request:
        if (request.method==='GET'){
        const form = serverWidget.createForm({
            title: 'user registration form'
        });

        const name = form.addField({
            id:'custpage_user_name',
            type:serverWidget.FieldType.TEXT,
            label:'Enter your Name',
        });
        name.isMandatory = true;

        const email = form.addField({
            id:'custpage_user_email',
            type:serverWidget.FieldType.EMAIL,
            label:'Enter your Email',
        });
        email.isMandatory = true;
        form.addField({
            id:'custpage_user_phone',
            type:serverWidget.FieldType.PHONE,
            label:'Enter your Phone',
        });
        form.addField({
            id:'custpage_user_joining_date',
            type:serverWidget.FieldType.DATE,
            label:'Select Joining Date',
        });
        const department = form.addField({
            id:'custpage_user_department',
            type:serverWidget.FieldType.SELECT,
            label:'Select Department',
        });
        department.addSelectOption({
            value: '',
            text: '- Select Department -'
        });
        department.addSelectOption({
            value:'hr',
            text:'HR',
        });
        department.addSelectOption({
            value:'it',
            text:'IT'
        });

        form.addField({
            id: 'cust_posi',
            type: serverWidget.FieldType.RADIO,
            label: 'Manager',
            source: 'manager'
        });

        form.addField({
            id: 'cust_posi',
            type: serverWidget.FieldType.RADIO,
            label: 'Software Developer',
            source: 'developer'
        });

        form.addField({
            id: 'cust_posi',
            type: serverWidget.FieldType.RADIO,
            label: 'IT Support',
            source: 'itsupport'
        });
        form.addField({
            id:'custpage_emp_type',
            type:serverWidget.FieldType.CHECKBOX,
            label:'FullTime Employee',
        });
        form.addField({
            id:'custpage_user_address',
            type:serverWidget.FieldType.TEXTAREA,
            label:'Address',
        });

        form.addSubmitButton({
            label:'Register User',
        });
        response.writePage(form);
        return
    }

    // post request:
    const params = request.parameters;

    const user = {
        name:params.custpage_user_name || '',
        email: params.custpage_user_email || '',
        phone: params.custpage_user_phone || '',
        joiningDate: params.custpage_user_joining_date || '',
        department: params.custpage_user_department || '',
        position: params.cust_posi || '',
        fullTime: params.custpage_emp_type === 'T',
        address: params.custpage_user_address || ''
    };

    // basic server side validation
    if(!user.name.trim() || !user.email.trim()){
        response.write('name and email are required.')
        return;
    }

    // display the submitted data
    const resultForm = serverWidget.createForm({
        title:'Registration Submitted.'
    });

    function showValue(id,label,value){
        const field = resultForm.addField({
            id:id,
            type:serverWidget.FieldType.TEXT,
            label:label
        });
        
        field.defaultValue = String(value || '-');
        field.updateDisplayType({
            displayType:serverWidget.FieldDisplayType.INLINE
        });
    }

    showValue('custpage_result_name','Name',user.name);
    showValue('custpage_result_email', 'Email', user.email);
    showValue('custpage_result_phone', 'Phone', user.phone);
    showValue('custpage_result_date', 'Joining Date', user.joiningDate);
    showValue('custpage_result_dept', 'Department', user.department);
    showValue('custpage_result_position', 'Position', user.position);
    showValue(
        'custpage_result_type',
        'Full-Time Employee',
        user.fullTime ? 'Yes' : 'No'
    );
    showValue('custpage_result_address', 'Address', user.address);
    response.writePage(resultForm)
    }
    return {
        onRequest:onRequestregister
    };
});