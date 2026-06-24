/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */
define(['N/ui/serverWidget', 'N/record', 'N/log'], (serverWidget, record, log) => {

    const onRequest = (context) => {

        const soId = context.request.parameters.soId;
        if (!soId) {
            log.error('Missing soId', 'soId not found in URL params');
            return;
        }

        const soRecord = record.load({
            type: record.Type.SALES_ORDER,
            id:   soId
        });

        // Primary fields
        const tranid      = soRecord.getValue({ fieldId: 'tranid' });
        const customer    = soRecord.getText({ fieldId: 'entity' });
        const trandate    = soRecord.getValue({ fieldId: 'trandate' });
        const status      = soRecord.getValue({ fieldId: 'status' });
        const otherrefnum = soRecord.getValue({ fieldId: 'otherrefnum' });
        const memo        = soRecord.getValue({ fieldId: 'memo' });
        const total       = soRecord.getValue({ fieldId: 'total' });

        // Items sublist
        const lineCount = soRecord.getLineCount({ sublistId: 'item' });
        const items = [];

        for (let i = 0; i < lineCount; i++) {
            items.push({
                item:     soRecord.getSublistText({ sublistId: 'item', fieldId: 'item',     line: i }),
                quantity: soRecord.getSublistValue({ sublistId: 'item', fieldId: 'quantity', line: i }),
                rate:     soRecord.getSublistValue({ sublistId: 'item', fieldId: 'rate',     line: i }),
                amount:   soRecord.getSublistValue({ sublistId: 'item', fieldId: 'amount',   line: i })
            });
        }

        log.debug('Items fetched', JSON.stringify(items));

        // Form banana
        const form = serverWidget.createForm({
            title: `Sales Order : ${tranid}`
        });

        // Primary Info group
        form.addFieldGroup({
            id:    'custpage_primary_info',
            label: 'Primary Information'
        });

        const addField = (id, label, value) => {
            const field = form.addField({
                id:        id,
                label:     label,
                type:      serverWidget.FieldType.TEXT,
                container: 'custpage_primary_info'
            });
            field.defaultValue = value ? String(value) : '-';
            field.updateDisplayType({ displayType: serverWidget.FieldDisplayType.INLINE });
        };

        addField('custpage_tranid',      'Document Number', tranid);
        addField('custpage_entity',      'Customer',        customer);
        addField('custpage_trandate',    'Date',            trandate);
        addField('custpage_status',      'Status',          status);
        addField('custpage_otherrefnum', 'PO Number',       otherrefnum);
        addField('custpage_memo',        'Memo',            memo);
        addField('custpage_total',       'Amount (Total)',  total);

        // Sublist — LIST use karo
        const sublist = form.addSublist({
            id:    'custpage_items',
            label: 'Items',
            type:  serverWidget.SublistType.LIST
        });

        sublist.addColumn({ id: 'custpage_item',     label: 'Item',     type: serverWidget.FieldType.TEXT });
        sublist.addColumn({ id: 'custpage_quantity', label: 'Quantity', type: serverWidget.FieldType.TEXT });
        sublist.addColumn({ id: 'custpage_rate',     label: 'Rate',     type: serverWidget.FieldType.TEXT });
        sublist.addColumn({ id: 'custpage_amount',   label: 'Amount',   type: serverWidget.FieldType.TEXT });

        items.forEach((item, index) => {
            sublist.setSublistValue({ id: 'custpage_item',     line: index, value: item.item     || '-' });
            sublist.setSublistValue({ id: 'custpage_quantity', line: index, value: String(item.quantity) });
            sublist.setSublistValue({ id: 'custpage_rate',     line: index, value: String(item.rate)     });
            sublist.setSublistValue({ id: 'custpage_amount',   line: index, value: String(item.amount)   });
        });

        context.response.writePage({ pageObject: form });
    };

    return { onRequest };
});