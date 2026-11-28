/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */

define([
    'N/file',
    'N/documentCapture',
    'N/llm',
    'N/log',
    'N/record',
    'N/search',
    'N/ui/serverWidget',
    'N/redirect',
    'N/runtime'
], function (
    file,
    documentCapture,
    llm,
    log,
    record,
    search,
    serverWidget,
    redirect,
    runtime
){

    function onRequest(context) {
        try {
            if (context.request.method === 'GET') {
                showUploadForm(context);
            } else {
                processUploadedFile(context);
            }
        } catch (e) {
            log.error('Processing Error', e.message + '\n' + e.stack);

            showUploadForm(context, 'Something went wrong!');
        }
    }

    function showUploadForm(context, errorMessage) {

        var form = serverWidget.createForm({
            title: 'Invoice Upload'
        });

        // Error using alerts
        if (errorMessage) {

            let errorField = form.addField({
                id: 'custpage_error_message',
                type: serverWidget.FieldType.INLINEHTML,
                label: ' '
            });

            errorField.defaultValue =
                '<script>alert(' +
                JSON.stringify(errorMessage) +
                ');</script>';
        }

        var fileField = form.addField({
            id: 'custpage_invoice_file',
            type: serverWidget.FieldType.FILE,
            label: 'Upload Invoice'
        });

        fileField.isMandatory = true;

        form.addSubmitButton({
            label: 'Process Invoice'
        });

        context.response.writePage(form);
    }

    function processUploadedFile(context) {

        var request = context.request;
        var fileObj = request.files.custpage_invoice_file;

        if (!fileObj) {
            throw new Error('No file uploaded');
        }

        fileObj.folder = 13734;

        var fileId = fileObj.save();

        log.audit('File Uploaded', {
            fileId: fileId,
            fileName: fileObj.name
        });

        log.audit(
            'File Uploaded',
            'File ID: ' + fileId + ', Name: ' + fileObj.name
        );

        var savedFile = file.load({
            id: fileId
        });

        var extractedText = documentCapture.documentToText({
            file: savedFile
        });

        log.audit(
            'File Processed',
            'File ID: ' + fileId +
            ', Text Length: ' + extractedText.length
        );

        var invoiceData = getInvoiceDataFromLLM(
            extractedText,
            fileId
        );

        log.audit(
            'Invoice Data Extracted',
            JSON.stringify(invoiceData)
        );

        var recordId = saveInvoiceRecord(
            invoiceData,
            fileId
        );

        log.audit(
            'Record Created',
            'ID: ' + recordId
        );

        redirect.toRecord({
            type: 'customrecord_ags_ocr_vendor_bill',
            id: recordId
        });
    }

     function getInvoiceDataFromLLM(extractedText, fileId) {

        var prompt =
            "Extract these invoice details in this exact format:\n\n" +
            "Invoice Number: [value]\n" +
            "Invoice Date: [DD-MMM-YY]\n" +
            "Due Date: [DD-MMM-YY]\n" +
            "Vendor Name: [value]\n" +
            "Vendor Address: [value]\n" +
            "Customer Name: [value]\n" +
            "Customer Address: [value]\n" +
            "Shipping Address: [value]\n" +
            "Subtotal: [number]\n" +
            "Tax Amount: [number]\n" +
            "Total Amount: [number]\n" +
            "Payment Terms: [value]\n\n" +
            "Items (list all items, one per line in this format):\n" +
            "ITEM_START\n" +
            "Item Description: [value]\n" +
            "Quantity: [number]\n" +
            "Unit Price: [number]\n" +
            "Item Total: [number]\n" +
            "ITEM_END\n\n" +
            "follow date format strictly\n\n" +
            "Use 'Not mentioned' if any field is missing. " +
            "List ALL items found in the invoice.";

        var response = llm.generateText({

            modelFamily: llm.ModelFamily.GPT_OSS,

            prompt: prompt +
                "\n\nInvoice Text:\n" +
                extractedText,

            timeout: 600000,

            modelParameters: {
                maxTokens: 8000,
                temperature: 0.1
            }
        });

        log.audit(
            'LLM Processing Completed',
            new Date().toISOString()
        );

        return parseResponse(response.text);
    }

     function parseResponse(text) {

        var items = parseItems(text);

        if (items.length === 0) {
            log.audit('No Items Found', 'Added demo item');
        }

        return {
            invoiceNumber: getValue(text, 'Invoice Number'),
            invoiceDate: getValue(text, 'Invoice Date'),
            dueDate: getValue(text, 'Due Date'),
            vendorName: getValue(text, 'Vendor Name'),
            vendorAddress: getValue(text, 'Vendor Address'),
            customerName: getValue(text, 'Customer Name'),
            customerAddress: getValue(text, 'Customer Address'),
            shippingAddress: getValue(text, 'Shipping Address'),
            items: items,
            subtotal: getNumber(text, 'Subtotal'),
            taxAmount: getNumber(text, 'Tax Amount'),
            totalAmount: getNumber(text, 'Total Amount'),
            paymentTerms: getValue(text, 'Payment Terms')
        };
    }

    function parseItems(text) {

        var items = [];

        var itemBlocks = text.split('ITEM_START');

        for (var i = 1; i < itemBlocks.length; i++) {

            if (!itemBlocks[i].includes('ITEM_END')) {

                throw new Error(
                    'Incomplete LLM response at item number: ' + i
                );
            }

            var block = itemBlocks[i].split('ITEM_END')[0];

            var description = getValue(
                block,
                'Item Description'
            );

            var quantity = getNumber(
                block,
                'Quantity'
            );

            var unitPrice = getNumber(
                block,
                'Unit Price'
            );

            var total = getNumber(
                block,
                'Item Total'
            );

            if (description) {

                items.push({
                    description: description,
                    quantity: quantity || 1,
                    unitPrice: unitPrice || 0,
                    total: total || 0
                });
            }
        }

        return items;
    }

    function getValue(text, label) {

        var regex = new RegExp(
            label + ':\\s*(.+?)(?:\\n|$)',
            'i'
        );

        var match = text.match(regex);

        if (match && match[1]) {

            var value = match[1].trim();

            return (
                value.toLowerCase() === 'not mentioned'
            ) ? '' : value;
        }

        return '';
    }

    function getNumber(text, label) {

        var value = getValue(text, label);

        if (!value) return 0;

        var numeric = value.replace(/[₹$,]/g, '').trim();

        var num = parseFloat(numeric);

        return isNaN(num) ? 0 : num;
    }


    function getAllItems() {

        let items = [];

        let itemSearch = search.create({

            type: search.Type.ITEM,

            columns: [

                search.createColumn({
                    name: 'internalid',
                    sort: search.Sort.DESC
                }),

                'itemid',
                'vendorname'
            ]
        });

        let pagedData = itemSearch.runPaged({
            pageSize: 1000
        });

        pagedData.pageRanges.forEach(function (pageRange) {

            var page = pagedData.fetch({
                index: pageRange.index
            });

            page.data.forEach(function (result) {

                var itemName = result.getValue('itemid') || '';

                items.push({

                    itemId: result.getValue('internalid'),

                    itemName: itemName,

                    normalizedName: itemName.trim().toLowerCase(),

                    vendorName: result.getValue('vendorname')
                });
            });
        });

        log.audit('item master loaded', {

            totalItems: items.length,

            remainingUsage: runtime.getCurrentScript()
                .getRemainingUsage()
        });

        return items;
    }


    function saveInvoiceRecord(data, fileId) {

        var startTime = Date.now();

        log.audit('Invoice Processing Started', {

            totalItems: data.items.length,

            remainingUsage: runtime.getCurrentScript()
                .getRemainingUsage()
        });

        var allItems = getAllItems();

        var invoice = record.create({

            type: 'customrecord_ags_ocr_vendor_bill',

            isDynamic: true
        });

        log.audit('Date Debug', {

            extractedInvoiceDate: data.invoiceDate,

            extractedDueDate: data.dueDate,

            parsedInvoiceDate: String(
                parseDate(data.invoiceDate)
            ),

            parsedDueDate: String(
                parseDate(data.dueDate)
            )
        });

        // ==============================
        // SAVE PARENT RECORD
        // ==============================

        invoice.setValue({
            fieldId: 'custrecord_ags_vb_invoice_number',
            value: data.invoiceNumber
        });

        invoice.setValue({
            fieldId: 'custrecord_ags_vb_invoice_date',
            value: parseDate(data.invoiceDate)
        });

        invoice.setValue({
            fieldId: 'custrecord_ags_vb_due_date',
            value: parseDate(data.dueDate)
        });

        invoice.setValue({
            fieldId: 'custrecord_ags_vb_vendor_name',
            value: data.vendorName
        });

        invoice.setValue({
            fieldId: 'custrecord_ags_vb_vendor_address',
            value: data.vendorAddress
        });

        invoice.setValue({
            fieldId: 'custrecord_ags_vb_customer_name',
            value: data.customerName
        });

        invoice.setValue({
            fieldId: 'custrecord_ags_vb_customer_address',
            value: data.customerAddress
        });

        invoice.setValue({
            fieldId: 'custrecord_ags_vb_shipping_address',
            value: data.shippingAddress
        });

        invoice.setValue({
            fieldId: 'custrecord_ags_vb_subtotal',
            value: String(data.subtotal)
        });

        invoice.setValue({
            fieldId: 'custrecord_ags_vb_tax_amount',
            value: String(data.taxAmount)
        });

        invoice.setValue({
            fieldId: 'custrecord_ags_vb_total_amount',
            value: String(data.totalAmount)
        });

        invoice.setValue({
            fieldId: 'custrecord_ags_vb_uploaded_file',
            value: fileId
        });

        var invoiceId = invoice.save();

        log.audit(
            'Invoice Created',
            'Invoice ID: ' + invoiceId
        );

        var matchedItems = 0;
        var unmatchedItems = 0;

        // ==============================
        // SAVE CHILD RECORDS
        // ==============================

        for (var i = 0; i < data.items.length; i++) {

            var itemData = data.items[i];

            var itemLookup = findItemAndVendorName(
                itemData.description,
                allItems
            );

            var item = record.create({

                type: 'customrecord_ags_ocr_vendor_bill_items',

                isDynamic: true
            });

            // Parent Record ID

            item.setValue({
                fieldId: 'custrecord_ags_vbi_parent',
                value: invoiceId
            });

            // Original extracted description

            item.setValue({
                fieldId: 'custrecord_ags_vbi_desc',
                value: itemData.description
            });

            // Matched Item

            if (itemLookup.itemId) {

                item.setValue({
                    fieldId: 'custrecord_ags_vbi_item',
                    value: itemLookup.itemId
                });

                matchedItems++;

            } else {

                unmatchedItems++;
            }

            // Quantity

            item.setValue({
                fieldId: 'custrecord_ags_vbi_quantity',
                value: String(itemData.quantity)
            });

            // Unit Price

            item.setValue({
                fieldId: 'custrecord_ags_vbi_rate',
                value: String(itemData.unitPrice)
            });

            // Total Price

            item.setValue({
                fieldId: 'custrecord_ags_vbi_amount',
                value: String(itemData.total)
            });

            // Remark

            item.setValue({

                fieldId: 'custrecord_ags_vbi_remark',

                value: itemLookup.itemId
                    ? itemLookup.matchStatus
                    : itemData.description
            });

            item.save();
        }

        log.audit('Invoice processing completed', {

            invoiceId: invoiceId,

            totalItems: data.items.length,

            matchedItems: matchedItems,

            unmatchedItems: unmatchedItems,

            executionTimeSeconds:
                (Date.now() - startTime) / 1000,

            remainingUsage: runtime.getCurrentScript()
                .getRemainingUsage()
        });

        return invoiceId;
    }

    function findItemAndVendorName(description, allItems) {

        if (!description || !description.trim()) {

            return {
                itemId: null,
                vendorName: null,
                matchStatus: 'Item not found'
            };
        }

        var searchValue = description.trim();

        // Exact match

        var exactMatch = allItems.find(function (item) {

            return item.normalizedName === searchValue;
        });

        if (exactMatch) {

            return {

                itemId: exactMatch.itemId,

                vendorName: exactMatch.vendorName,

                matchStatus: 'Item Matched'
            };
        }

        // Partial match

        var partialMatches = allItems.filter(function (item) {

            return item.normalizedName.includes(searchValue);
        });

        if (partialMatches.length === 0) {

            log.error('item not found', description);

            return {

                itemId: null,

                vendorName: null,

                matchStatus: 'Item not found'
            };
        }

        return {

            itemId: partialMatches[0].itemId,

            vendorName: partialMatches[0].vendorName,

            matchStatus: partialMatches.length === 1
                ? 'Item Matched'
                : 'Multiple Item Matched'
        };
    }

    function parseDate(dateStr) {
            if (!dateStr || !String(dateStr).trim()) return null;
            
            dateStr = String(dateStr).trim();

            if(dateStr.toLowerCase() === 'not mentioned'){
                return null;
            }
            
            try {
                var parts = dateStr.split('-');
                if (parts.length !== 3) return new Date(dateStr);
                
                var day = parseInt(parts[0], 10);
                var monthStr = parts[1].toLowerCase();
                var year = parseInt(parts[2], 10);
                
                if (year < 100) year += 2000;
                
                var months = {
                    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
                    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
                };
                
                var month = months[monthStr];
                return (month !== undefined) ? new Date(year, month, day) : new Date(dateStr);
            } catch (e) {
                log.error('Date Parse Error', dateStr);
                return null;
            }
        }

        return{
            onRequest:onRequest
        }
});