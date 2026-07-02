/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @ModuleScope SameAccount
 */

define(['N/search', 'N/log'], (search, log) => {

    const getInputData = (inputContext) => {
        var searchResult = search.create({
            type: 'customrecordcust_movie_record',
            columns: [
                'custrecordcust_movie_name',
                'custrecordcust_rating_by_users_no',
                'custrecordcust_movie_rating'
            ]
        });

        return searchResult;
    };

    const map = (mapContext) => {
        try {
            log.debug("mapContext Key", mapContext.key);
            log.debug("mapContext Data", mapContext.value);

            var mapContextData = JSON.parse(mapContext.value);

            var movieName = mapContextData.values.custrecordcust_movie_name;
            var ratedBy = mapContextData.values.custrecordcust_rating_by_users_no;
            var rating = mapContextData.values.custrecordcust_movie_rating;

            if (rating && typeof rating === 'object') {
                rating = rating.text || rating.value;
            }

            if (rating === null || rating === undefined || rating === '') {
                log.debug('Skipping record - no rating', 'Key: ' + mapContext.key);
                return;
            }

            rating = String(rating).trim();

            log.audit(
                `Movie data for key ${mapContext.key}`,
                `movieName: ${movieName} | ratedBy: ${ratedBy} | ratings: ${rating}.`
            );

            mapContext.write({

                key: rating,
                value: 1
            });

        } catch (e) {
            log.error('Map Error - Key: ' + mapContext.key, e.message);
        }
    };

    const reduce = (reduceContext) => {
        try {
            log.debug("reduceContext Key", reduceContext.key);
            log.debug("reduceContext Data", reduceContext.values);

            var rating = reduceContext.key;
            var count = 0;

            reduceContext.values.forEach(function (value) {
                count += parseInt(value, 10) || 0;
            });

            reduceContext.write({
                key: rating,
                value: count
            });

        } catch (e) {
            log.error('Reduce Error - Key: ' + reduceContext.key, e.message);
        }
    };

    const summarize = (summaryContext) => {
        var strContent = 'Rating, Count</br>';

        summaryContext.output.iterator().each(function (key, value) {
            strContent += 'Movie Rating: ' + key + ', Count: ' + value + ' </br>';
            return true;
        });

        log.debug('strContent', strContent);

        var errorMsgInputSummary = [];
        summaryContext.mapSummary.errors.iterator().each(function (key, value) {
            try {
                var msg = 'Failed for key: ' + key + '. Error was: ' + JSON.parse(value).message + '\n';
                errorMsgInputSummary.push(msg);
            } catch (e) {
                errorMsgInputSummary.push('Failed for key: ' + key + '. Raw error: ' + value);
            }
            return true;
        });
        if (errorMsgInputSummary.length) {
            log.error("Error in mapSummary", errorMsgInputSummary.join('\n'));
        }

        var errorMsgReduceSummary = [];
        summaryContext.reduceSummary.errors.iterator().each(function (key, value) {
            try {
                var msg = 'Failed for key: ' + key + '. Error was: ' + JSON.parse(value).message + '\n';
                errorMsgReduceSummary.push(msg);
            } catch (e) {
                errorMsgReduceSummary.push('Failed for key: ' + key + '. Raw error: ' + value);
            }
            return true;
        });
        if (errorMsgReduceSummary.length) {
            log.error("Error in reduceSummary", errorMsgReduceSummary.join('\n'));
        }

        // Overall summary bhi log karo — useful for quick debugging
        log.audit('Summary Stats',
            'Usage consumed: ' + summaryContext.usage +
            ' | Concurrency: ' + summaryContext.concurrency +
            ' | Yields: ' + summaryContext.yields
        );
    };

    return {
        getInputData,
        map,
        reduce,
        summarize
    };
});