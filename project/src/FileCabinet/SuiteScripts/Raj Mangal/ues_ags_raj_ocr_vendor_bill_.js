/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */

define([
    'N/url',
    'N/log',
    'N/ui/serverWidget'
], function(url, log, serverWidget) {

    function beforeLoad(context) {

        if (context.type !== context.UserEventType.VIEW) {
            return;
        }

        var currentRecord = context.newRecord;

        if (!currentRecord.id) {
            return;
        }

        var vendorBillId = currentRecord.getValue({
            fieldId: 'custrecord_ags_vb_vendor_bill'
        });

        if (vendorBillId) {
            return;
        }

        var suiteletUrl = url.resolveScript({
            scriptId: 'customscript4568',
            deploymentId: 'customdeploy1',
            returnExternalUrl: false,
            params: {
                custparam_invoice_id: String(currentRecord.id)
            }
        });

        log.debug('Generated Suitelet URL', suiteletUrl);

        context.form.clientScriptModulePath =
            '/SuiteScripts/Raj Mangal/AGS_vendor_bill_cs_v2.js';

        var warehouseField = context.form.addField({
            id: 'custpage_warehouse',
            type: serverWidget.FieldType.SELECT,
            label: 'Select Warehouse',
            source: 'location'
        });

        warehouseField.updateDisplayType({
            displayType: serverWidget.FieldDisplayType.NORMAL
        });

        var savedWarehouse = currentRecord.getValue({
            fieldId: 'custrecord_ags_vb_warehouse'
        });

        if (savedWarehouse) {
            warehouseField.defaultValue = String(savedWarehouse);
        }

        context.form.addButton({
            id: 'custpage_create_vb_test_btn',
            label: 'Create Vendor Bill',
            functionName: 'openVendorBillReview(' +
                JSON.stringify(suiteletUrl) + ')'
        });
    }

    return {
        beforeLoad: beforeLoad
    };
});