import React, { useState } from 'react';
import {
  ShoppingBag,
  Plus,
  Trash2,
  Printer,
  User,
  CreditCard,
  DollarSign,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Search,
  Sparkles,
} from 'lucide-react';
import {
  Client,
  ClothingProduct,
  Invoice,
  InvoiceItem,
  PaymentMethod,
  StoreSettings,
  UserAccount,
} from '../types';
import { calculateInvoiceTotals, generateInstallmentSchedule } from '../utils/calculations';
import { playRetailSound } from '../utils/storage';

interface InvoiceCreatorProps {
  clients: Client[];
  products: ClothingProduct[];
  settings: StoreSettings;
  currentUser: UserAccount;
  preselectedClientId?: string;
  onSaveInvoice: (invoice: Invoice, client: Client) => void;
  onQuickCreateClient: (newClient: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>) => Client;
}

export const InvoiceCreator: React.FC<InvoiceCreatorProps> = ({
  clients,
  products,
  settings,
  currentUser,
  preselectedClientId,
  onSaveInvoice,
  onQuickCreateClient,
}) => {
  const curr = settings.currencySymbol;

  // Selected client state
  const [selectedClientId, setSelectedClientId] = useState<string>(preselectedClientId || '');
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);

  // Quick Client Creation Modal State
  const [isQuickClientOpen, setIsQuickClientOpen] = useState(false);
  const [quickName, setQuickName] = useState('');
  const [quickPhone, setQuickPhone] = useState('');
  const [quickAddress, setQuickAddress] = useState('');
  const [quickFolio, setQuickFolio] = useState('');
  const [quickPrevFolio, setQuickPrevFolio] = useState('');
  const [quickCreditLimit, setQuickCreditLimit] = useState(50000);

  // Cart / Invoice Items
  const [items, setItems] = useState<InvoiceItem[]>([
    {
      id: 'item-1',
      description: 'Italian Wool 3-Piece Suit',
      category: 'Men Suits',
      size: '42R',
      color: 'Midnight Black',
      quantity: 1,
      unitPrice: 18500,
      totalPrice: 18500,
    },
  ]);

  // Financial inputs
  const [discount, setDiscount] = useState<number>(0);
  const [taxRate, setTaxRate] = useState<number>(0);
  const [downPayment, setDownPayment] = useState<number>(5000);
  const [downPaymentMethod, setDownPaymentMethod] = useState<PaymentMethod>('cash');
  const [installmentMonths, setInstallmentMonths] = useState<number>(3);
  const [firstDueDate, setFirstDueDate] = useState<string>(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().split('T')[0];
  });
  const [notes, setNotes] = useState('');

  // Selected Client
  const selectedClient = clients.find((c) => c.id === selectedClientId);

  // Filter clients for dropdown
  const filteredClients = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(clientSearchQuery.toLowerCase()) ||
      c.phone.includes(clientSearchQuery) ||
      (c.paperFolioNumber && c.paperFolioNumber.toLowerCase().includes(clientSearchQuery.toLowerCase())) ||
      (c.previousPaperFolioNumber && c.previousPaperFolioNumber.toLowerCase().includes(clientSearchQuery.toLowerCase()))
  ).slice(0, 10);

  // Calculations
  const totals = calculateInvoiceTotals(items, discount, taxRate, downPayment);
  const previousBalance = selectedClient ? selectedClient.currentBalance : 0;
  const newBalance = Math.round((previousBalance + totals.creditAmountAdded) * 100) / 100;
  const monthlyAmount =
    totals.creditAmountAdded > 0 && installmentMonths > 0
      ? Math.round((totals.creditAmountAdded / installmentMonths) * 100) / 100
      : 0;

  // Add Item from Catalog
  const handleAddProduct = (prod: ClothingProduct) => {
    if (settings.soundEnabled) playRetailSound('beep');
    const existingIndex = items.findIndex((i) => i.productId === prod.id && i.size === prod.size);
    if (existingIndex >= 0) {
      const updated = [...items];
      updated[existingIndex].quantity += 1;
      updated[existingIndex].totalPrice = updated[existingIndex].quantity * updated[existingIndex].unitPrice;
      setItems(updated);
    } else {
      setItems([
        ...items,
        {
          id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
          productId: prod.id,
          description: prod.name,
          category: prod.category,
          size: prod.size,
          color: prod.color,
          quantity: 1,
          unitPrice: prod.price,
          totalPrice: prod.price,
        },
      ]);
    }
  };

  // Add Custom Clothing Item
  const handleAddCustomItem = () => {
    setItems([
      ...items,
      {
        id: `item-${Date.now()}`,
        description: 'Custom Tailored Clothing Item',
        category: 'Custom Couture',
        size: 'Custom',
        quantity: 1,
        unitPrice: 5000,
        totalPrice: 5000,
      },
    ]);
  };

  const handleUpdateItem = (id: string, updates: Partial<InvoiceItem>) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, ...updates };
        updated.totalPrice = updated.quantity * updated.unitPrice;
        return updated;
      })
    );
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Quick Client Submit
  const handleCreateQuickClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickName.trim() || !quickPhone.trim()) return;

    const newClient = onQuickCreateClient({
      name: quickName.trim(),
      phone: quickPhone.trim(),
      address: quickAddress.trim() || 'Store Walk-in',
      paperFolioNumber: quickFolio.trim() || undefined,
      previousPaperFolioNumber: quickPrevFolio.trim() || undefined,
      creditLimit: quickCreditLimit || 50000,
      currentBalance: 0,
      monthlyInstallmentTarget: 5000,
      notes: quickPrevFolio.trim() ? `Carried forward from previous physical record: ${quickPrevFolio.trim()}` : undefined,
      rating: 'Good',
    });

    setSelectedClientId(newClient.id);
    setIsQuickClientOpen(false);
    setQuickName('');
    setQuickPhone('');
    setQuickAddress('');
    setQuickFolio('');
    setQuickPrevFolio('');
  };

  // Form Submit
  const handleSave = () => {
    if (!selectedClient) {
      alert('Please select or create a client for this invoice.');
      return;
    }
    if (items.length === 0) {
      alert('Please add at least one clothing item.');
      return;
    }

    const invNumber = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newInvoice: Invoice = {
      id: `inv-${Date.now()}`,
      invoiceNumber: invNumber,
      clientId: selectedClient.id,
      clientName: selectedClient.name,
      clientPhone: selectedClient.phone,
      items,
      subtotal: totals.subtotal,
      discount: totals.discount,
      taxRate,
      taxAmount: totals.taxAmount,
      grandTotal: totals.grandTotal,
      downPayment: totals.downPayment,
      downPaymentMethod,
      creditAmountAdded: totals.creditAmountAdded,
      previousBalance,
      newBalance,
      installmentMonths,
      monthlyInstallmentAmount: monthlyAmount,
      firstDueDate,
      status: 'active',
      cashierName: currentUser.name,
      notes,
      createdAt: new Date().toISOString(),
    };

    if (settings.soundEnabled) playRetailSound('success');
    onSaveInvoice(newInvoice, selectedClient);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left Column: Client Selection & Catalog & Items (8 Cols) */}
      <div className="lg:col-span-8 space-y-6">
        {/* Client Selection Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center space-x-1.5">
              <User className="w-4 h-4 text-amber-500" />
              <span>Client Account & Credit Ledger (2,000+ Registered)</span>
            </label>
            <button
              type="button"
              onClick={() => setIsQuickClientOpen(true)}
              className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline flex items-center space-x-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Quick Add New Client</span>
            </button>
          </div>

          {/* Searchable Client Selector */}
          <div className="relative">
            <div className="flex items-center rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-3 py-2">
              <Search className="w-4 h-4 text-slate-400 mr-2" />
              <input
                type="text"
                value={selectedClient ? `${selectedClient.name} (${selectedClient.phone})` : clientSearchQuery}
                onChange={(e) => {
                  setSelectedClientId('');
                  setClientSearchQuery(e.target.value);
                  setShowClientDropdown(true);
                }}
                onFocus={() => setShowClientDropdown(true)}
                placeholder="Search 2,000+ clients by name, phone, folio (e.g. B2-P045) or prev physical page (e.g. B1-P180)..."
                className="w-full bg-transparent text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
              />
              {selectedClient && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedClientId('');
                    setClientSearchQuery('');
                  }}
                  className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 ml-2"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Dropdown suggestions */}
            {showClientDropdown && !selectedClientId && (
              <div className="absolute left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl max-h-60 overflow-y-auto z-20">
                {filteredClients.length === 0 ? (
                  <div className="p-3 text-xs text-slate-400 text-center">
                    No client found matching "{clientSearchQuery}". Click "Quick Add New Client" above.
                  </div>
                ) : (
                  filteredClients.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => {
                        setSelectedClientId(c.id);
                        setShowClientDropdown(false);
                      }}
                      className="p-3 hover:bg-slate-100 dark:hover:bg-slate-700/60 cursor-pointer border-b border-slate-100 dark:border-slate-700/40 last:border-none flex items-center justify-between transition"
                    >
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                          <span>{c.name}</span>
                          {c.paperFolioNumber && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono">
                              {c.paperFolioNumber}
                            </span>
                          )}
                          {c.previousPaperFolioNumber && (
                            <span className="text-[9px] text-slate-400 font-mono">
                              (Prev: {c.previousPaperFolioNumber})
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          {c.phone} • {c.address}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-bold text-slate-900 dark:text-white">
                          Bal: {curr}{c.currentBalance.toLocaleString()}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Limit: {curr}{c.creditLimit.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Selected Client Ledger Snapshot */}
          {selectedClient && (
            <div className="mt-3 p-3.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                  {selectedClient.name[0]}
                </div>
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">
                    {selectedClient.name} • {selectedClient.phone}
                  </div>
                  <div className="text-slate-500 dark:text-slate-400 text-[11px]">
                    {selectedClient.paperFolioNumber ? `Paper Folio: ${selectedClient.paperFolioNumber} ` : ''}
                    {selectedClient.previousPaperFolioNumber ? `(Prev Physical: ${selectedClient.previousPaperFolioNumber}) • ` : '• '}
                    {selectedClient.address}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <div>
                  <div className="text-slate-500 dark:text-slate-400 text-[10px]">Current Credit Balance</div>
                  <div className="font-bold text-slate-900 dark:text-white">
                    {curr}{selectedClient.currentBalance.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500 dark:text-slate-400 text-[10px]">Available Credit</div>
                  <div className="font-bold text-emerald-600 dark:text-emerald-400">
                    {curr}{Math.max(0, selectedClient.creditLimit - selectedClient.currentBalance).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Quick Clothing Catalog Picker */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center space-x-1.5">
              <ShoppingBag className="w-4 h-4 text-amber-500" />
              <span>Quick Clothing Catalog (Click to Add to Cart)</span>
            </h3>
            <button
              type="button"
              onClick={handleAddCustomItem}
              className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline flex items-center space-x-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Custom / Alteration Item</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
            {products.slice(0, 8).map((prod) => (
              <button
                key={prod.id}
                type="button"
                onClick={() => handleAddProduct(prod)}
                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800/60 hover:border-amber-500 dark:hover:border-amber-500 text-left transition group"
              >
                <div className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-amber-500">
                  {prod.name}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">
                  Size: {prod.size} • {prod.color}
                </div>
                <div className="text-xs font-semibold text-amber-600 dark:text-amber-400 mt-1">
                  {curr}{prod.price.toLocaleString()}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Cart / Invoice Line Items Table */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              Invoice Items ({items.length})
            </h3>
            <button
              type="button"
              onClick={handleAddCustomItem}
              className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium hover:bg-slate-200"
            >
              + Add Item Line
            </button>
          </div>

          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 grid grid-cols-12 gap-2.5 items-center"
              >
                {/* Description & Category */}
                <div className="col-span-12 sm:col-span-5">
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => handleUpdateItem(item.id, { description: e.target.value })}
                    placeholder="Clothing item description..."
                    className="w-full text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                  <div className="flex items-center space-x-2 mt-1">
                    <input
                      type="text"
                      value={item.category}
                      onChange={(e) => handleUpdateItem(item.id, { category: e.target.value })}
                      placeholder="Category (e.g. Pret, Suit)"
                      className="text-[10px] bg-transparent text-slate-500 dark:text-slate-400 w-28 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Size */}
                <div className="col-span-4 sm:col-span-2">
                  <label className="text-[10px] text-slate-400 block mb-0.5">Size</label>
                  <select
                    value={item.size}
                    onChange={(e) => handleUpdateItem(item.id, { size: e.target.value })}
                    className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1.5 text-slate-900 dark:text-white"
                  >
                    <option value="XS">XS</option>
                    <option value="S">S</option>
                    <option value="M">M</option>
                    <option value="L">L</option>
                    <option value="XL">XL</option>
                    <option value="XXL">XXL</option>
                    <option value="40R">40R</option>
                    <option value="42R">42R</option>
                    <option value="Unstitched">Unstitched</option>
                    <option value="Custom">Custom</option>
                  </select>
                </div>

                {/* Qty */}
                <div className="col-span-3 sm:col-span-2">
                  <label className="text-[10px] text-slate-400 block mb-0.5">Qty</label>
                  <input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) => handleUpdateItem(item.id, { quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                    className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1.5 text-slate-900 dark:text-white text-center"
                  />
                </div>

                {/* Unit Price */}
                <div className="col-span-4 sm:col-span-2">
                  <label className="text-[10px] text-slate-400 block mb-0.5">Unit Price</label>
                  <input
                    type="number"
                    min={0}
                    value={item.unitPrice}
                    onChange={(e) => handleUpdateItem(item.id, { unitPrice: Math.max(0, parseFloat(e.target.value) || 0) })}
                    className="w-full text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1.5 text-slate-900 dark:text-white text-right"
                  />
                </div>

                {/* Delete */}
                <div className="col-span-1 text-right">
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(item.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-500 rounded transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Column: Checkout, Interest-Free Installment Setup & Totals (4 Cols) */}
      <div className="lg:col-span-4 space-y-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-lg sticky top-20">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4 flex items-center space-x-2">
            <CreditCard className="w-4 h-4 text-amber-500" />
            <span>Installment & Payment Plan</span>
          </h3>

          {/* Pricing Summary */}
          <div className="space-y-2.5 text-xs pb-4 border-b border-slate-200 dark:border-slate-800">
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Items Subtotal:</span>
              <span className="font-semibold text-slate-900 dark:text-white">{curr}{totals.subtotal.toLocaleString()}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-600 dark:text-slate-400">Discount:</span>
              <div className="flex items-center space-x-1">
                <span>{curr}</span>
                <input
                  type="number"
                  min={0}
                  value={discount}
                  onChange={(e) => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-20 px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-right text-xs"
                />
              </div>
            </div>

            <div className="flex justify-between text-sm font-bold text-slate-900 dark:text-white pt-1">
              <span>GRAND TOTAL:</span>
              <span className="text-amber-600 dark:text-amber-400 text-base">{curr}{totals.grandTotal.toLocaleString()}</span>
            </div>
          </div>

          {/* Down Payment Section */}
          <div className="py-4 border-b border-slate-200 dark:border-slate-800 space-y-3">
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
              Down Payment Paid Today ({curr})
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                min={0}
                max={totals.grandTotal}
                value={downPayment}
                onChange={(e) => setDownPayment(Math.min(totals.grandTotal, Math.max(0, parseFloat(e.target.value) || 0)))}
                className="w-full text-base font-bold px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <select
                value={downPaymentMethod}
                onChange={(e) => setDownPaymentMethod(e.target.value as PaymentMethod)}
                className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-2.5 py-2.5 text-slate-900 dark:text-white"
              >
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="bank_transfer">Bank</option>
                <option value="mobile_wallet">Wallet</option>
              </select>
            </div>

            {/* Quick Down Payment Percentages */}
            <div className="flex space-x-1.5">
              {[0, 25, 50, 100].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => setDownPayment(Math.round((totals.grandTotal * (pct / 100)) / 100) * 100)}
                  className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[10px] text-slate-700 dark:text-slate-300 font-semibold flex-1"
                >
                  {pct}% Down
                </button>
              ))}
            </div>
          </div>

          {/* Interest-Free Installment Tenure */}
          <div className="py-4 border-b border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Installment Duration (0% Interest)
              </label>
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                Interest Free
              </span>
            </div>

            <div className="grid grid-cols-4 gap-1.5">
              {[1, 2, 3, 6].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setInstallmentMonths(m)}
                  className={`py-1.5 text-xs font-bold rounded-lg border transition ${
                    installmentMonths === m
                      ? 'bg-amber-500 text-slate-950 border-amber-500'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {m} Mo
                </button>
              ))}
            </div>

            {/* Monthly Installment Amount Calculation */}
            {totals.creditAmountAdded > 0 && (
              <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>New Credit Added:</span>
                  <span className="font-bold text-slate-900 dark:text-white">+{curr}{totals.creditAmountAdded.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Monthly Installment:</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">{curr}{monthlyAmount.toLocaleString()} / month</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>First Due Date:</span>
                  <input
                    type="date"
                    value={firstDueDate}
                    onChange={(e) => setFirstDueDate(e.target.value)}
                    className="bg-transparent text-right font-medium text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* New Running Balance Summary */}
          <div className="py-4 space-y-2">
            <div className="p-3.5 rounded-xl bg-gradient-to-br from-slate-900 to-indigo-950 text-white border border-slate-700">
              <div className="text-[11px] text-slate-400">Updated Customer Balance:</div>
              <div className="text-xl font-black text-amber-400 mt-0.5">
                {curr}{newBalance.toLocaleString()}
              </div>
              <div className="text-[10px] text-slate-300 mt-1 flex justify-between">
                <span>Prev Bal: {curr}{previousBalance.toLocaleString()}</span>
                <span>+ Credit: {curr}{totals.creditAmountAdded.toLocaleString()}</span>
              </div>
            </div>

            {/* Save & Instant Thermal Print Button */}
            <button
              type="button"
              onClick={handleSave}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-sm flex items-center justify-center space-x-2 shadow-xl shadow-amber-500/20 transition active:scale-[0.99]"
            >
              <Printer className="w-4 h-4" />
              <span>Complete & Print Thermal Receipt</span>
            </button>
          </div>
        </div>
      </div>

      {/* Quick Add Client Modal */}
      {isQuickClientOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              Quick Register New Client
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Add new clothing customer into revolving credit ledger
            </p>

            <form onSubmit={handleCreateQuickClient} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Client Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={quickName}
                  onChange={(e) => setQuickName(e.target.value)}
                  placeholder="e.g. Tariq Mahmood"
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Mobile Phone (for WhatsApp Reminders) *
                </label>
                <input
                  type="tel"
                  required
                  value={quickPhone}
                  onChange={(e) => setQuickPhone(e.target.value)}
                  placeholder="e.g. 0300-1234567"
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Current Folio / Page #
                  </label>
                  <input
                    type="text"
                    value={quickFolio}
                    onChange={(e) => setQuickFolio(e.target.value)}
                    placeholder="e.g. B2-P105"
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Credit Limit ({curr})
                  </label>
                  <input
                    type="number"
                    value={quickCreditLimit}
                    onChange={(e) => setQuickCreditLimit(parseFloat(e.target.value) || 50000)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Reference # of Previous Page of Physical Record
                </label>
                <input
                  type="text"
                  value={quickPrevFolio}
                  onChange={(e) => setQuickPrevFolio(e.target.value)}
                  placeholder="e.g. B1-P180 or Register Vol 1, Page 45"
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
                />
                <span className="text-[10px] text-slate-400">Links this digital profile to older paper register books.</span>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Address / City
                </label>
                <input
                  type="text"
                  value={quickAddress}
                  onChange={(e) => setQuickAddress(e.target.value)}
                  placeholder="e.g. Model Town, Lahore"
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsQuickClientOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold"
                >
                  Register Client
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
