// --- SETUP SUPABASE ---
const { createClient } = window.supabase;
const supabaseUrl = "https://gulfowxshhaqlibmkbks.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1bGZvd3hzaGhhcWxpYm1rYmtzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0MDEzMTQsImV4cCI6MjA3NTk3NzMxNH0.hQ8FVqBjgYq4EzT3bx2vZHp9bg19E-ml-qR8nUP9JSw";
const supabase = createClient(supabaseUrl, supabaseKey);

// --- GLOBAL VARIABLES ---
let currentUser = null;
let allWallets = [];
let allTransactions = [];

// --- AUTHENTICATION ---
async function handleAuthStateChange() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  currentUser = session?.user ?? null;
  const loginModal = document.getElementById("login-modal");
  const signupModal = document.getElementById("signup-modal");
  const appContent = document.querySelector("main");

  if (currentUser) {
    if (loginModal) loginModal.classList.add("hidden");
    if (signupModal) signupModal.classList.add("hidden");
    if (appContent) appContent.style.display = "block";

    if (window.location.pathname.endsWith("admin.html")) {
      await loadAdminPage();
    } else if (window.location.pathname.endsWith("form.html")) {
      await loadFormPage();
    } else {
      await loadMainPage();
    }
  } else {
    if (loginModal) loginModal.classList.remove("hidden");
    if (signupModal) signupModal.classList.add("hidden");
    if (appContent) appContent.style.display = "none";
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) alert("Gagal log masuk: " + error.message);
}

async function handleSignup(e) {
  e.preventDefault();
  const email = document.getElementById("signup-email").value;
  const password = document.getElementById("signup-password").value;
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) {
    alert("Gagal daftar: " + error.message);
  } else {
    alert("Pendaftaran berjaya! Sila semula email anda untuk pengesahan.");
    document.getElementById("signup-modal").classList.add("hidden");
    document.getElementById("login-modal").classList.remove("hidden");
  }
}

async function handleLogout() {
  await supabase.auth.signOut();
}

// --- DATA FETCHING ---
async function fetchWallets() {
  const { data, error } = await supabase.from("wallets").select("*");
  if (error) console.error("Error fetching wallets:", error);
  else allWallets = data;
  return data;
}

async function fetchTransactions(filter = {}) {
  let query = supabase.from("transactions").select("*").eq("is_hidden", false);
  if (filter.dateFrom) query = query.gte("transaction_date", filter.dateFrom);
  if (filter.dateTo) query = query.lte("transaction_date", filter.dateTo);
  const { data, error } = await query.order("transaction_date", {
    ascending: false,
  });
  if (error) console.error("Error fetching transactions:", error);
  else allTransactions = data;
  return data;
}

// --- PAGE LOADERS ---
async function loadMainPage() {
  await fetchWallets();
  await fetchTransactions();
  renderDashboard();
  setDefaultExpenseFilter(); // Panggil fungsi untuk tetapkan tarikh lalai
  renderTransactionTable();
  renderSubscriptionTable();
  renderCommitmentTable();
  renderCreditCardTable();
  renderDebtList();
}

async function loadAdminPage() {
  await fetchWallets();
  renderWalletList();
}

async function loadFormPage() {
  const wallets = await fetchWallets();
  const sourceSelect = document.getElementById("source");
  sourceSelect.innerHTML = '<option value="">Pilih Sumber</option>';
  wallets.forEach((w) => {
    const option = document.createElement("option");
    option.value = w.name;
    option.textContent = `${w.name} (RM${w.balance})`;
    sourceSelect.appendChild(option);
  });
  document.getElementById("transaction-date").valueAsDate = new Date();
}

