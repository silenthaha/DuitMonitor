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

  // Dapatkan elemen-elemen, tetapi ia mungkin null pada sesetengah halaman
  const loginModal = document.getElementById("login-modal");
  const signupModal = document.getElementById("signup-modal");
  const appContent = document.querySelector("main");

  if (currentUser) {
    // Pengguna telah log masuk
    // SEMAK: Adakah elemen wujud sebelum mengubahnya?
    if (loginModal) loginModal.classList.add("hidden");
    if (signupModal) signupModal.classList.add("hidden");
    if (appContent) appContent.style.display = "block";

    // Muatkan kandungan mengikut halaman
    if (window.location.pathname.endsWith("admin.html")) {
      await loadAdminPage();
    } else if (window.location.pathname.endsWith("form.html")) {
      await loadFormPage();
    } else {
      await loadMainPage();
    }
  } else {
    // Pengguna belum log masuk
    if (loginModal) loginModal.classList.remove("hidden");
    if (signupModal) signupModal.classList.add("hidden"); // Pastikan signup modal tersembunyi
    if (appContent) appContent.style.display = "none";
  }
}

// --- EVENT LISTENERS ---
document.addEventListener("DOMContentLoaded", () => {
  // Supabase auth listener
  supabase.auth.onAuthStateChange((_event, session) => {
    handleAuthStateChange();
  });

  // Login/Signup forms
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

  // Main page listeners
  document
    .getElementById("search-toggle")
    ?.addEventListener("click", toggleSearch);
  document
    .getElementById("apply-search")
    ?.addEventListener("click", applyDateFilter);

  // Admin page listeners
  document
    .getElementById("wallet-form")
    ?.addEventListener("submit", handleAddWallet);

  // Form page listeners
  document
    .getElementById("transaction-form")
    ?.addEventListener("submit", handleAddTransaction);

  document.getElementById("category")?.addEventListener("change", (e) => {
    // Dapatkan semua elemen kumpulan yang mungkin ditunjukkan
    const endDateGroup = document.getElementById("end-date-group");
    const dueDateGroup = document.getElementById("due-date-group");

    // Sembunyikan semua kumpulan terlebih dahulu untuk menetapkan semula paparan
    endDateGroup.classList.add("hidden");
    dueDateGroup.classList.add("hidden");

    // Paparkan kumpulan yang berkaitan berdasarkan kategori yang dipilih
    if (e.target.value === "subscription") {
      endDateGroup.classList.remove("hidden");
    } else if (e.target.value === "Pay Later") {
      dueDateGroup.classList.remove("hidden");
    }
  });

  //   // Form page listeners
  //   document
  //     .getElementById("transaction-form")
  //     ?.addEventListener("submit", handleAddTransaction);
  //   document.getElementById("category")?.addEventListener("change", (e) => {
  //     const endDateGroup = document.getElementById("end-date-group");
  //     if (e.target.value === "subscription") {
  //       endDateGroup.classList.remove("hidden");
  //     } else {
  //       endDateGroup.classList.add("hidden");
  //     }
  //   });
});

// --- AUTH HANDLERS ---
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
  // --- PINDAAN: Ambil SEMUA wallet, tanpa menapis status ---
  const { data, error } = await supabase.from("wallets").select("*");
  if (error) console.error("Error fetching wallets:", error);
  else allWallets = data;
  return data;
}
// async function fetchWallets() {
//   const { data, error } = await supabase
//     .from("wallets")
//     .select("*")
//     .eq("is_hidden", false);
//   if (error) console.error("Error fetching wallets:", error);
//   else allWallets = data;
//   return data;
// }

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

function renderDashboard() {
  // --- PINDAAN: Kira jumlah baki dari semua wallet yang tidak disembunyikan ---
  const totalBalance = allWallets
    .filter((wallet) => !wallet.is_hidden) // Hanya ambil wallet yang is_hidden = false
    .reduce((sum, wallet) => sum + wallet.balance, 0);

  document.getElementById(
    "total-income"
  ).textContent = `RM ${totalBalance.toFixed(2)}`;

  // Jumlah perbelanjaan kekal sama
  const expense = allTransactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);
  document.getElementById("total-expense").textContent = `RM ${expense.toFixed(
    2
  )}`;
}
// function renderDashboard() {
//   const income = allTransactions
//     .filter((t) => t.type === "income")
//     .reduce((sum, t) => sum + t.amount, 0);
//   const expense = allTransactions
//     .filter((t) => t.type === "expense")
//     .reduce((sum, t) => sum + t.amount, 0);
//   document.getElementById("total-income").textContent = `RM ${income.toFixed(
//     2
//   )}`;
//   document.getElementById("total-expense").textContent = `RM ${expense.toFixed(
//     2
//   )}`;
// }

