/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */
define(['N/record','N/search','N/redirect','N/log','N/url'], function(record, search, redirect, log, url) {

    function onRequest(context) {
        try {
            var invoiceId = context.request.parameters.invoice_id;

            if (!invoiceId) {
                context.response.write('ERROR: No invoice ID provided.');
                return;
            }

            log.audit('Create PO', 'Starting for invoice record ID: ' + invoiceId);
            var invoiceRec = record.load({
                type: 'customrecord1526',
                id:   invoiceId
            });

            var vendorId        = invoiceRec.getValue('custrecordcustrecord_vendor_name') || null;
            var invoiceNumber   = invoiceRec.getValue('custrecord_invoice_number')        || '';
            var invoiceDate     = invoiceRec.getValue('custrecord_invoice_date');
            var dueDate         = invoiceRec.getValue('custrecordcustrecord_due_date');
            var memo            = 'PO created from Invoice #' + invoiceNumber;

            log.audit('Invoice Data', JSON.stringify({
                vendorId:      vendorId,
                invoiceNumber: invoiceNumber,
                invoiceDate:   invoiceDate,
                dueDate:       dueDate
            }));

            if (!vendorId) {
                context.response.write('ERROR: No vendor ID found on invoice record.');
                return;
            }

            var items = getInvoiceItems(invoiceId);
            log.audit('Items Found', items.length + ' line item(s)');

            var po = record.create({
                type:      record.Type.PURCHASE_ORDER,
                isDynamic: true
            });

            po.setValue({ fieldId: 'entity',     value: vendorId });
            po.setValue({ fieldId: 'memo',        value: memo });
            po.setValue({ fieldId: 'otherrefnum', value: invoiceNumber });

            if (dueDate) {
                po.setValue({ fieldId: 'duedate', value: dueDate });
            }

            if (items.length === 0) {
                log.audit('No Items', 'No line items found for invoice ' + invoiceNumber);
            } else {
                for (var i = 0; i < items.length; i++) {
                    var itm = items[i];

                    if (!itm.itemId) {
                        log.audit('Skipped Line', 'No item ID for: ' + itm.description);
                        continue;
                    }

                    po.selectNewLine({ sublistId: 'item' });
                    po.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item',        value: itm.itemId });
                    po.setCurrentSublistValue({ sublistId: 'item', fieldId: 'description', value: itm.description });
                    po.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity',    value: itm.quantity  || 1 });
                    po.setCurrentSublistValue({ sublistId: 'item', fieldId: 'rate',        value: itm.unitPrice || 0 });
                    po.commitLine({ sublistId: 'item' });

                    log.audit('PO Line Added', JSON.stringify(itm));
                }
            }

            var poId = po.save({ ignoreMandatoryFields: true });
            log.audit('PO Created', 'Purchase Order ID: ' + poId);

            record.submitFields({
                type: 'customrecord1526',
                id:   invoiceId,
                values: { custrecord_linked_po_id: poId },
                options: { ignoreMandatoryFields: true }
            });

            redirect.toRecord({
                type: record.Type.PURCHASE_ORDER,
                id:   poId
            });

        } catch (e) {
            log.error('Create PO Error', e.message + '\n' + e.stack);
            context.response.write('ERROR: ' + e.message + '\n\n' + e.stack);
        }
    }

    function getInvoiceItems(invoiceId) {
        var items = [];

        var itemSearch = search.create({
            type: 'customrecord1527',
            filters: [
                search.createFilter({
                    name:     'custrecord157',
                    operator: search.Operator.ANYOF,
                    values:   invoiceId
                })
            ],
            columns: [
                search.createColumn({ name: 'custrecord156' }),  
                search.createColumn({ name: 'custrecord158' }),  
                search.createColumn({ name: 'custrecord159' }),  
                search.createColumn({ name: 'custrecord160' })  
            ]
        });

        itemSearch.run().each(function(result) {
            items.push({
                itemId:      result.getValue('custrecord156') || null,
                description: result.getText('custrecord156')  || '',
                quantity:    parseFloat(result.getValue('custrecord158')) || 1,
                unitPrice:   parseFloat(result.getValue('custrecord159')) || 0,
                total:       parseFloat(result.getValue('custrecord160')) || 0
            });
            return true;
        });

        return items;
    }

    return { onRequest: onRequest };
});