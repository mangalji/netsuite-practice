/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */

define(['N/ui/serverWidget', 'N/file', 'N/log'], (ui, file, log) => {

    const beforeLoad = (context) => {

        if (context.type !== context.UserEventType.VIEW) return;

        const form = context.form;
        const rec = context.newRecord;

        try {

            const fileId = rec.getValue({
                fieldId: 'custrecord_ags_vb_uploaded_file'
            });

            let fileUrl = '';

            if (fileId) {

                const f = file.load({
                    id: fileId
                });

                fileUrl = f.url;
            }

            const htmlField = form.addField({
                id: 'custpage_pdf_viewer',
                type: ui.FieldType.INLINEHTML,
                label: ' '
            });

            htmlField.defaultValue = `
                <style>

                    body {
                        margin: 0 !important;
                        overflow: hidden !important;
                    }

                    #div__body {
                        position: relative !important;
                        width: 100% !important;
                        max-width: 100% !important;
                        height: calc(100vh - 110px) !important;
                        overflow: hidden !important;
                    }

                    .split-layout-wrapper {
                        display: flex;
                        width: 100%;
                        height: 100%;
                        position: relative;
                    }

                    .form-content-wrapper {
                        width: 70%;
                        height: 100%;
                        overflow-y: auto;
                        overflow-x: hidden;
                        box-sizing: border-box;
                        background: #fff;
                        flex-shrink: 0;
                        order: 2;
                    }

                    .uir-page-wrapper {
                        width: 100% !important;
                        max-width: 100% !important;
                        margin: 0 !important;
                        padding: 15px !important;
                    }

                    .pdf-viewer-container {
                        flex: 1;
                        display: flex;
                        flex-direction: column;
                        background: #525659;
                        overflow: hidden;
                        min-width: 250px;
                        order: 1;
                    }

                    .pdf-viewer-header {
                        background: #1e1e1e;
                        color: #ffffff;
                        padding: 14px 20px;
                        font-size: 14px;
                        font-weight: 600;
                        border-bottom: 2px solid #3d3d3d;
                        display: flex;
                        align-items: center;
                        gap: 10px;
                        flex-shrink: 0;
                    }

                    .pdf-icon {
                        font-size: 18px;
                    }

                    .pdf-viewer-content {
                        flex: 1;
                        background: #525659;
                        overflow: auto;
                        position: relative;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        padding: 20px;
                    }

                    .pdf-viewer-content embed {
                        width: 100%;
                        height: 100%;
                        border: none;
                        display: block;
                        background: white;
                    }

                    .pdf-viewer-content object {
                        width: 100%;
                        height: 100%;
                        border: none;
                        display: block;
                    }

                    .no-file-message {
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        height: 100%;
                        color: #999;
                        font-size: 15px;
                        flex-direction: column;
                        gap: 15px;
                        background: #f8f8f8;
                    }

                    .no-file-icon {
                        font-size: 64px;
                        opacity: 0.2;
                    }

                </style>

                <script>

                    (function initSplitView() {

                        if (document.readyState === 'loading') {

                            document.addEventListener(
                                'DOMContentLoaded',
                                setupSplitView
                            );

                        } else {

                            setupSplitView();
                        }

                        function setupSplitView() {

                            const bodyDiv =
                                document.getElementById('div__body');

                            if (!bodyDiv) {

                                console.error('div__body not found');

                                return;
                            }

                            if (document.getElementById('pdfViewerContainer')) {
                                return;
                            }

                            const splitWrapper =
                                document.createElement('div');

                            splitWrapper.className =
                                'split-layout-wrapper';

                            const rightPanel =
                                document.createElement('div');

                            rightPanel.className =
                                'form-content-wrapper';

                            rightPanel.id =
                                'formContentWrapper';

                            while (bodyDiv.firstChild) {

                                rightPanel.appendChild(
                                    bodyDiv.firstChild
                                );
                            }

                            const pdfContainer =
                                document.createElement('div');

                            pdfContainer.className =
                                'pdf-viewer-container';

                            pdfContainer.id =
                                'pdfViewerContainer';

                            const pdfContent =
                                document.createElement('div');

                            pdfContent.className =
                                'pdf-viewer-content';

                            const pdfUrl = ${JSON.stringify(fileUrl).replace(/</g, '\\u003c')};

                            if (pdfUrl) {

                                const pdfEmbed =
                                    document.createElement('embed');

                                pdfEmbed.src =
                                    pdfUrl +
                                    '#toolbar=0&navpanes=0&scrollbar=1';

                                pdfEmbed.type = 'application/pdf';

                                pdfEmbed.style.cssText =
                                    'width:100%;height:100%;min-height:600px;';

                                pdfContent.appendChild(pdfEmbed);

                            } else {

                                pdfContent.innerHTML =
                                    '<div class="no-file-message">' +
                                    '<div class="no-file-icon">📄</div>' +
                                    '<div>No file uploaded</div>' +
                                    '</div>';
                            }

                            pdfContainer.appendChild(pdfContent);

                            splitWrapper.appendChild(pdfContainer);

                            splitWrapper.appendChild(rightPanel);

                            bodyDiv.appendChild(splitWrapper);
                        }

                    })();

                </script>
            `;

        } catch (e) {

            log.error(
                'Error rendering split layout',
                e.message
            );
        }
    };

    return {
        beforeLoad
    };

});