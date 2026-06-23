/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 */

define([], () => {

    const pageInit = (context) => {
        alert('Client Script Working');
    };

    return {
        pageInit
    };

});
// /**
//  * @NAPI_VERSION 2.0
//  * @NScriptType ClientScript
//  */

// define([],function(){
//     function pageInit(context){
//         alert('your form is saved.')
//     }
//     return {
//         pageInit:pageInit
//     }
// })

