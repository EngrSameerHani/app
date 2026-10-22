import { Invoice, Payment, Client, StoreSettings } from '../types';

/**
 * ESC/POS Thermal Printer Protocol Helpers and Formatters
 * Supports standard 58mm (32 chars/line) and 80mm (48 chars/line) paper rolls.
 */

export interface ThermalLine {
  text: string;
  align?: 'left' | 'center' | 'right';
  bold?: boolean;
  size?: 'normal' | 'double' | 'small';
}

function padLine(left: string, right: string, width: number): string {
  const space = width - left.length - right.length;
  if (space <= 0) {
    return left.slice(0, width - right.length - 1) + ' ' + right;
  }
  return left + ' '.repeat(space) + right;
}

function centerText(text: string, width: number): string {
  if (text.length >= width) return text.slice(0, width);
  const leftPad = Math.floor((width - text.length) / 2);
  return ' '.repeat(leftPad) + text;
}

function divider(width: number, char = '-'): string {
  return char.repeat(width);
}

/**
 * Formats a Purchase & Installment Invoice for Thermal Printing
 */
export function formatThermalInvoice(
  invoice: Invoice,
  client: Client | undefined,
  settings: StoreSettings
): string {
  const width = settings.printerWidth === '58mm' ? 32 : 48;
  const curr = settings.currencySymbol;
  const lines: string[] = [];

  // Header
  lines.push(centerText(settings.storeName.toUpperCase(), width));
  if (settings.tagline) lines.push(centerText(settings.tagline, width));
  lines.push(centerText(settings.address, width));
  lines.push(centerText(`Tel: ${settings.phone}`, width));
  if (settings.taxNumber) lines.push(centerText(`Tax/NTN: ${settings.taxNumber}`, width));
  lines.push(divider(width, '='));

  // Invoice Meta
  lines.push(centerText('*** PURCHASE & CREDIT INVOICE ***', width));
  lines.push(padLine(`Inv: ${invoice.invoiceNumber}`, new Date(invoice.createdAt).toLocaleDateString(), width));
  lines.push(padLine(`Time: ${new Date(invoice.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`, `Cashier: ${invoice.cashierName}`, width));
  lines.push(divider(width));

  // Client Details
  lines.push(`Client: ${invoice.clientName}`);
  lines.push(`Phone : ${invoice.clientPhone}`);
  if (client?.paperFolioNumber) {
    lines.push(`Physical Folio : ${client.paperFolioNumber}`);
    if (client.previousPaperFolioNumber) {
      lines.push(`Prev Physical Pg: ${client.previousPaperFolioNumber}`);
    }
  }
  lines.push(divider(width));

  // Items Table Header
  if (width === 32) {
    lines.push(padLine('ITEM (QTY x RATE)', 'TOTAL', width));
  } else {
    lines.push(padLine('ITEM / SIZE / CATEGORY', 'QTY x RATE     TOTAL', width));
  }
  lines.push(divider(width, '-'));

  // Items List
  invoice.items.forEach((item) => {
    const itemTitle = `${item.description} [${item.size}]`;
    const priceStr = `${curr}${item.totalPrice.toFixed(2)}`;
    const rateStr = `${item.quantity} x ${curr}${item.unitPrice.toFixed(2)}`;

    if (width === 32) {
      lines.push(itemTitle.slice(0, 32));
      lines.push(padLine(`  ${rateStr}`, priceStr, width));
    } else {
      lines.push(padLine(itemTitle.slice(0, 24), `${item.quantity}x${curr}${item.unitPrice}   ${priceStr}`, width));
    }
  });

  lines.push(divider(width, '='));

  // Financial Breakdown
  lines.push(padLine('Subtotal:', `${curr}${invoice.subtotal.toFixed(2)}`, width));
  if (invoice.discount > 0) {
    lines.push(padLine('Discount:', `-${curr}${invoice.discount.toFixed(2)}`, width));
  }
  if (invoice.taxAmount > 0) {
    lines.push(padLine(`Tax (${invoice.taxRate}%):`, `${curr}${invoice.taxAmount.toFixed(2)}`, width));
  }
  lines.push(padLine('GRAND TOTAL:', `${curr}${invoice.grandTotal.toFixed(2)}`, width));
  lines.push(divider(width, '-'));

  // Payment & Credit Calculation
  lines.push(padLine('Down Payment Paid:', `${curr}${invoice.downPayment.toFixed(2)}`, width));
  lines.push(padLine('Paid Via:', invoice.downPaymentMethod.toUpperCase(), width));
  lines.push(padLine('New Credit Added:', `${curr}${invoice.creditAmountAdded.toFixed(2)}`, width));
  lines.push(divider(width, '-'));

  // Account Ledger Status
  lines.push(padLine('Previous Credit Balance:', `${curr}${invoice.previousBalance.toFixed(2)}`, width));
  lines.push(padLine('TOTAL ACCOUNT BALANCE:', `${curr}${invoice.newBalance.toFixed(2)}`, width));
  lines.push(divider(width, '='));

  // Installment Schedule
  if (invoice.installmentMonths > 1 && invoice.creditAmountAdded > 0) {
    lines.push(centerText(`INSTALLMENT SCHEDULE (0% INTEREST)`, width));
    lines.push(padLine(`Plan Duration:`, `${invoice.installmentMonths} Monthly Installments`, width));
    lines.push(padLine(`Monthly Payment:`, `${curr}${invoice.monthlyInstallmentAmount.toFixed(2)}/mo`, width));
    lines.push(padLine(`First Installment Due:`, invoice.firstDueDate, width));
    lines.push(divider(width, '-'));
  }

  // Footer & Return Policy
  lines.push(centerText(settings.receiptFooterText || 'Thank you for shopping with us!', width));
  lines.push(centerText('Please pay monthly installments on time.', width));
  lines.push(centerText(`${settings.storeName} • ${settings.phone}`, width));
  lines.push('\n\n'); // Feed lines for paper cut

  return lines.join('\n');
}

