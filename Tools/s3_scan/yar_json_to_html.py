#!/usr/bin/env python3

import json


def clean(v):
    v = v.replace('&', '&amp;')
    v = v.replace('<', '&lt;')
    v = v.replace('>', '&gt;')
    return v


def process_findings(js):
    new_js = []
    if js is None:
        return new_js

    for finding in js:
        reason = finding['Reason']
        filepath = finding['Filepath']
        secret = finding['Secret']
        if 'Context' in finding:
            context = finding['Context']
            context = clean(context)
            context = context.replace("\r", "")
            context = context.replace("\n", "<br/>")
            context = context.replace("\\n", "<br/>")
            context = context.replace(
                secret, '<span style="background-color:#FFFF00;">'+secret+'</span>')
        else:
            context = ""

        if len(secret) > 200:
            secret = secret[0:200] + "...TRUCATED..."

        new_js.append({
            "file": filepath,
            "secret": clean(secret),
            "reason": reason,
            "context": context
        })

    return new_js


HTML_PREFIX = """
<!DOCTYPE html>
<head>
    <title>Yar secrets scan of %%bucketname%%</title>
    <link rel="stylesheet" href="https://cdn.datatables.net/1.10.19/css/jquery.dataTables.min.css" />
    <style>
        td.details-control {
            background: url('https://datatables.net/examples/resources/details_open.png') no-repeat left center;
            cursor: pointer;
        }
        tr.shown td.details-control {
            background: url('https://datatables.net/examples/resources/details_close.png') no-repeat left center;
        }
        td.secretwrap {
            max-width:500px;
            word-wrap:break-word;
        }
        td.filewrap {
            max-width:300px;
            word-wrap:break-word;
        }
        td.contextwrap {
            max-width:800px;
            word-wrap:break-word;
            font-family: "Lucida Console", Monaco, monospace;
        }
    </style>
</head>
<body style="font-family:sans-serif;">

<h2>Yar secrets scan of %%bucketname%%</h2>

<div style="font-size:70%;margin-top:20px;">
<table id="data" class="display compact hover" style="width:100%">
 <thead>
  <tr>
   <th></th>
   <th>File</th>
   <th>Secret</th>
   <th>Reason</th>
  </tr>
 </thead>
</table>
</div>

</body>

<script src="https://code.jquery.com/jquery-3.3.1.js"></script>
<script src="https://cdn.datatables.net/1.10.19/js/jquery.dataTables.min.js"></script>
<script>
var rows = """

HTML_SUFFIX = """;

function format(data) {
    return '<table cellpadding="10" cellspacing="0" border="0" style="padding-left:40px;">' +
        '<tr><td class="contextwrap">' + data.context + '</td></tr></table>';
}

$(document).ready(function(){
  var table = $('#data').DataTable({
    'data':rows,
    'columns':[
        {
            'data':null,
            'orderable':false,
            'defaultContent':'',
            'className':'details-control'
        },
        {'data':'file', 'className':'filewrap'},
        {'data':'secret', 'className':'secretwrap'},
        {'data':'reason'}
    ],
    'order':[[1,'asc']]
  });

  $('#data tbody').on('click', 'td.details-control', function(){
    var tr = $(this).closest('tr');
    var row = table.row(tr);
    if (row.child.isShown()) {
      row.child.hide();
      tr.removeClass('shown');
    } else {
      row.child(format(row.data())).show();
      tr.addClass('shown');
    }
  });
});
</script>
</html>
"""

if __name__ == "__main__":
    import sys

    bucket = sys.argv[1]

    total_js = []
    for json_file in sys.argv[2:]:
        with open(json_file, 'r') as f:
            js = json.load(f)
            new_js = process_findings(js)
            total_js.extend(new_js)

    print(HTML_PREFIX.replace("%%bucketname%%", bucket), end="")
    print(json.dumps(total_js), end="")
    print(HTML_SUFFIX)
