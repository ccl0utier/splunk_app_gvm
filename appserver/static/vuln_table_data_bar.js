require([
    'underscore',
    'splunkjs/mvc',
    'views/shared/results_table/renderers/BaseCellRenderer',
    'splunkjs/mvc/searchmanager',
    'splunkjs/mvc/tableview',
    '/static/app/splunk_app_gvm/marked.min.js',
    'splunkjs/mvc/simplexml/ready!'
], function(_, mvc, BaseCellRenderer, SearchManager, TableView, Marked) {

    // Setup MarkedJS to support Github Flavored Markdown and tables.
    Marked.marked.setOptions({
      renderer: new Marked.marked.Renderer(),
      gfm: true,
      tables: true
    });

    // Handle table row expansion.
    var EventSearchBasedRowExpansionRenderer = TableView.BaseRowExpansionRenderer.extend({
        initialize: function() {
            // initialize will run once, so we will set up a search to be reused.
            this._searchManager = new SearchManager({
                id: 'details-search-manager',
                preview: false
            });
        },
        canRender: function(rowData) {
            return true;
        },
        render: function($container, rowData) {
            // rowData contains information about the row that is expanded.  We can see the cells, fields, and values.
            // Find the id cell to use its value in the details search.
            var idCell = _(rowData.cells).find(function (cell) {
                return cell.field === 'id';
            });

            // Add initial message.
            $container.append("<span>Fetching vulnerability details...</span>");

            //console.log("Result ID:", idCell.value);

            // Create the SPL search based on the result ID being expanded.  
            // The search returns Markdown formatted information.
            var spl = '`gvm_index` result{@id}=TERM("' + idCell.value + '") | rename result.* as * | fillnull value="N/A" vuldetect summary impact insight affected solution_type solution | eval method = vuldetect + "\n\n**Details:** " + signature + " - OID: " + signature_id | eval insight = replace(insight, "\\s+\\-", "\n\n-") | mvexpand cve | eval cve = "[" + cve + "](https://nvd.nist.gov/vuln/detail/" + cve + ")" | mvcombine cve | rex field=xref max_match=0 "^(?<xref>.+)\n+"| eval xref_table = "| Type | Reference |,|---|---|," + if(mvcount(cve) > 0, "| CVE | ", "") + mvjoin(cve, " |,| CVE | ") + if(mvcount(cve) > 0, " |", "") + if(mvcount(xref) > 0, ",| Others | ", "") + mvjoin(xref, " |,| Others | ") + if(mvcount(xref) > 0, " |", "") | rex mode=sed field=xref_table "s/,/\n/g" | fillnull value="N/A" xref_table | eval details = "### Summary\n\n" + summary + "\n\n### Detection Result\n\n```" + description + "```\n\n**Category**: " + category + "\n\n**Location:** \`" + dest + " -> " + location + "\`\n\n### Insight\n\n" + insight + "\n\n### Detection Method\n\n" + method + "\n\n### Affected Software/OS\n\n" + affected + "\n\n### Impact\n\n" + impact + "\n\n### Solution\n\n**Solution Type:** " + solution_type + "\n\n" + solution + "\n\n### References\n\n" + xref_table | table details';

            //console.log("SPL Query:", spl);

            // Setup the Search Manager.
            this._searchManager.set({ search: spl });

            // $container is the jquery object where we can put out content.
            // In this case we will add the result of the "details" result field to the $container as rendered Markdown.
            this._searchManager.on('search:done', function(properties) {
                var searchName = properties.content.request.label;
                if (properties.content.resultCount == 0) {
                     //console.log(searchName, "returned no results.", properties);
                     $container.html("<span style='padding-top: 10px; color: #effbff'>No results found.</span>");
                } else {
                    var results = splunkjs.mvc.Components.getInstance(searchName).data('results', { output_mode: 'json', count: 0 });
                    results.on("data", function(properties) {
                        var searchName = properties.attributes.manager.id;
                        var data = properties.data().results;

                        //console.log(searchName, "returned the following results:", properties, data);
                        //console.log("Markdown:", data[0].details);
                        
                        var rendered = Marked.marked.parse(data[0].details);
                        $container.html(rendered);
                    });
                }
            });
        }
    });

    // Add colored bar to the Severity field in the table.
    var DataBarCellRenderer = BaseCellRenderer.extend({
        canRender: function(cell) {
            return (cell.field === 'Severity');
        },
        render: function($td, cell) {
            let color = '';
        if (cell.value.endsWith('(High)')) {
               color = '#db1700';
            } else if (cell.value.endsWith('(Medium)')) {
               color = '#f99515';
            } else if (cell.value.endsWith('(Low)')) {
               color = '#facc24';
            } else {
               color = '#409e24';
            }
            $td.addClass('data-bar-cell').html(_.template('<div class="data-bar-wrapper"><div class="data-bar" style="width:<%- percent %>%;background-color: ' + color + '">' + cell.value + '</div></div>', {
                percent: Math.min(Math.max(parseFloat(cell.value) * 10, 0), 100)
            }));
        }
    });

    // Register customer classes against our TableView.
    mvc.Components.get('tableVulnerabilities').getVisualization(function(tableView) {
        tableView.addCellRenderer(new DataBarCellRenderer());
        tableView.addRowExpansionRenderer(new EventSearchBasedRowExpansionRenderer());
    });
});
