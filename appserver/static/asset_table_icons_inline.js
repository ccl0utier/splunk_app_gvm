requirejs([
    'underscore',
    'splunkjs/mvc',
    'splunkjs/mvc/tableview',
    'splunkjs/mvc/simplexml/ready!'
], function(_, mvc, TableView) {
    var CustomIconRenderer = TableView.BaseCellRenderer.extend({
        canRender: function(cell) {
            return cell.field === 'Operating System';
        },
        render: function($td, cell) {
            var os = cell.value;
            // Compute the icon based on the field value
            var icon;
            if (os === 'Android') {
                icon = 'android-os';
            } else if (os === 'Apple') {
                icon = 'apple';
            } else if (os === 'CentOS') {
                icon = 'centos';
            } else if (os === 'Debian') {
                icon = 'debian';
            } else if (os === 'FreeBSD') {
                icon = 'freebsd';
            } else if (os === 'Linux') {
                icon = 'linux';
            } else if (os === 'RedHat') {
                icon = 'red-hat';
            } else if (os === 'Ubuntu') {
                icon = 'ubuntu';
            } else if (os === 'Unix') {
                icon = 'unix'; 
            } else if (os === 'WMware') {
                icon = 'vmware'; 
            } else if (os === 'Windows') {
                icon = 'windows';  
            } else {
                icon = 'unknown';
            }
            // Create the icon element and add it to the table cell
            $td.addClass('icon-inline').html(_.template('<img class="icon-image" src="/static/app/splunk_app_gvm/images/<%-icon%>.png"/> <%- text %>', {
                icon: icon,
                text: cell.value
            }));
        }
    });
    mvc.Components.get('tableAssets').getVisualization(function(tableView) {
        // Register custom cell renderer, the table will re-render automatically
        tableView.addCellRenderer(new CustomIconRenderer());
    });
});
