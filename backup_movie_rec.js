/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @ModuleScope SameAccount
 */

define(['N/search','N/log'],(search,log)=>{

    const getInputData = (inputContext)=>{
        var searchResult = search.create({
            type:'customrecordcust_movie_record',
            columns:['custrecordcust_movie_name','custrecordcust_rating_by_users_no','custrecordcust_movie_rating']
        });

        return searchResult;
    }

    const map = (mapContext) =>{

        log.debug("mapContext Key ", mapContext.key)
        log.debug("mapContext Data", mapContext.value)

        var mapContextData = JSON.parse(mapContext.value)

        var movieName = mapContextData["values"]["custrecordcust_movie_name"]
        var ratedBy = mapContextData["values"]["custrecordcust_rating_by_users_no"]
        var rating = mapContextData["values"]["custrecordcust_movie_rating"]

        log.audit(`Movie data for key ${mapContext.key}`, `movieName: ${movieName} | ratedBy: ${ratedBy} | ratings: ${rating}.`)

        mapContext.write({
            key: rating,
            value: 1
        });
    }

    const reduce = (reduceContext)=>{

        log.debug("reduceContext Key: ", reduceContext.key)
        log.debug("reduceContext Data: ", reduceContext.values)

        var rating = reduceContext.key;
        var count = 0;

        reduceContext.values.forEach(function(value){
            count += parseInt(value);
        });

        reduceContext.write({
            key:rating,
            value: count
        });
    }

    const summarize = (summaryContext)=>{

        var strContent = 'Rating, Count</br>';

        summaryContext.output.iterator().each(function(key,value){
            strContent += 'Movie Rating: ' + key + ', Count: ' + value + ' </br>';
            return true;
        });

        log.debug(' strContent', strContent);

        var errorMsgInputSummary = [];
        summaryContext.mapSummary.errors.iterator().each(function(key,value){
            var msg = 'Failed for key: ' + key + '. Error was: ' + JSON.parse(value).message + '\n';
            errorMsgInputSummary.push(msg);
            return true;    
        });
        log.error("Error in mapSummar", errorMsgInputSummary)

        var     errorMsgReduceSummary = [];
        summaryContext.reduceSummary.errors.iterator().each(function(key,value){
            
            var msg = 'Failed for key: ' + key + '.Error was: ' + JSON.parse(value).message + '\n';
            errorMsgReduceSummary.push(msg);
            return true;
        });
        log.error("Error in reduce Summary",errorMsgReduceSummary)
    }
    return {
        getInputData, map, reduce, summarize
    };
}); 
