const fs = require('fs');
const { JSDOM } = require('jsdom');

// Load the HTML file
const html = fs.readFileSync('./page.html', 'utf-8');
const dom = new JSDOM(html);
const document = dom.window.document;
console.log(document.querySelector("table"))

const table = document.querySelector('#table_epreuve_1');
console.log(table)
const extractedData = {};

if (table) {
  const thead = table.querySelector('thead');
  const tbody = table.querySelector('tbody');

  // Extract headers
  if (thead) {
    const headerCells = thead.querySelectorAll('th');
    extractedData.headers = Array.from(headerCells).map(cell => cell.textContent.trim());
  }

  // Extract all rows from tbody
  if (tbody) {
    const allRows = [];
    const rows = tbody.querySelectorAll('tr');
    rows.forEach(row => {
      const rowData = [];
      const cells = row.querySelectorAll('td');
      cells.forEach(cell => {
        rowData.push(cell.textContent.trim());
      });
      allRows.push(rowData);
    });
    extractedData.data = allRows;
  }

  // Convert to JSON and save to file
  const jsonData = JSON.stringify(extractedData, null, 2);
  fs.writeFileSync('table_epreuve_1_data.json', jsonData);
  console.log('Data exported to table_epreuve_1_data.json');
} else {
  console.log('Table not found');
}
