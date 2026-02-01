


// Print Sale Receipt Utility (top-level for global scope)
function printSaleReceipt(sale: {
  saleDate: string;
  customerName?: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
}) {
  const businessName = (typeof window !== 'undefined' && window.localStorage.getItem('business_name')) || 'Business';
  const businessAddress = (typeof window !== 'undefined' && window.localStorage.getItem('business_address')) || '';
  const businessPhone = (typeof window !== 'undefined' && window.localStorage.getItem('business_phone')) || '';
  const businessEmail = (typeof window !== 'undefined' && window.localStorage.getItem('business_email')) || '';
  const win = window.open('', 'PRINT', 'height=600,width=400');
  if (win) {
    win.document.write(`
      <html>
        <head>
          <title>Receipt</title>
          <style>
            body { font-family: Arial, sans-serif; font-size: 13px; margin: 0; padding: 0; }
            .receipt { max-width: 320px; margin: 0 auto; padding: 16px; border: 1px solid #eee; }
            .header { text-align: center; margin-bottom: 12px; }
            .details { margin-bottom: 12px; }
            .footer { text-align: center; margin-top: 16px; font-size: 11px; color: #888; }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="header">
              <h2 style="margin:0;">${businessName}</h2>
              <div>${businessAddress}</div>
              <div>${businessPhone}</div>
              <div>${businessEmail}</div>
            </div>
            <div class="details">
              <div>Date: ${new Date(sale.saleDate).toLocaleDateString()}</div>
              <div>Customer: ${sale.customerName || 'Cash Sale'}</div>
              <div>Product: ${sale.productName}</div>
              <div>Quantity: ${sale.quantity}</div>
              <div>Unit Price: ${sale.unitPrice}</div>
              <div>Total: ${sale.totalAmount}</div>
            </div>
            <div class="footer">Thank you for your business!</div>
          </div>
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
    win.print();
    win.close();
  }
}

import React, { useState, useEffect, useMemo, useRef } from "react";

import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

// Top-level formatCurrency utility for all usages
function formatCurrency(amount: number, currency: string, currencyRates?: Record<string, number>) {
  const rate = currencyRates?.[currency] ?? 1;
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount * rate);
}


// --- Invoice Actions Handlers ---
interface Invoice {
  _id: string;
  invoiceNumber: string;
  clientName: string;
  amount: number;
  status: "paid" | "pending" | "overdue";
  dueDate: string;
  createdAt: string;
  balance?: number;
}

function handleViewInvoice(invoice: Invoice) {
  alert(`Viewing invoice #${invoice.invoiceNumber}`);
}

function handleEditInvoice(invoice: Invoice) {
  alert(`Editing invoice #${invoice.invoiceNumber}`);
}

function handleDownloadInvoice(invoice: Invoice) {
  alert(`Downloading invoice #${invoice.invoiceNumber}`);
}

// --- PaymentForm Component ---
interface PaymentFormProps {
  invoice: Invoice;
  currency: string;
  currencyRates: Record<string, number>;
  onPaymentSuccess: () => void;
}

function PaymentForm({ invoice, currency, currencyRates, onPaymentSuccess }: PaymentFormProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  const methodRef = useRef<HTMLSelectElement>(null);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const amount = parseFloat(amountRef.current?.value || "");
    const method = methodRef.current?.value || "";
    if (!amount || amount <= 0) {
      setError("Enter a valid amount");
      setSaving(false);
      return;
    }
    const res = await fetch(`/api/business-sales/${invoice._id}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount, method })
    });
    if (res.ok) {
      if (onPaymentSuccess) {
        await res.json();
        onPaymentSuccess();
      }
      if (amountRef.current) amountRef.current.value = "";
      setSaving(false);
    } else {
      setError("Payment failed");
      setSaving(false);
    }
  };
  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 mt-1">
      <div className="relative flex items-center">
        <span className="absolute left-3 text-xs text-slate-500">{currency}</span>
        <input
          type="number"
          name="amount"
          min="0.01"
          max={typeof invoice.balance === "number" && invoice.balance > 0 ? (invoice.balance * (currencyRates[currency] ?? 1)).toFixed(2) : (invoice.amount * (currencyRates[currency] ?? 1)).toFixed(2)}
          step="0.01"
          placeholder={`Amount (${currency})`}
          className="w-36 rounded border px-8 py-2 text-sm text-right"
          required
          ref={amountRef}
        />
      </div>
      <select name="method" className="rounded border px-2 py-1 text-xs" required ref={methodRef}>
        <option value="cash">Cash</option>
        <option value="card">Card</option>
        <option value="bank_transfer">Bank Transfer</option>
        <option value="other">Other</option>
      </select>
      <button type="submit" className="rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700" disabled={saving}>
        {saving ? "Saving..." : "Record Payment"}
      </button>
      {error && <span className="text-xs text-red-600 ml-2">{error}</span>}
    </form>
  );
}




// Business Registration Form Component


function BusinessRegistrationForm() {
  const { data: session } = useSession();
  const [form, setForm] = useState({
    businessName: "",
    address: "",
    email: "",
    phone: "",
    taxNumber: ""
  });
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load business info from API
  useEffect(() => {
    const fetchBusinessInfo = async () => {
      try {
        const res = await fetch("/api/business-information", { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          if (data && data.businessName) {
            setForm({
              businessName: data.businessName || "",
              address: data.address || "",
              email: data.email || "",
              phone: data.phone || "",
              taxNumber: data.taxNumber || ""
            });
          }
        }
      } catch (err) {
        // ignore
      }
    };
    fetchBusinessInfo();
  }, [typeof session?.user === "object" && session?.user && "id" in session.user ? (session.user as any).id : undefined]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setError(null);
    setSuccess(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    if (!form.businessName.trim()) {
      setError("Business name is required.");
      setSaving(false);
      return;
    }
    if (!form.email.trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) {
      setError("A valid email is required.");
      setSaving(false);
      return;
    }
    try {
      const res = await fetch("/api/business-information", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
        credentials: "include"
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error || "Failed to save business details.");
      } else {
        setSuccess("Business details saved successfully!");
        setEditing(false);
      }
    } catch (err) {
      setError("Failed to save business details.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSave}>
      <div>
        <label className="block text-sm font-medium mb-1">Business Name <span className="text-red-500">*</span></label>
        <input
          type="text"
          name="businessName"
          className="w-full rounded border px-3 py-2"
          value={form.businessName}
          onChange={handleChange}
          disabled={!editing}
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Address</label>
        <textarea
          name="address"
          className="w-full rounded border px-3 py-2"
          value={form.address}
          onChange={handleChange}
          disabled={!editing}
          rows={2}
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Email <span className="text-red-500">*</span></label>
          <input
            type="email"
            name="email"
            className="w-full rounded border px-3 py-2"
            value={form.email}
            onChange={handleChange}
            disabled={!editing}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Phone</label>
          <input
            type="tel"
            name="phone"
            className="w-full rounded border px-3 py-2"
            value={form.phone}
            onChange={handleChange}
            disabled={!editing}
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Tax Number</label>
        <input
          type="text"
          name="taxNumber"
          className="w-full rounded border px-3 py-2"
          value={form.taxNumber}
          onChange={handleChange}
          disabled={!editing}
        />
      </div>
      {error && <div className="text-red-600 text-sm">{error}</div>}
      {success && <div className="text-green-600 text-sm">{success}</div>}
      <div className="flex gap-2 mt-4">
        {editing ? (
          <>
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              disabled={saving}
            >
              {saving ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400"
              onClick={() => { setEditing(false); setError(null); setSuccess(null); }}
              disabled={saving}
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            type="button"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            onClick={() => setEditing(true)}
          >
            Edit
          </button>
        )}
      </div>
    </form>
  );
}

interface Expense {
  _id: string;
  label: string;
  amount: number;
  category: string;
  occurredOn: string;
  createdAt: string;
}

interface Sale {
  _id: string;
  productId?: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  customerName?: string;
  saleType: "cash" | "credit";
  status: "paid" | "pending";
  paymentMethod?: "cash" | "card" | "bank_transfer" | "other";
  saleDate: string;
  dueDate?: string;
  createdAt: string;
  invoiceNumber?: string;
  balance?: number; // <-- add this line
}

interface InventoryItem {
  _id: string;
  name: string;
  sku?: string;
  unitPrice: number;
  sellingPrice?: number;
  quantityInStock: number;
  createdAt: string;
}

interface Announcement {
  _id: string;
  title: string;
  body: string;
  createdAt: string;
}

export default function BusinessPage() {
    // --- Invoice Filters State ---
    const [invoiceSearch, setInvoiceSearch] = useState("");
    const [invoiceStatusFilter, setInvoiceStatusFilter] = useState("all");

  // --- Income Filters State ---
  const [incomeSearch, setIncomeSearch] = useState("");
  const [incomeTypeFilter, setIncomeTypeFilter] = useState("all"); // all, cash, credit
  const [incomeDateStart, setIncomeDateStart] = useState("");
  const [incomeDateEnd, setIncomeDateEnd] = useState("");

  const router = useRouter();
  const { data: session } = useSession();
  const [activeSection, setActiveSection] = useState("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const currencyRates = {
    USD: 1,
    KES: 160,
    UGX: 3800
  } as const;
  const [currency, setCurrency] = useState<keyof typeof currencyRates>("USD");
  const [expenses, setExpenses] = useState<Expense[]>([]);
  // Expense filters
  const [expenseSearch, setExpenseSearch] = useState("");
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState("all");
  const [sales, setSales] = useState<Sale[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
    // Create Invoice Modal State (must be declared at top level)
  const [loading, setLoading] = useState(false);
  const [salesLoading, setSalesLoading] = useState(false);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [showSaleForm, setShowSaleForm] = useState(false);
  const [saleType, setSaleType] = useState<"cash" | "credit">("cash");
  const [saleForm, setSaleForm] = useState({
    productId: "",
    productName: "",
    quantity: "",
    unitPrice: "",
    customerName: "",
    saleDate: new Date().toISOString().split("T")[0],
    paymentMethod: "cash" as Sale["paymentMethod"],
    dueDate: ""
  });
  const [saleSaving, setSaleSaving] = useState(false);
  const [saleError, setSaleError] = useState<string | null>(null);
  const [showInventoryForm, setShowInventoryForm] = useState(false);
  const [editingInventoryId, setEditingInventoryId] = useState<string | null>(null);
  const [inventoryForm, setInventoryForm] = useState({
    name: "",
    sku: "",
    unitPrice: "",
    sellingPrice: "",
    quantityInStock: ""
  });
  const [inventorySaving, setInventorySaving] = useState(false);
  const [inventoryError, setInventoryError] = useState<string | null>(null);
  const [inventorySearch, setInventorySearch] = useState("");
  const [inventoryStockFilter, setInventoryStockFilter] = useState<"all" | "in" | "out">("all");
  const [inventoryActivityFilter, setInventoryActivityFilter] = useState("");
  const [inventoryActivityStartDate, setInventoryActivityStartDate] = useState("");
  const [inventoryActivityEndDate, setInventoryActivityEndDate] = useState("");
  const filteredSales = sales.filter(sale => {
    const matchesProduct = sale.productName.toLowerCase().includes(inventoryActivityFilter.toLowerCase());
    const saleDate = new Date(sale.saleDate);
    const afterStart = !inventoryActivityStartDate || saleDate >= new Date(inventoryActivityStartDate);
    const beforeEnd = !inventoryActivityEndDate || saleDate <= new Date(inventoryActivityEndDate + 'T23:59:59');
    return matchesProduct && afterStart && beforeEnd;
  });

  // --- Sales Trend Chart State and Logic ---
  const [salesTrendPeriod, setSalesTrendPeriod] = useState("this_month");
  const salesTrendData = useMemo(() => {
    // Filter and group sales by week or month depending on period
    const now = new Date();
    let start: Date, end: Date, numBuckets: number, labels: string[] = [];
    if (salesTrendPeriod === "this_month") {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      numBuckets = 4;
      labels = ["Week 1", "Week 2", "Week 3", "Week 4"];
    } else if (salesTrendPeriod === "last_month") {
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      start = lastMonth;
      end = new Date(now.getFullYear(), now.getMonth(), 0);
      numBuckets = 4;
      labels = ["Week 1", "Week 2", "Week 3", "Week 4"];
    } else {
      // last 3 months
      start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      numBuckets = 3;
      labels = [];
      for (let i = 0; i < 3; i++) {
        const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
        labels.push(d.toLocaleString(undefined, { month: "short" }));
      }
    }
    // Prepare buckets
    const buckets = Array(numBuckets).fill(0);
    sales.forEach(sale => {
      const date = new Date(sale.saleDate);
      if (date < start || date > end) return;
      let bucketIdx = 0;
      if (salesTrendPeriod === "last_3_months") {
        bucketIdx = date.getMonth() - start.getMonth();
      } else {
        // week of month
        const day = date.getDate();
        const week = Math.floor((day - 1) / 7);
        bucketIdx = Math.min(week, numBuckets - 1);
      }
      const amount = (typeof sale.unitPrice === "number" && typeof sale.quantity === "number"
        ? sale.unitPrice * sale.quantity
        : sale.totalAmount || 0);
      buckets[bucketIdx] += amount;
    });
    return { buckets, labels, start, end };
  }, [sales, salesTrendPeriod]);

  const maxY = useMemo(() => {
    const max = Math.max(...salesTrendData.buckets, 100);
    // Round up to nearest 25/50/100 for nice grid
    if (max <= 100) return 100;
    if (max <= 500) return Math.ceil(max / 25) * 25;
    if (max <= 1000) return Math.ceil(max / 50) * 50;
    return Math.ceil(max / 100) * 100;
  }, [salesTrendData]);

  const salesTrendPoints = useMemo(() => {
    // Map buckets to SVG points
    const n = salesTrendData.buckets.length;
    return salesTrendData.buckets.map((val, i) => ({
      x: (i * 700) / (n - 1),
      y: 200 - (val / maxY) * 180 - 10 // 10px padding top/bottom
    }));
  }, [salesTrendData, maxY]);

  const salesTrendPath = useMemo(() => {
    if (salesTrendPoints.length === 0) return "";
    return salesTrendPoints.map((pt, i) => `${i === 0 ? "M" : "L"} ${pt.x} ${pt.y}`).join(" ");
  }, [salesTrendPoints]);

  const salesTrendAreaPath = useMemo(() => {
    if (salesTrendPoints.length === 0) return "";
    const area = salesTrendPoints.map((pt, i) => `${i === 0 ? "M" : "L"} ${pt.x} ${pt.y}`).join(" ");
    const last = salesTrendPoints[salesTrendPoints.length - 1];
    return `${area} L ${last.x} 200 L 0 200 Z`;
  }, [salesTrendPoints]);

  const salesTrendLabels = salesTrendData.labels;

  // Calculate % change from previous period
  const salesTrendChangeText = useMemo(() => {
    if (salesTrendData.buckets.length === 0) return "";
    const sum = salesTrendData.buckets.reduce((a, b) => a + b, 0);
    // Compare to previous period
    let prevSum = 0;
    if (salesTrendPeriod === "this_month" || salesTrendPeriod === "last_month") {
      // Previous month
      // removed unused variable 'now'
      const prevStart = new Date(salesTrendData.start);
      prevStart.setMonth(prevStart.getMonth() - 1);
      const prevEnd = new Date(salesTrendData.start);
      prevEnd.setDate(0);
      prevSum = sales.filter(sale => {
        const date = new Date(sale.saleDate);
        return date >= prevStart && date <= prevEnd;
      }).reduce((acc, sale) => acc + ((typeof sale.unitPrice === "number" && typeof sale.quantity === "number"
        ? sale.unitPrice * sale.quantity
        : sale.totalAmount || 0) * (currencyRates[currency] ?? 1)), 0);
    } else {
      // Last 3 months: compare to previous 3 months
      const prevStart = new Date(salesTrendData.start);
      prevStart.setMonth(prevStart.getMonth() - 3);
      const prevEnd = new Date(salesTrendData.start);
      prevEnd.setDate(0);
      prevSum = sales.filter(sale => {
        const date = new Date(sale.saleDate);
        return date >= prevStart && date <= prevEnd;
      }).reduce((acc, sale) => acc + ((typeof sale.unitPrice === "number" && typeof sale.quantity === "number"
        ? sale.unitPrice * sale.quantity
        : sale.totalAmount || 0) * (currencyRates[currency] ?? 1)), 0);
    }
    if (prevSum === 0) return "N/A";
    const pct = ((sum - prevSum) / prevSum) * 100;
    const arrow = pct >= 0 ? "↑" : "↓";
    const color = pct >= 0 ? "text-green-600" : "text-red-600";
    return <span className={`font-semibold ${color}`}>{arrow} {Math.abs(pct).toFixed(1)}% from last period</span>;
  }, [salesTrendData, sales, currency, salesTrendPeriod]);

  useEffect(() => {
    const storedCurrency = typeof window !== "undefined" ? window.localStorage.getItem("business_currency") : null;
    if (storedCurrency && Object.keys(currencyRates).includes(storedCurrency)) {
      setCurrency(storedCurrency as keyof typeof currencyRates);
    }
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const userId = (session?.user as any)?.id as string | undefined;
      const announcementUrl = new URL("/api/announcements", window.location.origin);
      announcementUrl.searchParams.set("audience", "business");
      if (userId) {
        announcementUrl.searchParams.set("userId", userId);
      }

      if (userId) {
        setSalesLoading(true);
        setInventoryLoading(true);
      }

      const expensesPromise = userId ? fetch(`/api/expenses?userId=${userId}`) : fetch("/api/expenses");
      const salesPromise = userId ? fetch(`/api/business-sales?userId=${userId}`) : Promise.resolve(null);
      const inventoryPromise = userId ? fetch(`/api/inventory?userId=${userId}`, { cache: "no-store" }) : Promise.resolve(null);
      const announcementsPromise = fetch(announcementUrl.toString());

      const [expensesRes, salesRes, inventoryRes, announcementsRes] = await Promise.all([
        expensesPromise,
        salesPromise,
        inventoryPromise,
        announcementsPromise
      ]);

      const expensesData = expensesRes ? await expensesRes.json() : [];
      const salesData = salesRes ? await salesRes.json() : [];
      const inventoryData = inventoryRes ? await inventoryRes.json() : [];
      const announcementsData = announcementsRes ? await announcementsRes.json() : [];

      setExpenses(Array.isArray(expensesData) ? expensesData : []);
      setSales(Array.isArray(salesData) ? salesData : []);
      setInventory(Array.isArray(inventoryData) ? inventoryData : []);
      setAnnouncements(Array.isArray(announcementsData) ? announcementsData : []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setSalesLoading(false);
      setInventoryLoading(false);
      setLoading(false);
    }
  };

  const availableProducts = inventory.filter((item) => item.quantityInStock > 0);
  const filteredInventory = inventory.filter((item) => {
    const matchesSearch = [item.name, item.sku]
      .filter(Boolean)
      .some((value) => value!.toLowerCase().includes(inventorySearch.toLowerCase()));
    const matchesStock =
      inventoryStockFilter === "all" ? true :
      inventoryStockFilter === "in" ? item.quantityInStock > 0 :
      item.quantityInStock === 0;
    return matchesSearch && matchesStock;
  });
  const selectedProduct = availableProducts.find((item) => item._id === saleForm.productId);

  useEffect(() => {
    if (!saleForm.productId) return;
    const item = availableProducts.find((product) => product._id === saleForm.productId);
    if (!item) return;
    const currencyRate = currencyRates[currency] ?? 1;
    setSaleForm((prev) => ({
      ...prev,
      unitPrice: item.sellingPrice !== undefined
        ? String(Number(item.sellingPrice * currencyRate).toFixed(2))
        : ""
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currency, saleForm.productId, availableProducts]);

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg> },
    { id: "inventory", label: "Inventory", icon: <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg> },
    { id: "sales", label: "Sales", icon: <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg> },
    { id: "expenses", label: "Expenses", icon: <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg> },
    { id: "income", label: "Income", icon: <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
    { id: "invoices", label: "Invoices", icon: <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> },
    { id: "reports", label: "Reports", icon: <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg> },
    { id: "settings", label: "Settings", icon: <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg> }
  ];

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push("/");
  };

  const handleSaveSale = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaleError(null);

    const userId = (session?.user as any)?.id as string | undefined;
    if (!userId) {
      setSaleError("Unable to record sales without a business account.");
      return;
    }
    if (!saleForm.productId || !selectedProduct) {
      setSaleError("Please select a product in stock.");
      return;
    }
    if (saleForm.quantity === "") {
      setSaleError("Quantity is required.");
      return;
    }
    const quantityValue = Number(saleForm.quantity);
    if (Number.isNaN(quantityValue) || quantityValue <= 0) {
      setSaleError("Quantity must be greater than zero.");
      return;
    }
    if (quantityValue > selectedProduct.quantityInStock) {
      setSaleError("Quantity exceeds available stock.");
      return;
    }
    if (saleType === "credit" && !saleForm.customerName.trim()) {
      setSaleError("Customer name is required for credit sales.");
      return;
    }
    if (saleType === "credit" && !saleForm.dueDate) {
      setSaleError("Due date is required for credit sales.");
      return;
    }
    if (saleType === "cash" && !saleForm.paymentMethod) {
      setSaleError("Payment method is required for cash sales.");
      return;
    }

    try {
      setSaleSaving(true);
      const response = await fetch("/api/business-sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: saleForm.productId,
          productName: saleForm.productName.trim(),
          quantity: quantityValue,
          unitPrice: Number(saleForm.unitPrice || 0),
          customerName: saleForm.customerName.trim() || undefined,
          saleType,
          paymentMethod: saleType === "cash" ? saleForm.paymentMethod : undefined,
          saleDate: saleForm.saleDate,
          dueDate: saleType === "credit" ? saleForm.dueDate : undefined,
          userId
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        setSaleError(errorData?.error || "Failed to record sale.");
        return;
      }

      const newSale = await response.json();
      setSales((prev) => [newSale, ...prev]);
      setInventory((prev) =>
        prev.map((item) =>
          item._id === saleForm.productId
            ? { ...item, quantityInStock: Math.max(0, item.quantityInStock - quantityValue) }
            : item
        )
      );
      setSaleForm({
        productId: "",
        productName: "",
        quantity: "",
        unitPrice: "",
        customerName: "",
        saleDate: new Date().toISOString().split("T")[0],
        paymentMethod: "cash",
        dueDate: ""
      });
      setShowSaleForm(false);
    } catch (error) {
      console.error("Error recording sale:", error);
      setSaleError("Failed to record sale.");
    } finally {
      setSaleSaving(false);
    }
  };

  const handleDeleteSale = async (saleId: string) => {
    const userId = (session?.user as any)?.id as string | undefined;
    if (!userId) return;

    try {
      const response = await fetch(`/api/business-sales/${saleId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId })
      });
      if (!response.ok) return;
      setSales((prev) => prev.filter((sale) => sale._id !== saleId));
    } catch (error) {
      console.error("Error deleting sale:", error);
    }
  };

  const handleSaveInventory = async (event: React.FormEvent) => {
    event.preventDefault();
    setInventoryError(null);

    const userId = (session?.user as any)?.id as string | undefined;
    if (!userId) {
      setInventoryError("Unable to add inventory without a business account.");
      return;
    }
    if (!inventoryForm.name.trim()) {
      setInventoryError("Product name is required.");
      return;
    }
    if (inventoryForm.unitPrice === "") {
      setInventoryError("Cost price is required.");
      return;
    }
    if (inventoryForm.sellingPrice === "") {
      setInventoryError("Selling price is required.");
      return;
    }
    if (inventoryForm.quantityInStock === "") {
      setInventoryError("Quantity is required.");
      return;
    }

    const unitPriceValue = Number(inventoryForm.unitPrice);
    const sellingPriceValue = Number(inventoryForm.sellingPrice);
    const quantityValue = Number(inventoryForm.quantityInStock);
    const currencyRate = currencyRates[currency] ?? 1;
    const unitPriceBase = unitPriceValue / currencyRate;
    const sellingPriceBase = sellingPriceValue / currencyRate;

    if (Number.isNaN(unitPriceValue) || unitPriceValue < 0) {
      setInventoryError("Cost price must be 0 or higher.");
      return;
    }
    if (Number.isNaN(sellingPriceValue) || sellingPriceValue < 0) {
      setInventoryError("Selling price must be 0 or higher.");
      return;
    }
    if (Number.isNaN(quantityValue) || quantityValue < 0) {
      setInventoryError("Quantity must be 0 or higher.");
      return;
    }

    try {
      setInventorySaving(true);
      const response = await fetch(editingInventoryId ? `/api/inventory/${editingInventoryId}` : "/api/inventory", {
        method: editingInventoryId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: inventoryForm.name.trim(),
          sku: inventoryForm.sku.trim() || undefined,
          unitPrice: unitPriceBase,
          sellingPrice: sellingPriceBase,
          quantityInStock: quantityValue,
          userId
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        setInventoryError(errorData?.error || "Failed to add inventory item.");
        return;
      }

      const savedItem = await response.json();
      setInventory((prev) => {
        const next = editingInventoryId
          ? prev.map((item) => (item._id === editingInventoryId ? savedItem : item))
          : [...prev, savedItem];
        return next.sort((a, b) => a.name.localeCompare(b.name));
      });
      await refreshInventory();
      resetInventoryForm();
    } catch (error) {
      console.error("Error adding inventory item:", error);
      setInventoryError("Failed to add inventory item.");
    } finally {
      setInventorySaving(false);
    }
  };

  const handleDeleteInventory = async (itemId: string) => {
    const userId = (session?.user as any)?.id as string | undefined;
    if (!userId) return;

    try {
      const response = await fetch(`/api/inventory/${itemId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId })
      });
      if (!response.ok) return;
      setInventory((prev) => prev.filter((item) => item._id !== itemId));
    } catch (error) {
      console.error("Error deleting inventory item:", error);
    }
  };

  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    label: "",
    amount: "",
    category: "General",
    occurredOn: new Date().toISOString().split("T")[0],
  });
  const [expenseSaving, setExpenseSaving] = useState(false);
  const [expenseError, setExpenseError] = useState<string | null>(null);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setExpenseError(null);
    setExpenseSaving(true);
    try {
      let res;
      const userId = (session?.user as any)?.id as string | undefined;
      // Convert amount from selected currency to base (USD)
      const rate = currencyRates[currency] ?? 1;
      const amountBase = Number(expenseForm.amount) / rate;
      if (editingExpenseId) {
        res = await fetch(`/api/expenses/${editingExpenseId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            label: expenseForm.label,
            amount: amountBase,
            category: expenseForm.category,
            occurredOn: expenseForm.occurredOn,
            ...(userId ? { userId } : {})
          }),
        });
      } else {
        res = await fetch("/api/expenses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            label: expenseForm.label,
            amount: amountBase,
            category: expenseForm.category,
            occurredOn: expenseForm.occurredOn,
            ...(userId ? { userId } : {})
          }),
        });
      }
      if (!res.ok) throw new Error(editingExpenseId ? "Failed to update expense" : "Failed to add expense");
      const updatedExpense = await res.json();
      setExpenses((prev) => {
        if (editingExpenseId) {
          return prev.map((exp) => exp._id === editingExpenseId ? updatedExpense : exp);
        } else {
          return [updatedExpense, ...prev];
        }
      });
      setShowExpenseForm(false);
      setExpenseForm({ label: "", amount: "", category: "General", occurredOn: new Date().toISOString().split("T")[0] });
      setEditingExpenseId(null);
    } catch (err: any) {
      setExpenseError(err.message || (editingExpenseId ? "Error updating expense" : "Error adding expense"));
    } finally {
      setExpenseSaving(false);
    }
  };

  const handleEditExpense = (expense: Expense) => {
    // Convert amount from base (USD) to selected currency for editing
    const rate = currencyRates[currency] ?? 1;
    setExpenseForm({
      label: expense.label,
      amount: String((expense.amount * rate).toFixed(2)),
      category: expense.category,
      occurredOn: expense.occurredOn.split("T")[0],
    });
    setEditingExpenseId(expense._id);
    setShowExpenseForm(true);
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (!window.confirm("Are you sure you want to delete this expense?")) return;
    try {
      setExpenseSaving(true);
      const res = await fetch(`/api/expenses/${expenseId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete expense");
      setExpenses((prev) => prev.filter((exp) => exp._id !== expenseId));
    } catch (err: any) {
      alert(err.message || "Error deleting expense");
    } finally {
      setExpenseSaving(false);
    }
  };

  const resetInventoryForm = () => {
    setInventoryForm({ name: "", sku: "", unitPrice: "", sellingPrice: "", quantityInStock: "" });
    setShowInventoryForm(false);
    setEditingInventoryId(null);
  };

  const refreshInventory = async () => {
    const userId = (session?.user as any)?.id as string | undefined;
    if (!userId) return;
    try {
      setInventoryLoading(true);
      const response = await fetch(`/api/inventory?userId=${userId}`, { cache: "no-store" });
      const data = await response.json();
      setInventory(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error refreshing inventory:", error);
    } finally {
      setInventoryLoading(false);
    }
  };

  const handleExportInventory = () => {
    const rows = [
      ["Product", "SKU", "Cost", "Selling", "In Stock", "Date Added"],
      ...filteredInventory.map((item) => [
        item.name,
        item.sku ?? "",
        String(item.unitPrice ?? 0),
        String(item.sellingPrice ?? item.unitPrice ?? 0),
        String(item.quantityInStock ?? 0),
        new Date(item.createdAt).toLocaleDateString()
      ])
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `inventory_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrintInventory = () => {
    const tableRows = filteredInventory.map((item) => `
      <tr>
        <td>${item.name}</td>
        <td>${item.sku ?? "-"}</td>
        <td>${formatCurrency(Number(item.unitPrice ?? 0), currency, currencyRates)}</td>
        <td>${formatCurrency(Number(item.sellingPrice ?? item.unitPrice ?? 0), currency, currencyRates)}</td>
        <td>${item.quantityInStock}</td>
        <td>${new Date(item.createdAt).toLocaleDateString()}</td>
      </tr>
    `).join("");

    const printWindow = window.open("", "", "width=900,height=700");
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Inventory</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; }
            h1 { font-size: 20px; margin-bottom: 16px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #e2e8f0; padding: 8px; text-align: left; }
            th { background: #1d4ed8; color: #fff; text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em; }
          </style>
        </head>
        <body>
          <h1>Inventory Report (${new Date().toLocaleDateString()})</h1>
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th>Cost</th>
                <th>Selling</th>
                <th>In Stock</th>
                <th>Date Added</th>
              </tr>
            </thead>
            <tbody>${tableRows}</tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  // Calculate totals
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  const expensesThisMonth = (Array.isArray(expenses) ? expenses : []).filter(exp => {
    const date = new Date(exp.occurredOn);
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
  });
  const totalExpenses = (Array.isArray(expenses) ? expenses : []).reduce((sum, exp) => sum + exp.amount, 0);
  const totalExpensesThisMonth = expensesThisMonth.reduce((sum, exp) => sum + exp.amount, 0);
  const averageDailyExpenses = expensesThisMonth.length > 0 ? totalExpensesThisMonth / currentDate.getDate() : 0;
  
  // Filtered expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter(exp => {
      // Search filter
      const search = expenseSearch.trim().toLowerCase();
      const matchesSearch =
        !search ||
        exp.label.toLowerCase().includes(search) ||
        (exp.category && exp.category.toLowerCase().includes(search));
      // Category filter
      const matchesCategory = expenseCategoryFilter === "all" || (exp.category || "General") === expenseCategoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [expenses, expenseSearch, expenseCategoryFilter]);
  const totalSales = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
  const cashSales = sales.filter((sale) => sale.saleType === "cash");
  const creditSales = sales.filter((sale) => sale.saleType === "credit");
  // Use real sales on credit as invoices
  const creditInvoices: Invoice[] = creditSales.map((sale, idx) => ({
    _id: sale._id,
    invoiceNumber: sale.invoiceNumber || `INV-${(idx + 1).toString().padStart(3, "0")}`,
    clientName: sale.customerName || "N/A",
    amount: sale.totalAmount,
    status: sale.status,
    dueDate: sale.dueDate || sale.saleDate,
    createdAt: sale.saleDate,
    balance: sale.balance // include balance if available from backend
  }));
  // Advanced income filters
  const filteredCashSales = useMemo(() => {
    return cashSales.filter((sale) => {
      // Search filter
      const search = incomeSearch.trim().toLowerCase();
      const matchesSearch =
        !search ||
        (sale.productName && sale.productName.toLowerCase().includes(search)) ||
        (sale.customerName && sale.customerName.toLowerCase().includes(search));
      // Type filter
      const matchesType = incomeTypeFilter === "all" || incomeTypeFilter === "cash";
      // Date range filter
      const saleDate = new Date(sale.saleDate);
      const matchesStart = !incomeDateStart || saleDate >= new Date(incomeDateStart);
      const matchesEnd = !incomeDateEnd || saleDate <= new Date(incomeDateEnd);
      return matchesSearch && matchesType && matchesStart && matchesEnd;
    });
  }, [cashSales, incomeSearch, incomeTypeFilter, incomeDateStart, incomeDateEnd, currency]);

  const filteredCreditPayments = useMemo(() => {
    return creditInvoices.filter((inv) => {
      // Include all invoices with any payment (partial or full, including fully paid)
      const paidAmount = typeof inv.balance === "number" ? inv.amount - inv.balance : 0;
      if (paidAmount <= 0) return false;
      // Search filter
      const search = incomeSearch.trim().toLowerCase();
      const matchesSearch =
        !search ||
        inv.invoiceNumber.toLowerCase().includes(search) ||
        inv.clientName.toLowerCase().includes(search);
      // Type filter
      const matchesType = incomeTypeFilter === "all" || incomeTypeFilter === "credit";
      // Date range filter
      const createdAt = new Date(inv.createdAt);
      const matchesStart = !incomeDateStart || createdAt >= new Date(incomeDateStart);
      const matchesEnd = !incomeDateEnd || createdAt <= new Date(incomeDateEnd);
      return matchesSearch && matchesType && matchesStart && matchesEnd;
    });
  }, [creditInvoices, incomeSearch, incomeTypeFilter, incomeDateStart, incomeDateEnd]);
  const pendingCreditSales = creditSales.filter((sale) => sale.status === "pending");
  const totalQuantity = sales.reduce((sum, sale) => sum + sale.quantity, 0);
  const totalIncome = creditInvoices.filter(inv => inv.status === "paid").reduce((sum, inv) => sum + inv.amount, 0);
  const pendingInvoices = creditInvoices.filter(inv => inv.status === "pending");
  const overdueInvoices = creditInvoices.filter(inv => inv.status === "overdue");
  const filteredInvoices = useMemo(() => {
    return creditInvoices.filter(inv => {
      const matchesSearch =
        invoiceSearch.trim() === "" ||
        inv.invoiceNumber.toLowerCase().includes(invoiceSearch.trim().toLowerCase()) ||
        inv.clientName.toLowerCase().includes(invoiceSearch.trim().toLowerCase());
      const matchesStatus =
        invoiceStatusFilter === "all" ||
        inv.status === invoiceStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [creditInvoices, invoiceSearch, invoiceStatusFilter]);
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Mobile Menu Overlay */}
      {/* Removed orphaned Create Invoice Modal */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-gradient-to-b from-blue-600 to-blue-800 text-white transition-transform duration-300 lg:relative lg:translate-x-0 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo/Header */}
        <div className="border-b border-blue-500 px-6 py-5">
          <h1 className="text-xl font-bold">Business Portal</h1>
          <p className="mt-1 text-xs text-blue-200">Financial Management</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveSection(item.id);
                setMobileMenuOpen(false);
              }}
              className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-medium transition ${
                activeSection === item.id
                  ? "bg-white text-blue-700 shadow-sm"
                  : "text-blue-100 hover:bg-blue-700 hover:text-white"
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* User info */}
        <div className="border-t border-blue-500 px-6 py-4">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-400 text-sm font-bold">
              B
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold">Business</p>
              <p className="text-xs text-blue-200">Account Owner</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-600"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="border-b border-slate-200 bg-white px-4 py-3 shadow-sm lg:px-6 lg:py-4">
          <div className="flex items-center justify-between gap-3">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="rounded-lg border border-slate-300 bg-white p-2 text-slate-700 hover:bg-slate-50 lg:hidden"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <div className="flex-1">
              <h2 className="text-lg font-bold text-slate-900 lg:text-2xl">
                {menuItems.find((m) => m.id === activeSection)?.label}
              </h2>
              <p className="hidden text-sm text-slate-600 sm:block">
                Manage your business finances
              </p>
            </div>
            <div className="flex items-center gap-2 lg:gap-3">
              <div className="hidden sm:flex items-center gap-2">
                <label className="text-xs font-semibold text-slate-600">Currency</label>
                <select
                  value={currency}
                  onChange={(event) => {
                    const next = event.target.value as keyof typeof currencyRates;
                    setCurrency(next);
                    if (typeof window !== "undefined") {
                      window.localStorage.setItem("business_currency", next);
                    }
                  }}
                  className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  {Object.keys(currencyRates).map((code) => (
                    <option key={code} value={code}>{code}</option>
                  ))}
                </select>
              </div>
              <div className="relative hidden sm:block">
                <button
                  onClick={() => setShowNotifications((prev) => !prev)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 sm:flex sm:items-center sm:gap-2 lg:px-4"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                  <span className="hidden lg:inline">Notifications</span>
                  {announcements.length > 0 && (
                    <span className="ml-2 rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                      {announcements.length}
                    </span>
                  )}
                </button>
                {showNotifications && (
                  <div className="absolute right-0 z-50 mt-2 w-80 rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-slate-900">Notifications</h4>
                      <button
                        onClick={() => setShowNotifications(false)}
                        className="text-xs text-slate-500 hover:text-slate-700"
                      >
                        Close
                      </button>
                    </div>
                    <div className="mt-3 space-y-2 text-xs">
                      {announcements.length === 0 ? (
                        <p className="text-slate-500">No notifications yet.</p>
                      ) : (
                        announcements.map((announcement) => (
                          <div key={announcement._id} className="rounded-lg border border-blue-100 bg-blue-50 p-2">
                            <p className="font-semibold text-blue-900">{announcement.title}</p>
                            <p className="text-blue-700">{announcement.body}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
              <button
                onClick={handleLogout}
                className="rounded-lg bg-red-500 px-3 py-2 text-sm font-semibold text-white hover:bg-red-600 lg:hidden"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {activeSection === "dashboard" && (
            <div className="space-y-6">
              {/* Stats Cards */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {/* Business Income Summary (QuickBooks-style) */}
                <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-600">Total Income Received</p>
                      <p className="mt-2 text-2xl font-bold text-green-600">
                        {formatCurrency(
                          cashSales.reduce((sum, sale) => sum + sale.totalAmount, 0) +
                          creditInvoices.reduce((sum, inv) => sum + (inv.amount - (typeof inv.balance === "number" ? inv.balance : 0)), 0),
                          currency,
                          currencyRates
                        )}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">Includes cash sales</p>
                    </div>
                    <div className="rounded-full bg-green-100 p-3">
                      <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-600">Total Expenses</p>
                      <p className="mt-2 text-2xl font-bold text-red-600">{formatCurrency(totalExpenses, currency, currencyRates)}</p>
                      <p className="mt-1 text-xs text-slate-500">+8% from last month</p>
                    </div>
                    <div className="rounded-full bg-red-100 p-3">
                      <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-600">Net Profit</p>
                      <p className="mt-2 text-2xl font-bold text-blue-600">
                        {formatCurrency(
                          (
                            cashSales.reduce((sum, sale) => sum + sale.totalAmount, 0) +
                            creditInvoices.reduce((sum, inv) => sum + (inv.amount - (typeof inv.balance === "number" ? inv.balance : 0)), 0)
                          ) - totalExpenses,
                          currency,
                          currencyRates
                        )}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Profit margin: {
                          (cashSales.reduce((sum, sale) => sum + sale.totalAmount, 0) +
                          creditInvoices.reduce((sum, inv) => sum + (inv.amount - (typeof inv.balance === "number" ? inv.balance : 0)), 0))
                          ? (((
                              (
                                cashSales.reduce((sum, sale) => sum + sale.totalAmount, 0) +
                                creditInvoices.reduce((sum, inv) => sum + (inv.amount - (typeof inv.balance === "number" ? inv.balance : 0)), 0)
                              ) - totalExpenses
                            ) /
                            (cashSales.reduce((sum, sale) => sum + sale.totalAmount, 0) +
                              creditInvoices.reduce((sum, inv) => sum + (inv.amount - (typeof inv.balance === "number" ? inv.balance : 0)), 0))
                          ) * 100).toFixed(1)
                          : "0.0"
                        }%
                      </p>
                    </div>
                    <div className="rounded-full bg-blue-100 p-3">
                      <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-600">Pending Invoices</p>
                      <p className="mt-2 text-2xl font-bold text-amber-600">{pendingInvoices.length}</p>
                      <p className="mt-1 text-xs text-slate-500">{formatCurrency(pendingInvoices.reduce((sum, inv) => sum + inv.amount, 0), currency, currencyRates)} awaiting</p>
                    </div>
                    <div className="rounded-full bg-amber-100 p-3">
                      <svg className="h-6 w-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Recent Invoices */}
                <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 lg:p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-slate-900">Recent Invoices</h3>
                    <button 
                      onClick={() => setActiveSection("invoices")}
                      className="text-sm font-medium text-blue-600 hover:text-blue-700"
                      type="button"
                    >
                      View All →
                    </button>
                  </div>
                  <div className="space-y-3">
                    {creditInvoices.slice(0, 5).map((invoice) => (
                      <div key={invoice._id} className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                        <div>
                          <p className="font-medium text-slate-900">{invoice.invoiceNumber}</p>
                          <p className="text-sm text-slate-600">{invoice.clientName}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-slate-900">{formatCurrency(invoice.amount, currency, currencyRates)}</p>
                          <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                            invoice.status === "paid" ? "bg-green-100 text-green-700" :
                            invoice.status === "pending" ? "bg-amber-100 text-amber-700" :
                            "bg-red-100 text-red-700"
                          }`}>
                            {invoice.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent Expenses */}
                <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 lg:p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-slate-900">Recent Expenses</h3>
                    <button 
                      onClick={() => setActiveSection("expenses")}
                      className="text-sm font-medium text-blue-600 hover:text-blue-700"
                    >
                      View All →
                    </button>
                  </div>
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
                    </div>
                  ) : expenses.length === 0 ? (
                    <div className="py-8 text-center text-slate-500">
                      <p>No expenses recorded yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {expenses.slice(0, 5).map((expense) => (
                        <div key={expense._id} className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                          <div>
                            <p className="font-medium text-slate-900">{expense.label}</p>
                            <p className="text-sm text-slate-600">{new Date(expense.occurredOn).toLocaleDateString()}</p>
                          </div>
                          <p className="font-semibold text-red-600">{formatCurrency(-expense.amount, currency, currencyRates)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Financial Overview Charts */}
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Income vs Expenses Bar Chart (real data) */}
                <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 lg:p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-slate-900">Income vs Expenses</h3>
                  </div>
                  <div className="space-y-4">
                    {(() => {
                      // Get last 6 months labels
                      const now = new Date();
                      const months = [];
                      for (let i = 5; i >= 0; i--) {
                        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                        months.push({
                          label: d.toLocaleString(undefined, { month: "short" }),
                          year: d.getFullYear(),
                          month: d.getMonth()
                        });
                      }
                      // Group sales and expenses by month
                      const monthlyIncome = months.map(({ year, month }) => {
                        // Cash sales for this month
                        const cash = cashSales.filter(sale => {
                          const d = new Date(sale.saleDate);
                          return d.getFullYear() === year && d.getMonth() === month;
                        }).reduce((sum, sale) => sum + sale.totalAmount, 0);
                        // Payments received on credit sales for this month
                        const creditPayments = creditInvoices.reduce((sum, inv) => {
                          const d = new Date(inv.createdAt);
                          // Only count payments received in this month
                          if (d.getFullYear() === year && d.getMonth() === month) {
                            return sum + (typeof inv.balance === "number" && inv.balance < inv.amount ? inv.amount - inv.balance : 0);
                          }
                          return sum;
                        }, 0);
                        return cash + creditPayments;
                      });
                      const monthlyExpenses = months.map(({ year, month }) => {
                        return expenses.filter(exp => {
                          const d = new Date(exp.occurredOn);
                          return d.getFullYear() === year && d.getMonth() === month;
                        }).reduce((sum, exp) => sum + exp.amount, 0);
                      });
                      // Find max for bar width scaling
                      const maxVal = Math.max(...monthlyIncome, ...monthlyExpenses, 1);
                      return months.map((m, idx) => {
                        const income = monthlyIncome[idx];
                        const expense = monthlyExpenses[idx];
                        return (
                          <div key={m.label + m.year}>
                            <div className="mb-1 flex items-center justify-between text-sm">
                              <span className="font-medium text-slate-700">{m.label}</span>
                              <div className="flex gap-4 text-xs">
                                <span className="text-green-600">Income: {formatCurrency(income, currency, currencyRates)}</span>
                                <span className="text-red-600">Expenses: {formatCurrency(expense, currency, currencyRates)}</span>
                              </div>
                            </div>
                            <div className="flex h-8 gap-1 overflow-hidden rounded-lg">
                              <div
                                className="bg-green-500 transition-all hover:bg-green-600"
                                style={{ width: `${(income / maxVal) * 100}%` }}
                                title={`Income: ${formatCurrency(income, currency, currencyRates)}`}
                              ></div>
                              <div
                                className="bg-red-500 transition-all hover:bg-red-600"
                                style={{ width: `${(expense / maxVal) * 100}%` }}
                                title={`Expenses: ${formatCurrency(expense, currency, currencyRates)}`}
                              ></div>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                  <div className="mt-4 flex justify-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-blue-500"></div>
                      <span className="text-slate-600">Income</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-red-500"></div>
                      <span className="text-slate-600">Expenses</span>
                    </div>
                  </div>
                </div>

                {/* Expense Breakdown Donut Chart + Low Inventory Warning */}
                <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 lg:p-6">
                  <h3 className="mb-4 text-lg font-semibold text-slate-900">Income & Expenses Pie Chart</h3>
                  <div className="flex flex-col items-center">
                    <div className="relative h-48 w-48">
                      {/* Pie Chart using conic-gradient */}
                      {(() => {
                        const totalIncome = cashSales.reduce((sum, sale) => sum + sale.totalAmount, 0) + creditInvoices.reduce((sum, inv) => sum + (typeof inv.balance === "number" && inv.balance < inv.amount ? inv.amount - inv.balance : 0), 0);
                        const total = totalIncome + totalExpenses;
                        const incomePercent = total > 0 ? (totalIncome / total) * 360 : 0;
                        return (
                          <div
                            className="h-full w-full rounded-full"
                            style={{
                              background: `conic-gradient(
                                #3b82f6 0deg ${incomePercent}deg,
                                #ef4444 ${incomePercent}deg 360deg
                              )`
                            }}
                          >
                            <div className="absolute inset-6 flex items-center justify-center rounded-full bg-white">
                              <div className="text-center">
                                <p className="text-2xl font-bold text-slate-900">{formatCurrency(total, currency, currencyRates)}</p>
                                <p className="text-xs text-slate-600">Total</p>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                    <div className="mt-6 grid w-full grid-cols-2 gap-3">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-blue-500"></div>
                        <div className="flex-1">
                          <p className="text-xs font-medium text-slate-700">Income</p>
                          <p className="text-xs text-slate-500">{formatCurrency(cashSales.reduce((sum, sale) => sum + sale.totalAmount, 0) + creditInvoices.reduce((sum, inv) => sum + (typeof inv.balance === "number" && inv.balance < inv.amount ? inv.amount - inv.balance : 0), 0), currency, currencyRates)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-red-500"></div>
                        <div className="flex-1">
                          <p className="text-xs font-medium text-slate-700">Expenses</p>
                          <p className="text-xs text-slate-500">{formatCurrency(totalExpenses, currency, currencyRates)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sales Trend Line Chart */}
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Sales Trend */}
                <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 lg:p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-slate-900">Sales Trend</h3>
                    <select
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                      value={salesTrendPeriod}
                      onChange={e => setSalesTrendPeriod(e.target.value)}
                    >
                      <option value="this_month">This Month</option>
                      <option value="last_month">Last Month</option>
                      <option value="last_3_months">Last 3 Months</option>
                    </select>
                  </div>
                  <div className="relative h-64">
                    {/* Grid lines */}
                    <div className="absolute inset-0 flex flex-col justify-between border-l border-slate-200">
                      {[maxY, maxY*0.75, maxY*0.5, maxY*0.25, 0].map((value, i) => (
                        <div key={i} className="flex items-center">
                          <span className="w-12 text-xs text-slate-500">{formatCurrency(value, currency, currencyRates)}</span>
                          <div className="flex-1 border-t border-slate-200"></div>
                        </div>
                      ))}
                    </div>

                    {/* Line Chart */}
                    <div className="absolute inset-0 pl-10">
                      <svg className="h-full w-full" viewBox="0 0 700 200" preserveAspectRatio="none">
                        <defs>
                          <linearGradient id="salesGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
                            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        {/* Sales line path */}
                        <path
                          d={salesTrendPath}
                          fill="none"
                          stroke="#3b82f6"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        {/* Area under line */}
                        <path
                          d={salesTrendAreaPath}
                          fill="url(#salesGradient)"
                        />
                        {/* Data points */}
                        {salesTrendPoints.map((point, i) => (
                          <circle
                            key={i}
                            cx={point.x}
                            cy={point.y}
                            r="5"
                            fill="#3b82f6"
                            stroke="white"
                            strokeWidth="2"
                            className="hover:r-7 transition-all"
                          />
                        ))}
                      </svg>
                    </div>
                    {/* X-axis labels */}
                    <div className="absolute bottom-0 left-10 right-0 flex justify-between border-t border-slate-200 pt-2">
                      {salesTrendLabels.map((label, i) => (
                        <span key={i} className="text-xs text-slate-500">{label}</span>
                      ))}
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-center gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-blue-500"></div>
                      <span className="text-slate-600">Sales Revenue</span>
                    </div>
                    <span className="text-slate-400">•</span>
                    <span className="font-semibold text-green-600">{salesTrendChangeText}</span>
                  </div>
                </div>

                {/* Payment Methods Distribution */}
                <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 lg:p-6">
                  <h3 className="mb-4 text-lg font-semibold text-slate-900">Payment Methods Distribution</h3>
                  <div className="space-y-4">
                    {(() => {
                      const paymentMethods = [
                        { method: "Card", key: "card", color: "bg-blue-500" },
                        { method: "Cash", key: "cash", color: "bg-green-500" },
                        { method: "Bank Transfer", key: "bank_transfer", color: "bg-purple-500" },
                        { method: "Other", key: "other", color: "bg-slate-400" }
                      ];
                      const totalAmount = sales.reduce((sum, s) => sum + (typeof s.unitPrice === "number" && typeof s.quantity === "number" ? s.unitPrice * s.quantity : 0), 0);
                      return paymentMethods.map((pm, index) => {
                        const filtered = sales.filter(s => s.paymentMethod === pm.key);
                        const amount = filtered.reduce((sum, s) => sum + (typeof s.unitPrice === "number" && typeof s.quantity === "number" ? s.unitPrice * s.quantity : 0), 0);
                        const percentage = totalAmount > 0 ? Math.round((amount / totalAmount) * 100) : 0;
                        return (
                          <div key={index}>
                            <div className="mb-2 flex items-center justify-between">
                              <span className="text-sm font-medium text-slate-700">{pm.method}</span>
                              <div className="text-right">
                                <span className="text-sm font-semibold text-slate-900">{percentage}%</span>
                                <span className="ml-2 text-xs text-slate-500">{formatCurrency(amount, currency, currencyRates)}</span>
                              </div>
                            </div>
                            <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
                              <div 
                                className={`h-full ${pm.color} transition-all duration-500`}
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              </div>


            </div>
          )}

          {activeSection === "sales" && (
            <div className="space-y-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Sales Management</h3>
                  <p className="text-sm text-slate-600">Record and track all your sales transactions</p>
                </div>
                <button
                  onClick={() => setShowSaleForm((prev) => !prev)}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  {showSaleForm ? "Close" : "+ Record Sale"}
                </button>
              </div>

              {showSaleForm && (
                <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                  <div className="mb-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setSaleType("cash")}
                      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${saleType === "cash" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
                    >
                      Cash Sale
                    </button>
                    <button
                      type="button"
                      onClick={() => setSaleType("credit")}
                      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${saleType === "credit" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
                    >
                      Credit Sale
                    </button>
                  </div>
                  <form onSubmit={handleSaveSale} className="space-y-4">
                    <div className="grid gap-4 lg:grid-cols-3">
                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Product in Stock</label>
                        <select
                          value={saleForm.productId}
                          onChange={(event) => {
                            const productId = event.target.value;
                            const item = availableProducts.find((product) => product._id === productId);
                            const currencyRate = currencyRates[currency] ?? 1;
                            setSaleForm((prev) => ({
                              ...prev,
                              productId,
                              productName: item?.name ?? "",
                              unitPrice: item?.sellingPrice !== undefined
                                ? String(Number(item.sellingPrice * currencyRate).toFixed(2))
                                : "",
                              quantity: ""
                            }));
                          }}
                          className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                        >
                          <option value="">Select a product</option>
                          {availableProducts.map((item) => (
                            <option key={item._id} value={item._id}>
                              {item.name} · {item.quantityInStock} in stock
                            </option>
                          ))}
                        </select>
                        <p className="mt-2 text-xs text-slate-500">
                          {availableProducts.length === 0 ? "No products in stock yet." : "Only in-stock items are shown."}
                        </p>
                      </div>
                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Quantity</label>
                        <input
                          type="number"
                          min={1}
                          max={selectedProduct?.quantityInStock ?? undefined}
                          value={saleForm.quantity}
                          onChange={(event) => setSaleForm((prev) => ({ ...prev, quantity: event.target.value }))}
                          className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Unit Price</label>
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={saleForm.unitPrice}
                          readOnly
                          className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                        />
                      </div>
                    </div>
                    <div className="grid gap-4 lg:grid-cols-3">
                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Customer Name</label>
                        <input
                          type="text"
                          value={saleForm.customerName}
                          onChange={(event) => setSaleForm((prev) => ({ ...prev, customerName: event.target.value }))}
                          className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                          placeholder={saleType === "credit" ? "Required for credit" : "Optional"}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Sale Date</label>
                        <input
                          type="date"
                          value={saleForm.saleDate}
                          onChange={(event) => setSaleForm((prev) => ({ ...prev, saleDate: event.target.value }))}
                          className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                        />
                      </div>
                      {saleType === "cash" ? (
                        <div>
                          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Payment Method</label>
                          <select
                            value={saleForm.paymentMethod}
                            onChange={(event) => setSaleForm((prev) => ({ ...prev, paymentMethod: event.target.value as Sale["paymentMethod"] }))}
                            className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                          >
                            <option value="cash">Cash</option>
                            <option value="card">Card</option>
                            <option value="bank_transfer">Bank Transfer</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                      ) : (
                        <div>
                          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Due Date</label>
                          <input
                            type="date"
                            value={saleForm.dueDate}
                            onChange={(event) => setSaleForm((prev) => ({ ...prev, dueDate: event.target.value }))}
                            className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                          />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm text-slate-600">
                        Total: <span className="font-semibold text-slate-900">
                          {formatCurrency((Number(saleForm.quantity || 0) || 0) * (Number(saleForm.unitPrice || 0) || 0), currency, currencyRates)}
                        </span>
                      </p>
                      <button
                        type="submit"
                        disabled={saleSaving || availableProducts.length === 0}
                        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {saleSaving ? "Saving..." : "Save Sale"}
                      </button>
                    </div>
                    {saleError && (
                      <p className="text-sm font-medium text-red-600">{saleError}</p>
                    )}
                  </form>
                </div>
              )}

              {/* Sales Stats */}
              <div className="grid gap-4 sm:grid-cols-4">
                <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                  <p className="text-sm font-medium text-slate-600">Total Sales</p>
                  <p className="mt-2 text-2xl font-bold text-green-600">{formatCurrency(totalSales, currency, currencyRates)}</p>
                  <p className="mt-1 text-xs text-slate-500">This period</p>
                </div>
                <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                  <p className="text-sm font-medium text-slate-600">Transactions</p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">{sales.length}</p>
                  <p className="mt-1 text-xs text-slate-500">Total count</p>
                </div>
                <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                  <p className="text-sm font-medium text-slate-600">Average Sale</p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">
                    {sales.length ? formatCurrency(totalSales / sales.length, currency, currencyRates) : formatCurrency(0, currency, currencyRates)}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">Per transaction</p>
                </div>
                <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                  <p className="text-sm font-medium text-slate-600">Items Sold</p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">{totalQuantity}</p>
                  <p className="mt-1 text-xs text-slate-500">Total units</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                  <p className="text-sm font-medium text-slate-600">Cash Sales</p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">{cashSales.length}</p>
                  <p className="mt-1 text-xs text-slate-500">Paid immediately</p>
                </div>
                <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                  <p className="text-sm font-medium text-slate-600">Credit Sales</p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">{creditSales.length}</p>
                  <p className="mt-1 text-xs text-slate-500">Pending & paid</p>
                </div>
                <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                  <p className="text-sm font-medium text-slate-600">Pending Credit</p>
                  <p className="mt-2 text-2xl font-bold text-amber-600">{pendingCreditSales.length}</p>
                  <p className="mt-1 text-xs text-slate-500">Outstanding balances</p>
                </div>
              </div>

              {/* Sales by Payment Method */}
              <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 lg:p-6">
                <h4 className="mb-4 text-base font-semibold text-slate-900">Sales by Payment Method</h4>
                <div className="grid gap-3 sm:grid-cols-4">
                  {[
                    { method: "Cash", count: sales.filter(s => s.paymentMethod === "cash").length, color: "green" },
                    { method: "Card", count: sales.filter(s => s.paymentMethod === "card").length, color: "blue" },
                    { method: "Bank Transfer", count: sales.filter(s => s.paymentMethod === "bank_transfer").length, color: "purple" },
                    { method: "Other", count: sales.filter(s => s.paymentMethod === "other").length, color: "slate" }
                  ].map((item, index) => (
                    <div key={index} className="rounded-lg border border-slate-200 p-3 text-center">
                      <p className={`text-2xl font-bold text-${item.color}-600`}>{item.count}</p>
                      <p className="mt-1 text-sm text-slate-600">{item.method}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sales List */}
              <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 lg:p-6">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <h4 className="text-base font-semibold text-slate-900">Recent Sales</h4>
                  <div className="flex gap-2">
                    <input 
                      type="search" 
                      placeholder="Search sales..." 
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                    />
                    <select className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm">
                      <option>All Payments</option>
                      <option>Cash</option>
                      <option>Card</option>
                      <option>Bank Transfer</option>
                    </select>
                  </div>
                </div>

                {salesLoading ? (
                  <div className="flex items-center justify-center py-10">
                    <div className="h-6 w-6 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
                  </div>
                ) : sales.length === 0 ? (
                  <div className="py-12 text-center text-sm text-slate-600">No sales recorded yet.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="hidden bg-blue-600 text-left text-xs font-semibold uppercase tracking-wide text-white md:table-header-group">
                        <tr>
                          <th className="px-4 py-3">Date</th>
                          <th className="px-4 py-3">Product</th>
                          <th className="px-4 py-3">Customer</th>
                          <th className="px-4 py-3 text-center">Qty</th>
                          <th className="px-4 py-3 text-right">Unit Price</th>
                          <th className="px-4 py-3 text-right">Total</th>
                          <th className="px-4 py-3 text-center">Type</th>
                          <th className="px-4 py-3 text-center">Status</th>
                          <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {sales.map((sale) => (
                          <tr key={sale._id} className="block border border-slate-200/70 bg-white p-4 shadow-sm md:table-row md:border-0 md:bg-transparent md:p-0 md:shadow-none">
                            <td className="flex items-center justify-between gap-3 py-2 md:table-cell md:py-3">
                              <span className="text-xs font-semibold uppercase text-slate-500 md:hidden">Date</span>
                              <span className="text-sm text-slate-900">{new Date(sale.saleDate).toLocaleDateString()}</span>
                            </td>
                            <td className="flex items-center justify-between gap-3 py-2 md:table-cell md:py-3">
                              <span className="text-xs font-semibold uppercase text-slate-500 md:hidden">Product</span>
                              <span className="text-sm font-medium text-slate-900">{sale.productName}</span>
                            </td>
                            <td className="flex items-center justify-between gap-3 py-2 md:table-cell md:py-3">
                              <span className="text-xs font-semibold uppercase text-slate-500 md:hidden">Customer</span>
                              <span className="text-sm text-slate-600">{sale.customerName || "-"}</span>
                            </td>
                            <td className="flex items-center justify-between gap-3 py-2 md:table-cell md:px-4 md:py-3 md:text-center">
                              <span className="text-xs font-semibold uppercase text-slate-500 md:hidden">Qty</span>
                              <span className="text-sm text-slate-900">{sale.quantity}</span>
                            </td>
                            <td className="flex items-center justify-between gap-3 py-2 md:table-cell md:px-4 md:py-3 md:text-right">
                              <span className="text-xs font-semibold uppercase text-slate-500 md:hidden">Unit Price</span>
                              <span className="text-sm text-slate-900">{formatCurrency(sale.unitPrice, currency, currencyRates)}</span>
                            </td>
                            <td className="flex items-center justify-between gap-3 py-2 md:table-cell md:px-4 md:py-3 md:text-right">
                              <span className="text-xs font-semibold uppercase text-slate-500 md:hidden">Total</span>
                              <span className="text-sm font-semibold text-slate-900">{formatCurrency(sale.totalAmount, currency, currencyRates)}</span>
                            </td>
                            <td className="flex items-center justify-between gap-3 py-2 md:table-cell md:px-4 md:py-3 md:text-center">
                              <span className="text-xs font-semibold uppercase text-slate-500 md:hidden">Type</span>
                              <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                                sale.saleType === "credit" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                              }`}>
                                {sale.saleType}
                              </span>
                            </td>
                            <td className="flex items-center justify-between gap-3 py-2 md:table-cell md:px-4 md:py-3 md:text-center">
                              <span className="text-xs font-semibold uppercase text-slate-500 md:hidden">Status</span>
                              <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                                sale.status === "paid" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
                              }`}>
                                {sale.status}
                              </span>
                            </td>
                            <td className="flex items-center justify-between gap-3 py-2 md:table-cell md:px-4 md:py-3 md:text-right">
                              <span className="text-xs font-semibold uppercase text-slate-500 md:hidden">Actions</span>
                              <button
                                onClick={() => handleDeleteSale(sale._id)}
                                className="rounded-lg border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeSection === "income" && (
            <div className="space-y-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Income Tracking</h3>
                  <p className="text-sm text-slate-600">All business income, including cash sales and payments received on credit sales. Outstanding balances are shown below.</p>
                </div>
                <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                  + Record Income
                </button>
              </div>

              <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 lg:p-6">
                <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <h4 className="text-base font-semibold text-slate-900">Income Summary</h4>
                  <div className="flex flex-wrap gap-2 items-center">
                    <input
                      type="search"
                      placeholder="Search income..."
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                      value={incomeSearch}
                      onChange={e => setIncomeSearch(e.target.value)}
                    />
                    <select
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                      value={incomeTypeFilter}
                      onChange={e => setIncomeTypeFilter(e.target.value)}
                    >
                      <option value="all">All Types</option>
                      <option value="cash">Cash</option>
                      <option value="credit">Credit Payment</option>
                    </select>
                    <input
                      type="date"
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                      value={incomeDateStart}
                      onChange={e => setIncomeDateStart(e.target.value)}
                      placeholder="Start date"
                    />
                    <input
                      type="date"
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                      value={incomeDateEnd}
                      onChange={e => setIncomeDateEnd(e.target.value)}
                      placeholder="End date"
                    />
                  </div>
                </div>
                {/* QuickBooks-style: show all cash sales and payments received on credit sales as income */}
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="hidden text-left text-xs font-semibold uppercase tracking-wide text-slate-500 md:table-header-group">
                      <tr className="border-b border-slate-200">
                        <th className="pb-3 text-left text-sm font-semibold text-slate-900">Date</th>
                        <th className="pb-3 text-left text-sm font-semibold text-slate-900">Source</th>
                        <th className="pb-3 text-left text-sm font-semibold text-slate-900">Description</th>
                        <th className="pb-3 text-right text-sm font-semibold text-slate-900">Amount</th>
                        <th className="pb-3 text-right text-sm font-semibold text-slate-900">Type</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {/* List all cash sales with print button */}
                      {sales.filter(sale => sale.saleType === "cash").map((sale) => (
                        <tr key={sale._id} className="block border border-slate-200/70 bg-white p-4 shadow-sm md:table-row md:border-0 md:bg-transparent md:p-0 md:shadow-none">
                          <td className="flex items-center justify-between gap-3 py-2 md:table-cell md:py-3">
                            <span className="text-xs font-semibold uppercase text-slate-500 md:hidden">Date</span>
                            <span className="text-sm text-slate-900">{new Date(sale.saleDate).toLocaleDateString()}</span>
                          </td>
                          <td className="flex items-center justify-between gap-3 py-2 md:table-cell md:py-3">
                            <span className="text-xs font-semibold uppercase text-slate-500 md:hidden">Source</span>
                            <span className="text-sm text-slate-900">{sale.customerName || "Cash Sale"}</span>
                          </td>
                          <td className="flex items-center justify-between gap-3 py-2 md:table-cell md:py-3">
                            <span className="text-xs font-semibold uppercase text-slate-500 md:hidden">Description</span>
                            <span className="text-sm text-slate-600">{sale.productName}</span>
                          </td>
                          <td className="flex items-center justify-between gap-3 py-2 md:table-cell md:py-3 md:text-right">
                            <span className="text-xs font-semibold uppercase text-slate-500 md:hidden">Amount</span>
                            <span className="text-sm font-semibold text-green-600">{formatCurrency(sale.totalAmount, currency, currencyRates)}</span>
                          </td>
                          <td className="flex items-center justify-between gap-3 py-2 md:table-cell md:py-3 md:text-right">
                            <span className="text-xs font-semibold uppercase text-slate-500 md:hidden">Type</span>
                            <span className="text-xs font-medium text-emerald-700">Cash</span>
                          </td>
                          <td className="flex items-center justify-between gap-3 py-2 md:table-cell md:py-3 md:text-right">
                            <button
                              className="inline-flex items-center gap-1 rounded bg-blue-500 px-2 py-1 text-xs text-white hover:bg-blue-600 print:hidden"
                              onClick={() => printSaleReceipt(sale)}
                              type="button"
                            >
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 9V2h12v7" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18v4h12v-4" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 14h12" /></svg>
                              Print
                            </button>
                          </td>
                        </tr>
                      ))}

                      {/* List all credit sales with any payment (partial or full) */}
                      {sales.filter(sale => sale.saleType === "credit" && ((typeof sale.balance === "number" && sale.balance < sale.totalAmount) || typeof sale.balance !== "number")).map((sale) => (
                        <tr key={sale._id} className="block border border-slate-200/70 bg-white p-4 shadow-sm md:table-row md:border-0 md:bg-transparent md:p-0 md:shadow-none">
                          <td className="flex items-center justify-between gap-3 py-2 md:table-cell md:py-3">
                            <span className="text-xs font-semibold uppercase text-slate-500 md:hidden">Date</span>
                            <span className="text-sm text-slate-900">{new Date(sale.saleDate).toLocaleDateString()}</span>
                          </td>
                          <td className="flex items-center justify-between gap-3 py-2 md:table-cell md:py-3">
                            <span className="text-xs font-semibold uppercase text-slate-500 md:hidden">Source</span>
                            <span className="text-sm text-slate-900">{sale.customerName || "Credit Sale"}</span>
                          </td>
                          <td className="flex items-center justify-between gap-3 py-2 md:table-cell md:py-3">
                            <span className="text-xs font-semibold uppercase text-slate-500 md:hidden">Description</span>
                            <span className="text-sm text-slate-600">{sale.invoiceNumber}</span>
                          </td>
                          <td className="flex items-center justify-between gap-3 py-2 md:table-cell md:py-3 md:text-right">
                            <span className="text-xs font-semibold uppercase text-slate-500 md:hidden">Amount</span>
                            <span className="text-sm font-semibold text-green-600">{formatCurrency(typeof sale.balance === "number" ? sale.totalAmount - sale.balance : sale.totalAmount, currency, currencyRates)}</span>
                          </td>
                          <td className="flex items-center justify-between gap-3 py-2 md:table-cell md:py-3 md:text-right">
                            <span className="text-xs font-semibold uppercase text-slate-500 md:hidden">Type</span>
                            <span className="text-xs font-medium text-amber-700">Credit Payment</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    {/* Summary row */}
                    <tfoot>
                      <tr className="border-t border-slate-200">
                        <td colSpan={3} className="pt-3 text-right font-semibold">Total Income Received:</td>
                        <td className="pt-3 text-right font-bold text-green-700" colSpan={2}>
                          {formatCurrency(
                            sales.reduce((sum, sale) => {
                              if (sale.saleType === "cash") {
                                return sum + sale.totalAmount;
                              } else if (sale.saleType === "credit") {
                                if (typeof sale.balance === "number") {
                                  return sum + (sale.totalAmount - sale.balance);
                                } else {
                                  // If no balance, treat as fully paid
                                  return sum + sale.totalAmount;
                                }
                              }
                              return sum;
                            }, 0),
                            currency,
                            currencyRates
                          )}
                        </td>
                      </tr>
                      <tr>
                        <td colSpan={3} className="text-right font-semibold">Outstanding Credit Balances:</td>
                        <td className="text-right font-bold text-amber-700" colSpan={2}>
                          {formatCurrency(
                            pendingInvoices.reduce((sum, inv) => sum + inv.amount, 0),
                            currency,
                            currencyRates
                          )}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeSection === "expenses" && (
            <div className="space-y-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Expense Management</h3>
                  <p className="text-sm text-slate-600">Track and categorize your business expenses</p>
                </div>
                <button
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                  onClick={() => setShowExpenseForm(true)}
                >
                  + Add Expense
                </button>
                {showExpenseForm && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
                    <form
                      className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg"
                      onSubmit={handleAddExpense}
                    >
                      <h4 className="mb-4 text-lg font-semibold">Add Expense</h4>
                      <div className="mb-3">
                        <label className="block text-sm font-medium mb-1">Expense Name</label>
                        <input
                          type="text"
                          className="w-full rounded border px-3 py-2"
                          value={expenseForm.label}
                          onChange={e => setExpenseForm(f => ({ ...f, label: e.target.value }))}
                          required
                        />
                      </div>
                      <div className="mb-3">
                        <label className="block text-sm font-medium mb-1">Amount ({currency})</label>
                        <input
                          type="number"
                          className="w-full rounded border px-3 py-2"
                          value={expenseForm.amount}
                          onChange={e => setExpenseForm(f => ({ ...f, amount: e.target.value }))}
                          min="0"
                          step="0.01"
                          required
                        />
                      </div>
                      <div className="mb-3">
                        <label className="block text-sm font-medium mb-1">Category</label>
                        <select
                          className="w-full rounded border px-3 py-2"
                          value={expenseForm.category}
                          onChange={e => setExpenseForm(f => ({ ...f, category: e.target.value }))}
                        >
                          <option>General</option>
                          <option>Office</option>
                          <option>Travel</option>
                          <option>Equipment</option>
                        </select>
                      </div>
                      <div className="mb-3">
                        <label className="block text-sm font-medium mb-1">Date</label>
                        <input
                          type="date"
                          className="w-full rounded border px-3 py-2"
                          value={expenseForm.occurredOn}
                          onChange={e => setExpenseForm(f => ({ ...f, occurredOn: e.target.value }))}
                          required
                        />
                      </div>
                      {expenseError && <div className="mb-2 text-red-600 text-sm">{expenseError}</div>}
                      <div className="flex gap-2 mt-4">
                        <button
                          type="submit"
                          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                          disabled={expenseSaving}
                        >
                          {expenseSaving ? "Saving..." : "Add Expense"}
                        </button>
                        <button
                          type="button"
                          className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400"
                          onClick={() => setShowExpenseForm(false)}
                          disabled={expenseSaving}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>

              {/* Expense Stats */}
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                  <p className="text-sm font-medium text-slate-600">This Month</p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">{formatCurrency(totalExpensesThisMonth, currency, currencyRates)}</p>
                </div>
                <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                  <p className="text-sm font-medium text-slate-600">Average Daily</p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">{formatCurrency(averageDailyExpenses, currency, currencyRates)}</p>
                </div>
                <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                  <p className="text-sm font-medium text-slate-600">Total Transactions</p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">{expenses.length}</p>
                </div>
              </div>

              <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 lg:p-6">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <h4 className="text-base font-semibold text-slate-900">All Expenses</h4>
                  <div className="flex gap-2 flex-wrap items-center">
                    <input
                      type="search"
                      placeholder="Search expenses..."
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                      value={expenseSearch}
                      onChange={e => setExpenseSearch(e.target.value)}
                    />
                    <select
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                      value={expenseCategoryFilter}
                      onChange={e => setExpenseCategoryFilter(e.target.value)}
                    >
                      <option value="all">All Categories</option>
                      <option value="General">General</option>
                      <option value="Office">Office</option>
                      <option value="Travel">Travel</option>
                      <option value="Equipment">Equipment</option>
                    </select>
                    {(expenseSearch || expenseCategoryFilter !== "all") && (
                      <button
                        className="rounded bg-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-300"
                        onClick={() => { setExpenseSearch(""); setExpenseCategoryFilter("all"); }}
                        type="button"
                      >
                        Clear Filters
                      </button>
                    )}
                  </div>
                </div>

                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
                  </div>
                ) : filteredExpenses.length === 0 ? (
                  <div className="py-12 text-center">
                    <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <p className="mt-2 text-sm text-slate-600">No expenses found for the selected filters.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="hidden bg-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-600 md:table-header-group">
                        <tr>
                          <th className="px-4 py-3">Date</th>
                          <th className="px-4 py-3">Description</th>
                          <th className="px-4 py-3">Category</th>
                          <th className="px-4 py-3 text-right">Amount</th>
                          <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredExpenses.map((expense) => (
                          <tr key={expense._id} className="block border border-slate-200/70 bg-white p-4 shadow-sm md:table-row md:border-0 md:bg-transparent md:p-0 md:shadow-none">
                            <td className="flex items-center justify-between gap-3 py-2 md:table-cell md:py-3">
                              <span className="text-xs font-semibold uppercase text-slate-500 md:hidden">Date</span>
                              <span className="text-sm text-slate-900">{new Date(expense.occurredOn).toLocaleDateString()}</span>
                            </td>
                            <td className="flex items-center justify-between gap-3 py-2 md:table-cell md:py-3">
                              <span className="text-xs font-semibold uppercase text-slate-500 md:hidden">Description</span>
                              <span className="text-sm text-slate-900">{expense.label}</span>
                            </td>
                            <td className="flex items-center justify-between gap-3 py-2 md:table-cell md:py-3">
                              <span className="text-xs font-semibold uppercase text-slate-500 md:hidden">Category</span>
                              <span className="inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">{expense.category ? expense.category : 'General'}</span>
                            </td>
                            <td className="flex items-center justify-between gap-3 py-2 md:table-cell md:py-3 md:text-right">
                              <span className="text-xs font-semibold uppercase text-slate-500 md:hidden">Amount</span>
                              <span className="text-sm font-semibold text-slate-900">{formatCurrency(expense.amount, currency, currencyRates)}</span>
                            </td>
                            <td className="flex items-center justify-between gap-3 py-2 md:table-cell md:py-3 md:text-right">
                              <span className="text-xs font-semibold uppercase text-slate-500 md:hidden">Actions</span>
                              <div className="flex items-center justify-end gap-2">
                                <button className="text-slate-600 hover:text-blue-600" onClick={() => handleEditExpense(expense)}>
                                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                  </svg>
                                </button>
                                <button className="text-slate-600 hover:text-red-600" onClick={() => handleDeleteExpense(expense._id)} disabled={expenseSaving}>
                                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeSection === "invoices" && (
            <div className="space-y-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">Invoice Management</h3>
                    <p className="text-sm text-slate-600">Create and track invoices for your clients</p>
                  </div>
                </div>

              {/* Invoice Stats */}
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                  <p className="text-sm font-medium text-slate-600">Total Outstanding</p>
                  <p className="mt-2 text-2xl font-bold text-amber-600">
                    {formatCurrency([...pendingInvoices, ...overdueInvoices].reduce((sum, inv) => sum + inv.amount, 0), currency, currencyRates)}
                  </p>
                </div>
                <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                  <p className="text-sm font-medium text-slate-600">Paid This Month</p>
                  <p className="mt-2 text-2xl font-bold text-green-600">{formatCurrency(totalIncome, currency, currencyRates)}</p>
                </div>
                <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                  <p className="text-sm font-medium text-slate-600">Overdue</p>
                  <p className="mt-2 text-2xl font-bold text-red-600">{overdueInvoices.length}</p>
                </div>
              </div>

              <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 lg:p-6">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <h4 className="text-base font-semibold text-slate-900">All Invoices</h4>
                  <div className="flex gap-2">
                    <input
                      type="search"
                      placeholder="Search invoices..."
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                      value={invoiceSearch}
                      onChange={e => setInvoiceSearch(e.target.value)}
                    />
                    <select
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                      value={invoiceStatusFilter}
                      onChange={e => setInvoiceStatusFilter(e.target.value)}
                    >
                      <option value="all">All Status</option>
                      <option value="paid">Paid</option>
                      <option value="pending">Pending</option>
                      <option value="overdue">Overdue</option>
                    </select>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="hidden text-left text-xs font-semibold uppercase tracking-wide text-slate-500 md:table-header-group">
                      <tr className="border-b border-slate-200">
                        <th className="pb-3 text-left text-sm font-semibold text-slate-900">Invoice #</th>
                        <th className="pb-3 text-left text-sm font-semibold text-slate-900">Client</th>
                        <th className="pb-3 text-left text-sm font-semibold text-slate-900">Date</th>
                        <th className="pb-3 text-left text-sm font-semibold text-slate-900">Due Date</th>
                        <th className="pb-3 text-right text-sm font-semibold text-slate-900">Amount</th>
                        <th className="pb-3 text-center text-sm font-semibold text-slate-900">Status</th>
                        <th className="pb-3 text-right text-sm font-semibold text-slate-900">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredInvoices.map((invoice) => (
                        <tr key={invoice._id} className="block border border-slate-200/70 bg-white p-4 shadow-sm md:table-row md:border-0 md:bg-transparent md:p-0 md:shadow-none">
                          <td className="flex items-center justify-between gap-3 py-2 md:table-cell md:py-3">
                            <span className="text-xs font-semibold uppercase text-slate-500 md:hidden">Invoice #</span>
                            <span className="text-sm font-medium text-slate-900">{invoice.invoiceNumber}</span>
                          </td>
                          <td className="flex items-center justify-between gap-3 py-2 md:table-cell md:py-3">
                            <span className="text-xs font-semibold uppercase text-slate-500 md:hidden">Client</span>
                            <span className="text-sm text-slate-900">{invoice.clientName}</span>
                          </td>
                          <td className="flex items-center justify-between gap-3 py-2 md:table-cell md:py-3">
                            <span className="text-xs font-semibold uppercase text-slate-500 md:hidden">Date</span>
                            <span className="text-sm text-slate-600">{new Date(invoice.createdAt).toLocaleDateString()}</span>
                          </td>
                          <td className="flex items-center justify-between gap-3 py-2 md:table-cell md:py-3">
                            <span className="text-xs font-semibold uppercase text-slate-500 md:hidden">Due Date</span>
                            <span className="text-sm text-slate-600">{new Date(invoice.dueDate).toLocaleDateString()}</span>
                          </td>
                          <td className="flex items-center justify-between gap-3 py-2 md:table-cell md:py-3 md:text-right">
                            <span className="text-xs font-semibold uppercase text-slate-500 md:hidden">Amount</span>
                            <span className="text-sm font-semibold text-slate-900">{formatCurrency(invoice.amount, currency, currencyRates)}</span>
                            {/* Show balance if available */}
                            {typeof invoice.balance === "number" && invoice.balance > 0 && (
                              <span className="block text-xs text-amber-600">Balance: {formatCurrency(Number.isFinite(invoice.balance) ? invoice.balance : 0, currency, currencyRates)}</span>
                            )}
                          </td>
                          <td className="flex items-center justify-between gap-3 py-2 md:table-cell md:py-3 md:text-center">
                            <span className="text-xs font-semibold uppercase text-slate-500 md:hidden">Status</span>
                            <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                              invoice.status === "paid" ? "bg-green-100 text-green-700" :
                              invoice.status === "pending" ? "bg-amber-100 text-amber-700" :
                              "bg-red-100 text-red-700"
                            }`}>
                              {invoice.status}
                            </span>
                          </td>
                          <td className="flex items-center justify-between gap-3 py-2 md:table-cell md:py-3 md:text-right">
                            <span className="text-xs font-semibold uppercase text-slate-500 md:hidden">Actions</span>
                            <div className="flex flex-col items-end gap-2">
                              <div className="flex items-center gap-2">
                                <button
                                  className="text-slate-600 hover:text-blue-600"
                                  title="View"
                                  onClick={() => handleViewInvoice(invoice)}
                                >
                                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                </button>
                                <button
                                  className="text-slate-600 hover:text-blue-600"
                                  title="Edit"
                                  onClick={() => handleEditInvoice(invoice)}
                                >
                                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                  </svg>
                                </button>
                                <button
                                  className="text-slate-600 hover:text-green-600"
                                  title="Download"
                                  onClick={() => handleDownloadInvoice(invoice)}
                                >
                                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h12a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                  </svg>
                                </button>
                              </div>
                              {/* Inline payment form */}
                              {invoice.status !== "paid" && (
                                <PaymentForm
                                  invoice={invoice}
                                  currency={currency}
                                  currencyRates={currencyRates}
                                  onPaymentSuccess={fetchData}
                                />
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeSection === "inventory" && (
            <div className="space-y-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Inventory</h3>
                  <p className="text-sm text-slate-600">Add and manage products in stock</p>
                </div>
                <button
                  onClick={() => {
                    if (showInventoryForm) {
                      resetInventoryForm();
                      return;
                    }
                    setShowInventoryForm(true);
                  }}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  {showInventoryForm ? "Close" : "+ Add Product"}
                </button>
              </div>

              {showInventoryForm && (
                <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                  <form onSubmit={handleSaveInventory} className="space-y-4">
                    <div className="grid gap-4 lg:grid-cols-5">
                      <div className="lg:col-span-2">
                        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Product Name</label>
                        <input
                          type="text"
                          value={inventoryForm.name}
                          onChange={(event) => setInventoryForm((prev) => ({ ...prev, name: event.target.value }))}
                          className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                          placeholder="e.g. Laptop Charger"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">SKU (Optional)</label>
                        <input
                          type="text"
                          value={inventoryForm.sku}
                          onChange={(event) => setInventoryForm((prev) => ({ ...prev, sku: event.target.value }))}
                          className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Cost per Item</label>
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={inventoryForm.unitPrice}
                          onChange={(event) => setInventoryForm((prev) => ({ ...prev, unitPrice: event.target.value }))}
                          className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Selling Price per Item</label>
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={inventoryForm.sellingPrice}
                          onChange={(event) => setInventoryForm((prev) => ({ ...prev, sellingPrice: event.target.value }))}
                          className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                        />
                      </div>
                    </div>
                    <div className="grid gap-4 lg:grid-cols-5">
                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Quantity in Stock</label>
                        <input
                          type="number"
                          min={0}
                          value={inventoryForm.quantityInStock}
                          onChange={(event) => setInventoryForm((prev) => ({ ...prev, quantityInStock: event.target.value }))}
                          className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                        />
                      </div>
                      <div className="lg:col-span-4 flex items-end justify-end">
                        <button
                          type="submit"
                          disabled={inventorySaving}
                          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          {inventorySaving ? "Saving..." : editingInventoryId ? "Update Product" : "Save Product"}
                        </button>
                      </div>
                    </div>
                    {inventoryError && (
                      <p className="text-sm font-medium text-red-600">{inventoryError}</p>
                    )}
                  </form>
                </div>
              )}

              <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 lg:p-6">
                <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h4 className="text-base font-semibold text-slate-900">Products in Stock</h4>
                    <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                      {inventoryLoading && (
                        <span className="inline-flex items-center gap-1">
                          <span className="h-2 w-2 animate-pulse rounded-full bg-blue-500"></span>
                          Refreshing
                        </span>
                      )}
                      <span>{filteredInventory.length} items</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="search"
                      placeholder="Search products or SKU"
                      value={inventorySearch}
                      onChange={(event) => setInventorySearch(event.target.value)}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm w-full sm:w-72"
                    />
                    <select
                      value={inventoryStockFilter}
                      onChange={(event) => setInventoryStockFilter(event.target.value as "all" | "in" | "out")}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                    >
                      <option value="all">All Stock</option>
                      <option value="in">In Stock</option>
                      <option value="out">Out of Stock</option>
                    </select>
                    <button
                      onClick={handleExportInventory}
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 16v-8m0 0l-3 3m3-3l3 3M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
                      </svg>
                      Export
                    </button>
                    <button
                      onClick={handlePrintInventory}
                      className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 9V2h12v7M6 18h12v4H6v-4zm-2-7h16a2 2 0 012 2v5H2v-5a2 2 0 012-2z" />
                      </svg>
                      Print
                    </button>
                  </div>
                </div>
                {filteredInventory.length === 0 && inventoryLoading ? (
                  <div className="flex items-center justify-center py-10">
                    <div className="h-6 w-6 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
                  </div>
                ) : filteredInventory.length === 0 ? (
                  <div className="py-12 text-center text-sm text-slate-600">No products match your filters.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="hidden bg-blue-600 text-left text-xs font-semibold uppercase tracking-wide text-white md:table-header-group">
                        <tr>
                          <th className="px-4 py-3">Product</th>
                          <th className="px-4 py-3">SKU</th>
                          <th className="px-4 py-3 text-center">In Stock</th>
                          <th className="px-4 py-3 text-right">Cost / Item</th>
                          <th className="px-4 py-3 text-right">Selling / Item</th>
                          <th className="px-4 py-3 text-right">Total Cost</th>
                          <th className="px-4 py-3 text-right">Total Selling</th>
                          <th className="px-4 py-3">Date Added</th>
                          <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredInventory.map((item) => (
                          <tr key={item._id} className="block border border-slate-200/70 bg-white p-4 shadow-sm md:table-row md:border-0 md:bg-transparent md:p-0 md:shadow-none">
                            <td className="flex items-center justify-between gap-3 py-2 md:table-cell md:px-4 md:py-3">
                              <span className="text-xs font-semibold uppercase text-slate-500 md:hidden">Product</span>
                              <span className="text-sm font-medium text-slate-900">{item.name}</span>
                            </td>
                            <td className="flex items-center justify-between gap-3 py-2 md:table-cell md:px-4 md:py-3">
                              <span className="text-xs font-semibold uppercase text-slate-500 md:hidden">SKU</span>
                              <span className="text-sm text-slate-600">{item.sku || "-"}</span>
                            </td>
                            <td className="flex items-center justify-between gap-3 py-2 md:table-cell md:px-4 md:py-3 md:text-center">
                              <span className="text-xs font-semibold uppercase text-slate-500 md:hidden">In Stock</span>
                              <span className="flex items-center gap-2 text-sm text-slate-900">
                                {item.quantityInStock}
                                {item.quantityInStock <= 5 && (
                                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-700">
                                    Low
                                  </span>
                                )}
                              </span>
                            </td>
                            <td className="flex items-center justify-between gap-3 py-2 md:table-cell md:px-4 md:py-3 md:text-right">
                              <span className="text-xs font-semibold uppercase text-slate-500 md:hidden">Cost / Item</span>
                              <span className="text-sm text-slate-900">{formatCurrency(Number(item.unitPrice ?? 0), currency, currencyRates)}</span>
                            </td>
                            <td className="flex items-center justify-between gap-3 py-2 md:table-cell md:px-4 md:py-3 md:text-right">
                              <span className="text-xs font-semibold uppercase text-slate-500 md:hidden">Selling / Item</span>
                              <span className="text-sm text-slate-900">{formatCurrency(Number(item.sellingPrice ?? item.unitPrice ?? 0), currency, currencyRates)}</span>
                            </td>
                            <td className="flex items-center justify-between gap-3 py-2 md:table-cell md:px-4 md:py-3 md:text-right">
                              <span className="text-xs font-semibold uppercase text-slate-500 md:hidden">Total Cost</span>
                              <span className="text-sm text-slate-900">
                                {formatCurrency(Number(item.unitPrice ?? 0) * Number(item.quantityInStock ?? 0), currency, currencyRates)}
                              </span>
                            </td>
                            <td className="flex items-center justify-between gap-3 py-2 md:table-cell md:px-4 md:py-3 md:text-right">
                              <span className="text-xs font-semibold uppercase text-slate-500 md:hidden">Total Selling</span>
                              <span className="text-sm text-slate-900">
                                {formatCurrency(Number(item.sellingPrice ?? item.unitPrice ?? 0) * Number(item.quantityInStock ?? 0), currency, currencyRates)}
                              </span>
                            </td>
                            <td className="flex items-center justify-between gap-3 py-2 md:table-cell md:px-4 md:py-3">
                              <span className="text-xs font-semibold uppercase text-slate-500 md:hidden">Date Added</span>
                              <span className="text-sm text-slate-600">{new Date(item.createdAt).toLocaleDateString()}</span>
                            </td>
                            <td className="flex items-center justify-between gap-3 py-2 md:table-cell md:px-4 md:py-3 md:text-right">
                              <span className="text-xs font-semibold uppercase text-slate-500 md:hidden">Actions</span>
                              <div className="flex flex-wrap items-center justify-end gap-2">
                                <button
                                  onClick={() => {
                                    const currencyRate = currencyRates[currency] ?? 1;
                                    setEditingInventoryId(item._id);
                                    setInventoryForm({
                                      name: item.name,
                                      sku: item.sku ?? "",
                                      unitPrice: item.unitPrice !== undefined ? String(Number(item.unitPrice * currencyRate).toFixed(2)) : "",
                                      sellingPrice: item.sellingPrice !== undefined
                                        ? String(Number(item.sellingPrice * currencyRate).toFixed(2))
                                        : item.unitPrice !== undefined
                                          ? String(Number(item.unitPrice * currencyRate).toFixed(2))
                                          : "",
                                      quantityInStock: item.quantityInStock !== undefined ? String(item.quantityInStock) : ""
                                    });
                                    setShowInventoryForm(true);
                                  }}
                                  className="rounded-lg border border-blue-200 px-3 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteInventory(item._id)}
                                  className="rounded-lg border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              {/* Inventory Activity Section */}
              <div className="mt-8 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 lg:p-6">
                <h4 className="mb-4 text-base font-semibold text-slate-900">Inventory Activity</h4>
                <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <input
                    type="search"
                    placeholder="Filter by product name..."
                    value={inventoryActivityFilter}
                    onChange={e => setInventoryActivityFilter(e.target.value)}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm w-full sm:w-64"
                  />
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={inventoryActivityStartDate}
                      onChange={e => setInventoryActivityStartDate(e.target.value)}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                    />
                    <span className="text-slate-400">to</span>
                    <input
                      type="date"
                      value={inventoryActivityEndDate}
                      onChange={e => setInventoryActivityEndDate(e.target.value)}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                    />
                  </div>
                </div>
                {filteredSales.length === 0 ? (
                  <div className="py-8 text-center text-sm text-slate-600">No inventory activity found.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="hidden bg-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-600 md:table-header-group">
                        <tr>
                          <th className="px-4 py-3">Product</th>
                          <th className="px-4 py-3 text-right">Quantity Sold</th>
                          <th className="px-4 py-3 text-right">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredSales.slice(0, 20).map((sale) => (
                          <tr key={sale._id} className="block border border-slate-200/70 bg-white p-4 shadow-sm md:table-row md:border-0 md:bg-transparent md:p-0 md:shadow-none">
                            <td className="flex items-center justify-between gap-3 py-2 md:table-cell md:px-4 md:py-3">
                              <span className="text-xs font-semibold uppercase text-slate-500 md:hidden">Product</span>
                              <span className="text-sm font-medium text-slate-900">{sale.productName}</span>
                            </td>
                            <td className="flex items-center justify-between gap-3 py-2 md:table-cell md:px-4 md:py-3 md:text-right">
                              <span className="text-xs font-semibold uppercase text-slate-500 md:hidden">Quantity Sold</span>
                              <span className="text-sm text-slate-900">{sale.quantity}</span>
                            </td>
                            <td className="flex items-center justify-between gap-3 py-2 md:table-cell md:px-4 md:py-3 md:text-right">
                              <span className="text-xs font-semibold uppercase text-slate-500 md:hidden">Date</span>
                              <span className="text-sm text-slate-600">{new Date(sale.saleDate).toLocaleString()}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeSection === "reports" && (
            <div className="space-y-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Business Reports</h3>
                  <p className="text-sm text-slate-600">Comprehensive accountability of all transactions, sales, and income. QuickBooks-style reporting for your business.</p>
                </div>
                <div className="flex gap-2 mt-2 sm:mt-0">
                  <button
                    onClick={handleExportReport}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 16v-8m0 0l-3 3m3-3l3 3M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" /></svg>
                    Export
                  </button>
                  <button
                    onClick={handlePrintReport}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 9V2h12v7M6 18h12v4H6v-4zm-2-7h16a2 2 0 012 2v5H2v-5a2 2 0 012-2z" /></svg>
                    Print
                  </button>
                </div>
              </div>

              {/* Period Selection */}
              <div className="flex flex-wrap gap-2 items-center">
                <label className="text-xs font-semibold text-slate-600">Period:</label>
                <select
                  className="rounded border px-2 py-1 text-xs"
                  value={salesTrendPeriod}
                  onChange={e => setSalesTrendPeriod(e.target.value)}
                >
                  <option value="this_month">This Month</option>
                  <option value="last_month">Last Month</option>
                  <option value="last_3_months">Last 3 Months</option>
                </select>
                <span className="text-xs text-slate-500 ml-2">({salesTrendData.labels.join(', ')})</span>
              </div>

              {/* Summary Cards */}
              <div className="grid gap-4 sm:grid-cols-4">
                <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                  <p className="text-xs font-medium text-slate-600">Total Sales</p>
                  <p className="mt-2 text-xl font-bold text-green-600">{formatCurrency(sales.reduce((sum, sale) => sum + sale.totalAmount, 0), currency, currencyRates)}</p>
                </div>
                <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                  <p className="text-xs font-medium text-slate-600">Total Expenses</p>
                  <p className="mt-2 text-xl font-bold text-red-600">{formatCurrency(totalExpenses, currency, currencyRates)}</p>
                </div>
                <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                  <p className="text-xs font-medium text-slate-600">Total Income</p>
                  <p className="mt-2 text-xl font-bold text-blue-600">{formatCurrency(
                    cashSales.reduce((sum, sale) => sum + sale.totalAmount, 0) +
                    creditInvoices.reduce((sum, inv) => sum + (typeof inv.balance === "number" && inv.balance < inv.amount ? inv.amount - inv.balance : 0), 0),
                    currency,
                    currencyRates
                  )}</p>
                </div>
                <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                  <p className="text-xs font-medium text-slate-600">Net Profit</p>
                  <p className="mt-2 text-xl font-bold text-emerald-600">{formatCurrency(
                    (
                      cashSales.reduce((sum, sale) => sum + sale.totalAmount, 0) +
                      creditInvoices.reduce((sum, inv) => sum + (typeof inv.balance === "number" && inv.balance < inv.amount ? inv.amount - inv.balance : 0), 0)
                    ) - totalExpenses,
                    currency,
                    currencyRates
                  )}</p>
                </div>
              </div>

              {/* All Transactions Table */}
              <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200" id="report-section">
                <h4 className="mb-4 text-base font-semibold text-slate-900">All Transactions</h4>
                <div className="overflow-x-auto">

                  <table className="min-w-full text-xs" id="transactions-table">
                    <thead className="bg-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                      <tr>
                        <th className="px-4 py-2">Date</th>
                        <th className="px-4 py-2">Type</th>
                        <th className="px-4 py-2">Description</th>
                        <th className="px-4 py-2">Amount</th>
                        <th className="px-4 py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {/* Sales */}
                      {sales.map((sale) => (
                        <tr key={sale._id + '-sale'}>
                          <td className="px-4 py-2">{new Date(sale.saleDate).toLocaleDateString()}</td>
                          <td className="px-4 py-2 text-green-700 font-semibold">Sale</td>
                          <td className="px-4 py-2">{sale.productName} {sale.customerName ? `to ${sale.customerName}` : ''}</td>
                          <td className="px-4 py-2 text-green-700">{formatCurrency(sale.totalAmount, currency, currencyRates)}</td>
                          <td className="px-4 py-2">{sale.status}</td>
                        </tr>
                      ))}
                      {/* Expenses */}
                      {expenses.map((exp) => (
                        <tr key={exp._id + '-exp'}>
                          <td className="px-4 py-2">{new Date(exp.occurredOn).toLocaleDateString()}</td>
                          <td className="px-4 py-2 text-red-700 font-semibold">Expense</td>
                          <td className="px-4 py-2">{exp.label} ({exp.category || 'General'})</td>
                          <td className="px-4 py-2 text-red-700">-{formatCurrency(exp.amount, currency, currencyRates)}</td>
                          <td className="px-4 py-2">-</td>
                        </tr>
                      ))}
                      {/* Credit Payments */}
                      {creditInvoices.filter(inv => typeof inv.balance === "number" && inv.balance < inv.amount).map((inv) => (
                        <tr key={inv._id + '-creditpay'}>
                          <td className="px-4 py-2">{new Date(inv.createdAt).toLocaleDateString()}</td>
                          <td className="px-4 py-2 text-blue-700 font-semibold">Credit Payment</td>
                          <td className="px-4 py-2">{inv.invoiceNumber} ({inv.clientName})</td>
                          <td className="px-4 py-2 text-blue-700">{formatCurrency(inv.amount - (inv.balance ?? 0), currency, currencyRates)}</td>
                          <td className="px-4 py-2">{inv.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Sales Report Table */}
              <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                <h4 className="mb-4 text-base font-semibold text-slate-900">Sales Report ({salesTrendPeriod.replace('_', ' ')})</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs">
                    <thead className="bg-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                      <tr>
                        <th className="px-4 py-2">Date</th>
                        <th className="px-4 py-2">Product</th>
                        <th className="px-4 py-2">Customer</th>
                        <th className="px-4 py-2">Qty</th>
                        <th className="px-4 py-2">Unit Price</th>
                        <th className="px-4 py-2">Total</th>
                        <th className="px-4 py-2">Type</th>
                        <th className="px-4 py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {sales
                        .filter(sale => {
                          // Filter by period
                          const date = new Date(sale.saleDate);
                          if (salesTrendPeriod === "this_month") {
                            const now = new Date();
                            return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
                          } else if (salesTrendPeriod === "last_month") {
                            const now = new Date();
                            const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                            return date.getMonth() === lastMonth.getMonth() && date.getFullYear() === lastMonth.getFullYear();
                          } else if (salesTrendPeriod === "last_3_months") {
                            const now = new Date();
                            const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);
                            return date >= threeMonthsAgo && date <= now;
                          }
                          return true;
                        })
                        .map((sale) => (
                          <tr key={sale._id + '-salesrep'}>
                            <td className="px-4 py-2">{new Date(sale.saleDate).toLocaleDateString()}</td>
                            <td className="px-4 py-2">{sale.productName}</td>
                            <td className="px-4 py-2">{sale.customerName || '-'}</td>
                            <td className="px-4 py-2">{sale.quantity}</td>
                            <td className="px-4 py-2">{formatCurrency(sale.unitPrice, currency, currencyRates)}</td>
                            <td className="px-4 py-2">{formatCurrency(sale.totalAmount, currency, currencyRates)}</td>
                            <td className="px-4 py-2">{sale.saleType}</td>
                            <td className="px-4 py-2">{sale.status}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeSection === "settings" && (
            <div className="rounded-xl bg-white p-8 shadow-sm ring-1 ring-slate-200 max-w-xl mx-auto">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Business Registration</h3>
              <p className="text-sm text-slate-600 mb-6">Register or update your business details for invoicing, compliance, and QuickBooks-style features.</p>
              <BusinessRegistrationForm />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// --- Report Export/Print Handlers ---
function handleExportReport() {
  const table = document.getElementById('transactions-table') as HTMLTableElement | null;
  if (!table) return;
  let csv = '';
  for (const row of Array.from(table.rows)) {
    const cells = Array.from(row.cells).map((cell) => '"' + cell.innerText.replace(/"/g, '""') + '"');
    csv += cells.join(',') + '\n';
  }
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'business-report.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function handlePrintReport() {
  const section = document.getElementById('report-section');
  if (!section) return;
  const printContents = section.innerHTML;
  const win = window.open('', '', 'width=900,height=700');
  if (!win) return;
  win.document.write('<html><head><title>Print Report</title>');
  win.document.write('<style>body{font-family:sans-serif;padding:24px;}table{width:100%;border-collapse:collapse;font-size:12px;}th,td{border:1px solid #e2e8f0;padding:8px;text-align:left;}th{background:#f1f5f9;}</style>');
  win.document.write('</head><body>');
  win.document.write(printContents);
  win.document.write('</body></html>');
  win.document.close();
  win.focus();
  win.print();
  win.close();
}
