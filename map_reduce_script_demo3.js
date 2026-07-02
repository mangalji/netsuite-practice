/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @ModuleScope SameAccount
 */

define(['N/search', 'N/record', 'N/log'], (search, record, log) => {
   
    // Get Input Data
    const getInputData = () => {
        return search.load({
            id: "customsearch7100" // Aapki saved search ID
        });
    };

    // Map Stage
    const map = (context) => {
        try {
            const searchResult = JSON.parse(context.value);
            const customerId = searchResult.values.entity.value;
            const salesOrderId = searchResult.id;
            let amount = parseFloat(searchResult.values.amount);
            
            if (amount && amount > 200000) {
                let cashbackAmount = amount * 0.05;

                context.write({
                    key: customerId,
                    value: {
                        soId: salesOrderId,
                        cashback: cashbackAmount
                    }
                });
            }
        } catch (e) {
            log.error({ title: 'Error in Map Stage', details: e });
        }
    };
    // reduce stage
    const reduce = (context) => {
        try {
            const customerId = context.key; 
            const eligibleOrders = context.values; 

            let creditMemo = record.create({
                type: record.Type.CREDIT_MEMO,
                isDynamic: true
            });
            creditMemo.setValue({ fieldId: 'entity', value: customerId });

            let totalConsolidatedCashback = 0;
            let memoDetails = "Consolidated Cashback for SOs: ";

            for (let i = 0; i < eligibleOrders.length; i++) {
                let orderData = JSON.parse(eligibleOrders[i]);
                let soId = orderData.soId;
                let cashback = parseFloat(orderData.cashback);

                totalConsolidatedCashback += cashback;
                memoDetails += `#${soId} `;

                creditMemo.selectNewLine({ sublistId: 'item' });
                creditMemo.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: 'YOUR_CASHBACK_ITEM_ID' });
                creditMemo.setCurrentSublistValue({ sublistId: 'item', fieldId: 'amount', value: cashback });
                creditMemo.setCurrentSublistValue({ sublistId: 'item', fieldId: 'description', value: `5% Cashback for Sales Order #${soId}` });
                creditMemo.commitLine({ sublistId: 'item' });
            }

            creditMemo.setValue({
                fieldId: 'memo',
                value: `${memoDetails} | Total Cashback: INR ${totalConsolidatedCashback.toFixed(2)}`
            });

            let creditMemoId = creditMemo.save();

            log.audit({
                title: 'Consolidated Credit Memo Created',
                details: `CM ID: ${creditMemoId} for Customer: ${customerId} | Total Amount: ${totalConsolidatedCashback}`
            });

        } catch (e) {
            log.error({ title: 'Error in Reduce Stage', details: e });
        }
    };

    // STAGE 4: Summarize Stage
    const summarize = (summary) => {
        log.audit({
            title: 'Process Completed',
            details: 'All consolidated records processed successfully.'
        });
    };

    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    };
});