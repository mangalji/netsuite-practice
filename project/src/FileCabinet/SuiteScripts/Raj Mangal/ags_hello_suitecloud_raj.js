/** 
* @NApiVersion 2.1
* @NScriptType ScheduledScript
*/

define([], () => {
    const execute = (context) => {
        log.audit({
            title: 'SuiteCloud Connection Test',
            details: 'Hello Raj! Script file uploaded from VS Code.'
        });
    };

    return { execute };
});