// --- RENDER FUNCTIONS ---
function renderDashboard(dateFilter = null) {
  // --- Kiraan Jumlah Semua Baki Aktif (Tidak Berubah) ---
  const totalBalance = allWallets
    .filter((wallet) => !wallet.is_hidden)
    .reduce((sum, wallet) => sum + wallet.balance, 0);

  // --- Kiraan Jumlah Perbelanjaan (Tidak Berubah) ---
  let expensesToCalculate = allTransactions.filter((t) => t.type === "expense");
  if (dateFilter && dateFilter.dateFrom && dateFilter.dateTo) {
    const fromDate = new Date(dateFilter.dateFrom);
    const toDate = new Date(dateFilter.dateTo);
    toDate.setDate(toDate.getDate() + 1);
    expensesToCalculate = expensesToCalculate.filter((t) => {
      const transDate = new Date(t.transaction_date);
      return transDate >= fromDate && transDate < toDate;
    });
  }
  const expense = expensesToCalculate.reduce((sum, t) => sum + t.amount, 0);

  // --- PENGIRAAN BARU: Baki Bersih ---
  const netBalance = totalBalance - expense;
  document.getElementById(
    "total-income"
  ).textContent = `RM ${netBalance.toFixed(2)}`;

  // --- Paparkan Jumlah Perbelanjaan ---
  document.getElementById("total-expense").textContent = `RM ${expense.toFixed(
    2
  )}`;

  // --- Kiraan Dashboard Lain (Tidak Berubah) ---
  const creditCardNames = allWallets
    .filter((w) => w.type === "credit_card")
    .map((w) => w.name);
  const totalCreditDebt = allTransactions
    .filter((t) => creditCardNames.includes(t.source) && t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);
  document.getElementById(
    "total-credit-debt"
  ).textContent = `RM ${totalCreditDebt.toFixed(2)}`;

  const totalPayLaterDebt = allTransactions
    .filter((t) => t.category === "Pay Later" && t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);
  document.getElementById(
    "total-pay-later-debt"
  ).textContent = `RM ${totalPayLaterDebt.toFixed(2)}`;
}

function setDefaultExpenseFilter() {
  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const fromDateInput = document.getElementById("expense-date-from");
  const toDateInput = document.getElementById("expense-date-to");
  if (fromDateInput && toDateInput) {
    fromDateInput.value = firstDayOfMonth.toISOString().split("T")[0];
    toDateInput.valueAsDate = today;
    renderDashboard({
      dateFrom: fromDateInput.value,
      dateTo: toDateInput.value,
    });
  }
}

function renderTransactionTable() {
  const container = document.getElementById("transaction-list");
  const data = allTransactions.slice(0, 5);
  const cols = ["Item", "Kos", "Jenis", "Tarikh"];
  const mobileCols = ["Item", "Kos", "Jenis"];
  container.innerHTML = createResponsiveTable(
    data,
    cols,
    mobileCols,
    "transactions"
  );
}

function renderSubscriptionTable() {
  const container = document.getElementById("subscription-list");
  const data = allTransactions
    .filter((t) => t.category === "subscription")
    .slice(0, 5);
  const cols = ["Item", "Tarikh", "End Date", "Kos", "Status"];
  const mobileCols = ["Item", "End Date", "Kos"];
  container.innerHTML = createResponsiveTable(
    data,
    cols,
    mobileCols,
    "subscriptions"
  );
}

function renderCommitmentTable() {
  const container = document.getElementById("commitment-list");
  const data = allTransactions
    .filter((t) => t.category === "monthly commitment")
    .slice(0, 5);
  const cols = ["Item", "Kos", "Status", "Tarikh Bayaran"];
  const mobileCols = ["Item", "Kos", "Status"];
  container.innerHTML = createResponsiveTable(
    data,
    cols,
    mobileCols,
    "commitments"
  );
}

function renderCreditCardTable() {
  const container = document.getElementById("credit-card-list");
  const creditWallets = allWallets
    .filter((w) => w.type === "credit_card")
    .map((w) => w.name);
  const data = allTransactions
    .filter((t) => creditWallets.includes(t.source))
    .slice(0, 5);
  const cols = ["Item", "Jenis", "Nama Kad", "Kos", "Tarikh", "Baki"];
  const mobileCols = ["Item", "Nama Kad", "Kos"];
  container.innerHTML = createResponsiveTable(
    data,
    cols,
    mobileCols,
    "credit-cards"
  );
}

