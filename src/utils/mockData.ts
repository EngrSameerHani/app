import { Client, ClothingProduct, Installment, Invoice, Payment, StoreSettings, UserAccount } from '../types';

export const DEFAULT_USERS: UserAccount[] = [
  { id: 'usr-admin', name: 'Usman (Owner)', role: 'admin', pin: '1234', shift: 'Master Admin / Store Owner', avatarColor: '#f59e0b' },
  { id: 'usr-op1', name: 'Operator 1 (Cashier Counter)', role: 'operator', pin: '1111', shift: 'Morning Shift (9am - 3pm)', avatarColor: '#10b981' },
  { id: 'usr-op2', name: 'Operator 2 (Sales & Billing)', role: 'operator', pin: '2222', shift: 'Evening Shift (3pm - 10pm)', avatarColor: '#3b82f6' },
  { id: 'usr-op3', name: 'Farhan (Accounts & Khata)', role: 'accountant', pin: '8888', shift: 'Revolving Ledger & Audit', avatarColor: '#8b5cf6' },
];

export const DEFAULT_SETTINGS: StoreSettings = {
  storeName: 'Usman Cloth Rehra',
  tagline: 'Exclusive Fabrics, Suiting, Bridal & Monthly Credit Khata',
  phone: '+92 300 8472910',
  email: 'accounts@usmanclothrehra.com',
  address: 'Main Bazaar, Rehra',
  taxNumber: 'NTN-4819204-7',
  currencySymbol: 'Rs.',
  printerWidth: '58mm',
  receiptFooterText: 'Thank you for shopping at Usman Cloth Rehra! No cash refund. Exchange within 7 days with original receipt.',
  whatsappTemplate: 'Dear {{client_name}}, warm greetings from Usman Cloth Rehra. Your monthly installment of {{currency}}{{monthly_amount}} is due on {{due_date}}. Current total balance: {{currency}}{{total_balance}} (Khata: {{paper_folio}}). Kindly deposit to Bank: Meezan Bank A/C: 0102-39281920 or visit our cash counter at Main Bazaar Rehra. Thank you!',
  smsTemplate: 'Usman Cloth Rehra: Dear {{client_name}}, monthly installment of {{currency}}{{monthly_amount}} is due on {{due_date}}. Total Balance: {{currency}}{{total_balance}} (Khata: {{paper_folio}}). Pay at counter or Meezan Bank 0102-39281920.',
  smsGatewayProvider: 'device_sms',
  smsSenderId: 'USMAN-CLOTH',
  autoCutPaper: true,
  soundEnabled: true,
  requireStartupLogin: true,
  masterAdminPin: '1234',
  masterAdminName: 'Usman (Owner)',
  antiBanDefaultDelay: 60,
};

export const INITIAL_PRODUCTS: ClothingProduct[] = [
  { id: 'p-1', sku: 'SUIT-WOOL-BLK', name: 'Italian Super-120s Wool Suit (3-Pc)', category: 'Men Suits', size: '40R', color: 'Midnight Black', price: 18500, costPrice: 12000, stock: 18 },
  { id: 'p-2', sku: 'SUIT-WOOL-NAVY', name: 'Tailored Slim Fit Navy Blazer & Pant', category: 'Men Suits', size: '42R', color: 'Navy Blue', price: 16500, costPrice: 10500, stock: 24 },
  { id: 'p-3', sku: 'KURTA-SILK-WHT', name: 'Pure Raw Silk Embroidered Kurta Trouser', category: 'Traditional', size: 'L', color: 'Off-White', price: 8500, costPrice: 5200, stock: 45 },
  { id: 'p-4', sku: 'KURTA-COT-SLV', name: 'Egyptian Giza Cotton Kurta Set', category: 'Traditional', size: 'M', color: 'Charcoal Slate', price: 6200, costPrice: 3800, stock: 38 },
  { id: 'p-5', sku: 'BRIDAL-VEL-MAR', name: 'Heavy Hand-Embellished Velvet Lehenga', category: 'Bridal Couture', size: 'Custom', color: 'Royal Maroon', price: 85000, costPrice: 55000, stock: 6 },
  { id: 'p-6', sku: 'PRET-CHIFF-EMB', name: 'Chiffon Formal 3-Piece with Organza Dupatta', category: 'Women Pret', size: 'M', color: 'Dusty Rose', price: 14500, costPrice: 9200, stock: 22 },
  { id: 'p-7', sku: 'PRET-SILK-TUN', name: 'Digital Print Pure Silk Tunic & Culottes', category: 'Women Pret', size: 'S', color: 'Emerald Green', price: 9800, costPrice: 6000, stock: 30 },
  { id: 'p-8', sku: 'FAB-UNST-LAWN', name: 'Luxury Jacquard Lawn 3-Pc Unstitched', category: 'Fabrics', size: 'Unstitched', color: 'Pastel Lilac', price: 5400, costPrice: 3400, stock: 65 },
  { id: 'p-9', sku: 'FAB-BOSKI-SLK', name: 'Authentic 6-Pound Chinese Boski Suit Length', category: 'Fabrics', size: 'Unstitched', color: 'Cream Gold', price: 22000, costPrice: 16500, stock: 14 },
  { id: 'p-10', sku: 'KIDS-SHER-GLD', name: 'Boys Brocade Sherwani & Churidar Set', category: 'Kids Wear', size: 'Age 8-10', color: 'Gold / Maroon', price: 7200, costPrice: 4200, stock: 19 },
  { id: 'p-11', sku: 'ACC-SHAWL-PAS', name: 'Fine Kashmiri Pure Pashmina Shawl', category: 'Accessories', size: 'Standard', color: 'Walnut Brown', price: 19500, costPrice: 13000, stock: 15 },
  { id: 'p-12', sku: 'ACC-TIE-SILK', name: 'Handmade Silk Jacquard Necktie & Cufflinks', category: 'Accessories', size: 'Standard', color: 'Burgundy Paisley', price: 2800, costPrice: 1400, stock: 50 },
];

