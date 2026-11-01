/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */

define(['N/search','N/record'], (search,record) =>{
    function getInputData(){
        return search.create({
            type: search.Type.CUSTOMER,
            filters: [
                ['isinactive', 'is', 'F']
            ],
            columns:['internalid']
        });
    }
    function map(context){
        const result = JSON.parse(context.value);
        const customerId = result.id;

        try{
            const customer = record.load({
                type:record.Type.CUSTOMER,
                id:customerId
            });

            // Replace with an existing custom checkbox field ID
            customer.setValue({
                fieldId:'custentity19',
                value:true
            });
            customer.save();

            log.audit({
                title:'customer processed',
                details: `customer id: ${customerId}.`
            });
        } catch(error) {
            log.error({
                title:`customer ${customerId} failed`,
                details: `${error.name}: ${error.message}`
            });

            throw error;
        }
    }

    // function summarize(context){
    //     log.audit({
    //         title:'customer update completed',
    //         details:`usage: ${context.usage}, yields: ${context.yields}`
    //     });

    //     context.mapSummary.errors.iterator().each(
    //         (key,error)=>{
    //             log.error({
    //                 title:`map error: ${key}`,
    //                 details: error
    //             });
    //             return true;
    //         }
    //     );
    // }

    return {
        getInputData:getInputData,
        map:map,
        // summarize:summarize
    };
});