function renderDebtList() {
  const container = document.getElementById("debt-list");
  const data = allTransactions
    .filter((t) => t.category === "Pay Later" && t.type === "expense")
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
    .slice(0, 5);
  if (!data || data.length === 0) {
    container.innerHTML =
      '<p class="p-4 text-gray-500">Tiada rekod hutang Pay Later.</p>';
    return;
  }
  const cols = [
    "Item",
    "Kos",
    "Jenis Pembayaran",
    "Tarikh",
    "Jatuh Tempo",
    "Status",
  ];
  const mobileCols = ["Item", "Jatuh Tempo", "Status"];
  container.innerHTML = createResponsiveTable(
    data,
    cols,
    mobileCols,
    "debt-list"
  );
}

function renderWalletList() {
  const container = document.getElementById("wallet-list");
  let html = `<table class="min-w-full leading-normal"><thead><tr class="bg-gray-100"><th class="px-5 py-3 border-b-2 border-gray-200 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Nama</th><th class="px-5 py-3 border-b-2 border-gray-200 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Jenis</th><th class="px-5 py-3 border-b-2 border-gray-200 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Baki</th><th class="px-5 py-3 border-b-2 border-gray-200 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th><th class="px-5 py-3 border-b-2 border-gray-200 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Aksi</th></tr></thead><tbody>`;
  allWallets.forEach((w) => {
    const isActive = !w.is_hidden;
    const rowClass = isActive ? "" : "bg-gray-100 opacity-50";
    html += `<tr class="${rowClass}"><td class="px-5 py-5 border-b border-gray-200 text-sm">${
      w.name
    }</td><td class="px-5 py-5 border-b border-gray-200 text-sm">${w.type.replace(
      "_",
      " "
    )}</td><td class="px-5 py-5 border-b border-gray-200 text-sm">RM ${w.balance.toFixed(
      2
    )}</td><td class="px-5 py-5 border-b border-gray-200 text-sm"><label class="inline-flex items-center"><input type="checkbox" ${
      isActive ? "checked" : ""
    } onchange="toggleWalletVisibility('${
      w.id
    }', !this.checked)" class="form-checkbox h-4 w-4 text-indigo-600"><span class="ml-2 text-gray-700">Aktif</span></label></td><td class="px-5 py-5 border-b border-gray-200 text-sm"><button onclick="deleteWallet('${
      w.id
    }')" class="text-red-600 hover:text-red-900">Delete</button></td></tr>`;
  });
  html += `</tbody></table>`;
  container.innerHTML = html;
}

