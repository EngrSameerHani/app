import { Client, Invoice, Payment, Installment } from '../types';

/**
 * Downloads raw text content as a file in the browser
 */
export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Converts headers and row data to standard CSV
 */
export function convertToCSV(headers: string[], rows: (string | number)[][]): string {
  const escapeCell = (cell: string | number) => {
    const str = String(cell ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headerLine = headers.map(escapeCell).join(',');
  const rowLines = rows.map((row) => row.map(escapeCell).join(','));
  return [headerLine, ...rowLines].join('\r\n');
}

/**
 * Exports data as Excel XML spreadsheet (.xls / .xlsx compatible)
 */
export function exportToExcelXML(
  filename: string,
  sheetName: string,
  headers: string[],
  rows: (string | number)[][]
) {
  const headerCells = headers
    .map((h) => `<Cell><Data ss:Type="String">${escapeXml(h)}</Data></Cell>`)
    .join('');

  const rowCells = rows
    .map((row) => {
      const cells = row
        .map((cell) => {
          const isNum = typeof cell === 'number';
          return `<Cell><Data ss:Type="${isNum ? 'Number' : 'String'}">${escapeXml(String(cell))}</Data></Cell>`;
        })
        .join('');
      return `<Row>${cells}</Row>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Worksheet ss:Name="${escapeXml(sheetName)}">
  <Table>
   <Row>${headerCells}</Row>
   ${rowCells}
  </Table>
 </Worksheet>
</Workbook>`;

  downloadFile(xml, `${filename}.xls`, 'application/vnd.ms-excel');
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

/**
 * Triggers a formatted printable PDF / print preview in an iframe / new print dialog
 */
export function printFormattedReport(
  title: string,
  storeName: string,
  headers: string[],
  rows: (string | number)[][],
  summaryText?: string
) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to print report');
    return;
  }

  const tableHeaders = headers.map((h) => `<th style="border: 1px solid #cbd5e1; padding: 8px 12px; background: #f1f5f9; text-align: left; font-size: 12px;">${h}</th>`).join('');
  const tableRows = rows
    .map(
      (row, idx) =>
        `<tr style="background: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">` +
        row.map((c) => `<td style="border: 1px solid #e2e8f0; padding: 6px 12px; font-size: 12px;">${c}</td>`).join('') +
        `</tr>`
    )
    .join('');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title} - ${storeName}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; color: #0f172a; }
          .header { margin-bottom: 24px; border-bottom: 2px solid #0f172a; padding-bottom: 12px; display: flex; justify-content: space-between; align-items: flex-end; }
          .title { font-size: 20px; font-weight: bold; margin: 0; }
          .subtitle { color: #64748b; font-size: 13px; margin-top: 4px; }
          .summary { background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 6px; margin-bottom: 20px; font-size: 13px; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          @media print {
            button { display: none !important; }
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <div style="margin-bottom: 16px;">
          <button onclick="window.print()" style="background: #0f172a; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-weight: 500;">Print / Save as PDF</button>
        </div>
        <div class="header">
          <div>
            <h1 class="title">${title}</h1>
            <div class="subtitle">${storeName} • Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</div>
          </div>
          <div style="text-align: right; font-size: 12px; color: #64748b;">
            Confidential Accounting Document
          </div>
        </div>
        ${summaryText ? `<div class="summary">${summaryText}</div>` : ''}
        <table>
          <thead><tr>${tableHeaders}</tr></thead>
          <tbody>${tableRows}</tbody>
        </table>
      </body>
    </html>
  `);
  printWindow.document.close();
}
