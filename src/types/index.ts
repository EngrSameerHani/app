export type UserRole = 'admin' | 'operator' | 'cashier' | 'accountant';

export interface UserAccount {
  id: string;
  name: string;
  role: UserRole;
  pin: string; // 4-digit numeric PIN
  shift?: string; // e.g. "Morning Shift", "Evening Counter", "Master Admin"
  phone?: string;
  avatarColor?: string;
  createdAt?: string;
}

export type ClientRating = 'A+' | 'Good' | 'Fair' | 'Overdue' | 'High Risk';

export interface Client {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address: string;
  paperFolioNumber?: string; // Current physical paper register book folio/page (e.g. B2-P045)
  previousPaperFolioNumber?: string; // Reference number of previous page of physical record (e.g. B1-P180)
  creditLimit: number;
  currentBalance: number;
  monthlyInstallmentTarget: number;
  notes?: string;
  rating: ClientRating;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceItem {
  id: string;
  productId?: string;
  description: string;
  category: string;
  size: string;
  color?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export type PaymentMethod = 'cash' | 'card' | 'bank_transfer' | 'mobile_wallet';

export interface Invoice {
  id: string;
  invoiceNumber: string;
  clientId: string;
  clientName: string;
  clientPhone: string;
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  taxRate: number;
  taxAmount: number;
  grandTotal: number;
  downPayment: number;
  downPaymentMethod: PaymentMethod;
  creditAmountAdded: number; // grandTotal - downPayment
  previousBalance: number;
  newBalance: number; // previousBalance + creditAmountAdded
  installmentMonths: number;
  monthlyInstallmentAmount: number;
  firstDueDate: string;
  status: 'active' | 'completed' | 'cancelled';
  cashierName: string;
  notes?: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  receiptNumber: string;
  clientId: string;
  clientName: string;
  amount: number;
  paymentMethod: PaymentMethod;
  referenceNote?: string;
  previousBalance: number;
  remainingBalance: number;
  cashierName: string;
  createdAt: string;
}

export interface Installment {
  id: string;
  clientId: string;
  invoiceId: string;
  invoiceNumber: string;
  installmentNumber: number;
  totalInstallments: number;
  amount: number;
  dueDate: string;
  status: 'paid' | 'pending' | 'overdue';
  paidAt?: string;
  paidAmount?: number;
}

export interface ClothingProduct {
  id: string;
  sku: string;
  name: string;
  category: string;
  size: string;
  color: string;
  price: number;
  costPrice: number;
  stock: number;
}

export interface StoreSettings {
  storeName: string;
  tagline: string;
  phone: string;
  email: string;
  address: string;
  taxNumber: string;
  currencySymbol: string;
  printerWidth: '58mm' | '80mm';
  receiptFooterText: string;
  whatsappTemplate: string;
  smsTemplate: string;
  smsGatewayProvider: 'device_sms' | 'custom_api' | 'twilio';
  smsSenderId: string;
  smsApiKey?: string;
  smsApiUrl?: string;
  autoCutPaper: boolean;
  soundEnabled: boolean;
  requireStartupLogin?: boolean;
  masterAdminPin?: string;
  masterAdminName?: string;
  antiBanDefaultDelay?: number;
}

export interface SyncQueueItem {
  id: string;
  action: 'create_invoice' | 'record_payment' | 'create_client' | 'migrate_paper' | 'update_client';
  entityId: string;
  payload: any;
  timestamp: string;
  status: 'pending' | 'synced';
}

export interface LedgerEntry {
  id: string;
  date: string;
  type: 'invoice' | 'payment' | 'paper_migration' | 'adjustment';
  refNumber: string;
  description: string;
  debit: number; // Increases balance (purchases)
  credit: number; // Decreases balance (payments)
  balance: number; // Running balance
}