// --- GENERIC TABLE CREATOR ---
function createResponsiveTable(data, cols, mobileCols, type) {
  if (!data || data.length === 0)
    return '<p class="p-4 text-gray-500">Tiada data.</p>';
  let html = `<table class="min-w-full leading-normal"><thead class="bg-gray-100"><tr><th class="px-5 py-3 border-b-2 border-gray-200 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider"></th>`;
  cols.forEach(
    (col) =>
      (html += `<th class="px-5 py-3 border-b-2 border-gray-200 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden md:table-cell">${col}</th>`)
  );
  mobileCols.forEach(
    (col) =>
      (html += `<th class="px-5 py-3 border-b-2 border-gray-200 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider md:hidden">${col}</th>`)
  );
  html += `</tr></thead><tbody>`;
  data.forEach((item, index) => {
    html += `<tr class="hover:bg-gray-50"><td class="px-5 py-5 border-b border-gray-200 text-sm"><button onclick="toggleRow('detail-${type}-${index}')" class="text-gray-400 hover:text-gray-600"><svg class="w-4 h-4 transform transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg></button></td>`;
    cols.forEach((col) => {
      let value = getNestedValue(item, col);
      html += `<td class="px-5 py-5 border-b border-gray-200 text-sm hidden md:table-cell">${value}</td>`;
    });
    mobileCols.forEach((col) => {
      let value = getNestedValue(item, col);
      html += `<td class="px-5 py-5 border-b border-gray-200 text-sm md:hidden">${value}</td>`;
    });
    html += `</tr><tr id="detail-${type}-${index}" class="hidden"><td colspan="${
      cols.length + 1
    }" class="px-5 py-3 border-b border-gray-200 bg-gray-50 text-sm"><div class="space-y-2">`;
    cols.forEach((col) => {
      if (!mobileCols.includes(col)) {
        let value = getNestedValue(item, col);
        html += `<p><strong>${col}:</strong> ${value}</p>`;
      }
    });
    html += `<div class="pt-2 border-t border-gray-200"><button onclick="editTransaction('${item.id}')" class="bg-indigo-600 text-white text-xs font-bold py-1 px-3 rounded hover:bg-indigo-700 mr-2">Edit</button><button onclick="deleteTransaction('${item.id}')" class="bg-red-600 text-white text-xs font-bold py-1 px-3 rounded hover:bg-red-700">Delete</button></div></div></td></tr>`;
  });
  html += `</tbody></table>`;
  return html;
}

function getNestedValue(obj, key) {
  const lowerKey = key.toLowerCase();
  if (lowerKey === "item") return obj.item || "-";
  if (lowerKey === "kos") return `RM ${obj.amount.toFixed(2)}`;
  if (lowerKey === "jenis") return obj.type === "income" ? "Masuk" : "Keluar";
  if (lowerKey === "tarikh" || lowerKey === "tarikh bayaran")
    return new Date(obj.transaction_date).toLocaleDateString("ms-MY");
  if (lowerKey === "end date")
    return obj.end_date
      ? new Date(obj.end_date).toLocaleDateString("ms-MY")
      : "-";
  if (lowerKey === "nama kad") return obj.source;
  if (lowerKey === "jenis pembayaran") return obj.source;
  if (lowerKey === "kategori") return obj.category;
  if (lowerKey === "tarikh jatuh tempo")
    return obj.due_date
      ? new Date(obj.due_date).toLocaleDateString("ms-MY")
      : "-";
  if (lowerKey === "status") {
    if (obj.category === "Pay Later" && obj.due_date) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dueDate = new Date(obj.due_date);
      return dueDate < today ? "Terlebay" : "Aktif";
    }
    if (obj.end_date) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const endDate = new Date(obj.end_date);
      return endDate < today ? "Non-Aktif" : "Aktif";
    }
    return "-";
  }
  if (lowerKey === "baki") {
    const wallet = allWallets.find((w) => w.name === obj.source);
    if (!wallet || wallet.type !== "credit_card") return "-";
    const totalExpenses = allTransactions
      .filter((t) => t.source === obj.source && t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);
    const finalBalance = wallet.balance - totalExpenses;
    return `RM ${finalBalance.toFixed(2)}`;
  }
  return obj[lowerKey] || "-";
}

// --- CRUD HANDLERS ---
async function handleAddTransaction(e) {
  e.preventDefault();
  const transactionData = {
    user_id: currentUser.id,
    item: document.getElementById("item").value,
    amount: parseFloat(document.getElementById("amount").value),
    type: document.querySelector('input[name="type"]:checked').value,
    category: document.getElementById("category").value,
    source: document.getElementById("source").value,
    transaction_date: document.getElementById("transaction-date").value,
    end_date: document.getElementById("end-date").value || null,
    due_date: document.getElementById("due-date").value || null,
  };
  const { error } = await supabase
    .from("transactions")
    .insert([transactionData]);
  if (error) alert("Gagal menambah transaksi: " + error.message);
  else {
    alert("Transaksi berjaya ditambah!");
    window.location.href = "index.html";
  }
}

