document.addEventListener('DOMContentLoaded', () => {
    const expenseForm = document.querySelector('.expense-form');
    const expenseList = document.querySelector('.expense-list');
    const languageSelect = document.querySelector('#language-select');
    const currencySelect = document.querySelector('#currency-select');
    const addExpensePage = document.querySelector('#add-expense-page');
    const viewExpensesPage = document.querySelector('#view-expenses-page');
    const navLinks = document.querySelectorAll('nav a');
    const addExpenseBtn = document.querySelector('#add-expense-btn');
    const totalExpensesElement = document.querySelector('#total-expenses');
    const typeInput = document.querySelector('#type');
    const typeDropdown = document.querySelector('.type-dropdown .dropdown-content');
    const loginForm = document.querySelector('#login-form');
    const registerForm = document.querySelector('#register-form');
    const authPage = document.querySelector('#auth-page');
    const container = document.querySelector('.container');
    const usernameDisplay = document.querySelector('#username-display');
    const loginError = document.createElement('p');
    const registerError = document.createElement('p');
    const registerSuccess = document.createElement('p');
    loginError.id = 'login-error';
    loginError.style.color = 'red';
    registerError.id = 'register-error';
    registerError.style.color = 'red';
    registerSuccess.id = 'register-success';
    registerSuccess.style.color = 'green';
    loginForm.appendChild(loginError);
    loginForm.appendChild(registerSuccess);
    registerForm.appendChild(registerError);
    let userToken = null;
    let username = null;

    let expenses = [];
    let currentLanguage = localStorage.getItem('language') || 'en';
    let currentCurrency = localStorage.getItem('currency') || 'EUR';
    let isEditing = false;
    let editIndex = null;

    const translations = {
        en: {
            title: 'Expenses Tracker',
            addExpense: 'Add Expense',
            saveEdit: 'Save Edit',
            viewExpenses: 'View Expenses',
            description: 'Description',
            amount: 'Amount',
            date: 'Date',
            notes: 'Notes',
            type: 'Type',
            edit: 'Edit',
            delete: 'Delete'
        },
        de: {
            title: 'Ausgaben Tracker',
            addExpense: 'Ausgabe hinzufügen',
            saveEdit: 'Änderung speichern',
            viewExpenses: 'Ausgaben anzeigen',
            description: 'Beschreibung',
            amount: 'Betrag',
            date: 'Datum',
            notes: 'Notizen',
            type: 'Typ',
            edit: 'Bearbeiten',
            delete: 'Löschen'
        },
        it: {
            title: 'Tracciatore di Spese',
            addExpense: 'Aggiungi Spesa',
            saveEdit: 'Salva Modifica',
            viewExpenses: 'Visualizza Spese',
            description: 'Descrizione',
            amount: 'Importo',
            date: 'Data',
            notes: 'Note',
            type: 'Tipo',
            edit: 'Modifica',
            delete: 'Elimina'
        }
    };

    const flags = {
        en: 'https://flagcdn.com/w20/gb.png',
        de: 'https://flagcdn.com/w20/de.png',
        it: 'https://flagcdn.com/w20/it.png'
    };

    const SERVER_URL = 'https://expensetracker-u4ni.onrender.com'; // Replace with your actual deployed server URL

    async function loginUser(email, password) {
        try {
            const response = await fetch(`${SERVER_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await response.json();
            if (response.ok) {
                userToken = data.token;
                username = email;
                localStorage.setItem('username', username);
                authPage.style.display = 'none';
                container.style.display = 'block';
                usernameDisplay.textContent = `Welcome, ${username}`;
                loginError.textContent = '';
                registerSuccess.textContent = '';
                fetchExpenses();
            } else {
                loginError.textContent = data.error;
            }
        } catch (err) {
            console.error('Error logging in:', err);
            loginError.textContent = 'An error occurred. Please try again.';
        }
    }

    async function registerUser(email, password) {
        try {
            const response = await fetch(`${SERVER_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await response.json();
            if (response.ok) {
                registerSuccess.textContent = 'Registered successfully!';
                toggleForms();
                registerError.textContent = '';
            } else {
                registerError.textContent = data.error;
            }
        } catch (err) {
            console.error('Error registering:', err);
            registerError.textContent = 'An error occurred. Please try again.';
        }
    }

    async function fetchExpenses() {
        try {
            const response = await fetch(`${SERVER_URL}/expenses`, {
                headers: { 'Authorization': `Bearer ${userToken}` }
            });
            expenses = await response.json();
            renderExpenses();
        } catch (err) {
            console.error('Error fetching expenses:', err);
        }
    }

    async function saveExpense(expense) {
        try {
            const response = await fetch(`${SERVER_URL}/expenses`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${userToken}`
                },
                body: JSON.stringify(expense)
            });
            const newExpense = await response.json();
            expenses.push(newExpense);
            renderExpenses();
        } catch (err) {
            console.error('Error saving expense:', err);
        }
    }

    async function updateExpense(index, expense) {
        try {
            const response = await fetch(`${SERVER_URL}/expenses/${expenses[index]._id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${userToken}`
                },
                body: JSON.stringify(expense)
            });
            const updatedExpense = await response.json();
            expenses[index] = updatedExpense;
            renderExpenses();
        } catch (err) {
            console.error('Error updating expense:', err);
        }
    }

    async function deleteExpense(index) {
        try {
            await fetch(`${SERVER_URL}/expenses/${expenses[index]._id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${userToken}` }
            });
            expenses.splice(index, 1);
            renderExpenses();
        } catch (err) {
            console.error('Error deleting expense:', err);
        }
    }

    function saveLanguage() {
        localStorage.setItem('language', currentLanguage);
    }

    function saveCurrency() {
        localStorage.setItem('currency', currentCurrency);
    }

    function formatCurrency(amount) {
        return new Intl.NumberFormat('de-DE', { style: 'currency', currency: currentCurrency }).format(amount);
    }

    function renderExpenses() {
        expenseList.innerHTML = '';
        const groupedExpenses = expenses.reduce((acc, expense) => {
            if (!acc[expense.type]) acc[expense.type] = [];
            acc[expense.type].push(expense);
            return acc;
        }, {});

        const totalAmount = expenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);
        totalExpensesElement.textContent = formatCurrency(totalAmount);

        Object.keys(groupedExpenses).forEach(type => {
            const expenseType = document.createElement('div');
            expenseType.classList.add('expense-type');
            const totalTypeAmount = groupedExpenses[type].reduce((sum, expense) => sum + parseFloat(expense.amount), 0);
            expenseType.innerHTML = `
                <h3>${type} <span class="count">${formatCurrency(totalTypeAmount)}</span> <span class="arrow">▼</span></h3>
                <div class="expense-items"></div>
            `;
            const expenseItems = expenseType.querySelector('.expense-items');
            groupedExpenses[type].forEach((expense, index) => {
                const expenseItem = document.createElement('div');
                expenseItem.classList.add('expense-item');
                expenseItem.innerHTML = `
                    <div class="details">
                        <p>${expense.description}</p>
                        <p>${formatCurrency(expense.amount)}</p>
                        <p>${expense.date}</p>
                        <p>${expense.notes}</p>
                    </div>
                    <div class="actions">
                        <button class="edit">${translations[currentLanguage].edit}</button>
                        <button class="delete">${translations[currentLanguage].delete}</button>
                    </div>
                `;
                expenseItem.querySelector('.edit').addEventListener('click', () => editExpense(index));
                expenseItem.querySelector('.delete').addEventListener('click', () => deleteExpense(index));
                expenseItems.appendChild(expenseItem);
            });
            expenseType.querySelector('h3').addEventListener('click', () => {
                expenseType.classList.toggle('active');
            });
            expenseList.appendChild(expenseType);
        });
    }

    function addExpense(event) {
        event.preventDefault();
        const description = expenseForm.querySelector('#description').value;
        const amount = parseFloat(expenseForm.querySelector('#amount').value.replace(',', '.')).toFixed(2);
        const date = expenseForm.querySelector('#date').value;
        const notes = expenseForm.querySelector('#notes').value;
        const type = expenseForm.querySelector('#type').value;

        if (isEditing) {
            updateExpense(editIndex, { description, amount, date, notes, type });
            isEditing = false;
            editIndex = null;
            addExpenseBtn.textContent = translations[currentLanguage].addExpense;
        } else {
            saveExpense({ description, amount, date, notes, type });
        }

        expenseForm.reset();
    }

    function editExpense(index) {
        const expense = expenses[index];
        expenseForm.querySelector('#description').value = expense.description;
        expenseForm.querySelector('#amount').value = expense.amount;
        expenseForm.querySelector('#date').value = expense.date;
        expenseForm.querySelector('#notes').value = expense.notes;
        expenseForm.querySelector('#type').value = expense.type;

        isEditing = true;
        editIndex = index;
        addExpenseBtn.textContent = translations[currentLanguage].saveEdit;

        showPage('add-expense-page');
    }

    function changeLanguage(event) {
        currentLanguage = event.target.value;
        saveLanguage();
        updateTranslations();
    }

    function changeCurrency(event) {
        currentCurrency = event.target.value;
        saveCurrency();
        renderExpenses();
    }

    function updateTranslations() {
        document.querySelector('header h1').textContent = translations[currentLanguage].title;
        addExpenseBtn.textContent = isEditing ? translations[currentLanguage].saveEdit : translations[currentLanguage].addExpense;
        document.querySelector('#description-label').textContent = translations[currentLanguage].description;
        document.querySelector('#amount-label').textContent = translations[currentLanguage].amount;
        document.querySelector('#date-label').textContent = translations[currentLanguage].date;
        document.querySelector('#notes-label').textContent = translations[currentLanguage].notes;
        document.querySelector('#type-label').textContent = translations[currentLanguage].type;
        document.querySelector('nav a[href="#add-expense-page"]').textContent = translations[currentLanguage].addExpense;
        document.querySelector('nav a[href="#view-expenses-page"]').textContent = translations[currentLanguage].viewExpenses;
        document.querySelector('#language-flag').src = flags[currentLanguage];
        renderExpenses();
    }

    function showPage(pageId) {
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });
        setTimeout(() => {
            document.querySelector(`#${pageId}`).classList.add('active');
        }, 100);
    }

    navLinks.forEach(link => {
        link.addEventListener('click', (event) => {
            event.preventDefault();
            showPage(event.target.getAttribute('href').substring(1));
        });
    });

    expenseForm.addEventListener('submit', addExpense);
    languageSelect.addEventListener('change', changeLanguage);
    currencySelect.addEventListener('change', changeCurrency);

    typeInput.addEventListener('focus', () => {
        const types = [...new Set(expenses.map(expense => expense.type))];
        typeDropdown.innerHTML = '';
        types.forEach(type => {
            const typeOption = document.createElement('div');
            typeOption.textContent = `${type} (${expenses.filter(expense => expense.type === type).length})`;
            typeOption.addEventListener('click', () => {
                typeInput.value = type;
                typeDropdown.classList.remove('active');
            });
            typeDropdown.appendChild(typeOption);
        });
        typeDropdown.classList.add('active');
    });

    typeInput.addEventListener('input', () => {
        const filter = typeInput.value.toLowerCase();
        const types = [...new Set(expenses.map(expense => expense.type))];
        typeDropdown.innerHTML = '';
        types.filter(type => type.toLowerCase().includes(filter)).forEach(type => {
            const typeOption = document.createElement('div');
            typeOption.textContent = `${type} (${expenses.filter(expense => expense.type === type).length})`;
            typeOption.addEventListener('click', () => {
                typeInput.value = type;
                typeDropdown.classList.remove('active');
            });
            typeDropdown.appendChild(typeOption);
        });
        typeDropdown.classList.add('active');
    });

    document.addEventListener('click', (event) => {
        if (!typeInput.contains(event.target) && !typeDropdown.contains(event.target)) {
            typeDropdown.classList.remove('active');
        }
    });

    loginForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const email = loginForm.querySelector('#username').value;
        const password = loginForm.querySelector('#password').value;
        loginUser(email, password);
    });

    registerForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const email = registerForm.querySelector('#register-username').value;
        const password = registerForm.querySelector('#register-password').value;
        registerUser(email, password);
    });

    document.querySelector('#toggle-register').addEventListener('click', (event) => {
        event.preventDefault();
        toggleForms();
    });

    document.querySelector('#toggle-login').addEventListener('click', (event) => {
        event.preventDefault();
        toggleForms();
    });

    function toggleForms() {
        loginForm.style.display = loginForm.style.display === 'none' ? 'block' : 'none';
        registerForm.style.display = registerForm.style.display === 'none' ? 'block' : 'none';
    }

    // Set the selected language and currency in the dropdowns
    languageSelect.value = currentLanguage;
    currencySelect.value = currentCurrency;

    // Ensure auth page is visible on initial load
    authPage.style.display = 'flex';
    container.style.display = 'none';

    // Display username if available
    username = localStorage.getItem('username');
    if (username) {
        usernameDisplay.textContent = `Welcome, ${username}`;
    }

    // Apply saved language and currency settings
    updateTranslations();
    renderExpenses();

    // Only call updateTranslations and renderExpenses if user is authenticated
    if (userToken) {
        showPage('add-expense-page');
    }
});