function renderTransactionTable() {
  const container = document.getElementById("transaction-list");
  const data = allTransactions.slice(0, 5); // Show 5 items
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

  // Ambil, isih, dan hadkan transaksi Pay Later
  const data = allTransactions
    .filter((t) => t.category === "Pay Later" && t.type === "expense")
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date)) // Isih mengikut tarikh jatuh tempo
    .slice(0, 5); // Hadkan kepada 5 item

  // --- PEMBETULAN: Gunakan pembolehubah 'data' yang betul ---
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
  const mobileCols = ["Item", "Jenis Pembayaran", "Kategori"];

  container.innerHTML = createResponsiveTable(
    data,
    cols,
    mobileCols,
    "debt-list"
  );
}
// function renderDebtList() {
//   const container = document.getElementById("debt-list");

//   // Ambil SAHAJA transaksi dengan kategori 'Pay Later'
//   const payLaterTransactions = allTransactions.filter(
//     (t) => t.category === "Pay Later" && t.type === "expense"
//   );

//   if (!payLaterTransactions || payLaterTransactions.length === 0) {
//     container.innerHTML =
//       '<p class="p-4 text-gray-500">Tiada rekod hutang Pay Later.</p>';
//     return;
//   }

//   // --- Kolum untuk paparan penuh (PC) dan mobile ---
//   // Struktur ini menyerupai jadual langganan
//   const cols = [
//     "Item",
//     "Kos",
//     "Jenis Pembayaran",
//     "Tarikh Transaksi",
//     "Jatuh Tempo",
//     "Status",
//   ];
//   const mobileCols = ["Item", "Jatuh Tempo", "Status"];

//   container.innerHTML = createResponsiveTable(
//     payLaterTransactions,
//     cols,
//     mobileCols,
//     "debt-list"
//   );
// }

// function renderDebtList() {
//   const container = document.getElementById("debt-list");

//   // Ambil SAHAJA transaksi dengan kategori 'Pay Later'
//   const payLaterTransactions = allTransactions.filter(
//     (t) => t.category === "Pay Later" && t.type === "expense"
//   );

//   if (!payLaterTransactions || payLaterTransactions.length === 0) {
//     container.innerHTML =
//       '<p class="p-4 text-gray-500">Tiada rekod hutang Pay Later.</p>';
//     return;
//   }

//   // Tambah 'Tarikh Jatuh Tempo' dalam kolum
//   const cols = [
//     "Item",
//     "Kos",
//     "Jenis Pembayaran",
//     "Tarikh Belian",
//     "Tarikh Jatuh Tempo",
//   ];
//   const mobileCols = ["Item", "Kos", "Jatuh Tempo"];
//   container.innerHTML = createResponsiveTable(
//     payLaterTransactions,
//     cols,
//     mobileCols,
//     "pay-later-list"
//   );
// }
// function renderAllTransactionTable() {
//   const container = document.getElementById("all-transaction-list");
//   const data = allTransactions.slice(0, 5);
//   const cols = ["Item", "Kos", "Jenis Pembayaran", "Tarikh", "Kategori"];
//   const mobileCols = ["Item", "Kos", "Jenis Pembayaran", "Tarikh"];
//   container.innerHTML = createResponsiveTable(
//     data,
//     cols,
//     mobileCols,
//     "all-transactions"
//   );
// }

