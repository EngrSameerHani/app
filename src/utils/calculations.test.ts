import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateInvoiceTotals,
  generateInstallmentSchedule,
  allocatePaymentToInstallments,
  calculateAgingBuckets,
  calculateRunningLedger,
  calculateStoreMetrics,
} from './calculations';
import { InvoiceItem, Installment, Invoice, Payment, Client } from '../types';

test('calculateInvoiceTotals computes correct subtotal, discount, tax and credit added', () => {
  const items: InvoiceItem[] = [
    {
      id: '1',
      description: 'Men 3-Piece Italian Wool Suit',
      category: 'Men Suits',
      size: '42R',
      quantity: 1,
      unitPrice: 250,
      totalPrice: 250,
    },
    {
      id: '2',
      description: 'Egyptian Cotton Dress Shirt',
      category: 'Men Suits',
      size: 'L',
      quantity: 2,
      unitPrice: 50,
      totalPrice: 100,
    },
  ];

  // Subtotal = 350. Discount = 50. Discounted = 300. Tax 10% = 30. Grand Total = 330.
  // Down Payment = 100. Credit added = 230.
  const totals = calculateInvoiceTotals(items, 50, 10, 100);

  assert.equal(totals.subtotal, 350);
  assert.equal(totals.discount, 50);
  assert.equal(totals.taxAmount, 30);
  assert.equal(totals.grandTotal, 330);
  assert.equal(totals.downPayment, 100);
  assert.equal(totals.creditAmountAdded, 230);
});

test('generateInstallmentSchedule splits credit interest-free without lost cents', () => {
  const schedule = generateInstallmentSchedule(
    'INV-100',
    'INV-100',
    'CLIENT-1',
    100,
    3,
    '2026-11-01'
  );

  assert.equal(schedule.length, 3);
  const totalScheduled = schedule.reduce((sum, s) => sum + s.amount, 0);
  assert.equal(Math.round(totalScheduled * 100) / 100, 100);
  assert.equal(schedule[0].installmentNumber, 1);
  assert.equal(schedule[0].dueDate, '2026-11-01');
  assert.equal(schedule[1].dueDate, '2026-12-01');
});

test('allocatePaymentToInstallments pays off earliest installments first', () => {
  const installments: Installment[] = [
    {
      id: 'inst-1',
      clientId: 'c1',
      invoiceId: 'inv-1',
      invoiceNumber: 'INV-1',
      installmentNumber: 1,
      totalInstallments: 2,
      amount: 50,
      dueDate: '2026-09-01',
      status: 'pending',
    },
    {
      id: 'inst-2',
      clientId: 'c1',
      invoiceId: 'inv-1',
      invoiceNumber: 'INV-1',
      installmentNumber: 2,
      totalInstallments: 2,
      amount: 50,
      dueDate: '2026-10-01',
      status: 'pending',
    },
  ];

  const result = allocatePaymentToInstallments(70, installments);
  assert.equal(result.remainingPayment, 0);
  assert.equal(result.updatedInstallments[0].status, 'paid');
  assert.equal(result.updatedInstallments[0].paidAmount, 50);
  assert.equal(result.updatedInstallments[1].status, 'pending');
  assert.equal(result.updatedInstallments[1].paidAmount, 20);
});

test('calculateAgingBuckets correctly categorizes overdue amounts', () => {
  const asOf = '2026-10-20';
  const installments: Installment[] = [
    {
      id: 'i1',
      clientId: 'c1',
      invoiceId: 'inv-1',
      invoiceNumber: 'INV-1',
      installmentNumber: 1,
      totalInstallments: 3,
      amount: 100,
      dueDate: '2026-10-25', // Future / Current
      status: 'pending',
    },
    {
      id: 'i2',
      clientId: 'c1',
      invoiceId: 'inv-1',
      invoiceNumber: 'INV-1',
      installmentNumber: 2,
      totalInstallments: 3,
      amount: 80,
      dueDate: '2026-10-05', // 15 days overdue -> 30 days bucket
      status: 'pending',
    },
    {
      id: 'i3',
      clientId: 'c1',
      invoiceId: 'inv-1',
      invoiceNumber: 'INV-1',
      installmentNumber: 3,
      totalInstallments: 3,
      amount: 120,
      dueDate: '2026-08-15', // 66 days overdue -> 90 days bucket
      status: 'pending',
    },
  ];

  const buckets = calculateAgingBuckets(installments, asOf);
  assert.equal(buckets.current, 100);
  assert.equal(buckets.days30, 80);
  assert.equal(buckets.days90, 120);
  assert.equal(buckets.totalOverdue, 200);
});

