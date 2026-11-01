/**
 * @NApiVersion 2.1
 * @NScriptType Portlet
 */

define([],()=>{
    function render(params){
        const portlet = params.portlet;

        portlet.title = 'Raj - Portlet Script';
        portlet.html = `
        <div style="padding: 12px; font-family: Arial;">
            <h2>Welcome to NetSuite!</h2>
            <p>This is Portlet Script.</p>
        </div>
        `;
    }

    return {render: render};
});