function renderWalletList() {
  const container = document.getElementById("wallet-list");
  let html = `
        <table class="min-w-full leading-normal">
            <thead><tr class="bg-gray-100">
                <th class="px-5 py-3 border-b-2 border-gray-200 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Nama</th>
                <th class="px-5 py-3 border-b-2 border-gray-200 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Jenis</th>
                <th class="px-5 py-3 border-b-2 border-gray-200 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Baki</th>
                <th class="px-5 py-3 border-b-2 border-gray-200 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                <th class="px-5 py-3 border-b-2 border-gray-200 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Aksi</th>
            </tr></thead>
            <tbody>
    `;
  allWallets.forEach((w) => {
    const isActive = !w.is_hidden;
    // --- PINDAAN: Tambah kelas CSS jika wallet tidak aktif ---
    const rowClass = isActive ? "" : "bg-gray-100 opacity-50";

    html += `
            <tr class="${rowClass}">
                <td class="px-5 py-5 border-b border-gray-200 text-sm">${
                  w.name
                }</td>
                <td class="px-5 py-5 border-b border-gray-200 text-sm">${w.type.replace(
                  "_",
                  " "
                )}</td>
                <td class="px-5 py-5 border-b border-gray-200 text-sm">RM ${w.balance.toFixed(
                  2
                )}</td>
                <td class="px-5 py-5 border-b border-gray-200 text-sm">
                    <label class="inline-flex items-center">
                        <input type="checkbox" ${
                          isActive ? "checked" : ""
                        } onchange="toggleWalletVisibility('${
      w.id
    }', !this.checked)" class="form-checkbox h-4 w-4 text-indigo-600">
                        <span class="ml-2 text-gray-700">Aktif</span>
                    </label>
                </td>
                <td class="px-5 py-5 border-b border-gray-200 text-sm"><button onclick="deleteWallet('${
                  w.id
                }')" class="text-red-600 hover:text-red-900">Delete</button></td>
            </tr>
        `;
  });
  html += `</tbody></table>`;
  container.innerHTML = html;
}
// function renderWalletList() {
//   const container = document.getElementById("wallet-list");
//   let html = `
//         <table class="min-w-full leading-normal">
//             <thead><tr class="bg-gray-100">
//                 <th class="px-5 py-3 border-b-2 border-gray-200 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Nama</th>
//                 <th class="px-5 py-3 border-b-2 border-gray-200 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Jenis</th>
//                 <th class="px-5 py-3 border-b-2 border-gray-200 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Baki</th>
//                 <th class="px-5 py-3 border-b-2 border-gray-200 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
//                 <th class="px-5 py-3 border-b-2 border-gray-200 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Aksi</th>
//             </tr></thead>
//             <tbody>
//     `;
//   allWallets.forEach((w) => {
//     // --- PINDAAN: Gunakan checkbox dan label "Aktif" ---
//     // Checkbox ditanda jika wallet tidak disembunyikankan (is_hidden = false)
//     const isActive = !w.is_hidden;
//     html += `
//             <tr>
//                 <td class="px-5 py-5 border-b border-gray-200 text-sm">${
//                   w.name
//                 }</td>
//                 <td class="px-5 py-5 border-b border-gray-200 text-sm">${w.type.replace(
//                   "_",
//                   " "
//                 )}</td>
//                 <td class="px-5 py-5 border-b border-gray-200 text-sm">RM ${w.balance.toFixed(
//                   2
//                 )}</td>
//                 <td class="px-5 py-5 border-b border-gray-200 text-sm">
//                     <label class="inline-flex items-center">
//                         <input type="checkbox" ${
//                           isActive ? "checked" : ""
//                         } onchange="toggleWalletVisibility('${
//       w.id
//     }', !this.checked)" class="form-checkbox h-4 w-4 text-indigo-600">
//                         <span class="ml-2 text-gray-700">Aktif</span>
//                     </label>
//                 </td>
//                 <td class="px-5 py-5 border-b border-gray-200 text-sm"><button onclick="deleteWallet('${
//                   w.id
//                 }')" class="text-red-600 hover:text-red-900">Delete</button></td>
//             </tr>
//         `;
//   });
//   html += `</tbody></table>`;
//   container.innerHTML = html;
// }