async function handleAddWallet(e) {
  e.preventDefault();
  const walletData = {
    user_id: currentUser.id,
    name: document.getElementById("wallet-name").value,
    type: document.getElementById("wallet-type").value,
    balance: parseFloat(document.getElementById("wallet-balance").value),
    credit_limit: document.getElementById("wallet-limit").value
      ? parseFloat(document.getElementById("wallet-limit").value)
      : null,
    is_hidden: false,
  };
  const { error } = await supabase.from("wallets").insert([walletData]);
  if (error) alert("Gagal menambah wallet: " + error.message);
  else {
    e.target.reset();
    loadAdminPage();
  }
}

async function deleteTransaction(id) {
  if (!confirm("Adakah anda pasti?")) return;
  const { error } = await supabase.from("transactions").delete().eq("id", id);
  if (error) alert("Gagal memadam: " + error.message);
  else loadMainPage();
}

async function deleteWallet(id) {
  if (!confirm("Adakah anda pasti?")) return;
  const { error } = await supabase.from("wallets").delete().eq("id", id);
  if (error) alert("Gagal memadam: " + error.message);
  else loadAdminPage();
}

async function toggleWalletVisibility(id, isHidden) {
  const { error } = await supabase
    .from("wallets")
    .update({ is_hidden: isHidden })
    .eq("id", id);
  if (error) {
    console.error("Error updating visibility:", error);
    alert("Gagal mengemas kini status.");
  } else {
    loadAdminPage();
    loadMainPage();
  }
}

function editTransaction(id) {
  const transaction = allTransactions.find((t) => t.id === id);
  if (!transaction) {
    alert("Transaksi tidak dijumpai!");
    return;
  }
  document.getElementById("edit-transaction-id").value = transaction.id;
  document.getElementById("edit-item").value = transaction.item;
  document.querySelector(
    `input[name="edit-type"][value="${transaction.type}"]`
  ).checked = true;
  document.getElementById("edit-amount").value = transaction.amount;
  document.getElementById("edit-transaction-date").value =
    transaction.transaction_date;
  const categorySelect = document.getElementById("edit-category");
  categorySelect.innerHTML = `<option value="">Pilih Kategori</option><optgroup label="Duit Masuk"><option value="Income">Income</option><option value="Part-time">Part-time</option></optgroup><optgroup label="Duit Keluar"><option value="subscription">Subscription</option><option value="monthly commitment">Monthly Commitment</option><option value="daily spent">Daily Spent</option><option value="Pay Later">Pay Later</option></optgroup>`;
  categorySelect.value = transaction.category;
  const sourceSelect = document.getElementById("edit-source");
  sourceSelect.innerHTML = '<option value="">Pilih Sumber</option>';
  allWallets.forEach((w) => {
    const option = document.createElement("option");
    option.value = w.name;
    option.textContent = `${w.name} (RM${w.balance})`;
    sourceSelect.appendChild(option);
  });
  sourceSelect.value = transaction.source;
  const endDateGroup = document.getElementById("edit-end-date-group");
  const endDateInput = document.getElementById("edit-end-date");
  if (transaction.category === "subscription") {
    endDateGroup.classList.remove("hidden");
    endDateInput.value = transaction.end_date || "";
  } else {
    endDateGroup.classList.add("hidden");
  }
  const dueDateGroup = document.getElementById("edit-due-date-group");
  const dueDateInput = document.getElementById("edit-due-date");
  if (transaction.category === "Pay Later") {
    dueDateGroup.classList.remove("hidden");
    dueDateInput.value = transaction.due_date || "";
  } else {
    dueDateGroup.classList.add("hidden");
  }
  document.getElementById("edit-modal").classList.remove("hidden");
  document.getElementById("edit-modal").classList.add("flex");
}

