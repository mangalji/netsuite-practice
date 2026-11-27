/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */

define(['N/log','N/search','N/record'],function(log,search,record){
    function onRequest(context){
        var vendorId = 14338;
        var vendorName = 'ALPHAGREP PTE. LTD.';
        var output = {};// TEST 1: Load actual vendor record
            try {

                var vendor = record.load({
                    type: record.Type.VENDOR,
                    id: vendorId
                });

                output.vendorRecord = {
                    internalId: vendorId,
                    entityId: vendor.getValue({
                        fieldId: 'entityid'
                    }),
                    companyName: vendor.getValue({
                        fieldId: 'companyname'
                    }),
                    altName: vendor.getValue({
                        fieldId: 'altname'
                    }),
                    isInactive: vendor.getValue({
                        fieldId: 'isinactive'
                    })
                };

            } catch (e) {
                output.vendorRecordError = e.message;
            }

            // TEST 2: Search by internal ID
            output.internalIdSearch = testSearch(
                'internalid',
                search.Operator.ANYOF,
                vendorId
            );

            // TEST 3: Exact entityid search
            output.entityIdExactSearch = testSearch(
                'entityid',
                search.Operator.IS,
                vendorName
            );

            // TEST 4: Partial entityid search
            output.entityIdPartialSearch = testSearch(
                'entityid',
                search.Operator.CONTAINS,
                'ALPHAGREP'
            );

            // TEST 5: Exact altname search
            output.altNameExactSearch = testSearch(
                'altname',
                search.Operator.IS,
                vendorName
            );

            // TEST 6: Partial altname search
            output.altNamePartialSearch = testSearch(
                'altname',
                search.Operator.CONTAINS,
                'ALPHAGREP'
            );

            // TEST 7: Company name search
            output.companyNameSearch = testSearch(
                'companyname',
                search.Operator.IS,
                vendorName
            );

            log.audit('Vendor Debug Results', output);

            context.response.setHeader({
                name: 'Content-Type',
                value: 'application/json'
            });

            context.response.write(
                JSON.stringify(output, null, 4)
            );
        }

        function testSearch(field, operator, value) {

            try {

                var results = search.create({
                    type: search.Type.VENDOR,
                    filters: [
                        [field, operator, value]
                    ],
                    columns: [
                        'internalid',
                        'entityid'
                    ]
                }).run().getRange({
                    start: 0,
                    end: 10
                });

                return {
                    field: field,
                    operator: operator,
                    searchValue: value,
                    returnedCount: results.length,

                    results: results.map(function(result) {
                        return {
                            internalId: result.getValue('internalid'),
                            entityId: result.getValue('entityid')
                        };
                    })
                };

            } catch (e) {

                return {
                    field: field,
                    operator: operator,
                    searchValue: value,
                    error: e.message
                };
            }
        }

        return {
            onRequest: onRequest
        };
    });