// --- GENERIC TABLE CREATOR ---
function createResponsiveTable(data, cols, mobileCols, type) {
  if (!data || data.length === 0)
    return '<p class="p-4 text-gray-500">Tiada data.</p>';

  let html = `<table class="min-w-full leading-normal"><thead class="bg-gray-100"><tr>`;
  html += `<th class="px-5 py-3 border-b-2 border-gray-200 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider"></th>`; // Arrow column
  cols.forEach(
    (col) =>
      (html += `<th class="px-5 py-3 border-b-2 border-gray-200 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden md:table-cell">${col}</th>`)
  );
  mobileCols.forEach(
    (col) =>
      (html += `<th class="px-5 py-3 border-b-2 border-gray-200 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider md:hidden">${col}</th>`)
  );
  html += `<th class="px-5 py-3 border-b-2 border-gray-200 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Aksi</th></tr></thead><tbody>`;

  data.forEach((item, index) => {
    html += `<tr class="hover:bg-gray-50">`;
    html += `<td class="px-5 py-5 border-b border-gray-200 text-sm"><button onclick="toggleRow('detail-${type}-${index}')" class="text-gray-400 hover:text-gray-600"><svg class="w-4 h-4 transform transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg></button></td>`;

    cols.forEach((col) => {
      let value = getNestedValue(item, col);
      html += `<td class="px-5 py-5 border-b border-gray-200 text-sm hidden md:table-cell">${value}</td>`;
    });
    mobileCols.forEach((col) => {
      let value = getNestedValue(item, col);
      html += `<td class="px-5 py-5 border-b border-gray-200 text-sm md:hidden">${value}</td>`;
    });

    html += `<td class="px-5 py-5 border-b border-gray-200 text-sm"><button onclick="editTransaction('${item.id}')" class="text-indigo-600 hover:text-indigo-900 mr-2">Edit</button><button onclick="deleteTransaction('${item.id}')" class="text-red-600 hover:text-red-900">Delete</button></td>`;
    html += `</tr>`;
    html += `<tr id="detail-${type}-${index}" class="hidden"><td colspan="${
      cols.length + 2
    }" class="px-5 py-3 border-b border-gray-200 bg-gray-50 text-sm"><div class="space-y-1">`;
    cols.forEach((col) => {
      if (!mobileCols.includes(col)) {
        let value = getNestedValue(item, col);
        html += `<p><strong>${col}:</strong> ${value}</p>`;
      }
    });
    html += `</div></td></tr>`;
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

  // --- PEMBETULAN: Logik Status yang betul untuk Subscription dan Pay Later ---
  if (lowerKey === "status") {
    // Logik untuk Pay Later
    if (obj.category === "Pay Later" && obj.due_date) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dueDate = new Date(obj.due_date);
      return dueDate < today ? "Terlebay" : "Aktif";
    }
    // Logik asal untuk Subscription
    if (obj.end_date) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const endDate = new Date(obj.end_date);
      return endDate < today ? "Non-Aktif" : "Aktif";
    }
    return "-";
  }

  // Logik untuk Baki Kad Kredit (tidak berubah)
  if (lowerKey === "baki") {
    const wallet = allWallets.find((w) => w.name === obj.source);
    if (!wallet || wallet.type !== "credit_card") {
      return "-";
    }
    const totalExpenses = allTransactions
      .filter((t) => t.source === obj.source && t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);
    const finalBalance = wallet.balance - totalExpenses;
    return `RM ${finalBalance.toFixed(2)}`;
  }

  // Fallback asal jika tiada padanan khas
  return obj[lowerKey] || "-";
}
// function getNestedValue(obj, key) {
//   const lowerKey = key.toLowerCase();

//   if (lowerKey === "item") return obj.item || "-";
//   if (lowerKey === "kos") return `RM ${obj.amount.toFixed(2)}`;
//   if (lowerKey === "jenis") return obj.type === "income" ? "Masuk" : "Keluar";
//   if (lowerKey === "tarikh" || lowerKey === "tarikh bayaran")
//     return new Date(obj.transaction_date).toLocaleDateString("ms-MY");
//   if (lowerKey === "end date")
//     return obj.end_date
//       ? new Date(obj.end_date).toLocaleDateString("ms-MY")
//       : "-";
//   if (lowerKey === "status")
//     return obj.end_date && new Date(obj.end_date) < new Date()
//       ? "Non-Aktif"
//       : "Aktif";
//   if (lowerKey === "nama kad") return obj.source;

//   // --- PINDAAN BERMULA DI SINI ---
//   if (lowerKey === "baki") {
//     // 1. Cari wallet kad kredit yang sepadan untuk mendapatkan baki semasa
//     const wallet = allWallets.find((w) => w.name === obj.source);
//     if (!wallet || wallet.type !== "credit_card") {
//       return "-"; // Kembali '-' jika bukan kad kredit atau wallet tidak dijumpai
//     }

//     // 2. Kira jumlah SEMUA perbelanjaan (expense) untuk kad kredit ini
//     const totalExpenses = allTransactions
//       .filter((t) => t.source === obj.source && t.type === "expense")
//       .reduce((sum, t) => sum + t.amount, 0);

//     // 3. Kira baki akhir: Baki Semasa - Jumlah Perbelanjaan
//     const finalBalance = wallet.balance - totalExpenses;

