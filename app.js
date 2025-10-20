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
    document.getElementById("total-income").textContent = `RM ${netBalance.toFixed(2)}`;

    // --- Paparkan Jumlah Perbelanjaan ---
    document.getElementById("total-expense").textContent = `RM ${expense.toFixed(2)}`;

    // --- Kiraan Dashboard Lain (Tidak Berubah) ---
    const creditCardNames = allWallets.filter((w) => w.type === "credit_card").map((w) => w.name);
    const totalCreditDebt = allTransactions
        .filter((t) => creditCardNames.includes(t.source) && t.type === "expense")
        .reduce((sum, t) => sum + t.amount, 0);
    document.getElementById("total-credit-debt").textContent = `RM ${totalCreditDebt.toFixed(2)}`;

    const totalPayLaterDebt = allTransactions
        .filter((t) => t.category === "Pay Later" && t.type === "expense")
        .reduce((sum, t) => sum + t.amount, 0);
    document.getElementById("total-pay-later-debt").textContent = `RM ${totalPayLaterDebt.toFixed(2)}`;
}
