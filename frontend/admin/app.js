const API_URL = "http://localhost:3000";

let allExpenses = [];
let currentFilter = "ALL";


// ==========================================
// Currency
// ==========================================

function formatCurrency(amount) {

    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2
    }).format(Number(amount));
}


// ==========================================
// Initial
// ==========================================

window.addEventListener("DOMContentLoaded", () => {

    loadUsers();

    loadExpenses();

});


// ==========================================
// Load Users
// ==========================================

async function loadUsers() {

    const container =
        document.getElementById("usersGrid");

    try {

        const response = await fetch(
            `${API_URL}/api/admin/users`
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message);
        }

        document.getElementById("totalUsers")
            .textContent = data.count;

        if (!data.users.length) {

            container.innerHTML =
                `<p class="empty">No users found.</p>`;

            return;
        }

        container.innerHTML = "";

        data.users.forEach(user => {

            const div =
                document.createElement("div");

            div.className = "user-card";

            const initial =
                user.name
                    ? user.name.charAt(0).toUpperCase()
                    : "U";

            div.innerHTML = `

                <div class="user-avatar">
                    ${initial}
                </div>

                <div>

                    <h3>
                        ${escapeHTML(user.name)}
                    </h3>

                    <p>
                        ${escapeHTML(user.email)}
                    </p>

                    <span class="user-status">
                        ● ${user.status}
                    </span>

                </div>

            `;

            container.appendChild(div);

        });

    } catch (error) {

        container.innerHTML = `
            <p class="empty">
                ${error.message}
            </p>
        `;
    }
}


// ==========================================
// Load Expenses
// ==========================================

async function loadExpenses() {

    const table =
        document.getElementById("expenseTable");

    try {

        const response = await fetch(
            `${API_URL}/api/admin/expenses`
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message);
        }

        allExpenses = data.expenses;

        updateStats(allExpenses);

        renderExpenses();

    } catch (error) {

        table.innerHTML = `
            <tr>
                <td
                    colspan="7"
                    class="empty"
                >
                    ${error.message}
                </td>
            </tr>
        `;
    }
}


// ==========================================
// Render Expenses
// ==========================================

function renderExpenses() {

    const table =
        document.getElementById("expenseTable");

    let expenses = allExpenses;

    if (currentFilter !== "ALL") {

        expenses =
            allExpenses.filter(
                expense =>
                    expense.status === currentFilter
            );
    }

    if (!expenses.length) {

        table.innerHTML = `
            <tr>
                <td
                    colspan="7"
                    class="empty"
                >
                    No expenses found.
                </td>
            </tr>
        `;

        return;
    }

    table.innerHTML = "";

    expenses.forEach(expense => {

        const row =
            document.createElement("tr");

        const status =
            expense.status.toLowerCase();

        const date =
            new Date(expense.created_at)
                .toLocaleDateString("en-IN");

        row.innerHTML = `

            <td>

                <div class="expense-title">
                    ${escapeHTML(expense.title)}
                </div>

                <div class="expense-description">
                    ${escapeHTML(
                        expense.description || "-"
                    )}
                </div>

            </td>


            <td>

                <div class="employee-name">
                    ${escapeHTML(expense.user_name)}
                </div>

                <span class="employee-email">
                    ${escapeHTML(expense.user_email)}
                </span>

            </td>


            <td>
                ${escapeHTML(expense.category)}
            </td>


            <td class="amount">
                ${formatCurrency(expense.amount)}
            </td>


            <td>

                <span class="badge ${status}">
                    ${expense.status}
                </span>

            </td>


            <td>
                ${date}
            </td>


            <td>

                ${
                    expense.status === "PENDING"
                        ? `

                            <div class="actions">

                                <button
                                    class="action-btn approve-btn"
                                    onclick="approveExpense(${expense.id})"
                                >
                                    Approve
                                </button>

                                <button
                                    class="action-btn reject-btn"
                                    onclick="rejectExpense(${expense.id})"
                                >
                                    Reject
                                </button>

                            </div>

                          `
                        : "—"
                }

            </td>

        `;

        table.appendChild(row);

    });
}


// ==========================================
// Statistics
// ==========================================

function updateStats(expenses) {

    const pending =
        expenses.filter(
            e => e.status === "PENDING"
        ).length;

    const approved =
        expenses.filter(
            e => e.status === "APPROVED"
        ).length;

    const total =
        expenses.reduce(
            (sum, e) => sum + Number(e.amount),
            0
        );

    document.getElementById("pendingExpenses")
        .textContent = pending;

    document.getElementById("approvedExpenses")
        .textContent = approved;

    document.getElementById("totalValue")
        .textContent = formatCurrency(total);
}


// ==========================================
// Filter
// ==========================================

function filterExpenses(filter, button) {

    currentFilter = filter;

    document
        .querySelectorAll(".filter")
        .forEach(item =>
            item.classList.remove("active")
        );

    button.classList.add("active");

    renderExpenses();
}


// ==========================================
// Approve
// ==========================================

async function approveExpense(id) {

    if (!confirm(
        "Approve this expense?"
    )) {
        return;
    }

    try {

        const response = await fetch(
            `${API_URL}/api/admin/expenses/${id}/approve`,
            {
                method: "PUT"
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message);
        }

        await loadExpenses();

    } catch (error) {

        alert(error.message);
    }
}


// ==========================================
// Reject
// ==========================================

async function rejectExpense(id) {

    if (!confirm(
        "Reject this expense?"
    )) {
        return;
    }

    try {

        const response = await fetch(
            `${API_URL}/api/admin/expenses/${id}/reject`,
            {
                method: "PUT"
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message);
        }

        await loadExpenses();

    } catch (error) {

        alert(error.message);
    }
}


// ==========================================
// HTML Escape
// ==========================================

function escapeHTML(value) {

    const div =
        document.createElement("div");

    div.textContent = value;

    return div.innerHTML;
}
