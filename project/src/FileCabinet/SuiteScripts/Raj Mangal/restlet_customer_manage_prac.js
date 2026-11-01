/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */

define(['N/record','N/search','N/error'], (record, search, error) => {
    
    // get request
    const get = (requestParams) =>{
        try{
            const customerId = requestParams.id;
            if (customerId){
                const customer = record.load({
                    type: record.Type.CUSTOMER,
                    id: customerId
                });

                return {
                    success: true,
                    data:{
                        id:customer.id,
                        name: customer.getValue({
                            fieldId: 'companyname'
                        }),

                        email:customer.getValue({
                            fieldId:'email'
                        }),

                        phone:customer.getValue({
                            fieldId:'phone'
                        })
                    }
                };
            }
            return {
                success: false,
                message: 'customer id is required'
            };
        }
        catch (e){
            log.error('Get customer error', e);

            return {
                success: false,
                message: e.message
            };
        }
    };

    // post request - create customer

    const post = (requestBody) =>{
        
        try{
            const customer = record.create({
                type: record.Type.CUSTOMER,
                isDynamic: true
            });
            customer.setValue({
                fieldId:'companyname',
                value:requestBody.companyname
            })

            customer.setValue({
                fieldId:'email',
                value:requestBody.email
            });

            customer.setValue({
                fieldId:'phone',
                value:requestBody.phone
            })

            const customerId = customer.save({
                enableSourcing:true,
                ignoreMandatoryFields: false
            });

            return {
                success: true,
                message:'Customer created successfully',
                customerId:customerId
            };
        }
        catch(e){
            log.error('post customer error',e)

            return {
                success: false,
                message: e.message
            };
        }
    };

    // put - update the customer
    
    const put = (requestBody) =>{

        try{
            if(!requestBody.id){
                throw error.create({
                    name:'MISSING_CUSTOMER_ID',
                    message: 'Customer ID is required'
                });
            }

            const customer = record.load({
                type:record.Type.CUSTOMER,
                id:requestBody.id,
                isDynamic:true
            });
            if (requestBody.companyname){
                customer.setValue({
                    fieldId:'companyname',
                    value:requestBody.companyname
                });
            }

            if (requestBody.email){
                customer.setValue({
                    fieldId:'email',
                    value:requestBody.email
                });
            }

            if (requestBody.phone){
                customer.setValue({
                    fieldId:'phone',
                    value:requestBody.phone
                });
            }
            const updateId = customer.save();
            
            return{
                success:true,
                message:'Customer updated successfully',
                customerId:updateId
            };
        }
        catch(e){
            log.error('PUT Customer Error', e);

            return {
                success: false,
                message: e.message
            };
        }
    };

    // delete the customer 
    const deleteCustomer = (requestParams) =>{
        try{

            const customerId = requestParams.id;
            
            if(!customerId){
                throw error.create({
                    name: 'MISSING_CUSTOMER_ID',
                    message: 'Customer ID is required'
                });
            }

            record.delete({
                type:record.Type.CUSTOMER,
                id:customerId
            });

            return {
                success: true,
                message: 'Customer deleted successfully',
                customerId: customerId
            }
        }
        catch(e){
            log.error('DELETE Customer Error', e);

            return {
                success: false,
                message: e.message
            };
        }
    };

    return {
        get:get,
        post:post,
        put:put,
        delete:deleteCustomer
    };

});