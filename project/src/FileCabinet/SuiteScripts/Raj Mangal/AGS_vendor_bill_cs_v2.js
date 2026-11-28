/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */

define(['N/currentRecord'], function(currentRecord) {

    function pageInit(context) {
    }

    function openVendorBillReview(suiteletUrl) {

        var rec = currentRecord.get();

        var warehouseId = rec.getValue({
            fieldId: 'custpage_warehouse'
        });

        if (!warehouseId) {
            alert('Please select Warehouse.');
            return;
        }

        suiteletUrl += '&custparam_warehouse_id=' +
            encodeURIComponent(warehouseId);

        window.location.href = suiteletUrl;
    }

    return {
        pageInit: pageInit,
        openVendorBillReview: openVendorBillReview
    };
});