/**
 * Generates seed data of 2000 clients representing paper ledger records for Usman Cloth Rehra.
 */
export function generateSeedClients(): Client[] {
  const firstNames = [
    'Mohammad', 'Ahmed', 'Tariq', 'Zubair', 'Bilal', 'Imran', 'Rashid', 'Farhan', 'Naveed', 'Khalid',
    'Ayesha', 'Fatima', 'Zainab', 'Sana', 'Hina', 'Maryam', 'Sobia', 'Samina', 'Sadia', 'Noreen',
    'Shahid', 'Hamza', 'Usman', 'Waseem', 'Kashif', 'Arsalan', 'Kamran', 'Faisal', 'Rizwan', 'Junaid',
    'Rabia', 'Shazia', 'Tahira', 'Bushra', 'Nazia', 'Lubna', 'Asma', 'Fariha', 'Mehwish', 'Amber'
  ];

  const lastNames = [
    'Khan', 'Sheikh', 'Malik', 'Chaudhry', 'Bhatti', 'Ansari', 'Qureshi', 'Mirza', 'Raza', 'Siddiqui',
    'Butt', 'Dar', 'Abbasi', 'Gondal', 'Hashmi', 'Gillani', 'Akhtar', 'Javed', 'Rehman', 'Tahir',
    'Niazi', 'Virk', 'Bajwa', 'Tarar', 'Alvi', 'Mughal', 'Sethi', 'Syed', 'Lodhi', 'Kazmi'
  ];

  const areas = ['Main Bazaar Rehra', 'Purana Bazaar', 'Chowk Rehra', 'Station Road', 'Canal View', 'Civil Lines', 'Model Town Rehra', 'Bara Bazaar'];

  const clients: Client[] = [];

  for (let i = 1; i <= 2000; i++) {
    const fName = firstNames[(i * 7 + 3) % firstNames.length];
    const lName = lastNames[(i * 13 + 5) % lastNames.length];
    const area = areas[(i * 3) % areas.length];
    const phone = `03${(10 + (i % 89)).toString().padStart(2, '0')}-${((i * 9471) % 9000000 + 1000000)}`;

    // Ledger folio representation: 180 pages per physical ledger register book
    const bookNum = Math.ceil(i / 180);
    const pageNum = ((i - 1) % 180) + 1;
    const paperFolioNumber = `B${bookNum}-P${pageNum.toString().padStart(3, '0')}`;

    // Previous Physical Page Reference Number (carried over from earlier paper record)
    let previousPaperFolioNumber: string | undefined;
    if (bookNum > 1 && i % 2 === 0) {
      const prevBook = bookNum - 1;
      const prevPage = ((pageNum * 3) % 175) + 1;
      previousPaperFolioNumber = `B${prevBook}-P${prevPage.toString().padStart(3, '0')}`;
    } else if (i % 5 === 0) {
      previousPaperFolioNumber = `Old Khata 2024 Page #${((i * 11) % 190) + 1}`;
    }

    // Balances
    let balance = 0;
    let rating: Client['rating'] = 'Good';
    const rand = (i * 31) % 100;

    if (rand < 15) {
      balance = 0; // Settled
      rating = 'A+';
    } else if (rand < 55) {
      balance = Math.round(((i * 789) % 35000 + 4000) / 100) * 100; // Normal active
      rating = 'Good';
    } else if (rand < 80) {
      balance = Math.round(((i * 923) % 65000 + 15000) / 100) * 100; // High balance
      rating = 'Fair';
    } else if (rand < 93) {
      balance = Math.round(((i * 443) % 45000 + 10000) / 100) * 100; // Overdue
      rating = 'Overdue';
    } else {
      balance = Math.round(((i * 617) % 80000 + 35000) / 100) * 100; // High risk
      rating = 'High Risk';
    }

    const creditLimit = Math.max(balance + 25000, 50000 + ((i % 10) * 10000));
    const monthlyInstallmentTarget = balance > 0 ? Math.round((balance / 3) / 100) * 100 : 5000;

    clients.push({
      id: `client-${i}`,
      name: `${fName} ${lName}`,
      phone,
      address: `Shop/House #${(i % 120) + 1}, ${area}`,
      paperFolioNumber,
      previousPaperFolioNumber,
      creditLimit,
      currentBalance: balance,
      monthlyInstallmentTarget,
      notes: previousPaperFolioNumber
        ? `Account carried forward from physical ledger ${previousPaperFolioNumber}.`
        : 'New digitized khata account.',
      rating,
      createdAt: new Date(Date.now() - ((2100 - i) * 86400000 * 0.4)).toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
    });
  }

  return clients;
}