//     // 4. Pulangkan nilai yang telah diformat
//     return `RM ${finalBalance.toFixed(2)}`;
//   }
//   if (lowerKey === "baki") {
//     // Cari wallet yang sepadan dengan nama sumber transaksi
//     const wallet = allWallets.find((w) => w.name === obj.source);
//     // Jika wallet dijumpai dan ia adalah kad kredit, pulangkan baki
//     if (wallet && wallet.type === "credit_card") {
//       return `RM ${wallet.balance.toFixed(2)}`;
//     }
//     // Jika tidak, pulangkan '-'
//     return "-";
//   }
// --- PINDAAN TAMAT DI SINI ---

//   if (lowerKey === "jenis pembayaran") return obj.source;
//   if (lowerKey === "kategori") return obj.category;

//   if (lowerKey === "tarikh jatuh tempo")
//     return obj.due_date
//       ? new Date(obj.due_date).toLocaleDateString("ms-MY")
//       : "-";

//   // Fallback asal jika tiada padanan khas
//   return obj[lowerKey] || "-";
// }
// function getNestedValue(obj, key) {
//   if (key === "Item") return obj.item;
//   if (key === "Kos") return `RM ${obj.amount.toFixed(2)}`;
//   if (key === "Jenis") return obj.type === "income" ? "Masuk" : "Keluar";
//   if (key === "Tarikh" || key === "Tarikh Bayaran")
//     return new Date(obj.transaction_date).toLocaleDateString("ms-MY");
//   if (key === "End Date")
//     return obj.end_date
//       ? new Date(obj.end_date).toLocaleDateString("ms-MY")
//       : "-";
//   if (key === "Status")
//     return obj.end_date && new Date(obj.end_date) < new Date()
//       ? "Non-Aktif"
//       : "Aktif";
//   if (key === "Nama Kad") return obj.source;
//   if (key === "Baki") return "-"; // Placeholder
//   if (key === "Jenis Pembayaran") return obj.source;
//   if (key === "Kategori") return obj.category;
//   return obj[key] || "-";
// }

