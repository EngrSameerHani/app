import { Installment, Invoice, InvoiceItem, Payment, LedgerEntry, Client } from '../types';

/**
 * Calculates subtotal, tax amount, grand total, and credit added for an invoice.
 */
export function calculateInvoiceTotals(
  items: InvoiceItem[],
  discount: number = 0,
  taxRate: number = 0,
  downPayment: number = 0
) {
  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const discountedSubtotal = Math.max(0, subtotal - discount);
  const taxAmount = Math.round((discountedSubtotal * (taxRate / 100)) * 100) / 100;
  const grandTotal = Math.round((discountedSubtotal + taxAmount) * 100) / 100;
  const clampedDownPayment = Math.min(grandTotal, Math.max(0, downPayment));
  const creditAmountAdded = Math.round((grandTotal - clampedDownPayment) * 100) / 100;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    discount: Math.round(discount * 100) / 100,
    taxAmount,
    grandTotal,
    downPayment: clampedDownPayment,
    creditAmountAdded,
  };
}

/**
 * Generates an interest-free installment schedule split across N months.
 * Balances cents accurately so sum of installments strictly equals totalCredit.
 */
export function generateInstallmentSchedule(
  invoiceId: string,
  invoiceNumber: string,
  clientId: string,
  totalCredit: number,
  months: number,
  startDateStr: string
): Installment[] {
  if (totalCredit <= 0 || months <= 0) return [];

  const validMonths = Math.max(1, Math.min(24, Math.floor(months)));
  const baseMonthlyAmount = Math.floor((totalCredit / validMonths) * 100) / 100;
  const remainder = Math.round((totalCredit - (baseMonthlyAmount * validMonths)) * 100) / 100;

  const baseDate = new Date(startDateStr);
  const schedule: Installment[] = [];

  for (let i = 1; i <= validMonths; i++) {
    // Add 1 month each time
    const dueDate = new Date(baseDate);
    dueDate.setMonth(baseDate.getMonth() + (i - 1));
    const dueDateStr = dueDate.toISOString().split('T')[0];

    // Distribute remainder on the first installment
    const installmentAmount = i === 1 
      ? Math.round((baseMonthlyAmount + remainder) * 100) / 100 
      : baseMonthlyAmount;

    schedule.push({
      id: `${invoiceId}-inst-${i}`,
      clientId,
      invoiceId,
      invoiceNumber,
      installmentNumber: i,
      totalInstallments: validMonths,
      amount: installmentAmount,
      dueDate: dueDateStr,
      status: 'pending',
    });
  }

  return schedule;
}

/**
 * Allocates incoming payment to earliest overdue / pending installments.
 */
export function allocatePaymentToInstallments(
  paymentAmount: number,
  installments: Installment[],
  paymentDateStr: string = new Date().toISOString()
): { updatedInstallments: Installment[]; remainingPayment: number } {
  let remaining = paymentAmount;
  const sorted = [...installments].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  const updatedInstallments = sorted.map((inst) => {
    if (remaining <= 0 || inst.status === 'paid') return inst;

    const currentPaid = inst.paidAmount || 0;
    const unpaidOnThis = inst.amount - currentPaid;

    if (remaining >= unpaidOnThis) {
      remaining = Math.round((remaining - unpaidOnThis) * 100) / 100;
      return {
        ...inst,
        paidAmount: inst.amount,
        status: 'paid' as const,
        paidAt: paymentDateStr,
      };
    } else {
      const newPaid = Math.round((currentPaid + remaining) * 100) / 100;
      remaining = 0;
      return {
        ...inst,
        paidAmount: newPaid,
      };
    }
  });

  return {
    updatedInstallments,
    remainingPayment: remaining,
  };
}

/**
 * Calculates Aging Buckets for outstanding balances (0-30 days, 31-60 days, 61-90 days, 90+ days)
 */
