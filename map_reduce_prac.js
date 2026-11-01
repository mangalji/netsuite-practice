/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */

define(['N/file', 'N/log'], function(file, log){
    // Change this if the execution role cannot write to this File Cabinet folder.
    const OUTPUT_FOLDER_ID = -15;
    const PUNCTUATION_REGXP = /[\u2000-\u206F\u2E00-\u2E7F\\'!"#\$%&\(\)\*\+,\-\.\/:;<=>\?@\[\]\^_`\{\|\}~]/;

    function getInputData(){
        log.audit({
            title: 'getInputData started',
            details: 'map_reduce_prac diagnostics v1: hello/world input'
        });
        return ['hello', 'world'];
    }

    function map(context){
        for (var i=0; context.value && i < context.value.length; i++){
            if (context.value[i] !== ' ' && !PUNCTUATION_REGXP.test(context.value[i])){
                context.write({
                    key:context.value[i],
                    value: 1
                });
            }
        }
    }

    function reduce(context){
        context.write({
            key:context.key,
            value:context.values.length
        });
    }

    function summarize(context){
        try {
        var stageErrors = 0;
        if (context.inputSummary.error) {
            stageErrors++;
            log.error({ title: 'getInputData failed', details: context.inputSummary.error });
        }
        context.mapSummary.errors.iterator().each(function(key, error, executionNo){
            stageErrors++;
            log.error({
                title: 'map failed',
                details: { key: key, executionNo: executionNo, error: error }
            });
            return true;
        });
        context.reduceSummary.errors.iterator().each(function(key, error, executionNo){
            stageErrors++;
            log.error({
                title: 'reduce failed',
                details: { key: key, executionNo: executionNo, error: error }
            });
            return true;
        });
        // Avoid publishing incomplete counts when a processing stage failed.
        if (stageErrors > 0) {
            throw new Error('Stage errors recorded: ' + stageErrors + '. See Execution Log. Output file was not saved.');
        }
        log.audit({
            title: 'usage units consumed',
            details:context.usage
        });
        log.audit({
            title: "concurrency",
            details:context.concurrency
        });
        log.audit({
            title: "number of yields",
            details: context.yields
        });

        var text = '';
        var totalKeysSaved = 0;
        context.output.iterator().each(function(key,value){
            text += (key + ' ' + value + '\n');
            totalKeysSaved++;
            return true;
        });
        log.audit({
            title:'Unique number of letters used in string.',
            details:totalKeysSaved
        });

        var fileObj = file.create({
            name:'letter_count_result.txt',
            fileType: file.Type.PLAINTEXT,
            contents:text
        });
        log.audit({
            title: 'Saving output file',
            details: { folderId: OUTPUT_FOLDER_ID, uniqueLetters: totalKeysSaved }
        });
        fileObj.folder = OUTPUT_FOLDER_ID;
        var fileId = fileObj.save();

        log.audit({
            title:'Id of new file record.',
            details:fileId
        });
        } catch (error) {
            log.error({
                title: 'summarize failed',
                details: {
                    name: error.name,
                    message: error.message,
                    stack: error.stack,
                    folderId: OUTPUT_FOLDER_ID
                }
            });
            throw error;
        }
    }

    return {
        getInputData:getInputData,
        map:map,
        reduce:reduce,
        summarize:summarize
    };
});