async function handleUpdateTransaction(e) {
  e.preventDefault();
  const id = document.getElementById("edit-transaction-id").value;
  const updatedData = {
    item: document.getElementById("edit-item").value,
    amount: parseFloat(document.getElementById("edit-amount").value),
    type: document.querySelector('input[name="edit-type"]:checked').value,
    category: document.getElementById("edit-category").value,
    source: document.getElementById("edit-source").value,
    transaction_date: document.getElementById("edit-transaction-date").value,
    end_date: document.getElementById("edit-end-date").value || null,
    due_date: document.getElementById("edit-due-date").value || null,
  };
  const { error } = await supabase
    .from("transactions")
    .update(updatedData)
    .eq("id", id);
  if (error) {
    alert("Gagal mengemaskini transaksi: " + error.message);
  } else {
    alert("Transaksi berjaya dikemaskini!");
    closeEditModal();
    loadMainPage();
  }
}

function closeEditModal() {
  const modal = document.getElementById("edit-modal");
  if (modal) {
    modal.classList.add("hidden");
    modal.classList.remove("flex");
  }
}

// --- UI HELPERS ---
function toggleRow(rowId) {
  const row = document.getElementById(rowId);
  const arrow = event.currentTarget.querySelector("svg");
  row.classList.toggle("hidden");
  arrow.classList.toggle("rotate-180");
}

function toggleSearch() {
  const form = document.getElementById("search-form");
  const arrow = document.getElementById("search-arrow");
  form.classList.toggle("hidden");
  arrow.classList.toggle("rotate-180");
}

async function applyDateFilter() {
  const dateFrom = document.getElementById("date-from").value;
  const dateTo = document.getElementById("date-to").value;
  await fetchTransactions({ dateFrom, dateTo });
  renderDashboard();
  renderTransactionTable();
  renderSubscriptionTable();
  renderCommitmentTable();
  renderCreditCardTable();
  renderDebtList();
}

// --- EVENT LISTENERS ---
document.addEventListener("DOMContentLoaded", () => {
  supabase.auth.onAuthStateChange((_event, session) => {
    handleAuthStateChange();
  });
  document
    .getElementById("login-form")
    ?.addEventListener("submit", handleLogin);
  document
    .getElementById("signup-form")
    ?.addEventListener("submit", handleSignup);
  document.getElementById("show-signup")?.addEventListener("click", (e) => {
    e.preventDefault();
    document.getElementById("login-modal").classList.add("hidden");
    document.getElementById("signup-modal").classList.remove("hidden");
  });
  document.getElementById("show-login")?.addEventListener("click", (e) => {
    e.preventDefault();
    document.getElementById("signup-modal").classList.add("hidden");
    document.getElementById("login-modal").classList.remove("hidden");
  });
  document
    .getElementById("logout-btn")
    ?.addEventListener("click", handleLogout);
  document
    .getElementById("search-toggle")
    ?.addEventListener("click", toggleSearch);
  document
    .getElementById("apply-search")
    ?.addEventListener("click", applyDateFilter);
  document
    .getElementById("wallet-form")
    ?.addEventListener("submit", handleAddWallet);
  document
    .getElementById("transaction-form")
    ?.addEventListener("submit", handleAddTransaction);
  document.getElementById("category")?.addEventListener("change", (e) => {
    const endDateGroup = document.getElementById("end-date-group");
    const dueDateGroup = document.getElementById("due-date-group");
    endDateGroup.classList.add("hidden");
    dueDateGroup.classList.add("hidden");
    if (e.target.value === "subscription") {
      endDateGroup.classList.remove("hidden");
    } else if (e.target.value === "Pay Later") {
      dueDateGroup.classList.remove("hidden");
    }
  });
  document
    .getElementById("expense-filter-form")
    ?.addEventListener("submit", (e) => {
      e.preventDefault();
      const dateFrom = document.getElementById("expense-date-from").value;
      const dateTo = document.getElementById("expense-date-to").value;
      if (!dateFrom || !dateTo) {
        alert("Sila pilih kedua-dua tarikh.");
        return;
      }
      renderDashboard({ dateFrom, dateTo });
    });
  document
    .getElementById("edit-transaction-form")
    ?.addEventListener("submit", handleUpdateTransaction);
});
