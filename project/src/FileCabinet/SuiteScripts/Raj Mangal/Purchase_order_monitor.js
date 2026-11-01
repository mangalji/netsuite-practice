/**
 * @NApiVersion 2.1
 * @NScriptType Portlet
 */

define(['N/search'],(search)=>{
    function render(params){
        const portlet = params.portlet;

        portlet.title = 'Purchase Order Monitor';

        // 1. Search Purchase Orders with required statuses
        const PO_search = search.create({
            type: search.Type.PURCHASE_ORDER,
            filters:[
                ['status','anyof',['PurchOrd:A','PurchOrd:B']]
            ],
            columns:[
                search.createColumn({name:'tranid'}),
                search.createColumn({name:'entity'}),
                search.createColumn({name:'trandate',sort:search.Sort.DESC}),
                search.createColumn({name:'amount'}),
                search.createColumn({name:'status'})
            ]
        });

        // 2. Get total matching record count
        const totalCount = PO_search.runPaged({
            pageSize:1000
        }).count;

        // 3. Retrieve the latest 50 matching POs
        const results = PO_search.run().getRange({
            start:0,
            end:50
        });

        // 4. Prepare summary counts
        let pendingApproval = 0;
        let pendingReceipt = 0;

        // 5. HTML escape helper
        function escapeHtml(value){
            return String(value==null?'':value)
                .replace(/&/g,'&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        }

        let rows = '';

        results.forEach((result) => {

            const PO_number = result.getValue({name:'tranid'}) || '';
            const vendor = result.getText({ name: 'entity' }) || '';
            const date = result.getValue({ name: 'trandate' }) || '';
            const amount = result.getValue({ name: 'amount' }) || '0';
            const status = result.getValue({ name: 'status' }) || '';
            const statusText = result.getText({ name: 'status' }) || '';

            // Count statuses in the displayed results
            if (status==='PurchOrd:A'){
                pendingApproval++;
            } else if(status==='PurchOrd:B') {
                pendingReceipt++;
            }

            const statusLabel = status === 'PurchOrd:A'
                ? 'Pending Approval'
                : status === 'PurchOrd:B'
                    ? 'Pending Receipt'
                    : status;

            rows += `
            <tr>
                <td>${escapeHtml(PO_number)}</td>
                <td>${escapeHtml(vendor)}</td>
                <td>${escapeHtml(date)}</td>
                <td>${escapeHtml(amount)}</td>
                <td>${escapeHtml(statusLabel)}</td>
            </tr>
            `; 
        });

        if (results.length ===0){
            rows = `
            <tr>
                <td colspan="5" style="text-align:center;padding:12px;">
                    No matching Purchase Orders found.
                </td>
            </tr>
            `;
        }

        // 6. Render dashboard content
        portlet.html = `
        <div style="font-family:Arial,sans-serif;padding:10px;">

                <h3>Purchase Order Summary</h3>

                <p>
                    <b>Pending Approval:</b> ${pendingApproval}
                    &nbsp; | &nbsp;
                    <b>Pending Receipt:</b> ${pendingReceipt}
                </p>

                <p>
                    <b>Total matching POs:</b> ${totalCount}
                </p>

                <div style="overflow-x:auto;">
                    <table style="
                        width:100%;
                        border-collapse:collapse;
                        font-size:12px;
                    ">
                        <thead>
                            <tr style="background:#e8edf4;">
                                <th style="padding:8px;border:1px solid #ccc;">PO Number</th>
                                <th style="padding:8px;border:1px solid #ccc;">Vendor</th>
                                <th style="padding:8px;border:1px solid #ccc;">Date</th>
                                <th style="padding:8px;border:1px solid #ccc;">Amount</th>
                                <th style="padding:8px;border:1px solid #ccc;">Status</th>
                            </tr>
                        </thead>

                        <tbody>
                            ${rows}
                        </tbody>
                    </table>
                </div>

                <p style="font-size:11px;color:#666;">
                    Showing up to 50 Purchase Orders.
                    Summary counts above reflect the displayed rows only.
                </p>

            </div>
        `;
    }

    return {
        render:render
    };
});