test('calculateRunningLedger computes chronological running balances correctly', () => {
  const invoices: Invoice[] = [
    {
      id: 'inv-1',
      invoiceNumber: 'INV-001',
      clientId: 'c1',
      clientName: 'Sarah Jenkins',
      clientPhone: '555-0101',
      items: [{ id: '1', description: 'Silk Dress', category: 'Women', size: 'M', quantity: 1, unitPrice: 150, totalPrice: 150 }],
      subtotal: 150,
      discount: 0,
      taxRate: 0,
      taxAmount: 0,
      grandTotal: 150,
      downPayment: 50,
      downPaymentMethod: 'cash',
      creditAmountAdded: 100,
      previousBalance: 0,
      newBalance: 100,
      installmentMonths: 2,
      monthlyInstallmentAmount: 50,
      firstDueDate: '2026-06-01',
      status: 'active',
      cashierName: 'Counter 1',
      createdAt: '2026-05-01',
    },
  ];

  const payments: Payment[] = [
    {
      id: 'pay-1',
      receiptNumber: 'REC-001',
      clientId: 'c1',
      clientName: 'Sarah Jenkins',
      amount: 40,
      paymentMethod: 'cash',
      previousBalance: 100,
      remainingBalance: 60,
      cashierName: 'Counter 1',
      createdAt: '2026-06-02',
    },
  ];

  const ledger = calculateRunningLedger(invoices, payments, 50, 'Page-12');
  assert.equal(ledger.length, 3); // 1 paper migration + 1 invoice + 1 payment
  assert.equal(ledger[0].balance, 50);
  assert.equal(ledger[1].balance, 150); // 50 + 100 credit added
  assert.equal(ledger[2].balance, 110); // 150 - 40 payment
});

test('anti-ban timing slabs correctly provide 30s intervals up to 180s (3 mins)', () => {
  const slabs = [30, 60, 90, 120, 150, 180];
  // Verify 30-second steps
  for (let i = 1; i < slabs.length; i++) {
    assert.equal(slabs[i] - slabs[i - 1], 30);
  }
  assert.equal(slabs[slabs.length - 1], 180); // 3 minutes max

  // Duration calculation helper
  const calculateBatchTimeMinutes = (clientsCount: number, delaySec: number) => {
    return Math.ceil((clientsCount * delaySec) / 60);
  };

  assert.equal(calculateBatchTimeMinutes(20, 60), 20); // 20 clients at 60s = 20 mins
  assert.equal(calculateBatchTimeMinutes(50, 180), 150); // 50 clients at 180s = 150 mins
});

test('operator and master admin PIN validation properly verifies credentials and overrides', () => {
  const masterPin = '1234';
  const operators = [
    { id: 'usr-op1', name: 'Operator 1', pin: '1111', role: 'operator' },
    { id: 'usr-op2', name: 'Operator 2', pin: '2222', role: 'operator' },
  ];

  const verifyPin = (opPin: string, entered: string, masterOverride: boolean) => {
    if (masterOverride) {
      return entered === masterPin;
    }
    return entered === opPin || entered === masterPin;
  };

  // Valid operator pin
  assert.equal(verifyPin(operators[0].pin, '1111', false), true);
  // Invalid operator pin
  assert.equal(verifyPin(operators[0].pin, '9999', false), false);
  // Master override with master pin
  assert.equal(verifyPin(operators[0].pin, '1234', true), true);
  // Master pin allowed as universal supervisor override
  assert.equal(verifyPin(operators[1].pin, '1234', false), true);
});

