var fs = require('fs');
var html = fs.readFileSync('C:/Users/Bharath Raj/Desktop/coastguard/frontend/index.html', 'utf8');
var pages = ['command-center','live-monitoring','hotspot-intelligence','ai-vision','decision-engine','interventions','recovery-circularity','analytics','field-nodes','settings','demo-mode'];
pages.forEach(function(p) {
  var found = html.indexOf('id="page-' + p + '"') > 0;
  console.log(p + ':', found ? 'FOUND' : 'MISSING');
});
