/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */
define(['N/file', 'N/documentCapture', 'N/llm', 'N/log', 'N/record', 'N/search', 'N/ui/serverWidget', 'N/redirect', 'N/url'],
    function(file, documentCapture, llm, log, record, search, serverWidget, redirect, url) {
        
        function onRequest(context) {
            try {
                if (context.request.method === 'GET') {
                    showUploadForm(context);
                } else {
                    processUploadedFile(context);
                }
            } catch (e) {
                log.error('Processing Error', e.message + '\n' + e.stack);
                context.response.write('ERROR: ' + e.message + '\n\n' + e.stack);
            }
        }
        
        function showUploadForm(context) {
            var form = serverWidget.createForm({
                title: 'Invoice Upload'
            });

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
            
            log.audit('File Uploaded', 'File ID: ' + fileId + ', Name: ' + fileObj.name);
            
            var savedFile = file.load({ id: fileId });
            var extractedText = documentCapture.documentToText({ file: savedFile });
            log.audit('File Processed', 'File ID: ' + fileId + ', Text Length: ' + extractedText.length);
            
            var invoiceData = getInvoiceDataFromLLM(extractedText, fileId);
            log.audit('Invoice Data Extracted', JSON.stringify(invoiceData));
            
            var recordId = saveInvoiceRecord(invoiceData, fileId);
            log.audit('Record Created', 'ID: ' + recordId);
           
            redirect.toRecord({
                type: 'customrecord1526',
                id: recordId
            });
        }
        
        function getInvoiceDataFromLLM(extractedText, fileId) {
            var prompt = "Extract these invoice details in this exact format:\n\n" +
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
                "Use 'Not mentioned' if any field is missing. List ALL items found in the invoice.";

            var response = llm.generateText({
                prompt: prompt,
                documents: [{ id: fileId.toString(), data: extractedText }]
            });
            
            return parseResponse(response.text);
        }
        
        function parseResponse(text) {
            var items = parseItems(text);
            
            if (items.length === 0) {
                items.push({
                    description: 'Demo Item - Sample Product',
                    quantity: 1,
                    unitPrice: 100.00,
                    total: 100.00
                });
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
                var block = itemBlocks[i].split('ITEM_END')[0];
                
                var description = getValue(block, 'Item Description');
                var quantity = getNumber(block, 'Quantity');
                var unitPrice = getNumber(block, 'Unit Price');
                var total = getNumber(block, 'Item Total');
                
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
            var regex = new RegExp(label + ':\\s*(.+?)(?:\\n|$)', 'i');
            var match = text.match(regex);
            if (match && match[1]) {
                var value = match[1].trim();
                return (value.toLowerCase() === 'not mentioned') ? '' : value;
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

        function findVendorId(vendorName) {
            if (!vendorName) return null;
            var result = search.create({
                type: search.Type.VENDOR,
                filters: [['entityid', search.Operator.CONTAINS, vendorName]],
                columns: ['internalid']
            }).run().getRange({ start: 0, end: 1 });
            return (result.length > 0) ? result[0].getValue('internalid') : null;
        }

        function findItemAndVendorName(description) {
            if (!description) return { itemId: null, vendorName: null };

            var result = search.create({
                type: search.Type.ITEM,
                filters: [['itemid', search.Operator.CONTAINS, description]],
                columns: ['internalid', 'vendorname']
            }).run().getRange({ start: 0, end: 1 });

            if (result.length > 0) {
                return {
                    itemId: result[0].getValue('internalid'),
                    vendorName: result[0].getValue('vendorname')
                };
            }
            return { itemId: null, vendorName: null };
        }
        
        function saveInvoiceRecord(data, fileId) {
            var invoice = record.create({
                type: 'customrecord1526',
                isDynamic: true
            });
            
            var vendorId = findVendorId(data.vendorName);

            invoice.setValue({ fieldId: 'custrecord_invoice_number', value: data.invoiceNumber });
            invoice.setValue({ fieldId: 'custrecord_invoice_date', value: parseDate(data.invoiceDate) });
            invoice.setValue({ fieldId: 'custrecordcustrecord_due_date', value: parseDate(data.dueDate) });
            invoice.setValue({ fieldId: 'custrecordcustrecord_vendor_address', value: data.vendorAddress });
            invoice.setValue({ fieldId: 'custrecordcustrecord_customer_name', value: data.customerName });
            invoice.setValue({ fieldId: 'custrecordcustrecord_customer_address', value: data.customerAddress });
            invoice.setValue({ fieldId: 'custrecordcustrecord_shipping_address', value: data.shippingAddress });
            invoice.setValue({ fieldId: 'custrecordcustrecord_subtotal', value: data.subtotal });
            invoice.setValue({ fieldId: 'custrecordcustrecord_tax_amount', value: data.taxAmount });
            invoice.setValue({ fieldId: 'custrecordcustrecord_total_amount', value: data.totalAmount });
            invoice.setValue({ fieldId: 'custrecord161', value: fileId });
            
            var invoiceId = invoice.save();
            log.audit('Invoice Created', 'Invoice ID: ' + invoiceId);
            
            var itemCount = 0;
            for (var i = 0; i < data.items.length; i++) {
                try {
                    var itemData = data.items[i];
                    var itemLookup = findItemAndVendorName(itemData.description);
                    var itemVendorId = findVendorId(itemLookup.vendorName);

                    log.audit('Item Lookup', 'Item: ' + itemData.description +
                        ' | Item ID: ' + itemLookup.itemId +
                        ' | Vendor Name from Item: ' + itemLookup.vendorName +
                        ' | Vendor ID: ' + itemVendorId);

                    if (itemVendorId) {
                        record.submitFields({
                            type: 'customrecord1526',
                            id: invoiceId,
                            values: { custrecordcustrecord_vendor_name: itemVendorId }
                        });
                    }
                    
                    var item = record.create({
                        type: 'customrecord1527',
                        isDynamic: true
                    });
                    
                    item.setValue({ fieldId: 'custrecord157', value: invoiceId });
                    item.setValue({ fieldId: 'custrecord156', value: itemLookup.itemId || itemData.description });
                    item.setValue({ fieldId: 'custrecord158', value: itemData.quantity });
                    item.setValue({ fieldId: 'custrecord159', value: itemData.unitPrice });
                    item.setValue({ fieldId: 'custrecord160', value: itemData.total });
                    
                    var itemId = item.save();
                    itemCount++;
                    log.audit('Item Created', 'Item ID: ' + itemId + ' (' + (i+1) + ' of ' + data.items.length + ')');
                } catch (e) {
                    log.error('Item Creation Failed', 'Item ' + (i+1) + ': ' + e.message);
                }
            }
            
            log.audit('Items Summary', itemCount + ' of ' + data.items.length + ' items created successfully');
            return invoiceId;
        }
        
        function parseDate(dateStr) {
            if (!dateStr) return null;
            
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
        
        return { onRequest: onRequest };
    });