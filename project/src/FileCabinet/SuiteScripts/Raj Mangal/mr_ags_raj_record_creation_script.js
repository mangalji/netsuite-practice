
/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N/record', 'N/log'], (record, log) => {

    // Step 1: Input data for testing
    const getInputData = () => {
        return [
            {
                companyName: 'AGS Test Customer 001',
                email: 'ags.test001@example.com',
                internalId: 'AGS_MR_TEST_001'
            },
            {
                companyName: 'AGS Test Customer 002',
                email: 'ags.test002@example.com',
                internalId: 'AGS_MR_TEST_002'
            },
            {
                companyName: 'AGS Test Customer 003',
                email: 'ags.test003@example.com',
                internalId: 'AGS_MR_TEST_003'
            }
        ];
    };

    // Step 2: Process each input and create a Customer
    const map = (context) => {
        const data = JSON.parse(context.value);

        try {
            const customer = record.create({
                type: record.Type.CUSTOMER,
                isDynamic: false
            });

            customer.setValue({
                fieldId: 'companyname',
                value: data.companyName
            });

            customer.setValue({
                fieldId:'subsidiary',
                value:2
            })

            customer.setValue({
                fieldId: 'email',
                value: data.email
            });

            customer.setValue({
                fieldId: 'internalId',
                value: data.internalId
            });

            const customerId = customer.save({
                enableSourcing: true,
                ignoreMandatoryFields: false
            });

            log.audit({
                title: 'Customer Created',
                details: {
                    companyName: data.companyName,
                    internalId: customerId,
                    internalId: data.internalId
                }
            });

        } catch (error) {
            log.error({
                title: 'Customer Creation Failed: ' + data.companyName,
                details: error
            });

            throw error;
        }
    };

    return {
        getInputData,
        map,
        };
});
