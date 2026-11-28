/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */

define([
    'N/record',
    'N/search',
    'N/ui/serverWidget',
    'N/redirect',
    'N/log',
    'N/format'
], function(record, search, serverWidget, redirect, log, format) {

    const PARENT_RECORD = 'customrecord_ags_ocr_vendor_bill';
    const CHILD_RECORD = 'customrecord_ags_ocr_vendor_bill_items';

    function onRequest(context) {

        try {

            if (context.request.method === 'GET') {
                showVendorBillForm(context);
            } else {
                createVendorBill(context);
            }

        } catch (e) {

            log.error('Vendor Bill Error', {
                message: e.message,
                stack: e.stack
            });

            context.response.write({
                output: 'Error: ' + e.message
            });
        }
    }

    function showVendorBillForm(context) {

        var invoiceId =
    context.request.parameters.custparam_invoice_id ||
    context.request.parameters.invoiceId;
        
    log.debug('Received Parameters', context.request.parameters);

        if (!invoiceId) {
            throw new Error('OCR Invoice ID is missing');
        }

        var invoice = record.load({
            type: PARENT_RECORD,
            id: invoiceId
        });

        var existingBill = invoice.getValue({
            fieldId: 'custrecord_ags_vb_vendor_bill'
        });

        if (existingBill) {

            redirect.toRecord({
                type: record.Type.VENDOR_BILL,
                id: existingBill
            });

            return;
        }

        var vendorName = invoice.getValue({
            fieldId: 'custrecord_ags_vb_vendor_name'
        });

        var vendorId = findVendorId(vendorName);
        
        var form = serverWidget.createForm({
            title: 'Review Vendor Bill'
        });
        var warehouseField = form.addField({
            id: 'custpage_warehouse',
            type: serverWidget.FieldType.SELECT,
            label: 'Warehouse',
            source: 'location'
        });

        warehouseField.isMandatory = true;

        var selectedWarehouse =
            context.request.parameters.custparam_warehouse_id ||
            invoice.getValue({
                fieldId: 'custrecord_ags_vb_warehouse'
            });
        
        if (selectedWarehouse) {
            warehouseField.defaultValue = String(selectedWarehouse);
        }


        var invoiceIdField = form.addField({
            id: 'custpage_invoice_id',
            type: serverWidget.FieldType.TEXT,
            label: 'OCR Invoice ID'
        });

        invoiceIdField.defaultValue = String(invoiceId);

        invoiceIdField.updateDisplayType({
            displayType: serverWidget.FieldDisplayType.HIDDEN
        });

        var vendorField = form.addField({
            id: 'custpage_vendor',
            type: serverWidget.FieldType.SELECT,
            label: 'Vendor',
            source: 'vendor'
        });

        vendorField.isMandatory = true;

        if (vendorId) {
            vendorField.defaultValue = String(vendorId);
        }

        var extractedVendor = form.addField({
            id: 'custpage_extracted_vendor',
            type: serverWidget.FieldType.TEXT,
            label: 'Extracted Vendor Name'
        });

        extractedVendor.defaultValue = vendorName || '';

        extractedVendor.updateDisplayType({
            displayType: serverWidget.FieldDisplayType.INLINE
        });

        var invoiceNumber = form.addField({
            id: 'custpage_invoice_number',
            type: serverWidget.FieldType.TEXT,
            label: 'Reference No.'
        });

        invoiceNumber.defaultValue = invoice.getValue({
            fieldId: 'custrecord_ags_vb_invoice_number'
        }) || '';

        invoiceNumber.isMandatory = true;

        addDateField(
            form,
            invoice,
            'custpage_invoice_date',
            'Invoice Date',
            'custrecord_ags_vb_invoice_date'
        );

        addDateField(
            form,
            invoice,
            'custpage_due_date',
            'Due Date',
            'custrecord_ags_vb_due_date'
        );

        addReadOnlyField(
            form,
            'custpage_subtotal',
            'Extracted Subtotal',
            invoice.getValue({
                fieldId: 'custrecord_ags_vb_subtotal'
            })
        );

        addReadOnlyField(
            form,
            'custpage_tax_amount',
            'Extracted Tax Amount',
            invoice.getValue({
                fieldId: 'custrecord_ags_vb_tax_amount'
            })
        );

        addReadOnlyField(
            form,
            'custpage_total_amount',
            'Extracted Total Amount',
            invoice.getValue({
                fieldId: 'custrecord_ags_vb_total_amount'
            })
        );

        var sublist = form.addSublist({
            id: 'custpage_items',
            type: serverWidget.SublistType.INLINEEDITOR,
            label: 'Invoice Items'
        });

        sublist.addField({
            id: 'custpage_item',
            type: serverWidget.FieldType.SELECT,
            label: 'Item',
            source: 'item'
        });

        sublist.addField({
            id: 'custpage_description',
            type: serverWidget.FieldType.TEXT,
            label: 'Extracted Item Description'
        });

        sublist.addField({
            id: 'custpage_quantity',
            type: serverWidget.FieldType.FLOAT,
            label: 'Quantity'
        });

        sublist.addField({
            id: 'custpage_rate',
            type: serverWidget.FieldType.FLOAT,
            label: 'Unit Price'
        });

        sublist.addField({
            id: 'custpage_amount',
            type: serverWidget.FieldType.CURRENCY,
            label: 'Extracted Amount'
        });

        var items = getInvoiceItems(invoiceId);

        items.forEach(function(item, index) {

            setSublistValue(
                sublist, 'custpage_item', index, item.itemId
            );

            setSublistValue(
                sublist, 'custpage_description', index,
                item.description
            );

            setSublistValue(
                sublist, 'custpage_quantity', index, item.quantity
            );

            setSublistValue(
                sublist, 'custpage_rate', index, item.rate
            );

            setSublistValue(
                sublist, 'custpage_amount', index, item.amount
            );
        });

        form.addSubmitButton({
            label: 'Create Vendor Bill'
        });

        context.response.writePage(form);
    }

    function createVendorBill(context) {

        var request = context.request;

        var invoiceId = request.parameters.custpage_invoice_id;
        var vendorId = request.parameters.custpage_vendor;
        var invoiceNumber = request.parameters.custpage_invoice_number;

        var warehouseId = request.parameters.custpage_warehouse;

        if (!warehouseId) {
            throw new Error('Please select Warehouse');
        }
        if (!invoiceId || !vendorId || !invoiceNumber) {
            throw new Error(
                'Invoice ID, Vendor and Reference No. are required'
            );
        }

        var invoice = record.load({
            type: PARENT_RECORD,
            id: invoiceId
        });

        var existingBill = invoice.getValue({
            fieldId: 'custrecord_ags_vb_vendor_bill'
        });

        if (existingBill) {

            redirect.toRecord({
                type: record.Type.VENDOR_BILL,
                id: existingBill
            });

            return;
        }

        var lineCount = request.getLineCount({
            group: 'custpage_items'
        });

        if (!lineCount) {
            throw new Error('No invoice items available');
        }

        var items = [];

        for (var i = 0; i < lineCount; i++) {

            var itemId = request.getSublistValue({
                group: 'custpage_items',
                name: 'custpage_item',
                line: i
            });

            var description = request.getSublistValue({
                group: 'custpage_items',
                name: 'custpage_description',
                line: i
            });

            var quantity = request.getSublistValue({
                group: 'custpage_items',
                name: 'custpage_quantity',
                line: i
            });

            var rate = request.getSublistValue({
                group: 'custpage_items',
                name: 'custpage_rate',
                line: i
            });

            if (!itemId) {
                throw new Error(
                    'Please select an item for line ' + (i + 1) +
                    ': ' + description
                );
            }

            if (!quantity || !Number.isFinite(Number(quantity)) ||
                Number(quantity) <= 0) {

                throw new Error(
                    'Invalid quantity at line ' + (i + 1)
                );
            }

            if (rate === '' || rate == null ||
                !Number.isFinite(Number(rate))) {

                throw new Error(
                    'Invalid rate at line ' + (i + 1)
                );
            }

            items.push({
                itemId: Number(itemId),
                description: description,
                quantity: Number(quantity),
                rate: Number(rate)
            });
        }

        var bill = record.create({
            type: record.Type.VENDOR_BILL,
            isDynamic: true
        });

        bill.setValue({
            fieldId: 'entity',
            value: Number(vendorId)
        });
        bill.setValue({
            fieldId: 'location',
            value: Number(warehouseId)
        });

        bill.setValue({
            fieldId: 'tranid',
            value: invoiceNumber
        });

        var invoiceDate = request.parameters.custpage_invoice_date;
        var dueDate = request.parameters.custpage_due_date;

        if (invoiceDate) {

            bill.setValue({
                fieldId: 'trandate',
                value: parseDate(invoiceDate)
            });
        }

        if (dueDate) {

            bill.setValue({
                fieldId: 'duedate',
                value: parseDate(dueDate)
            });
        }

        bill.setValue({
            fieldId: 'memo',
            value: 'Created from OCR Record: ' + invoiceId
        });

        items.forEach(function(item) {

            bill.selectNewLine({
                sublistId: 'item'
            });

            bill.setCurrentSublistValue({
                sublistId: 'item',
                fieldId: 'item',
                value: item.itemId
            });

            bill.setCurrentSublistValue({
                sublistId: 'item',
                fieldId: 'quantity',
                value: item.quantity
            });

            bill.setCurrentSublistValue({
                sublistId: 'item',
                fieldId: 'rate',
                value: item.rate
            });

            if (item.description) {

                bill.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'description',
                    value: item.description
                });
            }

            bill.commitLine({
                sublistId: 'item'
            });
        });

        var billId = bill.save({
            enableSourcing: true,
            ignoreMandatoryFields: false
        });

        log.audit('Vendor Bill Created', {
            invoiceId: invoiceId,
            vendorBillId: billId
        });

        try {

            record.submitFields({
                type: PARENT_RECORD,
                id: invoiceId,
                values: {
                    custrecord_ags_vb_vendor_bill: String(billId),
                    custrecord_ags_vb_warehouse: Number(warehouseId)
                }
            });

        } catch (e) {

            throw new Error(
                'Vendor Bill ' + billId +
                ' created successfully, but OCR record linking failed. ' +
                'Do not create the bill again. ' + e.message
            );
        }

        redirect.toRecord({
            type: record.Type.VENDOR_BILL,
            id: billId
        });
    }

    function findVendorId(vendorName) {

        if (!vendorName) {
            return null;
        }

        var results = search.create({
            type: search.Type.VENDOR,
            filters: [
                ['entityid', 'is', vendorName.trim()],
                'AND',
                ['isinactive', 'is', 'F']
            ],
            columns: ['internalid']
        }).run().getRange({
            start: 0,
            end: 2
        });

        if (results.length === 1) {
            return results[0].getValue('internalid');
        }

        return null;
    }

    function getInvoiceItems(invoiceId) {

        var items = [];

        var itemSearch = search.create({
            type: CHILD_RECORD,
            filters: [
                ['custrecord_ags_vbi_parent', 'anyof', invoiceId]
            ],
            columns: [
                search.createColumn({
                    name: 'internalid',
                    sort: search.Sort.ASC
                }),
                'custrecord_ags_vbi_item',
                'custrecord_ags_vbi_desc',
                'custrecord_ags_vbi_quantity',
                'custrecord_ags_vbi_rate',
                'custrecord_ags_vbi_amount'
            ]
        });

        var pagedData = itemSearch.runPaged({
            pageSize: 1000
        });

        pagedData.pageRanges.forEach(function(pageRange) {

            var page = pagedData.fetch({
                index: pageRange.index
            });

            page.data.forEach(function(result) {

                items.push({
                    itemId: result.getValue(
                        'custrecord_ags_vbi_item'
                    ),
                    description: result.getValue(
                        'custrecord_ags_vbi_desc'
                    ),
                    quantity: result.getValue(
                        'custrecord_ags_vbi_quantity'
                    ),
                    rate: result.getValue(
                        'custrecord_ags_vbi_rate'
                    ),
                    amount: result.getValue(
                        'custrecord_ags_vbi_amount'
                    )
                });
            });
        });

        return items;
    }

    function addDateField(form, invoice, id, label, sourceField) {

        var field = form.addField({
            id: id,
            type: serverWidget.FieldType.DATE,
            label: label
        });

        var value = invoice.getValue({
            fieldId: sourceField
        });

        if (value) {

            field.defaultValue = format.format({
                value: value,
                type: format.Type.DATE
            });
        }
    }

    function addReadOnlyField(form, id, label, value) {

        var field = form.addField({
            id: id,
            type: serverWidget.FieldType.TEXT,
            label: label
        });

        field.defaultValue = value == null ? '' : String(value);

        field.updateDisplayType({
            displayType: serverWidget.FieldDisplayType.INLINE
        });
    }

    function setSublistValue(sublist, id, line, value) {

        if (value !== null && value !== undefined && value !== '') {

            sublist.setSublistValue({
                id: id,
                line: line,
                value: String(value)
            });
        }
    }

    function parseDate(value) {

        var date = format.parse({
            value: value,
            type: format.Type.DATE
        });

        if (!(date instanceof Date) || isNaN(date.getTime())) {
            throw new Error('Invalid Date: ' + value);
        }

        return date;
    }

    return {
        onRequest: onRequest
    };
});