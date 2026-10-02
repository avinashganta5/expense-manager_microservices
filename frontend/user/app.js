const API_URL = "http://localhost:3000";

let currentUser = null;


// ==========================================
// Helpers
// ==========================================

function formatCurrency(amount) {

    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2
    }).format(Number(amount));
}


function getInitial(name) {

    return name
        ? name.charAt(0).toUpperCase()
        : "U";
}


// ==========================================
// Register
// ==========================================

document
    .getElementById("registerForm")
    .addEventListener("submit", async (event) => {

        event.preventDefault();

        const name =
            document.getElementById("name").value.trim();

        const email =
            document.getElementById("email").value.trim();

        const password =
            document.getElementById("password").value;

        const message =
            document.getElementById("registerMessage");

        try {

            const response = await fetch(
                `${API_URL}/api/users/register`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({
                        name,
                        email,
                        password
                    })
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message);
            }

            currentUser = data.user;

            localStorage.setItem(
                "expenseUser",
                JSON.stringify(currentUser)
            );

            updateUserUI();

            document.getElementById("userId").value =
                currentUser.id;

            message.style.color = "#16a34a";

            message.textContent =
                `Account created. Your User ID is ${currentUser.id}`;

            setTimeout(() => {

                closeRegisterModal();

                loadExpenses();

            }, 1000);

        } catch (error) {

            message.style.color = "#dc2626";

            message.textContent = error.message;
        }
    });


// ==========================================
// Load User
// ==========================================

async function loadUser() {

    const userId =
        document.getElementById("userId").value;

    if (!userId) {

        alert("Please enter your User ID.");

        return;
    }

    try {

        const response = await fetch(
            `${API_URL}/api/users/${userId}`
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message);
        }

        currentUser = data;

        localStorage.setItem(
            "expenseUser",
            JSON.stringify(currentUser)
        );

        updateUserUI();

        loadExpenses();

    } catch (error) {

        alert(error.message);
    }
}


// ==========================================
// Update User UI
// ==========================================

function updateUserUI() {

    if (!currentUser) {
        return;
    }

    const initial =
        getInitial(currentUser.name);

    document.getElementById("sidebarAvatar")
        .textContent = initial;

    document.getElementById("profileAvatar")
        .textContent = initial;

    document.getElementById("sidebarName")
        .textContent = currentUser.name;

    document.getElementById("sidebarEmail")
        .textContent = currentUser.email;

    document.getElementById("profileName")
        .textContent = currentUser.name;

    document.getElementById("profileEmail")
        .textContent = currentUser.email;

    document.getElementById("profileId")
        .textContent = currentUser.id;

    document.getElementById("userId")
        .value = currentUser.id;
}


// ==========================================
// Load Expenses
// ==========================================

async function loadExpenses() {

    const userId =
        document.getElementById("userId").value;

    if (!userId) {
        return;
    }

    try {

        const response = await fetch(
            `${API_URL}/api/users/${userId}/expenses`
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message);
        }

        renderExpenses(data.expenses);

        updateStats(data.expenses);

    } catch (error) {

        document.getElementById("expenseTable")
            .innerHTML = `
                <tr>
                    <td colspan="6" class="empty">
                        ${error.message}
                    </td>
                </tr>
            `;
    }
}


// ==========================================
// Render Expenses
// ==========================================

function renderExpenses(expenses) {

    const table =
        document.getElementById("expenseTable");

    if (!expenses || expenses.length === 0) {

        table.innerHTML = `
            <tr>
                <td colspan="6" class="empty">
                    No expenses found.
                    Add your first expense below.
                </td>
            </tr>
        `;

        return;
    }

    table.innerHTML = "";

    expenses.forEach((expense) => {

        const row =
            document.createElement("tr");

        const date =
            new Date(expense.created_at)
                .toLocaleDateString("en-IN");

        const status =
            expense.status.toLowerCase();

        row.innerHTML = `
            <td>
                <div class="expense-title">
                    ${escapeHTML(expense.title)}
                </div>

                <div class="expense-description">
                    ${escapeHTML(
                        expense.description || "No description"
                    )}
                </div>
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
                            <button
                                class="delete-btn"
                                onclick="deleteExpense(${expense.id})"
                            >
                                Delete
                            </button>
                          `
                        : ""
                }
            </td>
        `;

        table.appendChild(row);
    });
}


// ==========================================
// Update Statistics
// ==========================================

function updateStats(expenses) {

    let total = 0;
    let pending = 0;
    let approved = 0;

    expenses.forEach((expense) => {

        const amount =
            Number(expense.amount);

        total += amount;

        if (expense.status === "PENDING") {
            pending += amount;
        }

        if (expense.status === "APPROVED") {
            approved += amount;
        }

    });

    document.getElementById("totalAmount")
        .textContent = formatCurrency(total);

    document.getElementById("pendingAmount")
        .textContent = formatCurrency(pending);

    document.getElementById("approvedAmount")
        .textContent = formatCurrency(approved);

    document.getElementById("expenseCount")
        .textContent = expenses.length;
}


// ==========================================
// Create Expense
// ==========================================

document
    .getElementById("expenseForm")
    .addEventListener("submit", async (event) => {

        event.preventDefault();

        const userId =
            document.getElementById("userId").value;

        if (!userId) {

            alert("Load your account first.");

            return;
        }

        const title =
            document.getElementById("expenseTitle").value.trim();

        const description =
            document.getElementById("expenseDescription").value.trim();

        const amount =
            document.getElementById("expenseAmount").value;

        const category =
            document.getElementById("expenseCategory").value;

        const message =
            document.getElementById("expenseMessage");

        try {

            const response = await fetch(
                `${API_URL}/api/users/${userId}/expenses`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({
                        title,
                        description,
                        amount,
                        category
                    })
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message);
            }

            message.style.color = "#16a34a";

            message.textContent =
                "Expense submitted successfully.";

            document
                .getElementById("expenseForm")
                .reset();

            loadExpenses();

        } catch (error) {

            message.style.color = "#dc2626";

            message.textContent =
                error.message;
        }
    });


// ==========================================
// Delete Expense
// ==========================================

async function deleteExpense(expenseId) {

    const userId =
        document.getElementById("userId").value;

    if (!confirm(
        "Are you sure you want to delete this expense?"
    )) {
        return;
    }

    try {

        const response = await fetch(
            `${API_URL}/api/users/${userId}/expenses/${expenseId}`,
            {
                method: "DELETE"
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message);
        }

        loadExpenses();

    } catch (error) {

        alert(error.message);
    }
}


// ==========================================
// Modal
// ==========================================

function openExpenseModal() {

    document
        .getElementById("add-expense")
        .scrollIntoView({
            behavior: "smooth"
        });
}

function openRegisterModal() {

    document
        .getElementById("registerModal")
        .classList.add("show");
}

function closeRegisterModal() {

    document
        .getElementById("registerModal")
        .classList.remove("show");
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


// ==========================================
// Initial Load
// ==========================================

window.addEventListener("DOMContentLoaded", () => {

    const savedUser =
        localStorage.getItem("expenseUser");

    if (savedUser) {

        try {

            currentUser =
                JSON.parse(savedUser);

            updateUserUI();

            loadExpenses();

        } catch {

            localStorage.removeItem(
                "expenseUser"
            );
        }
    }

});