// --- CRUD HANDLERS ---
async function handleAddTransaction(e) {
  e.preventDefault();
  const formData = new FormData(e.target);
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
  if (error) {
    alert("Gagal menambah transaksi: " + error.message);
  } else {
    alert("Transaksi berjaya ditambah!");
    // Redirect to main page. The browser cache might still be an issue,
    // which is why the code in Step 3 is important.
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
    is_hidden: false, // --- PINDAAN: Default wallet adalah AKTIF (tidak disembunyikan) ---
  };
  const { error } = await supabase.from("wallets").insert([walletData]);
  if (error) alert("Gagal menambah wallet: " + error.message);
  else {
    e.target.reset();
    loadAdminPage(); // Muat semula senarai wallet
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
  // `isHidden` adalah nilai untuk medan `is_hidden` di database
  const { error } = await supabase
    .from("wallets")
    .update({ is_hidden: isHidden })
    .eq("id", id);
  if (error) {
    console.error("Error updating visibility:", error);
    alert("Gagal mengemas kini status.");
  } else {
    // Muat semula kedua-dua halaman untuk refleksi perubahan
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

  // Isi borang dengan data transaksi yang dipilih
  document.getElementById("edit-transaction-id").value = transaction.id;
  document.getElementById("edit-item").value = transaction.item;
  document.querySelector(
    `input[name="edit-type"][value="${transaction.type}"]`
  ).checked = true;
  document.getElementById("edit-amount").value = transaction.amount;
  document.getElementById("edit-transaction-date").value =
    transaction.transaction_date;

  // Isi dropdown Kategori
  const categorySelect = document.getElementById("edit-category");
  categorySelect.innerHTML = `
        <option value="">Pilih Kategori</option>
        <optgroup label="Duit Masuk"><option value="Income">Income</option><option value="Part-time">Part-time</option></optgroup>
        <optgroup label="Duit Keluar"><option value="subscription">Subscription</option><option value="monthly commitment">Monthly Commitment</option><option value="daily spent">Daily Spent</option></optgroup><option value="Pay Later">Pay Later</option></optgroup>
    `;
  categorySelect.value = transaction.category;

  // Isi dropdown Sumber / Wallet
  const sourceSelect = document.getElementById("edit-source");
  sourceSelect.innerHTML = '<option value="">Pilih Sumber</option>';
  allWallets.forEach((w) => {
    const option = document.createElement("option");
    option.value = w.name;
    option.textContent = `${w.name} (RM${w.balance})`;
    sourceSelect.appendChild(option);
  });
  sourceSelect.value = transaction.source;

  // Tunjukkan/sembunyikan End Date jika perlu
  const endDateGroup = document.getElementById("edit-end-date-group");
  const endDateInput = document.getElementById("edit-end-date");
  if (transaction.category === "subscription") {
    endDateGroup.classList.remove("hidden");
    endDateInput.value = transaction.end_date || "";
  } else {
    endDateGroup.classList.add("hidden");
  }

  // Tunjukkan/sembunyikan Due Date jika perlu
  const dueDateGroup = document.getElementById("edit-due-date-group");
  const dueDateInput = document.getElementById("edit-due-date");
  if (transaction.category === "Pay Later") {
    dueDateGroup.classList.remove("hidden");
    dueDateInput.value = transaction.due_date || "";
  } else {
    dueDateGroup.classList.add("hidden");
  }
  // Paparkan modal
  document.getElementById("edit-modal").classList.remove("hidden");
  document.getElementById("edit-modal").classList.add("flex");
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
  // renderAllTransactionTable();
  renderDebtList(); // Tambahan untuk memaparkan senarai hutang
}

function renderDashboard() {
  // --- Kiraan Jumlah Semua Baki Aktif (sedia ada) ---
  const totalBalance = allWallets
    .filter((wallet) => !wallet.is_hidden)
    .reduce((sum, wallet) => sum + wallet.balance, 0);
  document.getElementById(
    "total-income"
  ).textContent = `RM ${totalBalance.toFixed(2)}`;

  // --- Kiraan Jumlah Perbelanjaan (sedia ada) ---
  const expense = allTransactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);
  document.getElementById("total-expense").textContent = `RM ${expense.toFixed(
    2
  )}`;

  // --- Kiraan Jumlah Hutang Kad Kredit (sedia ada) ---
  const creditCardNames = allWallets
    .filter((w) => w.type === "credit_card")
    .map((w) => w.name);
  const totalCreditDebt = allTransactions
    .filter((t) => creditCardNames.includes(t.source) && t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);
  document.getElementById(
    "total-credit-debt"
  ).textContent = `RM ${totalCreditDebt.toFixed(2)}`;

  // --- PENGIRAAN BARU: Jumlah Hutang Pay Later ---
  const totalPayLaterDebt = allTransactions
    .filter((t) => t.category === "Pay Later" && t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);
  document.getElementById(
    "total-pay-later-debt"
  ).textContent = `RM ${totalPayLaterDebt.toFixed(2)}`;
}
// function renderDashboard() {
//   console.log("--- MENGIRA DASHBOARD ---");
//   console.log("Senarai SEMUA wallet yang dimuatkan dari Supabase:", allWallets);

//   // Kira hanya wallet yang AKTIF (is_hidden = false)
//   const activeWallets = allWallets.filter((wallet) => !wallet.is_hidden);
//   console.log("Senarai wallet AKTIF sahaja:", activeWallets);

//   const totalBalance = activeWallets.reduce(
//     (sum, wallet) => sum + wallet.balance,
//     0
//   );
//   console.log("Jumlah baki AKTIF yang dikira:", totalBalance);

//   // Paparkan ke dashboard
//   // Jumlah pendapatan (baki semua wallet aktif)
//   const incomeElement = document.getElementById("total-income");
//   if (incomeElement) {
//     incomeElement.textContent = `RM ${totalBalance.toFixed(2)}`;
//   } else {
//     console.error("Elemen dengan ID 'total-income' tidak ditemui!");
//   }

//   // Jumlah perbelanjaan
//   const expense = allTransactions
//     .filter((t) => t.type === "expense")
//     .reduce((sum, t) => sum + t.amount, 0);
//   document.getElementById("total-expense").textContent = `RM ${expense.toFixed(
//     2
//   )}`;
//   console.log("--- TAMAT PENGIRAAN DASHBOARD ---");
// }

// function renderDashboard() {
//   // Tambah baris ini untuk debugging
//   console.log("Data transaksi yang diterima untuk dashboard:", allTransactions);

//   const income = allTransactions
//     .filter((t) => t.type === "income")
//     .reduce((sum, t) => sum + t.amount, 0);
//   const expense = allTransactions
//     .filter((t) => t.type === "expense")
//     .reduce((sum, t) => sum + t.amount, 0);
//   document.getElementById("total-income").textContent = `RM ${income.toFixed(
//     2
//   )}`;
//   document.getElementById("total-expense").textContent = `RM ${expense.toFixed(
//     2
//   )}`;
// }