/**
 * Formats a Payment Receipt for Thermal Printing
 */
export function formatThermalPayment(
  payment: Payment,
  client: Client | undefined,
  settings: StoreSettings
): string {
  const width = settings.printerWidth === '58mm' ? 32 : 48;
  const curr = settings.currencySymbol;
  const lines: string[] = [];

  // Header
  lines.push(centerText(settings.storeName.toUpperCase(), width));
  lines.push(centerText(settings.address, width));
  lines.push(centerText(`Tel: ${settings.phone}`, width));
  lines.push(divider(width, '='));

  // Receipt Meta
  lines.push(centerText('*** OFFICIAL PAYMENT RECEIPT ***', width));
  lines.push(padLine(`Receipt #: ${payment.receiptNumber}`, new Date(payment.createdAt).toLocaleDateString(), width));
  lines.push(padLine(`Time: ${new Date(payment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`, `Cashier: ${payment.cashierName}`, width));
  lines.push(divider(width));

  // Client Details
  lines.push(`Client: ${payment.clientName}`);
  if (client?.paperFolioNumber) {
    lines.push(`Folio Page : #${client.paperFolioNumber}`);
    if (client.previousPaperFolioNumber) {
      lines.push(`Prev Page #: ${client.previousPaperFolioNumber}`);
    }
  }
  lines.push(divider(width, '-'));

  // Amount Paid Box
  lines.push(centerText('AMOUNT RECEIVED', width));
  lines.push(centerText(`${curr}${payment.amount.toFixed(2)}`, width));
  lines.push(padLine('Payment Mode:', payment.paymentMethod.replace('_', ' ').toUpperCase(), width));
  if (payment.referenceNote) {
    lines.push(`Ref: ${payment.referenceNote}`);
  }
  lines.push(divider(width, '-'));

  // Balance Update
  lines.push(padLine('Previous Balance:', `${curr}${payment.previousBalance.toFixed(2)}`, width));
  lines.push(padLine('Amount Credited:', `-${curr}${payment.amount.toFixed(2)}`, width));
  lines.push(padLine('REMAINING BALANCE:', `${curr}${payment.remainingBalance.toFixed(2)}`, width));
  lines.push(divider(width, '='));

  if (payment.remainingBalance <= 0) {
    lines.push(centerText('*** ACCOUNT FULLY SETTLED ***', width));
    lines.push(centerText('Zero balance remaining. Thank you!', width));
  } else {
    lines.push(centerText('Next installment due as scheduled.', width));
  }

  lines.push(centerText('Customer Copy • Computer Generated', width));
  lines.push('\n\n');

  return lines.join('\n');
}

/**
 * Generates raw ESC/POS binary command stream (Uint8Array)
 * Standard commands: ESC @ (Init), GS V (Cut), ESC E (Bold), ESC a (Align)
 */
export function generateEscPosBinary(receiptText: string, cutPaper = true): Uint8Array {
  const encoder = new TextEncoder();
  const textBytes = encoder.encode(receiptText.replace(/\n/g, '\r\n'));

  // ESC/POS commands:
  // ESC @: [0x1B, 0x40] Initialize printer
  // ESC t 0: [0x1B, 0x74, 0x00] Code table PC437
  // GS V 66 0: [0x1D, 0x56, 0x42, 0x00] Feed 6 lines and partial cut
  const initCmd = new Uint8Array([0x1B, 0x40, 0x1B, 0x74, 0x00]);
  const cutCmd = cutPaper ? new Uint8Array([0x0A, 0x0A, 0x0A, 0x1D, 0x56, 0x42, 0x00]) : new Uint8Array([]);

  const totalLength = initCmd.length + textBytes.length + cutCmd.length;
  const result = new Uint8Array(totalLength);
  result.set(initCmd, 0);
  result.set(textBytes, initCmd.length);
  result.set(cutCmd, initCmd.length + textBytes.length);

  return result;
}

/**
 * Triggers browser thermal print dialog with exact 58mm/80mm roll width
 */
export function printThermalReceiptInBrowser(
  receiptText: string,
  width: '58mm' | '80mm' = '58mm'
) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to print receipt');
    return;
  }

  const mmWidth = width === '58mm' ? '58mm' : '80mm';

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Thermal Receipt Print</title>
        <style>
          @page {
            size: ${mmWidth} auto;
            margin: 0;
          }
          * {
            box-sizing: border-box;
          }
          body {
            font-family: 'Courier New', Courier, monospace;
            width: ${mmWidth};
            max-width: ${mmWidth};
            margin: 0 auto;
            padding: 8px 6px;
            font-size: 11px;
            line-height: 1.25;
            color: #000;
            background: #fff;
            white-space: pre-wrap;
            word-break: break-all;
          }
          .btn-bar {
            margin-bottom: 12px;
            text-align: center;
          }
          .print-btn {
            background: #111;
            color: #fff;
            padding: 6px 12px;
            font-size: 11px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
          }
          @media print {
            .btn-bar { display: none !important; }
            body { padding: 4px 2px; }
          }
        </style>
      </head>
      <body>
        <div class="btn-bar">
          <button class="print-btn" onclick="window.print()">Print to Thermal Printer</button>
        </div>
        <div>${escapeHtml(receiptText)}</div>
      </body>
    </html>
  `);

  printWindow.document.close();
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