export function calculateAgingBuckets(
  installments: Installment[],
  asOfDateStr: string = new Date().toISOString().split('T')[0]
) {
  const asOf = new Date(asOfDateStr).getTime();
  const buckets = {
    current: 0, // Not overdue or <= 0 days past due
    days30: 0,  // 1 - 30 days overdue
    days60: 0,  // 31 - 60 days overdue
    days90: 0,  // 61 - 90 days overdue
    daysOver90: 0, // > 90 days overdue
    totalOverdue: 0,
  };

  installments.forEach((inst) => {
    if (inst.status === 'paid') return;
    const dueTime = new Date(inst.dueDate).getTime();
    const unpaidAmount = Math.max(0, inst.amount - (inst.paidAmount || 0));

    if (unpaidAmount <= 0) return;

    const diffDays = Math.floor((asOf - dueTime) / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) {
      buckets.current += unpaidAmount;
    } else if (diffDays <= 30) {
      buckets.days30 += unpaidAmount;
      buckets.totalOverdue += unpaidAmount;
    } else if (diffDays <= 60) {
      buckets.days60 += unpaidAmount;
      buckets.totalOverdue += unpaidAmount;
    } else if (diffDays <= 90) {
      buckets.days90 += unpaidAmount;
      buckets.totalOverdue += unpaidAmount;
    } else {
      buckets.daysOver90 += unpaidAmount;
      buckets.totalOverdue += unpaidAmount;
    }
  });

  // Round all
  return {
    current: Math.round(buckets.current * 100) / 100,
    days30: Math.round(buckets.days30 * 100) / 100,
    days60: Math.round(buckets.days60 * 100) / 100,
    days90: Math.round(buckets.days90 * 100) / 100,
    daysOver90: Math.round(buckets.daysOver90 * 100) / 100,
    totalOverdue: Math.round(buckets.totalOverdue * 100) / 100,
  };
}

/**
 * Computes a running balance chronological ledger for a client
 */
export function calculateRunningLedger(
  invoices: Invoice[],
  payments: Payment[],
  startingBalance: number = 0,
  paperFolioNumber?: string
): LedgerEntry[] {
  const events: Array<{
    date: string;
    type: 'invoice' | 'payment' | 'paper_migration';
    refNumber: string;
    description: string;
    debit: number;
    credit: number;
  }> = [];

  if (startingBalance > 0) {
    events.push({
      date: '2026-01-01',
      type: 'paper_migration',
      refNumber: paperFolioNumber ? `FOLIO-${paperFolioNumber}` : 'INIT-BAL',
      description: 'Opening Balance (Migrated from Paper Ledger)',
      debit: startingBalance,
      credit: 0,
    });
  }

  invoices.forEach((inv) => {
    // If client made down payment, that is credited or the invoice adds net credit
    events.push({
      date: inv.createdAt,
      type: 'invoice',
      refNumber: inv.invoiceNumber,
      description: `Purchase: ${inv.items.map(i => `${i.description} (${i.size})`).join(', ')}${inv.downPayment > 0 ? ` [Down Pay: ${inv.downPayment}]` : ''}`,
      debit: inv.creditAmountAdded,
      credit: 0,
    });
  });

  payments.forEach((pay) => {
    events.push({
      date: pay.createdAt,
      type: 'payment',
      refNumber: pay.receiptNumber,
      description: `Payment Received (${pay.paymentMethod.replace('_', ' ').toUpperCase()})${pay.referenceNote ? ` - ${pay.referenceNote}` : ''}`,
      debit: 0,
      credit: pay.amount,
    });
  });

  // Sort chronological
  events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  let runningBalance = 0;
  return events.map((ev, index) => {
    runningBalance = Math.round((runningBalance + ev.debit - ev.credit) * 100) / 100;
    return {
      id: `led-${index + 1}`,
      date: ev.date,
      type: ev.type,
      refNumber: ev.refNumber,
      description: ev.description,
      debit: ev.debit,
      credit: ev.credit,
      balance: runningBalance,
    };
  });
}

/**
 * Computes high-level business analytics metrics for the dashboard
 */
export function calculateStoreMetrics(
  clients: Client[],
  invoices: Invoice[],
  payments: Payment[],
  installments: Installment[]
) {
  const totalOutstandingCredit = Math.round(
    clients.reduce((sum, c) => sum + Math.max(0, c.currentBalance), 0) * 100
  ) / 100;

  const totalDownPayments = invoices.reduce((sum, inv) => sum + inv.downPayment, 0);
  const totalInstallmentPayments = payments.reduce((sum, p) => sum + p.amount, 0);
  const totalCashCollected = Math.round((totalDownPayments + totalInstallmentPayments) * 100) / 100;

  const totalSalesVolume = Math.round(
    invoices.reduce((sum, inv) => sum + inv.grandTotal, 0) * 100
  ) / 100;

  const aging = calculateAgingBuckets(installments);

  const activeClientsWithCredit = clients.filter((c) => c.currentBalance > 0).length;
  const overdueInstallments = installments.filter(
    (i) => i.status !== 'paid' && new Date(i.dueDate).getTime() < Date.now()
  );

  return {
    totalOutstandingCredit,
    totalCashCollected,
    totalSalesVolume,
    activeClientsWithCredit,
    totalClientsCount: clients.length,
    overdueAmount: aging.totalOverdue,
    overdueCount: overdueInstallments.length,
    aging,
  };
}