/**
 * Creates seed invoices, payments, and installments for the top 20 active clients
 */
export function generateSeedTransactions(clients: Client[]): {
  invoices: Invoice[];
  payments: Payment[];
  installments: Installment[];
} {
  const invoices: Invoice[] = [];
  const payments: Payment[] = [];
  const installments: Installment[] = [];

  const sampleClients = clients.slice(0, 25);

  sampleClients.forEach((client, idx) => {
    if (client.currentBalance <= 0) return;

    const invNum = `INV-2026-${(1001 + idx).toString()}`;
    const invoiceTotal = client.currentBalance + 8000;
    const downPayment = 8000;
    const creditAdded = client.currentBalance;

    const invoice: Invoice = {
      id: `inv-${idx + 1}`,
      invoiceNumber: invNum,
      clientId: client.id,
      clientName: client.name,
      clientPhone: client.phone,
      items: [
        {
          id: `item-${idx}-1`,
          description: idx % 2 === 0 ? 'Pure Wool Tailored 3-Piece Suit' : 'Hand Embroidered Chiffon 3-Pc Dress',
          category: idx % 2 === 0 ? 'Men Suits' : 'Women Pret',
          size: idx % 2 === 0 ? '42R' : 'M',
          quantity: 1,
          unitPrice: invoiceTotal,
          totalPrice: invoiceTotal,
        },
      ],
      subtotal: invoiceTotal,
      discount: 0,
      taxRate: 0,
      taxAmount: 0,
      grandTotal: invoiceTotal,
      downPayment,
      downPaymentMethod: 'cash',
      creditAmountAdded: creditAdded,
      previousBalance: 0,
      newBalance: creditAdded,
      installmentMonths: 3,
      monthlyInstallmentAmount: Math.round((creditAdded / 3) * 100) / 100,
      firstDueDate: '2026-09-15',
      status: 'active',
      cashierName: 'Counter 1',
      createdAt: '2026-08-15T14:30:00Z',
    };

    invoices.push(invoice);

    // Installments
    const monthlyAmt = Math.round((creditAdded / 3) * 100) / 100;
    const isOverdue = client.rating === 'Overdue' || client.rating === 'High Risk';

    installments.push({
      id: `inst-${idx}-1`,
      clientId: client.id,
      invoiceId: invoice.id,
      invoiceNumber: invNum,
      installmentNumber: 1,
      totalInstallments: 3,
      amount: monthlyAmt,
      dueDate: '2026-09-15',
      status: isOverdue ? 'overdue' : 'paid',
      paidAmount: isOverdue ? 0 : monthlyAmt,
      paidAt: isOverdue ? undefined : '2026-09-14',
    });

    installments.push({
      id: `inst-${idx}-2`,
      clientId: client.id,
      invoiceId: invoice.id,
      invoiceNumber: invNum,
      installmentNumber: 2,
      totalInstallments: 3,
      amount: monthlyAmt,
      dueDate: '2026-10-15',
      status: isOverdue ? 'overdue' : 'pending',
    });

    installments.push({
      id: `inst-${idx}-3`,
      clientId: client.id,
      invoiceId: invoice.id,
      invoiceNumber: invNum,
      installmentNumber: 3,
      totalInstallments: 3,
      amount: monthlyAmt,
      dueDate: '2026-11-15',
      status: 'pending',
    });

    if (!isOverdue) {
      payments.push({
        id: `pay-${idx + 1}`,
        receiptNumber: `REC-2026-${(501 + idx).toString()}`,
        clientId: client.id,
        clientName: client.name,
        amount: monthlyAmt,
        paymentMethod: 'cash',
        referenceNote: 'Month 1 installment paid in cash at counter',
        previousBalance: creditAdded,
        remainingBalance: creditAdded - monthlyAmt,
        cashierName: 'Counter 1',
        createdAt: '2026-09-14T11:20:00Z',
      });
    }
  });

  return { invoices, payments, installments };
}
