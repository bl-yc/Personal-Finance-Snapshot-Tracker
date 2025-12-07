// Personal Finance Snapshot Tracker - Main Application
class FinanceTracker {
    constructor() {
        this.data = {
            snapshots: []
        };
        this.currentSnapshotId = null;
        this.editingItems = new Map(); // Track editing state for each category

        // New sorting state
        this.sortBy = 'date'; // 'date' or 'name'
        this.sortDirection = 'desc'; // 'asc' or 'desc'

        // Search state
        this.searchTerm = '';
        this.isRenaming = false;

        // Chart creation state
        this.chartCreationInProgress = false;

        // Edit mode state tracking
        this.editModeStates = {
            assets: false,
            liabilities: false,
            incomes: false,
            expenses: false
        };

        // Table state for enhanced features
        this.tableState = {
            assets: {
                sortColumn: null,
                sortDirection: 'asc',
                filters: {
                    name: '',
                    amount: '',
                    category: '',
                    liquidity: ''
                },
                columnWidths: {
                    name: '28%',
                    amount: '22%',
                    category: '28%',
                    liquidity: '22%'
                }
            },
            liabilities: {
                sortColumn: null,
                sortDirection: 'asc',
                filters: {
                    name: '',
                    amount: '',
                    term: ''
                },
                columnWidths: {
                    name: '28%',
                    amount: '22%',
                    term: '25%',
                    actions: '25%'
                }
            },
            incomes: {
                sortColumn: null,
                sortDirection: 'asc',
                filters: {
                    name: '',
                    amount: '',
                    category: ''
                },
                columnWidths: {
                    name: '25%',
                    amount: '20%',
                    category: '30%',
                    actions: '25%'
                }
            },
            expenses: {
                sortColumn: null,
                sortDirection: 'asc',
                filters: {
                    name: '',
                    amount: '',
                    category: ''
                },
                columnWidths: {
                    name: '30%',
                    amount: '20%',
                    category: '25%',
                    actions: '25%'
                }
            }
        };
        
        this.init();
    }

    init() {
        this.loadData();
        this.checkShowWelcomeScreen();
        this.bindEventListeners();
        this.ensureAtLeastOneSnapshot(); // Only call if there are snapshots already
        this.updateUI();
        this.initChatbot(); // Initialize AI chatbot
    }

    // Data Management
    loadData() {
        const savedData = localStorage.getItem('financeData');
        if (savedData) {
            try {
                this.data = JSON.parse(savedData);
            } catch (e) {
                console.error('Error parsing saved data:', e);
                this.data = { snapshots: [] };
            }
        }
    }

    saveData() {
        localStorage.setItem('financeData', JSON.stringify(this.data));
    }

    clearData() {
        this.data = { snapshots: [] };
        this.currentSnapshotId = null;
        this.searchTerm = '';
        this.saveData();

        // Update UI without auto-creating snapshots
        this.updateSnapshotList();
        this.updateSnapshotNotification(); // Show notification when all data is cleared
        this.updateSummary();
        this.updateEmptyTables(); // Show empty tables instead of calling ensureAtLeastOneSnapshot
        this.updateMainPageState(); // Update main page state after clearing
        this.createCharts(); // Update charts and financial ratios to show empty state
        this.showMessage('🗑️ All data cleared! You now have a fresh start. Click "New Snapshot" to begin.', 'success');
    }

    clearAllData() {
        // Enhanced clear all with detailed confirmation
        const snapshotCount = this.data.snapshots.length;
        const hasData = snapshotCount > 0;
        const hasApiKey = localStorage.getItem('ai_api_key') !== null;

        let confirmMessage = '🗑️ CLEAR ALL DATA - FRESH START\n\n';
        confirmMessage += 'This will permanently delete ALL your data:\n\n';

        if (hasData) {
            confirmMessage += `• ${snapshotCount} snapshot(s) will be removed\n`;
            confirmMessage += '• All assets, liabilities, income, and expenses will be deleted\n';
        } else {
            confirmMessage += '• No existing financial data to delete\n';
        }

        confirmMessage += '• AI Chatbot history will be cleared\n';
        if (hasApiKey) {
            confirmMessage += '• AI Assistant API key will be cleared\n';
        }

        confirmMessage += '\nAfter clearing, you can:\n';
        confirmMessage += '• Create new snapshots\n';
        confirmMessage += '• Add fresh financial data\n';
        confirmMessage += '• Reconfigure AI assistance if needed\n';
        confirmMessage += '• Start completely fresh\n\n';
        confirmMessage += '⚠️ This action cannot be undone!\n\n';
        confirmMessage += 'Do you want to proceed and get a fresh start?';

        if (confirm(confirmMessage)) {
            this.clearData();

            // Clear chatbot data and API key without additional confirmations
            this.clearChat();
            localStorage.removeItem('ai_api_key');
            localStorage.removeItem('ai_base_url');
            localStorage.removeItem('ai_model_id');
            this.loadApiKeyStatus();

            // Close settings modal if open
            const settingsModal = document.getElementById('chatbotSettingsModal');
            if (settingsModal && settingsModal.classList.contains('active')) {
                this.closeChatbotSettings();
            }

            this.showMessage('🗑️ Everything cleared! Fresh start complete.', 'success');
        }
    }

    // Utility Functions
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    }

    validateNumber(value) {
        const num = parseFloat(value);
        return !isNaN(num) && num >= 0 ? num : 0;
    }

    formatDate(isoString) {
        try {
            const date = new Date(isoString);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (e) {
            return 'Invalid date';
        }
    }

    // Check if user has an active snapshot
    hasActiveSnapshot() {
        return this.currentSnapshotId !== null && 
               this.data.snapshots.length > 0 && 
               this.data.snapshots.some(s => s.id === this.currentSnapshotId);
    }

    // Update main page state based on active snapshot
    updateMainPageState() {
        const hasActiveSnapshot = this.hasActiveSnapshot();
        const mainContent = document.querySelector('.main-content');
        
        // Disable/enable forms
        const forms = [
            'assetsForm',
            'liabilitiesForm', 
            'incomeForm',
            'expensesForm'
        ];
        
        forms.forEach(formId => {
            const form = document.getElementById(formId);
            if (form) {
                const inputs = form.querySelectorAll('input, select, button');
                inputs.forEach(input => {
                    if (hasActiveSnapshot) {
                        input.disabled = false;
                        input.removeAttribute('title');
                    } else {
                        input.disabled = true;
                        input.setAttribute('title', 'Create or select a snapshot to add data');
                    }
                });
            }
        });

        // Disable/enable table action buttons
        const actionButtons = document.querySelectorAll('.btn-edit, .btn-delete');
        actionButtons.forEach(button => {
            if (hasActiveSnapshot) {
                button.disabled = false;
                button.removeAttribute('title');
            } else {
                button.disabled = true;
                button.setAttribute('title', 'Create or select a snapshot to manage items');
            }
        });

        // Disable/enable table filter icons (sortable column headers)
        const filterIcons = document.querySelectorAll('.filter-icon');
        filterIcons.forEach(icon => {
            if (hasActiveSnapshot) {
                icon.style.pointerEvents = 'auto';
                icon.style.opacity = '0.4';
                icon.removeAttribute('title');
            } else {
                icon.style.pointerEvents = 'none';
                icon.style.opacity = '0.3';
                icon.setAttribute('title', 'Create or select a snapshot to use filters');
            }
        });
    }

    // Asset Category Examples & Liquidity Guide
    getAssetCategoryExamples(category) {
        const examples = {
            'cash': [
                'Cash',
                'Savings account',
                'Checking account',
                'Money Market Funds',
                'e-Wallets'
            ],
            'investments': [
                'Stocks',
                'ETFs / Mutual Funds',
                'Bonds',
                'Crypto',
                'Robo-advisor portfolios'
            ],
            'retirement': [
                'CPF / 401k / IRA / EPF',
                'Pension accounts'
            ],
            'property': [
                'Home / Real estate',
                'Investment property'
            ],
            'vehicles': [
                'Car',
                'Motorcycle'
            ],
            'insurance': [
                'Whole life cash value',
                'Endowment value'
            ],
            'other': [
                'Collectibles',
                'Deposits',
                'Business equity'
            ]
        };
        return examples[category] || [];
    }

    getLiquidityDisplayName(liquidityValue) {
        const displayNames = {
            'high': 'High',
            'medium': 'Medium',
            'low': 'Low'
        };
        return displayNames[liquidityValue] || liquidityValue;
    }

    // Liability Term Examples & Guide
    getLiabilityTermExamples(term) {
        const examples = {
            'short-term': [
                'Credit card balances',
                'Personal loans (high monthly payments)',
                'Overdrafts',
                'PayLater or BNPL installments',
                'Outstanding bills (utilities, medical)'
            ],
            'medium-term': [
                'Student loans (under 5 years repayment)',
                'Personal loans with fixed terms (2-5 years)',
                'Small business loans (up to 5 years)'
            ],
            'long-term': [
                'Car loans',
                'Mortgage / housing loan',
                'Long-term business loan (>5 years)',
                'Education loan (>5 years remaining)',
                'Property investment loan',
                'Life insurance policy loans'
            ]
        };
        return examples[term] || [];
    }

    getLiabilityTermDisplayName(termValue) {
        const displayNames = {
            'short-term': 'Short-Term',
            'medium-term': 'Medium-Term',
            'long-term': 'Long-Term'
        };
        return displayNames[termValue] || termValue;
    }

    updateLiabilityTermExamples() {
        const termSelect = document.getElementById('liabilityTerm');
        const selectedTerm = termSelect.value;
        const examplesContainer = document.getElementById('liabilityTermExamplesContent');

        if (!selectedTerm) {
            examplesContainer.innerHTML = '<p class="examples-placeholder">Select a term to see examples</p>';
            return;
        }

        const examples = this.getLiabilityTermExamples(selectedTerm);

        // Term descriptions
        const descriptions = {
            'short-term': 'Short-Term: Debts that must be paid within a year or require regular, immediate payments.',
            'medium-term': 'Medium-Term: Debts with a 1–5 year repayment horizon or predictable monthly payments.',
            'long-term': 'Long-Term: Debts repaid over more than 5 years and usually tied to long-term assets.'
        };

        let html = `<p class="term-description">${descriptions[selectedTerm]}</p>`;

        html += '<ul class="examples-list">';
        examples.forEach(example => {
            html += `<li>${example}</li>`;
        });
        html += '</ul>';

        examplesContainer.innerHTML = html;
    }

    updateAssetCategoryExamples() {
        const categorySelect = document.getElementById('assetCategory');
        const selectedCategory = categorySelect.value;
        const examplesContainer = document.getElementById('categoryExamplesContent');
        
        if (!selectedCategory) {
            examplesContainer.innerHTML = '<p class="examples-placeholder">Select a category to see examples and liquidity information</p>';
            return;
        }

        const examples = this.getAssetCategoryExamples(selectedCategory);
        const categoryClass = `category-${selectedCategory}`;
        
        let html = `<div class="${categoryClass}">`;
        
        // Add category examples
        html += '<h5>Category Examples:</h5>';
        html += '<ul class="examples-list">';
        examples.forEach(example => {
            html += `<li>${example}</li>`;
        });
        html += '</ul>';
        
        // Add liquidity guide
        html += '<h5>Liquidity Guide:</h5>';
        html += '<ul class="examples-list">';
        html += '<li><strong>High:</strong> Easily converted to cash (immediate)</li>';
        html += '<li><strong>Medium:</strong> Can be sold but takes time or penalties</li>';
        html += '<li><strong>Low:</strong> Hard to sell quickly; may take weeks/months/years</li>';
        html += '</ul>';
        
        html += '</div>';
        
        examplesContainer.innerHTML = html;
    }

    // Income Category Examples & Guide
    getIncomeCategoryExamples(category) {
        const examples = {
            'employment': [
                'Salary',
                'Bonuses',
                'Allowances',
                'Overtime pay'
            ],
            'business': [
                'Freelance projects',
                'Side gigs',
                'Business profit share',
                'Consulting fees'
            ],
            'passive': [
                'Rental income',
                'Dividend payments',
                'Interest from savings',
                'Royalties'
            ],
            'other': [
                'Allowance from parents',
                'Tax refunds',
                'Insurance payouts'
            ]
        };
        return examples[category] || [];
    }

    getIncomeCategoryDisplayName(categoryValue) {
        const displayNames = {
            'employment': 'Employment Income',
            'business': 'Business / Self-Employment Income',
            'passive': 'Passive Income',
            'other': 'Other Income'
        };
        return displayNames[categoryValue] || categoryValue;
    }

    // Update income category examples based on selected category
    updateIncomeCategoryExamples() {
        const categorySelect = document.getElementById('incomeCategory');
        const selectedCategory = categorySelect.value;
        const examplesContainer = document.getElementById('incomeCategoryExamplesContent');

        if (!selectedCategory) {
            examplesContainer.innerHTML = '<p class="examples-placeholder">Select a category to see examples</p>';
            return;
        }

        const examples = this.getIncomeCategoryExamples(selectedCategory);

        // Category descriptions
        const descriptions = {
            'employment': 'Employment Income: Regular income from your job or profession.',
            'business': 'Business Income: Earnings from self-employment, side businesses, or freelance work.',
            'passive': 'Passive Income: Money earned with little effort (investments, rentals, etc.).',
            'other': 'Other Income: One-time payments, gifts, or miscellaneous earnings.'
        };

        let html = `<p class="category-description">${descriptions[selectedCategory]}</p>`;

        if (examples.length > 0) {
            html += '<h5>Examples:</h5>';
            html += '<ul class="examples-list">';
            examples.forEach(example => {
                html += `<li>${example}</li>`;
            });
            html += '</ul>';
        }

        examplesContainer.innerHTML = html;
    }

    // Expense Category Examples & Guide
    getExpenseCategoryExamples(category) {
        const examples = {
            'essential': [
                'Rent/Mortgage',
                'Utilities (electricity, water, gas)',
                'Insurance (health, home, car)',
                'Groceries',
                'Transportation (bus, train, car maintenance)'
            ],
            'variable': [
                'Food delivery/ Dining out',
                'Streaming services',
                'Mobile phone bill',
                'Clothing',
                'Household supplies'
            ],
            'discretionary': [
                'Entertainment (movies, concerts)',
                'Travel/Holidays',
                'Hobbies',
                'Gym membership',
                'Luxury purchases'
            ],
            'other': [
                'Medical expenses',
                'Gifts',
                'Repair costs',
                'Donations',
                'Unexpected bills'
            ]
        };
        return examples[category] || [];
    }

    getExpenseCategoryDisplayName(categoryValue) {
        const displayNames = {
            'essential': 'Essential / Fixed',
            'variable': 'Variable / Living',
            'discretionary': 'Discretionary / Lifestyle',
            'other': 'Other Expenses'
        };
        return displayNames[categoryValue] || categoryValue;
    }

    // Update expense category examples based on selected category
    updateExpenseCategoryExamples() {
        const categorySelect = document.getElementById('expenseCategory');
        const selectedCategory = categorySelect.value;
        const examplesContainer = document.getElementById('expenseCategoryExamplesContent');

        if (!selectedCategory) {
            examplesContainer.innerHTML = '<p class="examples-placeholder">Select a category to see examples</p>';
            return;
        }

        const examples = this.getExpenseCategoryExamples(selectedCategory);

        // Category descriptions
        const descriptions = {
            'essential': 'Essential / Fixed: Expenses that are required to maintain basic living standards.',
            'variable': 'Variable / Living: Everyday expenses that can fluctuate.',
            'discretionary': 'Discretionary / Lifestyle: Optional expenses for leisure and lifestyle choices.',
            'other': 'Other Expenses: Miscellaneous or uncommon expenses.'
        };

        let html = `<p class="category-description">${descriptions[selectedCategory]}</p>`;

        if (examples.length > 0) {
            html += '<h5>Examples:</h5>';
            html += '<ul class="examples-list">';
            examples.forEach(example => {
                html += `<li>${example}</li>`;
            });
            html += '</ul>';
        }

        examplesContainer.innerHTML = html;
    }

    getCategoryDisplayName(categoryValue) {
        const displayNames = {
            'cash': 'Cash Equivalents',
            'investments': 'Investments',
            'retirement': 'Retirement',
            'property': 'Property',
            'vehicles': 'Vehicles',
            'insurance': 'Insurance (Cash Value)',
            'other': 'Other Assets'
        };
        return displayNames[categoryValue] || categoryValue;
    }

    // Snapshot Management
    createSnapshot() {
        const label = prompt('Enter a name for this snapshot:', `Snapshot ${this.data.snapshots.length + 1}`);
        if (!label) return;

        const snapshot = {
            id: this.generateId(),
            label: label.trim(),
            createdAt: new Date().toISOString(),
            data: {
                assets: [],
                liabilities: [],
                incomes: [],
                expenses: []
            }
        };

        this.data.snapshots.push(snapshot);
        this.currentSnapshotId = snapshot.id;
        this.saveData();
        this.updateUI();
        this.showMessage('Snapshot created successfully', 'success');
    }

    deleteSnapshot() {
        if (!this.currentSnapshotId) {
            this.showMessage('No snapshot selected', 'error');
            return;
        }

        if (this.data.snapshots.length <= 1) {
            if (confirm('This is the only snapshot. Delete it and start fresh?')) {
                this.data.snapshots = [];
                this.currentSnapshotId = null;
                this.saveData();
                this.updateUI();
                this.showMessage('Snapshot deleted', 'success');
            }
            return;
        }

        const snapshot = this.getCurrentSnapshot();
        if (confirm(`Are you sure you want to delete "${snapshot.label}"?`)) {
            this.data.snapshots = this.data.snapshots.filter(s => s.id !== this.currentSnapshotId);
            this.currentSnapshotId = this.data.snapshots[0].id;
            this.saveData();
            this.updateUI();
            this.showMessage('Snapshot deleted successfully', 'success');
        }
    }

    duplicateSnapshot() {
        if (!this.currentSnapshotId) {
            this.showMessage('No snapshot selected', 'error');
            return;
        }

        const currentSnapshot = this.getCurrentSnapshot();
        const newSnapshot = {
            id: this.generateId(),
            label: `${currentSnapshot.label} (Copy)`,
            createdAt: new Date().toISOString(),
            data: JSON.parse(JSON.stringify(currentSnapshot.data))
        };

        this.data.snapshots.push(newSnapshot);
        this.currentSnapshotId = newSnapshot.id;
        this.saveData();
        this.updateUI();
        this.showMessage('Snapshot duplicated successfully', 'success');
    }

    // New method to rename snapshot
    renameSnapshot(newLabel) {
        if (!this.currentSnapshotId) {
            this.showMessage('No snapshot selected', 'error');
            return;
        }

        const snapshot = this.getCurrentSnapshot();
        if (!snapshot) return;

        const trimmedLabel = newLabel.trim();
        if (!trimmedLabel) {
            this.showMessage('Snapshot name cannot be empty', 'error');
            return;
        }

        snapshot.label = trimmedLabel;
        this.saveData();
        this.updateUI();
        this.showMessage('Snapshot renamed successfully', 'success');
    }

    switchSnapshot(snapshotId) {
        this.currentSnapshotId = snapshotId;
        this.updateUI();
        this.updateChatbotSnapshotInfo(); // Update chatbot context when snapshot changes
    }

    getCurrentSnapshot() {
        return this.data.snapshots.find(s => s.id === this.currentSnapshotId);
    }

    ensureAtLeastOneSnapshot() {
        // Only auto-create if there are already snapshots (not during fresh start)
        if (this.data.snapshots.length === 0 && this.currentSnapshotId === null) {
            return; // Don't auto-create on fresh start
        }
        
        if (this.data.snapshots.length === 0) {
            this.createSnapshot();
        } else if (!this.currentSnapshotId) {
            this.currentSnapshotId = this.data.snapshots[0].id;
        }
    }

    // CRUD Operations
    addItem(category, name, amount, assetCategory = null, assetLiquidity = null, liabilityTerm = null, incomeCategory = null, expenseCategory = null) {
        if (!this.hasActiveSnapshot()) {
            this.showMessage('Please create or select a snapshot first', 'error');
            return;
        }

        const snapshot = this.getCurrentSnapshot();
        if (!snapshot) return;

        const item = {
            name: name.trim(),
            amount: this.validateNumber(amount)
        };

        // Add category and liquidity for assets
        if (category === 'assets' && assetCategory) {
            item.category = assetCategory;
            item.liquidity = assetLiquidity;
        }

        // Add term for liabilities
        if (category === 'liabilities' && liabilityTerm) {
            item.term = liabilityTerm;
        }

        // Add category for incomes
        if (category === 'incomes' && incomeCategory) {
            item.category = incomeCategory;
        }

        // Add category for expenses
        if (category === 'expenses' && expenseCategory) {
            item.category = expenseCategory;
        }

        if (!item.name) {
            this.showMessage('Name cannot be empty', 'error');
            return;
        }

        snapshot.data[category].push(item);
        this.saveData();
        this.updateUI();
        this.showMessage('Item added successfully', 'success');
    }

    updateItem(category, index, name, amount, assetCategory = null, assetLiquidity = null, liabilityTerm = null, incomeCategory = null, expenseCategory = null, silent = false) {
        if (!this.hasActiveSnapshot()) {
            this.showMessage('No active snapshot', 'error');
            return;
        }

        const snapshot = this.getCurrentSnapshot();
        if (!snapshot) return;

        const item = snapshot.data[category][index];
        if (!item) return;

        const newName = name.trim();
        const newAmount = this.validateNumber(amount);

        if (!newName) {
            this.showMessage('Name cannot be empty', 'error');
            return;
        }

        item.name = newName;
        item.amount = newAmount;

        // Update category and liquidity for assets
        if (category === 'assets' && assetCategory !== null) {
            item.category = assetCategory;
            item.liquidity = assetLiquidity;
        }

        // Update term for liabilities
        if (category === 'liabilities' && liabilityTerm !== null) {
            item.term = liabilityTerm;
        }

        // Update category for incomes
        if (category === 'incomes' && incomeCategory !== null) {
            item.category = incomeCategory;
        }

        // Update category for expenses
        if (category === 'expenses' && expenseCategory !== null) {
            item.category = expenseCategory;
        }

        this.saveData();
        this.updateUI();
        if (!silent) {
            this.showMessage('Item updated successfully', 'success');
        }
    }

    deleteItem(category, index) {
        if (!this.hasActiveSnapshot()) {
            this.showMessage('No active snapshot', 'error');
            return;
        }

        const snapshot = this.getCurrentSnapshot();
        if (!snapshot) return;

        if (confirm('Are you sure you want to delete this item?')) {
            snapshot.data[category].splice(index, 1);
            this.saveData();
            this.updateUI();
            this.showMessage('Item deleted successfully', 'success');
        }
    }

    // Summary Calculations
    calculateSummary() {
        const snapshot = this.getCurrentSnapshot();
        if (!snapshot) return {
            totalAssets: 0,
            totalLiabilities: 0,
            netWorth: 0,
            totalIncome: 0,
            totalExpenses: 0,
            savings: 0
        };

        const totalAssets = snapshot.data.assets.reduce((sum, item) => sum + item.amount, 0);
        const totalLiabilities = snapshot.data.liabilities.reduce((sum, item) => sum + item.amount, 0);
        const totalIncome = snapshot.data.incomes.reduce((sum, item) => sum + item.amount, 0);
        const totalExpenses = snapshot.data.expenses.reduce((sum, item) => sum + item.amount, 0);

        return {
            totalAssets,
            totalLiabilities,
            netWorth: totalAssets - totalLiabilities,
            totalIncome,
            totalExpenses,
            savings: totalIncome - totalExpenses
        };
    }

    // Import/Export
    exportData() {
        try {
            const dataStr = JSON.stringify(this.data, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);

            const link = document.createElement('a');
            link.href = url;
            link.download = `myfinsnap.com-${new Date().toISOString().split('T')[0]}.json`;
            link.style.display = 'none';

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            URL.revokeObjectURL(url);
            this.showMessage('Data exported successfully! Check your downloads folder.', 'success');
        } catch (error) {
            console.error('Export error:', error);
            this.showMessage('Failed to export data: ' + error.message, 'error');
        }
    }

    importData(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                
                // Validate structure
                if (!importedData.snapshots || !Array.isArray(importedData.snapshots)) {
                    throw new Error('Invalid data structure');
                }

                // Validate each snapshot
                for (const snapshot of importedData.snapshots) {
                    if (!snapshot.id || !snapshot.label || !snapshot.data) {
                        throw new Error('Invalid snapshot structure');
                    }
                    if (!snapshot.data.assets || !snapshot.data.liabilities || 
                        !snapshot.data.incomes || !snapshot.data.expenses) {
                        throw new Error('Invalid data categories');
                    }
                }

                // Sanitize amounts to numbers to prevent string concatenation bugs
                importedData.snapshots.forEach(snap => {
                    ['assets','liabilities','incomes','expenses'].forEach(cat => {
                        snap.data[cat] = (snap.data[cat] || []).map(item => {
                            const sanitized = { ...item };
                            sanitized.amount = this.validateNumber(item.amount);
                            return sanitized;
                        });
                    });
                });

                this.data = importedData;
                this.currentSnapshotId = this.data.snapshots[0]?.id || null;
                this.searchTerm = ''; // Reset search
                this.saveData();
                this.updateUI();
                this.showMessage('Data imported successfully', 'success');
                
            } catch (error) {
                console.error('Import error:', error);
                this.showMessage('Error importing data: ' + error.message, 'error');
            }
        };
        reader.readAsText(file);
    }

    // Upload functionality
    handleUpload() {
        const fileInput = document.getElementById('uploadFile');
        fileInput.click();
    }

    // Enhanced Table Features: Sorting, Filtering, Resizing

    // Sort items by column
    sortItems(items, column, direction, category) {
        const sorted = [...items].sort((a, b) => {
            let aVal, bVal;
            
            switch (column) {
                case 'name':
                    aVal = a.name.toLowerCase();
                    bVal = b.name.toLowerCase();
                    break;
                case 'amount':
                    aVal = a.amount;
                    bVal = b.amount;
                    break;
                case 'category':
                    aVal = a.category ? a.category.toLowerCase() : '';
                    bVal = b.category ? b.category.toLowerCase() : '';
                    break;
                case 'liquidity':
                    aVal = a.liquidity ? a.liquidity.toLowerCase() : '';
                    bVal = b.liquidity ? b.liquidity.toLowerCase() : '';
                    break;
                case 'term':
                    aVal = a.term ? a.term.toLowerCase() : '';
                    bVal = b.term ? b.term.toLowerCase() : '';
                    break;
                default:
                    return 0;
            }
            
            if (aVal < bVal) return direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return direction === 'asc' ? 1 : -1;
            return 0;
        });
        
        return sorted;
    }

    // Filter items by search criteria
    filterItems(items, filters, category) {
        if (!filters) return items;

        return items.filter(item => {
            // Check text filters
            for (const [column, filterValue] of Object.entries(filters)) {
                if (!filterValue) continue; // Skip empty filters

                // Handle select filters separately
                if (column.endsWith('_select')) {
                    const selectColumn = column.replace('_select', '');
                    const selectedValues = filterValue;
                    if (selectedValues.length > 0) { // Only filter if there are selected values
                        let itemValue = '';
                        switch (selectColumn) {
                            case 'category':
                                itemValue = item.category || 'not specified';
                                break;
                            case 'liquidity':
                                itemValue = item.liquidity || 'not specified';
                                break;
                        }
                        if (!selectedValues.includes(itemValue)) {
                            return false;
                        }
                    }
                    continue;
                }

                // Handle amount column with comparison operators
                if (column === 'amount' && filterValue.includes(':')) {
                    const parts = filterValue.split(':');
                    const operator = parts[0];
                    const value1 = parseFloat(parts[1]);
                    const value2 = parts[2] ? parseFloat(parts[2]) : null;

                    if (!isNaN(value1)) {
                        switch (operator) {
                            case 'greater':
                                if (!(item.amount > value1)) return false;
                                break;
                            case 'less':
                                if (!(item.amount < value1)) return false;
                                break;
                            case 'greater_equal':
                                if (!(item.amount >= value1)) return false;
                                break;
                            case 'less_equal':
                                if (!(item.amount <= value1)) return false;
                                break;
                            case 'equal':
                                if (item.amount !== value1) return false;
                                break;
                            case 'between':
                                if (!(item.amount >= value1 && item.amount <= value2)) return false;
                                break;
                        }
                    }
                    continue; // Skip the text-based filtering for amount column
                }

                // Handle text filters
                let itemValue = '';
                switch (column) {
                    case 'name':
                        itemValue = item.name.toLowerCase();
                        break;
                    case 'amount':
                        itemValue = this.formatCurrency(item.amount).toLowerCase();
                        break;
                    case 'category':
                        if (category === 'expenses') {
                            itemValue = item.category ? this.getExpenseCategoryDisplayName(item.category).toLowerCase() : '';
                        } else if (category === 'incomes') {
                            itemValue = item.category ? this.getIncomeCategoryDisplayName(item.category).toLowerCase() : '';
                        } else {
                            itemValue = item.category ? this.getCategoryDisplayName(item.category).toLowerCase() : '';
                        }
                        break;
                    case 'liquidity':
                        itemValue = item.liquidity ? this.getLiquidityDisplayName(item.liquidity).toLowerCase() : '';
                        break;
                    case 'term':
                        itemValue = item.term ? this.getLiabilityTermDisplayName(item.term).toLowerCase() : '';
                        break;
                }

                if (!itemValue.includes(filterValue.toLowerCase())) {
                    return false;
                }
            }
            return true;
        });
    }

    // Handle column sorting - 3 state cycle: null -> asc -> desc -> null
    handleColumnSort(category, column, tableId) {
        const state = this.tableState[category];
        
        if (state.sortColumn === column) {
            // Cycle through states if same column: asc -> desc -> none
            if (state.sortDirection === 'asc') {
                state.sortDirection = 'desc';
            } else if (state.sortDirection === 'desc') {
                state.sortDirection = 'none';
                state.sortColumn = null; // Clear sorting
            } else {
                state.sortDirection = 'asc';
                state.sortColumn = column;
            }
        } else {
            // Set new column and default to ascending
            state.sortColumn = column;
            state.sortDirection = 'asc';
        }
        
        // Update UI for sort indicators
        this.updateSortIndicators(category, column, state.sortDirection);
        
        this.updateTable(category, tableId);
    }

    // Handle column filtering
    handleColumnFilter(category, column, value, tableId) {
        this.tableState[category].filters[column] = value;
        this.updateTable(category, tableId);
    }

    // Update amount filter inputs based on operator
    updateAmountFilterInputs(operator) {
        const amount1Input = document.getElementById('filterAmount1');
        const amount2Input = document.getElementById('filterAmount2');
        const rangeSeparator = document.getElementById('rangeSeparator');

        if (operator === 'between') {
            amount2Input.style.display = 'inline-block';
            rangeSeparator.style.display = 'inline';
            amount2Input.required = true;
        } else {
            amount2Input.style.display = 'none';
            rangeSeparator.style.display = 'none';
            amount2Input.required = false;
        }
    }

    // Handle column resizing
    handleColumnResize(category, column, newWidth, tableId) {
        this.tableState[category].columnWidths[column] = newWidth;
        
        // Apply the new width to the table
        const table = document.getElementById(tableId);
        if (table) {
            const headers = table.querySelectorAll('th');
            headers.forEach((th, index) => {
                const columnKey = th.getAttribute('data-column');
                if (columnKey && this.tableState[category].columnWidths[columnKey]) {
                    th.style.width = this.tableState[category].columnWidths[columnKey];
                }
            });
        }
    }

    // Update sort indicators in the table header
    updateSortIndicators(category, activeColumn, direction) {
        const tableId = category === 'incomes' ? 'incomeTable' : category + 'Table';
        const table = document.getElementById(tableId);
        if (!table) return;

        const headers = table.querySelectorAll('th[data-column]');
        headers.forEach(th => {
            const column = th.getAttribute('data-column');
            th.classList.remove('sort-asc', 'sort-desc', 'sort-none');

            if (column === activeColumn && direction !== 'none') {
                th.classList.add(direction === 'asc' ? 'sort-asc' : 'sort-desc');
            } else if (column === activeColumn && direction === 'none') {
                th.classList.add('sort-none');
            }
        });
    }

    // Apply column widths to table
    applyColumnWidths(category, tableId) {
        const table = document.getElementById(tableId);
        if (!table) return;

        const headers = table.querySelectorAll('th');
        headers.forEach((th, index) => {
            const columnKey = th.getAttribute('data-column');
            if (columnKey && this.tableState[category].columnWidths[columnKey]) {
                th.style.width = this.tableState[category].columnWidths[columnKey];
            }
        });
    }

    // New UI Update Methods for Enhanced Features
    updateSnapshotList() {
        const snapshotListContainer = document.getElementById('snapshotList');
        const sortedSnapshots = this.getSortedSnapshots();
        const filteredSnapshots = this.getFilteredSnapshots(sortedSnapshots);

        snapshotListContainer.innerHTML = '';

        if (filteredSnapshots.length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'empty-message';
            emptyMessage.style.cssText = 'text-align: center; padding: 2rem; color: #bdc3c7; font-style: italic;';
            if (this.searchTerm) {
                emptyMessage.textContent = 'No snapshots found matching your search';
            } else {
                emptyMessage.textContent = 'No snapshots available';
            }
            snapshotListContainer.appendChild(emptyMessage);
            return;
        }

        filteredSnapshots.forEach(snapshot => {
            const snapshotItem = document.createElement('div');
            snapshotItem.className = `snapshot-list-item ${snapshot.id === this.currentSnapshotId ? 'current' : ''}`;
            snapshotItem.dataset.snapshotId = snapshot.id;
            
            snapshotItem.innerHTML = `
                <div class="snapshot-item-header">
                    <div class="snapshot-item-name">${this.escapeHtml(snapshot.label)}</div>
                    ${snapshot.id === this.currentSnapshotId ? '<div class="snapshot-item-current-badge">Current</div>' : ''}
                </div>
                <div class="snapshot-item-date">📅 ${this.formatDate(snapshot.createdAt)}</div>
            `;

            snapshotItem.addEventListener('click', () => {
                this.switchSnapshot(snapshot.id);
            });

            snapshotListContainer.appendChild(snapshotItem);
        });
    }

    updateSortControls() {
        const dateBtn = document.getElementById('sortByDate');
        const nameBtn = document.getElementById('sortByName');
        const directionBtn = document.getElementById('toggleSortDirection');

        dateBtn.classList.toggle('active', this.sortBy === 'date');
        nameBtn.classList.toggle('active', this.sortBy === 'name');
        
        // Update direction button text and state
        if (directionBtn) {
            directionBtn.textContent = this.sortDirection === 'asc' ? '↑' : '↓';
            directionBtn.title = this.sortDirection === 'asc' ? 'Ascending' : 'Descending';
        }
    }

    updateSearchControls() {
        const searchInput = document.getElementById('snapshotSearch');
        const clearBtn = document.getElementById('clearSearchBtn');
        
        searchInput.value = this.searchTerm;
        clearBtn.style.display = this.searchTerm ? 'inline-block' : 'none';
    }

    getSortedSnapshots() {
        const snapshots = [...this.data.snapshots];
        
        return snapshots.sort((a, b) => {
            let comparison = 0;
            
            if (this.sortBy === 'date') {
                comparison = new Date(a.createdAt) - new Date(b.createdAt);
            } else if (this.sortBy === 'name') {
                comparison = a.label.localeCompare(b.label);
            }
            
            return this.sortDirection === 'asc' ? comparison : -comparison;
        });
    }

    getFilteredSnapshots(sortedSnapshots) {
        if (!this.searchTerm.trim()) {
            return sortedSnapshots;
        }

        const searchLower = this.searchTerm.toLowerCase();
        return sortedSnapshots.filter(snapshot => 
            snapshot.label.toLowerCase().includes(searchLower) ||
            this.formatDate(snapshot.createdAt).toLowerCase().includes(searchLower)
        );
    }

    changeSort(sortBy) {
        this.sortBy = sortBy;
        this.updateSnapshotList();
        this.updateSortControls();
    }

    toggleSortDirection() {
        this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        this.updateSnapshotList();
        this.updateSortControls();
    }

    // Search functionality
    handleSearch(event) {
        this.searchTerm = event.target.value;
        this.updateSnapshotList();
        this.updateSearchControls();
    }

    clearSearch() {
        this.searchTerm = '';
        const searchInput = document.getElementById('snapshotSearch');
        searchInput.value = '';
        this.updateSnapshotList();
        this.updateSearchControls();
        searchInput.focus();
    }

    // Utility method to escape HTML
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Renaming functionality - simplified for inline rename in list
    startRename() {
        const currentSnapshot = this.getCurrentSnapshot();
        if (!currentSnapshot) {
            this.showMessage('No snapshot selected', 'error');
            return;
        }

        const newName = prompt('Enter new name for this snapshot:', currentSnapshot.label);
        if (newName && newName.trim()) {
            this.renameSnapshot(newName);
        }
    }

    // Legacy method for backward compatibility
    updateSnapshotSelector() {
        // This method is kept for backward compatibility but is now deprecated
        // The new system uses updateSnapshotList()
    }

    // Home Page Modal Management
    checkShowWelcomeScreen() {
        // Modal is now triggered by help button, don't auto-show
        this.hideWelcomeScreen();
    }

    // Show help modal when help button is clicked
    showHelpModal() {
        const modal = document.getElementById('homeModal');
        if (modal) {
            modal.classList.add('active');
            // Mark as seen for first-time experience
            localStorage.setItem('hasSeenWelcome', 'true');
        }
    }

    showWelcomeScreen() {
        const modal = document.getElementById('homeModal');
        if (modal) {
            modal.classList.add('active');
            // Add event listener for Get Started button
            const getStartedBtn = document.getElementById('getStartedBtn');
            if (getStartedBtn) {
                getStartedBtn.addEventListener('click', () => this.handleGetStarted());
            }
        }
    }

    hideWelcomeScreen() {
        const modal = document.getElementById('homeModal');
        if (modal) {
            modal.classList.remove('active');
            // Mark as seen for future visits
            localStorage.setItem('hasSeenWelcome', 'true');
        }
    }

    hideHelpModal() {
        this.hideWelcomeScreen(); // Reusing the same method since it's the same modal // Reusing the same method since it's the same modal
    }

    handleGetStarted() {
        this.hideWelcomeScreen();
        this.showMessage('Welcome to Finance Tracker! Start by creating your first snapshot.', 'success');
    }

    updateSummary() {
        const summary = this.calculateSummary();

        const totalAssetsEl = document.getElementById('totalAssets');
        totalAssetsEl.textContent = this.formatCurrency(summary.totalAssets);
        totalAssetsEl.title = this.formatCurrency(summary.totalAssets);

        const totalLiabilitiesEl = document.getElementById('totalLiabilities');
        totalLiabilitiesEl.textContent = this.formatCurrency(summary.totalLiabilities);
        totalLiabilitiesEl.title = this.formatCurrency(summary.totalLiabilities);

        const netWorthEl = document.getElementById('netWorth');
        netWorthEl.textContent = this.formatCurrency(summary.netWorth);
        netWorthEl.title = this.formatCurrency(summary.netWorth);

        const totalIncomeEl = document.getElementById('totalIncome');
        totalIncomeEl.textContent = this.formatCurrency(summary.totalIncome);
        totalIncomeEl.title = this.formatCurrency(summary.totalIncome);

        const totalExpensesEl = document.getElementById('totalExpenses');
        totalExpensesEl.textContent = this.formatCurrency(summary.totalExpenses);
        totalExpensesEl.title = this.formatCurrency(summary.totalExpenses);

        const savingsEl = document.getElementById('savings');
        savingsEl.textContent = this.formatCurrency(summary.savings);
        savingsEl.title = this.formatCurrency(summary.savings);

        // Color coding - update class after title is set
        netWorthEl.className = 'amount ' + (summary.netWorth >= 0 ? 'positive' : 'negative');
        savingsEl.className = 'amount ' + (summary.savings >= 0 ? 'positive' : 'negative');
    }

    // Update snapshot notification visibility
    updateSnapshotNotification() {
        const notification = document.getElementById('snapshotNotification');
        if (notification) {
            // Show notification when there are no snapshots, hide when there are snapshots
            notification.style.display = this.data.snapshots.length === 0 ? 'block' : 'none';
        }
    }

    updateTable(category, tableId) {
        const tableEl = document.getElementById(tableId);
        if (!tableEl) {
            return;
        }
        const table = tableEl.querySelector('tbody');
        if (!table) {
            return;
        }
        table.innerHTML = '';

        const snapshot = this.getCurrentSnapshot();
        if (!snapshot) return;

        let items = [...snapshot.data[category]];

        // Apply filtering
        if (this.tableState[category]) {
            items = this.filterItems(items, this.tableState[category].filters, category);

            // Apply sorting
            if (this.tableState[category].sortColumn) {
                items = this.sortItems(
                    items,
                    this.tableState[category].sortColumn,
                    this.tableState[category].sortDirection,
                    category
                );
            }
        }

        const isEditMode = this.editModeStates[category];

        items.forEach((item, index) => {
            const row = document.createElement('tr');

            if (isEditMode) {
                // Edit mode - show input fields and delete button
                if (category === 'assets') {
                    row.innerHTML = `
                        <td>
                            <input type="text" value="${this.escapeHtml(item.name)}" class="edit-input edit-mode-input" data-field="name">
                        </td>
                        <td>
                            <input type="number" value="${item.amount}" step="0.01" min="0" class="edit-input edit-mode-input" data-field="amount">
                        </td>
                        <td>
                            <select class="edit-input edit-mode-input" data-field="category">
                                <option value="">Select Category</option>
                                <option value="cash" ${item.category === 'cash' ? 'selected' : ''}>Cash</option>
                                <option value="investments" ${item.category === 'investments' ? 'selected' : ''}>Investments</option>
                                <option value="retirement" ${item.category === 'retirement' ? 'selected' : ''}>Retirement</option>
                                <option value="property" ${item.category === 'property' ? 'selected' : ''}>Property</option>
                                <option value="vehicles" ${item.category === 'vehicles' ? 'selected' : ''}>Vehicles</option>
                                <option value="insurance" ${item.category === 'insurance' ? 'selected' : ''}>Insurance (Cash Value)</option>
                                <option value="other" ${item.category === 'other' ? 'selected' : ''}>Other Assets</option>
                            </select>
                        </td>
                        <td>
                            <select class="edit-input edit-mode-input" data-field="liquidity">
                                <option value="">Select Liquidity</option>
                                <option value="high" ${item.liquidity === 'high' ? 'selected' : ''}>High</option>
                                <option value="medium" ${item.liquidity === 'medium' ? 'selected' : ''}>Medium</option>
                                <option value="low" ${item.liquidity === 'low' ? 'selected' : ''}>Low</option>
                            </select>
                        </td>
                        <td class="edit-actions">
                            <button class="btn btn-danger btn-small delete-row-btn" data-category="${category}" data-index="${index}" title="Delete this item">✕</button>
                        </td>
                    `;

                    // Apply column widths for assets table in edit mode
                    if (this.tableState[category]) {
                        const cells = row.querySelectorAll('td');
                        if (cells[0]) cells[0].style.width = this.tableState[category].columnWidths.name;
                        if (cells[1]) cells[1].style.width = this.tableState[category].columnWidths.amount;
                        if (cells[2]) cells[2].style.width = this.tableState[category].columnWidths.category;
                        if (cells[3]) cells[3].style.width = this.tableState[category].columnWidths.liquidity;
                        if (cells[4]) cells[4].style.width = '60px'; // Fixed width for delete button column
                    }
                } else {
                    // Handle liabilities with term field
                    if (category === 'liabilities') {
                        row.innerHTML = `
                            <td>
                                <input type="text" value="${this.escapeHtml(item.name)}" class="edit-input edit-mode-input" data-field="name">
                            </td>
                            <td>
                                <input type="number" value="${item.amount}" step="0.01" min="0" class="edit-input edit-mode-input" data-field="amount">
                            </td>
                            <td>
                                <select class="edit-input edit-mode-input" data-field="term">
                                    <option value="">Select Term</option>
                                    <option value="short-term" ${item.term === 'short-term' ? 'selected' : ''}>Short-Term</option>
                                    <option value="medium-term" ${item.term === 'medium-term' ? 'selected' : ''}>Medium-Term</option>
                                    <option value="long-term" ${item.term === 'long-term' ? 'selected' : ''}>Long-Term</option>
                                </select>
                            </td>
                            <td class="edit-actions">
                                <button class="btn btn-danger btn-small delete-row-btn" data-category="${category}" data-index="${index}" title="Delete this item">✕</button>
                            </td>
                        `;

                        // Apply column widths for liabilities table in edit mode
                        if (this.tableState[category]) {
                            const cells = row.querySelectorAll('td');
                            if (cells[0]) cells[0].style.width = this.tableState[category].columnWidths.name;
                            if (cells[1]) cells[1].style.width = this.tableState[category].columnWidths.amount;
                            if (cells[2]) cells[2].style.width = this.tableState[category].columnWidths.term;
                            if (cells[3]) cells[3].style.width = '60px'; // Fixed width for delete button column
                        }
                    } else if (category === 'incomes') {
                        // Handle incomes with category field
                        row.innerHTML = `
                            <td>
                                <input type="text" value="${this.escapeHtml(item.name)}" class="edit-input edit-mode-input" data-field="name">
                            </td>
                            <td>
                                <input type="number" value="${item.amount}" step="0.01" min="0" class="edit-input edit-mode-input" data-field="amount">
                            </td>
                            <td>
                                <select class="edit-input edit-mode-input" data-field="category">
                                    <option value="">Select Category</option>
                                    <option value="employment" ${item.category === 'employment' ? 'selected' : ''}>Employment Income</option>
                                    <option value="business" ${item.category === 'business' ? 'selected' : ''}>Business / Self-Employment Income</option>
                                    <option value="passive" ${item.category === 'passive' ? 'selected' : ''}>Passive Income</option>
                                    <option value="other" ${item.category === 'other' ? 'selected' : ''}>Other Income</option>
                                </select>
                            </td>
                            <td class="edit-actions">
                                <button class="btn btn-danger btn-small delete-row-btn" data-category="${category}" data-index="${index}" title="Delete this item">✕</button>
                            </td>
                        `;

                        // Apply column widths for incomes table in edit mode
                        if (this.tableState[category]) {
                            const cells = row.querySelectorAll('td');
                            if (cells[0]) cells[0].style.width = this.tableState[category].columnWidths.name;
                            if (cells[1]) cells[1].style.width = this.tableState[category].columnWidths.amount;
                            if (cells[2]) cells[2].style.width = this.tableState[category].columnWidths.category;
                            if (cells[3]) cells[3].style.width = '60px'; // Fixed width for delete button column
                        }
                    } else if (category === 'expenses') {
                        // Expenses with category field
                        row.innerHTML = `
                            <td>
                                <input type="text" value="${this.escapeHtml(item.name)}" class="edit-input edit-mode-input" data-field="name">
                            </td>
                            <td>
                                <input type="number" value="${item.amount}" step="0.01" min="0" class="edit-input edit-mode-input" data-field="amount">
                            </td>
                            <td>
                                <select class="edit-input edit-mode-input" data-field="category">
                                    <option value="">Select Category</option>
                                    <option value="essential" ${item.category === 'essential' ? 'selected' : ''}>Essential / Fixed</option>
                                    <option value="variable" ${item.category === 'variable' ? 'selected' : ''}>Variable / Living</option>
                                    <option value="discretionary" ${item.category === 'discretionary' ? 'selected' : ''}>Discretionary / Lifestyle</option>
                                    <option value="other" ${item.category === 'other' ? 'selected' : ''}>Other Expenses</option>
                                </select>
                            </td>
                            <td class="edit-actions">
                                <button class="btn btn-danger btn-small delete-row-btn" data-category="${category}" data-index="${index}" title="Delete this item">✕</button>
                            </td>
                        `;

                        // Apply column widths for expenses table in edit mode
                        if (this.tableState[category]) {
                            const cells = row.querySelectorAll('td');
                            if (cells[0]) cells[0].style.width = this.tableState[category].columnWidths.name;
                            if (cells[1]) cells[1].style.width = this.tableState[category].columnWidths.amount;
                            if (cells[2]) cells[2].style.width = this.tableState[category].columnWidths.category;
                            if (cells[3]) cells[3].style.width = '60px'; // Fixed width for delete button column
                        }
                    }
                }
                row.classList.add('edit-mode-active');
            } else {
                // Normal view mode - no edit/delete buttons visible
                if (category === 'assets') {
                    const categoryName = item.category ? this.getCategoryDisplayName(item.category) : 'Not specified';
                    const liquidityName = item.liquidity ? this.getLiquidityDisplayName(item.liquidity) : 'Not specified';

                    row.innerHTML = `
                        <td>${this.escapeHtml(item.name)}</td>
                        <td>${this.formatCurrency(item.amount)}</td>
                        <td>${categoryName}</td>
                        <td class="liquidity-cell">${liquidityName}</td>
                    `;

                    // Apply column widths for assets table in view mode
                    if (this.tableState[category]) {
                        const cells = row.querySelectorAll('td');
                        if (cells[0]) cells[0].style.width = this.tableState[category].columnWidths.name;
                        if (cells[1]) cells[1].style.width = this.tableState[category].columnWidths.amount;
                        if (cells[2]) cells[2].style.width = this.tableState[category].columnWidths.category;
                        if (cells[3]) cells[3].style.width = this.tableState[category].columnWidths.liquidity;
                    }
                } else {
                    if (category === 'liabilities') {
                        const termName = item.term ? this.getLiabilityTermDisplayName(item.term) : 'Not specified';

                        row.innerHTML = `
                            <td>${this.escapeHtml(item.name)}</td>
                            <td>${this.formatCurrency(item.amount)}</td>
                            <td>${termName}</td>
                        `;

                        // Apply column widths for liabilities table in view mode
                        if (this.tableState[category]) {
                            const cells = row.querySelectorAll('td');
                            if (cells[0]) cells[0].style.width = this.tableState[category].columnWidths.name;
                            if (cells[1]) cells[1].style.width = this.tableState[category].columnWidths.amount;
                            if (cells[2]) cells[2].style.width = this.tableState[category].columnWidths.term;
                        }
                    } else if (category === 'incomes') {
                        // Handle incomes with category field for display
                        const categoryName = item.category ? this.getIncomeCategoryDisplayName(item.category) : 'Not specified';

                        row.innerHTML = `
                            <td>${this.escapeHtml(item.name)}</td>
                            <td>${this.formatCurrency(item.amount)}</td>
                            <td>${categoryName}</td>
                        `;

                        // Apply column widths for incomes table in view mode
                        if (this.tableState[category]) {
                            const cells = row.querySelectorAll('td');
                            if (cells[0]) cells[0].style.width = this.tableState[category].columnWidths.name;
                            if (cells[1]) cells[1].style.width = this.tableState[category].columnWidths.amount;
                            if (cells[2]) cells[2].style.width = this.tableState[category].columnWidths.category;
                        }
                    } else if (category === 'expenses') {
                        // Handle expenses with category field for display
                        const categoryName = item.category ? this.getExpenseCategoryDisplayName(item.category) : 'Not specified';

                        row.innerHTML = `
                            <td>${this.escapeHtml(item.name)}</td>
                            <td>${this.formatCurrency(item.amount)}</td>
                            <td>${categoryName}</td>
                        `;

                        // Apply column widths for expenses table in view mode
                        if (this.tableState[category]) {
                            const cells = row.querySelectorAll('td');
                            if (cells[0]) cells[0].style.width = this.tableState[category].columnWidths.name;
                            if (cells[1]) cells[1].style.width = this.tableState[category].columnWidths.amount;
                            if (cells[2]) cells[2].style.width = this.tableState[category].columnWidths.category;
                        }
                    }
                }
            }

            table.appendChild(row);
        });
        
        // Apply column widths to headers
        this.applyColumnWidths(category, tableId);
        
        // Force a DOM reflow to ensure the order is respected
        if (table.offsetParent !== null) {
            table.style.display = 'none';
            table.offsetHeight; // Trigger reflow
            table.style.display = '';
        }
        

    }

    // New method to show empty tables during fresh start
    updateEmptyTables() {
        const tables = ['assetsTable', 'liabilitiesTable', 'incomeTable', 'expensesTable'];
        tables.forEach(tableId => {
            const tableEl = document.getElementById(tableId);
            if (!tableEl) {
                return;
            }
            const table = tableEl.querySelector('tbody');
            if (!table) {
                return;
            }
            table.innerHTML = '';
        });
    }

    updateUI() {
        // Update snapshot notification based on whether any snapshots exist
        this.updateSnapshotNotification();

        // Update all UI components
        this.updateSnapshotList();
        this.updateSortControls();
        this.updateSearchControls();
        this.updateSummary();

        // Update charts and financial ratios
        this.createCharts();

        // Update edit mode buttons
        this.updateEditModeButtons();

        this.updateTable('assets', 'assetsTable');
        this.updateTable('liabilities', 'liabilitiesTable');
        this.updateTable('incomes', 'incomeTable');
        this.updateTable('expenses', 'expensesTable');

        // Update main page state based on active snapshot
        this.updateMainPageState();
    }

    // Update all edit mode buttons per their current states
    updateEditModeButtons() {
        document.querySelectorAll('.edit-mode-btn').forEach(button => {
            const category = button.dataset.category;
            this.updateEditModeButton(button, category);
        });
    }

    // Enhanced Event Handlers for Table Features
    bindTableEventListeners() {
        // Sort event listeners for all tables
        this.bindSortEventListeners();

        // Generic table resize handlers for all tables
        this.bindResizeHandlers();
    }

    bindSortEventListeners() {
        const tables = ['assetsTable', 'liabilitiesTable', 'incomeTable', 'expensesTable'];
        tables.forEach(tableId => {
            const table = document.getElementById(tableId);
            if (!table) return;
            const filterIcons = table.querySelectorAll('.filter-icon');
            filterIcons.forEach(icon => {
                icon.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const header = icon.closest('th');
                    const column = header.getAttribute('data-column');
                    const category = tableId.replace('Table', '').replace('income', 'incomes');
                    this.showFilterDialog(tableId, category, column, header);
                });
            });
        });
    }

    // Show filter and sort dialog
    showFilterDialog(tableId, category, column, header) {
        // Remove any existing filter dialogs
        document.querySelectorAll('.filter-dialog').forEach(dialog => dialog.remove());

        const dialog = document.createElement('div');
        dialog.className = 'filter-dialog';
        dialog.innerHTML = `
            <div class="filter-dialog-content">
                <h4>Sort & Filter: ${header.querySelector('span')?.textContent || column.charAt(0).toUpperCase() + column.slice(1)}</h4>

                <div class="filter-section">
                    <h5>Sort Order:</h5>
                    <select class="sort-select" id="sortSelect">
                        <option value="none">No Sort</option>
                        <option value="asc">Ascending A-Z ↑</option>
                        <option value="desc">Descending Z-A ↓</option>
                    </select>
                </div>

                <div class="filter-section">
                    <h5>Value Filter:</h5>
                    ${column === 'amount' ? `
                       <div class="amount-filter-wrapper">
                            <select class="filter-operator" id="filterOperator" style="margin-right: 0.5rem;">
                                <option value="greater">Greater than ></option>
                                <option value="less">Less than <</option>
                                <option value="greater_equal">Greater or Equal ≥</option>
                                <option value="less_equal">Less or Equal ≤</option>
                                <option value="equal">Equals =</option>
                                <option value="between">Range (between)</option>
                            </select>
                            <div class="amount-inputs" id="amountInputs">
                                <input type="text" class="filter-amount" id="filterAmount1" placeholder="Enter amount..." />
                                <span class="range-separator" id="rangeSeparator" style="display:none;">to</span>
                                <input type="text" class="filter-amount" id="filterAmount2" placeholder="Enter amount..." style="display:none;" />
                            </div>
                        </div>
                        <button class="btn btn-small" id="clearFilterBtn" style="margin-top: 0.5rem;">Clear Filter</button>
                    ` : `
                        <div class="autocomplete-wrapper">
                            <input type="text" class="filter-input" id="filterInput" placeholder="Type to filter..." />
                            <div class="suggestions-dropdown" id="suggestionsDropdown" style="display: none;"></div>
                        </div>
                        <button class="btn btn-small" id="clearFilterBtn" style="margin-top: 0.5rem;">Clear Filter</button>
                    `}
                </div>

                ${this.getColumnSpecificFilters(category, column)}

                <div class="filter-actions">
                    <button class="btn btn-secondary btn-small" id="cancelBtn">Cancel</button>
                    <button class="btn btn-primary btn-small" id="applyBtn">Apply</button>
                </div>
            </div>
        `;

        document.body.appendChild(dialog);

        // Set current filter values
        const currentSort = this.tableState[category].sortColumn === column ?
            this.tableState[category].sortDirection : 'none';
        const currentFilter = this.tableState[category].filters[column] || '';

        document.getElementById('sortSelect').value = currentSort;

        // Handle amount filters differently
        if (column === 'amount') {
            // Parse current filter value for amount filters
            let operator = 'greater', value1 = '', value2 = '';
            if (currentFilter && currentFilter.includes(':')) {
                const parts = currentFilter.split(':');
                operator = parts[0];
                value1 = parts[1];
                if (operator === 'between' && parts[2]) {
                    value2 = parts[2];
                }
            }

            const operatorSelect = document.getElementById('filterOperator');
            const amount1Input = document.getElementById('filterAmount1');
            const amount2Input = document.getElementById('filterAmount2');

            operatorSelect.value = operator;
            amount1Input.value = value1;
            amount2Input.value = value2;

            // Show/hide second input based on operator
            this.updateAmountFilterInputs(operator);

            // Add event listener for operator change
            operatorSelect.addEventListener('change', (e) => {
                this.updateAmountFilterInputs(e.target.value);
            });
        } else {
            document.getElementById('filterInput').value = currentFilter;
            // Initialize autocomplete functionality
            this.initializeAutocomplete(dialog, tableId, category, column);
        }

        // Set up event listeners
        document.getElementById('cancelBtn').addEventListener('click', () => {
            dialog.remove();
        });

        document.getElementById('applyBtn').addEventListener('click', () => {
            const sortValue = document.getElementById('sortSelect').value;
            let filterValue = '';

            // Handle sort
            if (sortValue === 'none') {
                if (this.tableState[category].sortColumn === column) {
                    this.tableState[category].sortColumn = null;
                    this.tableState[category].sortDirection = 'asc';
                }
            } else {
                this.tableState[category].sortColumn = column;
                this.tableState[category].sortDirection = sortValue;
            }

            // Handle filter - different logic for amount vs text filters
            if (column === 'amount') {
                const operator = document.getElementById('filterOperator').value;
                const value1 = document.getElementById('filterAmount1').value.trim();
                const value2 = document.getElementById('filterAmount2').value.trim();

                if (value1) {
                    filterValue = operator + ':' + value1;
                    if (operator === 'between' && value2) {
                        filterValue += ':' + value2;
                    }
                }
            } else {
                filterValue = document.getElementById('filterInput').value.trim();
            }

            this.tableState[category].filters[column] = filterValue;

            // Handle select filters for categorical columns
            if (category === 'assets' && (column === 'category' || column === 'liquidity')) {
                const checkedOptions = Array.from(dialog.querySelectorAll('.select-option:checked'))
                    .map(checkbox => checkbox.value);
                this.tableState[category].filters[column + '_select'] = checkedOptions;
            }

            this.updateSortIndicators(category, column, sortValue);
            this.updateTable(category, tableId);
            dialog.remove();
        });

        document.getElementById('clearFilterBtn').addEventListener('click', () => {
            if (column === 'amount') {
                // Clear amount filters
                document.getElementById('filterOperator').value = 'greater';
                document.getElementById('filterAmount1').value = '';
                document.getElementById('filterAmount2').value = '';
                this.updateAmountFilterInputs('greater'); // Reset to default
            } else {
                document.getElementById('filterInput').value = '';
            }
            // Also clear any select filters
            if (category === 'assets' && (column === 'category' || column === 'liquidity')) {
                dialog.querySelectorAll('.select-option').forEach(checkbox => checkbox.checked = false);
            }
        });

        // Position the dialog below the header like Excel - dynamically update on scroll
        const updatePosition = () => {
            const rect = header.getBoundingClientRect();
            dialog.style.position = 'fixed';
            dialog.style.left = rect.left + 'px';
            dialog.style.top = (rect.bottom + 5) + 'px';
            dialog.style.zIndex = '2000';
        };

        updatePosition(); // Initial position

        // Update position when scrolling or resizing
        const handleReposition = () => updatePosition();
        window.addEventListener('scroll', handleReposition);
        window.addEventListener('resize', handleReposition);

        // Also listen for scroll events on the main content area
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            mainContent.addEventListener('scroll', handleReposition);
        }

        // Close when clicking outside
        document.addEventListener('click', function closeDialog(e) {
            if (!dialog.contains(e.target)) {
                dialog.remove();
                document.removeEventListener('click', closeDialog);
            }
        });
    }

    // Get specific filter options for categorical columns
    getColumnSpecificFilters(category, column) {
        if (category === 'assets' && column === 'category') {
            const categories = ['cash', 'investments', 'retirement', 'property', 'vehicles', 'insurance', 'other'];
            const currentSelections = this.tableState[category].filters[column + '_select'] || [];

            return `
                <div class="filter-section">
                    <h5>Select Categories:</h5>
                    <div class="select-options">
                        ${categories.map(cat =>
                            `<label><input type="checkbox" class="select-option" value="${cat}"
                                ${currentSelections.includes(cat) ? 'checked' : ''}>
                                ${this.getCategoryDisplayName(cat)}</label><br>`
                        ).join('')}
                    </div>
                </div>
            `;
        }

        if (category === 'assets' && column === 'liquidity') {
            const liquidities = ['high', 'medium', 'low'];
            const currentSelections = this.tableState[category].filters[column + '_select'] || [];

            return `
                <div class="filter-section">
                    <h5>Select Liquidity:</h5>
                    <div class="select-options">
                        ${liquidities.map(liq =>
                            `<label><input type="checkbox" class="select-option" value="${liq}"
                                ${currentSelections.includes(liq) ? 'checked' : ''}>
                                ${this.getLiquidityDisplayName(liq)}</label><br>`
                        ).join('')}
                    </div>
                </div>
            `;
        }

        return '';
    }

    bindResizeHandlers() {
        const tables = ['assetsTable', 'liabilitiesTable', 'incomeTable', 'expensesTable'];
        tables.forEach(tableId => {
            const table = document.getElementById(tableId);
            if (!table) return;

            const resizeHandles = table.querySelectorAll('.resize-handle');
            resizeHandles.forEach(handle => {
                handle.addEventListener('mousedown', (e) => {
                    this.startResize(e, tableId);
                });
            });
        });
    }

    startResize(event, tableId) {
        event.preventDefault();

        const table = document.getElementById(tableId);
        const header = event.target.closest('th');
        const column = header.getAttribute('data-column');
        const category = tableId.replace('Table', '').replace('income', 'incomes');

        if (!column || !this.tableState[category]) return;

        const startX = event.pageX;
        const startWidth = header.offsetWidth;

        const handleMouseMove = (e) => {
            const diff = e.pageX - startX;
            const newWidth = Math.max(50, startWidth + diff); // Minimum width of 50px
            const newWidthPercent = (newWidth / table.offsetWidth) * 100;
            
            this.handleColumnResize(category, column, newWidthPercent + '%', tableId);
        };

        const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }

    // Mobile Sidebar Toggle Functionality
    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        const backdrop = document.getElementById('sidebarBackdrop');
        const isOpen = sidebar.classList.contains('show');

        if (isOpen) {
            // Close sidebar
            sidebar.classList.remove('show');
            backdrop.classList.remove('active');
        } else {
            // Open sidebar
            sidebar.classList.add('show');
            backdrop.classList.add('active');
        }
    }

    // Close sidebar when clicking backdrop
    handleBackdropClick() {
        const sidebar = document.getElementById('sidebar');
        const backdrop = document.getElementById('sidebarBackdrop');

        sidebar.classList.remove('show');
        backdrop.classList.remove('active');
    }

    // Event Handlers
    bindEventListeners() {
        // Help button - show welcome guide
        document.getElementById('helpBtn').addEventListener('click', () => this.showHelpModal());

        // Close help modal button
        const closeHelpModalBtn = document.getElementById('closeHelpModal');
        if (closeHelpModalBtn) {
            closeHelpModalBtn.addEventListener('click', () => this.hideHelpModal());
        }

        // Mobile sidebar toggle
        const sidebarToggle = document.getElementById('sidebarToggle');
        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', () => this.toggleSidebar());
        }

        // Sidebar backdrop click to close
        const sidebarBackdrop = document.getElementById('sidebarBackdrop');
        if (sidebarBackdrop) {
            sidebarBackdrop.addEventListener('click', () => this.handleBackdropClick());
        }

        // Snapshot management
        document.getElementById('createSnapshotBtn').addEventListener('click', () => this.createSnapshot());
        document.getElementById('duplicateSnapshotBtn').addEventListener('click', () => this.duplicateSnapshot());
        document.getElementById('deleteSnapshotBtn').addEventListener('click', () => this.deleteSnapshot());

        // New event listeners for enhanced features
        document.getElementById('renameSnapshotBtn').addEventListener('click', () => this.startRename());

        // Sorting controls
        document.getElementById('sortByDate').addEventListener('click', () => this.changeSort('date'));
        document.getElementById('sortByName').addEventListener('click', () => this.changeSort('name'));
        document.getElementById('toggleSortDirection').addEventListener('click', () => this.toggleSortDirection());

        // Search controls
        document.getElementById('snapshotSearch').addEventListener('input', (e) => this.handleSearch(e));
        document.getElementById('clearSearchBtn').addEventListener('click', () => this.clearSearch());

        // Forms
        document.getElementById('assetsForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addItem('assets',
                document.getElementById('assetName').value,
                document.getElementById('assetAmount').value,
                document.getElementById('assetCategory').value,
                document.getElementById('assetLiquidity').value
            );
            e.target.reset();
            this.updateAssetCategoryExamples(); // Reset examples display
        });

        document.getElementById('liabilitiesForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addItem('liabilities',
                document.getElementById('liabilityName').value,
                document.getElementById('liabilityAmount').value,
                null, // assetCategory parameter
                null, // assetLiquidity parameter
                document.getElementById('liabilityTerm').value // liabilityTerm parameter
            );
            e.target.reset();
            this.updateLiabilityTermExamples(); // Reset examples display to placeholder
        });

        document.getElementById('incomeForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addItem('incomes',
                document.getElementById('incomeName').value,
                document.getElementById('incomeAmount').value,
                null, // assetCategory parameter
                null, // assetLiquidity parameter
                null, // liabilityTerm parameter
                document.getElementById('incomeCategory').value // incomeCategory parameter
            );
            e.target.reset();
            this.updateIncomeCategoryExamples(); // Reset examples display
        });

        document.getElementById('expensesForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addItem('expenses',
                document.getElementById('expenseName').value,
                document.getElementById('expenseAmount').value,
                null, // assetCategory parameter
                null, // assetLiquidity parameter
                null, // liabilityTerm parameter
                null, // incomeCategory parameter
                document.getElementById('expenseCategory').value // expenseCategory parameter
            );
            e.target.reset();
            this.updateExpenseCategoryExamples(); // Reset examples display
        });

        // Asset category change handler
        document.getElementById('assetCategory').addEventListener('change', () => {
            this.updateAssetCategoryExamples();
        });

        // Income category change handler
        document.getElementById('incomeCategory').addEventListener('change', () => {
            this.updateIncomeCategoryExamples();
        });

        // Liability term change handler
        document.getElementById('liabilityTerm').addEventListener('change', () => {
            this.updateLiabilityTermExamples();
        });

        // Expense category change handler
        document.getElementById('expenseCategory').addEventListener('change', () => {
            this.updateExpenseCategoryExamples();
        });

        // Clear All with enhanced confirmation
        const clearDataBtn = document.getElementById('clearDataBtn');
        if (clearDataBtn) {
            clearDataBtn.addEventListener('click', () => {
                this.clearAllData();
            });
        }

        // Export Records button
        const exportBtn = document.getElementById('exportBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportData();
            });
        }

        // Upload functionality
        document.getElementById('uploadSnapshotBtn').addEventListener('click', () => this.handleUpload());
        document.getElementById('uploadFile').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                if (confirm('This will replace all current data. Continue?')) {
                    this.importData(file);
                }
            }
            e.target.value = ''; // Reset file input
        });

        // Table actions (delegated event listeners)
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('edit-item')) {
                const category = e.target.dataset.category;
                const index = parseInt(e.target.dataset.index);
                this.startEdit(category, index);
            } else if (e.target.classList.contains('delete-item')) {
                const category = e.target.dataset.category;
                const index = parseInt(e.target.dataset.index);
                this.deleteItem(category, index);
            } else if (e.target.classList.contains('delete-row-btn')) {
                const category = e.target.dataset.category;
                const index = parseInt(e.target.dataset.index);
                this.deleteItem(category, index);
            } else if (e.target.classList.contains('save-edit')) {
                const category = e.target.dataset.category;
                const index = parseInt(e.target.dataset.index);
                this.saveEdit(category, index);
            } else if (e.target.classList.contains('cancel-edit')) {
                const category = e.target.dataset.category;
                this.cancelEdit(category);
            }
        });

        // Bind section action event listeners for quick operations
        this.bindSectionActionListeners();

        // Bind enhanced table event listeners
        this.bindTableEventListeners();

        // Bind edit mode inline editing event listeners
        this.bindEditModeEventListeners();

        // Bind ratio info toggle functionality
        this.bindRatioInfoToggles();
    }

    // Bind inline editing event listeners for edit mode
    bindEditModeEventListeners() {
        // Use event delegation for edit mode inputs to save changes automatically
        document.addEventListener('input', (e) => {
            if (e.target.classList.contains('edit-mode-input')) {
                this.handleEditModeChange(e.target);
            }
        });

        document.addEventListener('change', (e) => {
            if (e.target.classList.contains('edit-mode-input') &&
                (e.target.tagName === 'SELECT' || e.target.type === 'checkbox')) {
                this.handleEditModeChange(e.target);
            }
        });
    }

    // Bind ratio info toggle functionality
    bindRatioInfoToggles() {
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('ratio-info-btn') ||
                e.target.closest('.ratio-info-btn')) {

                const toggleBtn = e.target.classList.contains('ratio-info-btn') ?
                    e.target : e.target.closest('.ratio-info-btn');

                if (!toggleBtn) return;

                // Find the details div - it's next to the button's parent container
                const ratioItem = toggleBtn.closest('.ratio-item-expandable');
                const ratioDetails = ratioItem.querySelector('.ratio-details');

                if (ratioDetails) {
                    const isVisible = ratioDetails.style.display !== 'none';
                    ratioDetails.style.display = isVisible ? 'none' : 'block';
                }
            }
        });
    }

    // Handle inline editing changes in edit mode - disabled for bulk editing
    handleEditModeChange(input) {
        // No auto-saving - users will save all changes when exiting edit mode
        // This allows bulk editing
    }

    startEdit(category, index) {
        if (!this.hasActiveSnapshot()) {
            this.showMessage('Please create or select a snapshot first', 'error');
            return;
        }
        this.editingItems.set(category, index);
        this.updateUI();
    }

    saveEdit(category, index) {
        // Fixed: More reliable way to find the correct row and inputs
        const tableId = category === 'incomes' ? 'incomeTable' : category + 'Table';
        const table = document.getElementById(tableId);
        const rows = table.querySelectorAll('tbody tr');
        const row = rows[index];

        if (!row) {
            this.showMessage('Error: Could not find the row to edit', 'error');
            this.editingItems.delete(category);
            this.updateUI();
            return;
        }

        const nameInput = row.querySelector('input[data-field="name"]');
        const amountInput = row.querySelector('input[data-field="amount"]');

        if (!nameInput || !amountInput) {
            this.showMessage('Error: Could not find input fields', 'error');
            this.editingItems.delete(category);
            this.updateUI();
            return;
        }

        let assetCategory = null;
        let assetLiquidity = null;
        if (category === 'assets') {
            const categoryInput = row.querySelector('select[data-field="category"]');
            const liquidityInput = row.querySelector('select[data-field="liquidity"]');
            if (categoryInput) {
                assetCategory = categoryInput.value;
            }
            if (liquidityInput) {
                assetLiquidity = liquidityInput.value;
            }
        }

        this.updateItem(category, index, nameInput.value, amountInput.value, assetCategory, assetLiquidity);
        this.editingItems.delete(category);
    }

    cancelEdit(category) {
        this.editingItems.delete(category);
        this.updateUI();
    }

    // Autocomplete functionality for filter inputs
    initializeAutocomplete(dialog, tableId, category, column) {
        const input = dialog.querySelector('#filterInput');
        const suggestionsDropdown = dialog.querySelector('#suggestionsDropdown');

        let selectedIndex = -1;
        let suggestions = [];
        let lastInputValue = '';

        // Get unique values from the column for suggestions
        const getColumnSuggestions = () => {
            const snapshot = this.getCurrentSnapshot();
            if (!snapshot) return [];

            const items = snapshot.data[category] || [];
            const uniqueValues = new Set();

            items.forEach(item => {
                let value = '';
                switch (column) {
                    case 'name':
                        value = item.name || '';
                        break;
                    case 'amount':
                        value = this.formatCurrency(item.amount);
                        break;
                    case 'category':
                        if (category === 'assets') {
                            value = item.category ? this.getCategoryDisplayName(item.category) : '';
                        } else if (category === 'incomes') {
                            value = item.category ? this.getIncomeCategoryDisplayName(item.category) : '';
                        }
                        break;
                    case 'liquidity':
                        value = item.liquidity ? this.getLiquidityDisplayName(item.liquidity) : '';
                        break;
                }
                if (value.trim()) {
                    uniqueValues.add(value);
                }
            });

            return Array.from(uniqueValues).sort();
        };

        // Render suggestions dropdown
        const renderSuggestions = (searchValue) => {
            if (!searchValue.trim()) {
                suggestionsDropdown.style.display = 'none';
                return;
            }

            const allSuggestions = getColumnSuggestions();
            suggestions = allSuggestions.filter(suggestion =>
                suggestion.toLowerCase().includes(searchValue.toLowerCase())
            );

            if (suggestions.length === 0) {
                suggestionsDropdown.style.display = 'none';
                return;
            }

            selectedIndex = -1;

            const highlightText = (text, search) => {
                if (!search) return this.escapeHtml(text);
                const regex = new RegExp(`(${this.escapeRegex(search)})`, 'gi');
                return text.replace(regex, '<span class="highlight">$1</span>');
            };

            suggestionsDropdown.innerHTML = suggestions.map((suggestion, index) => `
                <div class="suggestion-item ${index === selectedIndex ? 'highlighted' : ''}"
                     data-index="${index}"
                     data-value="${this.escapeHtml(suggestion)}">
                    ${highlightText(suggestion, searchValue)}
                </div>
            `).join('');

            suggestionsDropdown.style.display = 'block';
        };

        // Input event handler
        const handleInput = (e) => {
            const value = e.target.value;
            lastInputValue = value;
            renderSuggestions(value);
        };

        // Keyboard navigation
        const handleKeydown = (e) => {
            if (suggestionsDropdown.style.display === 'none') return;

            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    selectedIndex = Math.min(selectedIndex + 1, suggestions.length - 1);
                    updateSelection();
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    selectedIndex = Math.max(selectedIndex - 1, -1);
                    updateSelection();
                    break;
                case 'Enter':
                    e.preventDefault();
                    if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
                        selectSuggestion(suggestions[selectedIndex]);
                    }
                    break;
                case 'Escape':
                    suggestionsDropdown.style.display = 'none';
                    selectedIndex = -1;
                    break;
            }
        };

        // Update visual selection
        const updateSelection = () => {
            const items = suggestionsDropdown.querySelectorAll('.suggestion-item');
            items.forEach((item, index) => {
                item.classList.toggle('highlighted', index === selectedIndex);
            });

            // Auto-scroll to selected item
            if (selectedIndex >= 0) {
                const selectedItem = items[selectedIndex];
                selectedItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }
        };

        // Select a suggestion
        const selectSuggestion = (value) => {
            input.value = value;
            suggestionsDropdown.style.display = 'none';
            selectedIndex = -1;
        };

        // Click handler for suggestions
        suggestionsDropdown.addEventListener('click', (e) => {
            const item = e.target.closest('.suggestion-item');
            if (item) {
                const value = item.dataset.value;
                selectSuggestion(value);
            }
        });

        // Hide suggestions when clicking outside
        const hideSuggestions = (e) => {
            if (!input.contains(e.target) && !suggestionsDropdown.contains(e.target)) {
                suggestionsDropdown.style.display = 'none';
                selectedIndex = -1;
            }
        };

        // Bind events
        input.addEventListener('input', handleInput);
        input.addEventListener('keydown', handleKeydown);
        document.addEventListener('click', hideSuggestions);

        // Clean up when dialog closes
        const originalRemove = dialog.remove;
        dialog.remove = () => {
            document.removeEventListener('click', hideSuggestions);
            originalRemove.call(dialog);
        };
    }

    // Utility method to escape regex special characters
    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    // Removed selection-related methods - now using individual row actions only

    // Section action handlers for edit mode toggle
    bindSectionActionListeners() {
        // Edit mode toggle buttons
        document.querySelectorAll('.edit-mode-btn').forEach(button => {
            const category = button.dataset.category;
            // Initialize button text based on current state
            this.updateEditModeButton(button, category);

            button.addEventListener('click', (e) => {
                const category = e.currentTarget.dataset.category || e.target.dataset.category;
                this.toggleEditMode(category);
            });
        });
    }

    // Update edit mode button text and styling
    updateEditModeButton(button, category) {
        const isActive = this.editModeStates[category];
        const buttonText = isActive ? 'Edit Mode: ON' : 'Edit Mode: OFF';
        const buttonClass = isActive ? 'btn-warning' : 'btn-secondary';

        // Remove previous class and add new one
        button.classList.remove('btn-warning', 'btn-secondary');
        button.classList.add(buttonClass);

        // Find the text content - it should be the text node after the icon
        const childNodes = button.childNodes;
        let textNode = null;

        // Find the text node containing the edit mode text
        for (let node of childNodes) {
            if (node.nodeType === Node.TEXT_NODE && node.textContent.trim().includes('Edit Mode')) {
                textNode = node;
                break;
            }
        }

        if (textNode) {
            // Update existing text node - preserve the leading space from HTML
            const leadingSpace = textNode.textContent.startsWith(' ') ? ' ' : '';
            textNode.textContent = leadingSpace + buttonText;
        } else {
            // Fallback: create a text node after the icon
            const existingIcon = button.querySelector('.btn-icon');
            if (existingIcon) {
                // Remove any existing text nodes first
                for (let node of childNodes) {
                    if (node.nodeType === Node.TEXT_NODE && node.textContent.trim().includes('Edit Mode')) {
                        node.remove();
                    }
                }
                existingIcon.after(document.createTextNode(' ' + buttonText));
            }
        }

        button.setAttribute('title', isActive ? 'Exit Edit Mode' : 'Enter Edit Mode');
    }

    // Toggle edit mode for a category
    toggleEditMode(category) {
        if (!this.hasActiveSnapshot()) {
            this.showMessage('Please create or select a snapshot first', 'error');
            return;
        }

        // First, toggle the edit mode state to provide immediate visual feedback
        this.editModeStates[category] = !this.editModeStates[category];

        // If we just turned OFF edit mode, save all changes
        if (!this.editModeStates[category]) {
            try {
                const savedCount = this.saveBulkEditChanges(category);
                if (savedCount > 0) {
                    this.showMessage(`Edits saved! ${savedCount} item(s) updated.`, 'success');
                } else {
                    this.showMessage('Edit mode deactivated - no changes to save.', 'info');
                }
            } catch (error) {
                console.error('Error saving bulk changes:', error);
                this.showMessage('Error saving changes, but edit mode was deactivated.', 'error');
            }
        }

        this.updateUI();
    }

    // Save all bulk changes when exiting edit mode
    saveBulkEditChanges(category) {
        const tableId = category === 'incomes' ? 'incomeTable' : category + 'Table';
        const table = document.getElementById(tableId);
        if (!table) return 0; // Return number of saved items

        const rows = table.querySelectorAll('tbody tr');
        let savedCount = 0;

        rows.forEach((row, index) => {
            const nameInput = row.querySelector('input[data-field="name"]');
            const amountInput = row.querySelector('input[data-field="amount"]');

            if (!nameInput || !amountInput) return;

            const name = nameInput.value.trim();
            const amount = amountInput.value;

            // Skip invalid entries
            if (!name) return;

            let assetCategory = null;
            let assetLiquidity = null;
            let liabilityTerm = null;
            let incomeCategory = null;

            // Handle assets specific fields
            if (category === 'assets') {
                const categorySelect = row.querySelector('select[data-field="category"]');
                const liquiditySelect = row.querySelector('select[data-field="liquidity"]');

                if (categorySelect) assetCategory = categorySelect.value;
                if (liquiditySelect) assetLiquidity = liquiditySelect.value;
            }

            // Handle liabilities specific fields
            if (category === 'liabilities') {
                const termSelect = row.querySelector('select[data-field="term"]');
                if (termSelect) liabilityTerm = termSelect.value;
            }

            // Handle incomes specific fields
            if (category === 'incomes') {
                const categorySelect = row.querySelector('select[data-field="category"]');
                if (categorySelect) incomeCategory = categorySelect.value;
            }

            // Handle expenses specific fields
            let expenseCategory = null;
            if (category === 'expenses') {
                const categorySelect = row.querySelector('select[data-field="category"]');
                if (categorySelect) expenseCategory = categorySelect.value;
            }

            // Save this item silently (no individual success messages during bulk operations)
            this.updateItem(category, index, name, amount, assetCategory, assetLiquidity, liabilityTerm, incomeCategory, expenseCategory, true);
            savedCount++;
        });

        return savedCount;
    }

    // Format category name for display
    formatCategoryName(category) {
        const names = {
            assets: 'Assets',
            liabilities: 'Liabilities',
            incomes: 'Income',
            expenses: 'Expenses'
        };
        return names[category] || category;
    }

    // Financial Analysis - Pie Charts and Ratios
    createCharts() {
        // Prevent rapid successive chart creations which could cause infinite loops
        if (this.chartCreationInProgress) {
            console.log('Chart creation already in progress, skipping...');
            return;
        }

        this.chartCreationInProgress = true;

        try {
            this.createAssetsChart();
            this.createLiabilitiesChart();
            this.createIncomeChart();
            this.createExpensesChart();
            this.calculateFinancialRatios();
        } catch (error) {
            console.error('Error creating charts:', error);
        } finally {
            // Always reset the flag immediately, regardless of success/failure
            this.chartCreationInProgress = false;
        }
    }

    createAssetsChart() {
        const snapshot = this.getCurrentSnapshot();
        if (!snapshot || snapshot.data.assets.length === 0) {
            this.drawEmptyChart('assetsChart', 'Assets Breakdown');
            return;
        }

        // Group assets by category
        const categoryData = {};
        snapshot.data.assets.forEach(item => {
            const category = item.category || 'other';
            categoryData[category] = (categoryData[category] || 0) + item.amount;
        });

        const labels = Object.keys(categoryData).map(key => this.getAssetCategoryChartLabel(key));
        const data = Object.values(categoryData);
        const colors = this.getAssetCategoryColors(Object.keys(categoryData));

        this.drawPieChart('assetsChart', labels, data, colors, 'Assets Breakdown');
    }

    createLiabilitiesChart() {
        const snapshot = this.getCurrentSnapshot();
        if (!snapshot || snapshot.data.liabilities.length === 0) {
            this.drawEmptyChart('liabilitiesChart', 'Liabilities Breakdown');
            return;
        }

        // Group liabilities by term
        const termData = {};
        snapshot.data.liabilities.forEach(item => {
            const term = item.term || 'other';
            termData[term] = (termData[term] || 0) + item.amount;
        });

        const labels = Object.keys(termData).map(key => this.getLiabilityTermChartLabel(key));
        const data = Object.values(termData);

        // Assign different colors for liability terms
        const colors = this.getLiabilityTermColors(Object.keys(termData));

        this.drawPieChart('liabilitiesChart', labels, data, colors, 'Liabilities Breakdown');
    }

    createIncomeChart() {
        const snapshot = this.getCurrentSnapshot();
        if (!snapshot || snapshot.data.incomes.length === 0) {
            this.drawEmptyChart('incomeChart', 'Income Breakdown');
            return;
        }

        // Group income by category
        const categoryData = {};
        snapshot.data.incomes.forEach(item => {
            const category = item.category || 'other';
            categoryData[category] = (categoryData[category] || 0) + item.amount;
        });

        const labels = Object.keys(categoryData).map(key => this.getIncomeCategoryChartLabel(key));
        const data = Object.values(categoryData);
        const colors = this.getIncomeCategoryColors(Object.keys(categoryData));

        this.drawPieChart('incomeChart', labels, data, colors, 'Income Breakdown');
    }

    createExpensesChart() {
        const snapshot = this.getCurrentSnapshot();
        if (!snapshot || snapshot.data.expenses.length === 0) {
            this.drawEmptyChart('expensesChart', 'Expenses Breakdown');
            return;
        }

        // Group expenses by category
        const categoryData = {};
        snapshot.data.expenses.forEach(item => {
            const category = item.category || 'other';
            categoryData[category] = (categoryData[category] || 0) + item.amount;
        });

        const labels = Object.keys(categoryData).map(key => this.getExpenseCategoryChartLabel(key));
        const data = Object.values(categoryData);
        const colors = this.getExpenseCategoryColors(Object.keys(categoryData));

        this.drawPieChart('expensesChart', labels, data, colors, 'Expenses Breakdown');
    }

    drawPieChart(canvasId, labels, data, colors, title) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) {
            console.log(`Canvas ${canvasId} not found`);
            return;
        }

        // Destroy existing chart if it exists
        if (this.charts && this.charts[canvasId]) {
            try {
                this.charts[canvasId].destroy();
            } catch (e) {
                console.log(`Error destroying chart ${canvasId}:`, e);
            }
        }

        this.charts = this.charts || {};

        const total = data.reduce((sum, value) => sum + value, 0);

        try {
            const toOpaque = (hex) => {
                if (typeof hex !== 'string') return hex;
                return hex.length === 9 ? hex.slice(0, 7) + 'ff' : hex;
            };

            this.charts[canvasId] = new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: labels,
                    datasets: [{
                        data: data,
                        backgroundColor: colors,
                        borderColor: colors.map(toOpaque),
                        borderWidth: 2,
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                padding: 10,
                                font: {
                                    size: 10
                                },
                                generateLabels: function(chart) {
                                    const data = chart.data;
                                    if (data.labels.length && data.datasets.length) {
                                        return data.labels.map((label, i) => {
                                            const value = data.datasets[0].data[i];
                                            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;

                                            return {
                                                text: `${label} (${percentage}%)`,
                                                fillStyle: data.datasets[0].backgroundColor[i],
                                                strokeStyle: data.datasets[0].backgroundColor[i],
                                                lineWidth: 2,
                                                hidden: false,
                                                index: i
                                            };
                                        });
                                    }
                                    return [];
                                }
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const value = context.parsed;
                                    const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                    const formattedValue = '$' + value.toLocaleString();
                                    return `${context.label}: ${formattedValue} (${percentage}%)`;
                                }
                            }
                        }
                    }
                }
            });
        } catch (chartError) {
            console.error(`Error creating chart ${canvasId}:`, chartError);
            // Fallback: try to create a simple empty chart
            try {
                this.charts[canvasId] = new Chart(ctx, {
                    type: 'pie',
                    data: {
                        labels: ['Error'],
                        datasets: [{
                            data: [1],
                            backgroundColor: ['#dc3545']
                        }]
                    }
                });
            } catch (fallbackError) {
                console.error(`Fallback chart failed for ${canvasId}:`, fallbackError);
            }
        }
    }

    drawEmptyChart(canvasId, title) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;

        // Clear any existing chart
        if (this.charts && this.charts[canvasId]) {
            this.charts[canvasId].destroy();
        }

        this.charts = this.charts || {};

        this.charts[canvasId] = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: ['No Data'],
                datasets: [{
                    data: [1],
                    backgroundColor: ['#e9ecef'],
                    borderColor: ['#dee2e6'],
                    borderWidth: 1,
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 10,
                            font: {
                                size: 10
                            }
                        }
                    }
                }
            }
        });
    }

    // Chart label and color getters
    getAssetCategoryChartLabel(category) {
        const labels = {
            'cash': 'Cash Equivalents',
            'investments': 'Investments',
            'retirement': 'Retirement',
            'property': 'Property',
            'vehicles': 'Vehicles',
            'insurance': 'Insurance',
            'other': 'Other Assets'
        };
        return labels[category] || category;
    }

    getAssetCategoryColors(categories) {
        const colors = {
            'cash': '#28a745',
            'investments': '#ffc107',
            'retirement': '#17a2b8',
            'property': '#6f42c1',
            'vehicles': '#fd7e14',
            'insurance': '#dc3545',
            'other': '#6c757d'
        };

        return categories.map(cat => colors[cat] ? colors[cat] + '80' : '#6c757d80');
    }

    getLiabilityTermChartLabel(term) {
        const labels = {
            'short-term': 'Short-Term',
            'medium-term': 'Medium-Term',
            'long-term': 'Long-Term',
            'other': 'Other'
        };
        return labels[term] || term;
    }

    getLiabilityTermColors(terms) {
        const colors = {
            'short-term': '#fd7e14',
            'medium-term': '#ffc107',
            'long-term': '#dc3545',
            'other': '#6c757d'
        };

        return terms.map(term => colors[term] ? colors[term] + '80' : '#6c757d80');
    }

    getIncomeCategoryChartLabel(category) {
        const labels = {
            'employment': 'Employment',
            'business': 'Business',
            'passive': 'Passive',
            'other': 'Other'
        };
        return labels[category] || category;
    }

    getIncomeCategoryColors(categories) {
        const colors = {
            'employment': '#28a745',
            'business': '#007bff',
            'passive': '#17a2b8',
            'other': '#6c757d'
        };

        return categories.map(cat => colors[cat] ? colors[cat] + '80' : '#6c757d80');
    }

    getExpenseCategoryChartLabel(category) {
        const labels = {
            'essential': 'Essential/Fixed',
            'variable': 'Variable/Living',
            'discretionary': 'Discretionary',
            'other': 'Other'
        };
        return labels[category] || category;
    }

    getExpenseCategoryColors(categories) {
        const colors = {
            'essential': '#dc3545',
            'variable': '#fd7e14',
            'discretionary': '#ffc107',
            'other': '#6c757d'
        };

        return categories.map(cat => colors[cat] ? colors[cat] + '80' : '#6c757d80');
    }

    // Financial Ratios Calculations
    calculateFinancialRatios() {
        this.updateBasicLiquidityRatio();
        this.updateSavingsRatio();
        this.updateLiquidityToNetWorthRatio();
        this.updateDebtToAssetRatio();
        this.updateSolvencyRatio();
    }

    updateBasicLiquidityRatio() {
        const snapshot = this.getCurrentSnapshot();
        if (!snapshot) {
            this.updateRatioElement('basicLiquidityRatio', 0, ' months');
            return;
        }

        // Calculate total cash equivalents (high liquidity cash assets)
        const totalCashEquivalents = snapshot.data.assets
            .filter(asset => asset.category === 'cash')
            .reduce((sum, asset) => sum + asset.amount, 0);

        // Calculate total monthly expenses
        const totalMonthlyExpenses = snapshot.data.expenses
            .reduce((sum, expense) => sum + expense.amount, 0);

        // Calculate ratio: months of expenses covered by cash
        const basicLiquidityRatio = totalMonthlyExpenses > 0 ?
            totalCashEquivalents / totalMonthlyExpenses : 0;

        this.updateRatioElement('basicLiquidityRatio', basicLiquidityRatio, ' months');
    }

    updateSavingsRatio() {
        const snapshot = this.getCurrentSnapshot();
        if (!snapshot) {
            this.updateRatioElement('savingsRatio', 0, '%');
            return;
        }
        // Calculate total monthly income
        const totalMonthlyIncome = snapshot.data.incomes
            .reduce((sum, income) => sum + this.validateNumber(income.amount), 0);

        // Calculate total monthly expenses
        const totalMonthlyExpenses = snapshot.data.expenses
            .reduce((sum, expense) => sum + this.validateNumber(expense.amount), 0);

        // Calculate monthly savings (income minus expenses)
        const monthlySavings = totalMonthlyIncome - totalMonthlyExpenses;

        // Calculate savings ratio: (Monthly Savings ÷ Monthly Income) × 100%
        const savingsRatio = totalMonthlyIncome > 0 ?
            (monthlySavings / totalMonthlyIncome) * 100 : 0;

        // Update the ratio element with the calculated value
        this.updateRatioElement('savingsRatio', savingsRatio, '%');
    }

    updateLiquidityToNetWorthRatio() {
        const snapshot = this.getCurrentSnapshot();
        if (!snapshot) {
            this.updateRatioElement('liquidityToNetWorthRatio', 0, '%');
            return;
        }

        // Calculate total liquid assets (assets with High liquidity)
        const totalLiquidAssets = snapshot.data.assets
            .filter(asset => asset.liquidity === 'high')
            .reduce((sum, asset) => sum + asset.amount, 0);

        // Calculate net worth (total assets minus total liabilities)
        const totalAssets = snapshot.data.assets.reduce((sum, asset) => sum + asset.amount, 0);
        const totalLiabilities = snapshot.data.liabilities.reduce((sum, liability) => sum + liability.amount, 0);
        const netWorth = totalAssets - totalLiabilities;

        // Calculate ratio: (Liquid Assets ÷ Net Worth) × 100%
        const liquidityToNetWorthRatio = netWorth > 0 ?
            (totalLiquidAssets / netWorth) * 100 : 0;

        this.updateRatioElement('liquidityToNetWorthRatio', liquidityToNetWorthRatio, '%');
    }

    updateDebtToAssetRatio() {
        const snapshot = this.getCurrentSnapshot();
        if (!snapshot) {
            this.updateRatioElement('debtToAssetRatio', 0, '%');
            return;
        }

        // Calculate total assets and total liabilities
        const totalAssets = snapshot.data.assets.reduce((sum, asset) => sum + asset.amount, 0);
        const totalLiabilities = snapshot.data.liabilities.reduce((sum, liability) => sum + liability.amount, 0);

        // Calculate Debt to Asset Ratio: (Total Debt ÷ Total Assets) × 100%
        const debtToAssetRatio = totalAssets > 0 ? (totalLiabilities / totalAssets) * 100 : 0;

        this.updateRatioElement('debtToAssetRatio', debtToAssetRatio, '%');
    }

    updateSolvencyRatio() {
        const snapshot = this.getCurrentSnapshot();
        if (!snapshot) {
            this.updateRatioElement('solvencyRatio', 0, '%');
            return;
        }

        // Calculate total assets and total liabilities
        const totalAssets = snapshot.data.assets.reduce((sum, asset) => sum + asset.amount, 0);
        const totalLiabilities = snapshot.data.liabilities.reduce((sum, liability) => sum + liability.amount, 0);

        // Calculate Net Worth (Total Assets - Total Liabilities)
        const netWorth = totalAssets - totalLiabilities;

        // Calculate Solvency Ratio: (Net Worth ÷ Total Assets) × 100%
        const solvencyRatio = totalAssets > 0 ? (netWorth / totalAssets) * 100 : 0;

        this.updateRatioElement('solvencyRatio', solvencyRatio, '%');
    }

    updateRatioDisplay(summary) {
        // Debt-to-Asset Ratio
        const debtToAssetRatio = summary.totalAssets > 0 ? (summary.totalLiabilities / summary.totalAssets) * 100 : 0;
        this.updateRatioElement('debtToAssetRatio', debtToAssetRatio, '%');

        // Net Worth Ratio
        const netWorthRatio = summary.totalAssets > 0 ? (summary.netWorth / summary.totalAssets) * 100 : 0;
        this.updateRatioElement('netWorthRatio', netWorthRatio, '%');

        // Savings Rate
        const savingsRate = summary.totalIncome > 0 ? (summary.savings / summary.totalIncome) * 100 : 0;
        this.updateRatioElement('savingsRate', savingsRate, '%');

        // Liquidity Ratio (Cash vs Total Assets)
        const liquidityRatio = this.calculateLiquidityRatio();
        this.updateRatioElement('liquidityRatio', liquidityRatio, '%');

        // Expense Ratio
        const expenseRatio = summary.totalIncome > 0 ? (summary.totalExpenses / summary.totalIncome) * 100 : 0;
        this.updateRatioElement('expenseRatio', expenseRatio, '%');

        // Liability Coverage
        const liabilityCoverage = this.calculateLiabilityCoverage(summary);
        this.updateRatioElement('liabilityCoverage', liabilityCoverage, 'x');
    }

    updateRatioElement(elementId, value, unit) {
        const element = document.getElementById(elementId);
        if (!element) return;

        const formattedValue = this.formatRatioValue(value, unit);
        element.textContent = formattedValue;

        // Add color coding based on health
        element.classList.remove('positive', 'negative', 'warning');

        let healthClass = '';
        if (elementId === 'debtToAssetRatio') {
            healthClass = value < 20 ? 'positive' : value <= 50 ? 'warning' : 'negative'; // Green: Below 20%, Yellow: 20%-50%, Red: Above 50%
        } else if (elementId === 'netWorthRatio') {
            healthClass = value > 20 ? 'positive' : value > 0 ? 'warning' : 'negative'; // Higher is better
        } else if (elementId === 'savingsRate') {
            healthClass = value > 20 ? 'positive' : value > 10 ? 'warning' : 'negative'; // Higher is better
        } else if (elementId === 'savingsRatio') {
            healthClass = value >= 20 ? 'positive' : value >= 10 ? 'warning' : 'negative'; // Green: 20%+, Yellow: 10%-20%, Red: Below 10%
        } else if (elementId === 'solvencyRatio') {
            healthClass = value > 20 ? 'positive' : value >= 10 ? 'warning' : 'negative'; // Green: Above 20%, Yellow: 10%-20%, Red: Below 10%
        } else if (elementId === 'liquidityRatio') {
            healthClass = value > 30 ? 'positive' : value > 10 ? 'warning' : 'negative'; // Higher is better
        } else if (elementId === 'basicLiquidityRatio') {
            healthClass = value < 3 ? 'negative' : value <= 6 ? 'positive' : 'warning'; // Red: <3, Green: 3-6, Yellow: >6
            // Removed call to updateLiquidityStatus since liquidityStatus element doesn't exist
            // this.updateLiquidityStatus(value);
        } else if (elementId === 'expenseRatio') {
            healthClass = value < 80 ? 'positive' : value < 100 ? 'warning' : 'negative'; // Lower is better
        } else if (elementId === 'liabilityCoverage') {
            healthClass = value > 2 ? 'positive' : value > 1 ? 'warning' : 'negative'; // Higher is better
        } else if (elementId === 'liquidityToNetWorthRatio') {
            healthClass = value >= 20 ? 'positive' : value >= 10 ? 'warning' : 'negative'; // Green: 20%+, Yellow: 10%-20%, Red: Below 10%
        }

        if (healthClass) {
            element.classList.add(healthClass);
        }
    }

    formatRatioValue(value, unit) {
        const u = typeof unit === 'string' ? unit.trim() : unit;
        const num = typeof value === 'number' ? value : parseFloat(value);
        if (u === 'x') {
            return `${num === Infinity ? '∞' : num.toFixed(1)}${u}`;
        } else if (u === '%') {
            return `${num.toFixed(1)}${u}`;
        } else if (u === 'months') {
            return `${num.toFixed(1)} ${u}`;
        }
        return `${value}${unit}`;
    }

    // Update liquidity status text based on ratio value
    updateLiquidityStatus(ratio) {
        const statusElement = document.getElementById('liquidityStatus');
        if (!statusElement) return;

        let statusText = '';
        let statusClass = '';

        if (ratio > 6) {
            statusText = 'Cash-heavy - consider investing excess emergency funds.';
            statusClass = 'warning';
        } else if (ratio >= 3) {
            statusText = 'Good coverage - you\'re well prepared!';
            statusClass = 'positive';
        } else {
            statusText = 'Insufficient coverage - vulnerable to financial shocks.';
            statusClass = 'negative';
        }

        statusElement.textContent = statusText;
        statusElement.className = `ratio-status ${statusClass}`;
    }



    calculateLiquidityRatio() {
        const snapshot = this.getCurrentSnapshot();
        if (!snapshot) return 0;

        const cashAssets = snapshot.data.assets.filter(asset =>
            asset.category === 'cash' && asset.liquidity === 'high'
        ).reduce((sum, asset) => sum + asset.amount, 0);

        const totalAssets = snapshot.data.assets.reduce((sum, asset) => sum + asset.amount, 0);

        return totalAssets > 0 ? (cashAssets / totalAssets) * 100 : 0;
    }

    calculateLiabilityCoverage(summary) {
        // Simplified calculation: income divided by annual debt payments
        // This is a basic estimate - actual calculation would be more complex
        if (summary.totalLiabilities === 0 || summary.totalIncome === 0) return Infinity;

        // Estimate monthly debt payments (rough approximation based on common standards)
        // This would typically require more detailed debt information
        const estimatedMonthlyDebt = summary.totalLiabilities * 0.02; // Rough estimate

        return estimatedMonthlyDebt > 0 ? (summary.totalIncome / estimatedMonthlyDebt) : Infinity;
    }

    // Message System
    showMessage(text, type = 'info') {
        const container = document.getElementById('messageContainer');
        if (!container) {
            console.warn('Message container not found');
            return;
        }

        const message = document.createElement('div');
        message.className = `message ${type}`;
        message.textContent = text;

        container.appendChild(message);

        setTimeout(() => {
            if (message.parentNode) {
                message.remove();
            }
        }, 5000); // Longer duration for fresh start message
    }

    // AI Chatbot Methods
    getSnapshotDataForAI() {
        const snapshot = this.getCurrentSnapshot();
        if (!snapshot) {
            return null;
        }

        const summary = this.calculateSummary();
        const data = snapshot.data;

        // Format assets by category
        const assetsByCategory = {};
        data.assets.forEach(asset => {
            if (!assetsByCategory[asset.category]) {
                assetsByCategory[asset.category] = [];
            }
            assetsByCategory[asset.category].push({
                name: asset.name,
                amount: asset.amount,
                liquidity: asset.liquidity
            });
        });

        // Format liabilities by term
        const liabilitiesByTerm = {};
        data.liabilities.forEach(liability => {
            if (!liabilitiesByTerm[liability.term]) {
                liabilitiesByTerm[liability.term] = [];
            }
            liabilitiesByTerm[liability.term].push({
                name: liability.name,
                amount: liability.amount
            });
        });

        // Format incomes by category
        const incomesByCategory = {};
        data.incomes.forEach(income => {
            if (!incomesByCategory[income.category]) {
                incomesByCategory[income.category] = [];
            }
            incomesByCategory[income.category].push({
                name: income.name,
                amount: income.amount
            });
        });

        // Format expenses by category
        const expensesByCategory = {};
        data.expenses.forEach(expense => {
            if (!expensesByCategory[expense.category]) {
                expensesByCategory[expense.category] = [];
            }
            expensesByCategory[expense.category].push({
                name: expense.name,
                amount: expense.amount
            });
        });

        // Calculate financial ratios
        const cashEquivalents = data.assets
            .filter(a => a.category === 'cash' && a.liquidity === 'high')
            .reduce((sum, a) => sum + a.amount, 0);
        const totalExpenses = summary.totalExpenses || 1;
        const basicLiquidityRatio = totalExpenses > 0 ? (cashEquivalents / totalExpenses).toFixed(2) : 'N/A';
        
        const debtToAssetRatio = summary.totalAssets > 0 
            ? ((summary.totalLiabilities / summary.totalAssets) * 100).toFixed(2) 
            : '0.00';
        
        const solvencyRatio = summary.totalAssets > 0 
            ? ((summary.netWorth / summary.totalAssets) * 100).toFixed(2) 
            : '0.00';
        
        const savingsRatio = summary.totalIncome > 0 
            ? ((summary.savings / summary.totalIncome) * 100).toFixed(2) 
            : '0.00';

        return {
            snapshotName: snapshot.label,
            snapshotDate: this.formatDate(snapshot.createdAt),
            summary: {
                totalAssets: summary.totalAssets,
                totalLiabilities: summary.totalLiabilities,
                netWorth: summary.netWorth,
                totalIncome: summary.totalIncome,
                totalExpenses: summary.totalExpenses,
                savings: summary.savings
            },
            assets: {
                byCategory: assetsByCategory,
                total: summary.totalAssets
            },
            liabilities: {
                byTerm: liabilitiesByTerm,
                total: summary.totalLiabilities
            },
            incomes: {
                byCategory: incomesByCategory,
                total: summary.totalIncome
            },
            expenses: {
                byCategory: expensesByCategory,
                total: summary.totalExpenses
            },
            ratios: {
                basicLiquidity: basicLiquidityRatio,
                debtToAsset: debtToAssetRatio,
                solvency: solvencyRatio,
                savings: savingsRatio
            }
        };
    }

    formatSnapshotDataForAIContext(snapshotData) {
        if (!snapshotData) {
            return 'No snapshot data available. Please create or select a snapshot first.';
        }

        let context = `User's Financial Snapshot: "${snapshotData.snapshotName}" (created: ${snapshotData.snapshotDate})\n\n`;
        
        context += `FINANCIAL SUMMARY:\n`;
        context += `- Total Assets: $${this.formatCurrencyForAI(snapshotData.summary.totalAssets)}\n`;
        context += `- Total Liabilities: $${this.formatCurrencyForAI(snapshotData.summary.totalLiabilities)}\n`;
        context += `- Net Worth: $${this.formatCurrencyForAI(snapshotData.summary.netWorth)}\n`;
        context += `- Monthly Income: $${this.formatCurrencyForAI(snapshotData.summary.totalIncome)}\n`;
        context += `- Monthly Expenses: $${this.formatCurrencyForAI(snapshotData.summary.totalExpenses)}\n`;
        context += `- Monthly Savings: $${this.formatCurrencyForAI(snapshotData.summary.savings)}\n\n`;

        context += `FINANCIAL RATIOS:\n`;
        context += `- Basic Liquidity Ratio: ${snapshotData.ratios.basicLiquidity} months (emergency fund coverage)\n`;
        context += `- Debt to Asset Ratio: ${snapshotData.ratios.debtToAsset}%\n`;
        context += `- Solvency Ratio: ${snapshotData.ratios.solvency}%\n`;
        context += `- Savings Ratio: ${snapshotData.ratios.savings}%\n\n`;

        context += `ASSETS BREAKDOWN:\n`;
        Object.keys(snapshotData.assets.byCategory).forEach(category => {
            context += `\n${category.toUpperCase()}:\n`;
            snapshotData.assets.byCategory[category].forEach(asset => {
                context += `  - ${asset.name}: $${this.formatCurrencyForAI(asset.amount)} (Liquidity: ${asset.liquidity})\n`;
            });
        });

        context += `\nLIABILITIES BREAKDOWN:\n`;
        Object.keys(snapshotData.liabilities.byTerm).forEach(term => {
            context += `\n${term.toUpperCase()}:\n`;
            snapshotData.liabilities.byTerm[term].forEach(liability => {
                context += `  - ${liability.name}: $${this.formatCurrencyForAI(liability.amount)}\n`;
            });
        });

        context += `\nINCOME BREAKDOWN:\n`;
        Object.keys(snapshotData.incomes.byCategory).forEach(category => {
            context += `\n${category.toUpperCase()}:\n`;
            snapshotData.incomes.byCategory[category].forEach(income => {
                context += `  - ${income.name}: $${this.formatCurrencyForAI(income.amount)}/month\n`;
            });
        });

        context += `\nEXPENSES BREAKDOWN:\n`;
        Object.keys(snapshotData.expenses.byCategory).forEach(category => {
            context += `\n${category.toUpperCase()}:\n`;
            snapshotData.expenses.byCategory[category].forEach(expense => {
                context += `  - ${expense.name}: $${this.formatCurrencyForAI(expense.amount)}/month\n`;
            });
        });

        return context;
    }

    formatCurrencyForAI(amount) {
        // Format currency for AI context (simple number format without $ and commas)
        return parseFloat(amount).toFixed(2);
    }

    getProviderConfig() {
        // Get custom configuration from localStorage
        const apiKey = localStorage.getItem('ai_api_key') || '';
        const baseUrl = localStorage.getItem('ai_base_url') || 'https://api.openai.com/v1';
        const modelId = localStorage.getItem('ai_model_id') || 'gpt-4o-mini';

        return {
            name: 'OpenAI Compatible',
            endpoint: `${baseUrl}/chat/completions`,
            model: modelId,
            apiKey: apiKey,
            apiKeyPattern: 'sk-',
            baseUrl: baseUrl
        };
    }

    async sendChatbotMessage(userMessage) {
        const snapshotData = this.getSnapshotDataForAI();
        const snapshotContext = this.formatSnapshotDataForAIContext(snapshotData);

        const systemPrompt = `You are a helpful AI Finance Assistant for a personal finance tracking website. Your role is to help users understand their financial snapshot and provide insights based on their specific financial data.

CRITICAL FORMATTING REQUIREMENTS:
- RESPOND IN PLAIN TEXT ONLY - NEVER use *, #, **, or any markdown formatting
- Use bullet points, numbered lists, headers, or any special characters for formatting
- Write in normal paragraphs with regular sentences
- Keep responses concise - aim for 150-300 words maximum
- Be direct and to the point

IMPORTANT GUIDELINES:
- Stay friendly and helpful while being extremely concise
- Focus on actionable insights based on the user's actual data
- Reference specific numbers from their snapshot
- Explain financial concepts in simple terms
- Be encouraging but realistic, do not sugar coat and provide good insights
- If the user asks about something not in their snapshot, politely let them know

User's Current Financial Snapshot Data:
${snapshotContext}

Remember to analyze the actual numbers provided and give personalized, data-driven advice.`;

        const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage }
        ];

        try {
            const apiKey = localStorage.getItem('ai_api_key') || '';
            const providerConfig = this.getProviderConfig();
            
            if (!apiKey) {
                return `⚠️ AI Assistant is not configured. Please add your ${providerConfig.name} API key in the settings. For now, here's a simple analysis:\n\n` + 
                       this.generateBasicAnalysis(snapshotData);
            }

            const response = await fetch(providerConfig.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: providerConfig.model,
                    messages: messages,
                    temperature: 0.7,
                    max_tokens: 500
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: { message: `HTTP ${response.status}: ${response.statusText}` } }));
                throw new Error(errorData.error?.message || 'API request failed');
            }

            const data = await response.json();
            return data.choices[0].message.content.trim();
        } catch (error) {
            console.error('Chatbot error:', error);
            // Fallback to basic analysis if API fails
            return `⚠️ Unable to connect to AI service (${error.message}). Here's a basic analysis:\n\n` + 
                   this.generateBasicAnalysis(snapshotData);
        }
    }

    generateBasicAnalysis(snapshotData) {
        if (!snapshotData) {
            return 'Please create or select a snapshot to get financial insights.';
        }

        let analysis = `Based on your "${snapshotData.snapshotName}" snapshot:\n\n`;
        
        analysis += `💰 NET WORTH: $${snapshotData.summary.netWorth.toFixed(2)}\n`;
        if (snapshotData.summary.netWorth < 0) {
            analysis += `   Your liabilities exceed your assets. Focus on paying down debt.\n\n`;
        } else {
            analysis += `   You have positive net worth - keep building!\n\n`;
        }

        analysis += `📊 MONTHLY FLOW:\n`;
        analysis += `   Income: $${snapshotData.summary.totalIncome.toFixed(2)}\n`;
        analysis += `   Expenses: $${snapshotData.summary.totalExpenses.toFixed(2)}\n`;
        analysis += `   Savings: $${snapshotData.summary.savings.toFixed(2)} (${snapshotData.ratios.savings}%)\n\n`;

        return analysis;
    }

    addChatbotMessage(message, isUser = false) {
        const messagesContainer = document.getElementById('chatbotMessages');
        if (!messagesContainer) return;

        const messageDiv = document.createElement('div');
        messageDiv.className = `chatbot-message ${isUser ? 'chatbot-message-user' : 'chatbot-message-assistant'}`;
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        
        // Convert newlines to paragraphs
        const paragraphs = message.split('\n').filter(p => p.trim());
        paragraphs.forEach((para, index) => {
            const p = document.createElement('p');
            // Check if it's a list item
            if (para.trim().startsWith('-') || para.trim().match(/^\d+\./)) {
                p.style.marginLeft = '1rem';
                p.textContent = para.replace(/^[-•]\s*/, '').replace(/^\d+\.\s*/, '');
            } else {
                p.textContent = para;
            }
            if (index < paragraphs.length - 1) {
                p.style.marginBottom = '0.5rem';
            }
            contentDiv.appendChild(p);
        });

        messageDiv.appendChild(contentDiv);
        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    updateChatbotSnapshotInfo() {
        const infoElement = document.getElementById('chatbotSnapshotInfo');
        if (!infoElement) return;

        const snapshot = this.getCurrentSnapshot();
        if (snapshot) {
            infoElement.textContent = `Snapshot: ${snapshot.label}`;
        } else {
            infoElement.textContent = 'No snapshot selected';
        }
    }

    initChatbot() {
        const toggleBtn = document.getElementById('chatbotToggle');
        const closeBtn = document.getElementById('chatbotClose');
        const sendBtn = document.getElementById('chatbotSend');
        const inputField = document.getElementById('chatbotInput');
        const chatbotWindow = document.getElementById('chatbotWindow');
        const settingsBtn = document.getElementById('chatbotSettings');
        const settingsModal = document.getElementById('chatbotSettingsModal');
        const settingsCloseBtn = document.getElementById('chatbotSettingsClose');
        const saveApiKeyBtn = document.getElementById('saveApiKeyBtn');
        const clearApiKeyBtn = document.getElementById('clearApiKeyBtn');
        const apiKeyInput = document.getElementById('apiKeyInput');

        if (!toggleBtn || !closeBtn || !sendBtn || !inputField || !chatbotWindow) {
            console.warn('Chatbot elements not found');
            return;
        }

        // Toggle chatbot window
        toggleBtn.addEventListener('click', () => {
            chatbotWindow.classList.toggle('active');
            if (chatbotWindow.classList.contains('active')) {
                this.updateChatbotSnapshotInfo();
                // Only focus on desktop to avoid opening keyboard on mobile
                if (window.innerWidth > 768) {
                    inputField.focus();
                }
            }
        });

        closeBtn.addEventListener('click', () => {
            chatbotWindow.classList.remove('active');
        });

        // Send message on button click
        sendBtn.addEventListener('click', async () => {
            await this.handleChatbotSend();
        });

        // Send message on Enter key
        inputField.addEventListener('keypress', async (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                await this.handleChatbotSend();
            }
        });

        // Settings modal handlers
        if (settingsBtn && settingsModal) {
            settingsBtn.addEventListener('click', () => {
                this.openChatbotSettings();
            });
        }

        if (settingsCloseBtn && settingsModal) {
            settingsCloseBtn.addEventListener('click', () => {
                this.closeChatbotSettings();
            });

            // Close on backdrop click
            settingsModal.addEventListener('click', (e) => {
                if (e.target === settingsModal) {
                    this.closeChatbotSettings();
                }
            });
        }

        if (saveApiKeyBtn && apiKeyInput) {
            saveApiKeyBtn.addEventListener('click', () => {
                this.saveApiKey();
            });
        }

        if (clearApiKeyBtn) {
            clearApiKeyBtn.addEventListener('click', () => {
                this.clearApiKey();
            });
        }

        // Clear chat functionality
        const clearChatBtn = document.getElementById('chatbotClear');
        if (clearChatBtn) {
            clearChatBtn.addEventListener('click', () => {
                this.clearChat();
            });
        }

        // Clear masked input when user starts typing (optional - removed to keep key visible)
        // Users can choose to replace or clear manually

        // No provider selection needed - single OpenAI-compatible provider

        // Migrate old API key storage if exists
        this.migrateApiKeyStorage();

        // Load existing API key if present
        this.loadApiKeyStatus();

        // Initial update
        this.updateChatbotSnapshotInfo();
    }

    openChatbotSettings() {
        const settingsModal = document.getElementById('chatbotSettingsModal');
        const apiKeyInput = document.getElementById('apiKeyInput');
        const baseUrlInput = document.getElementById('baseUrlInput');
        const modelIdInput = document.getElementById('modelIdInput');

        if (!settingsModal || !apiKeyInput || !baseUrlInput || !modelIdInput) return;

        // Load current values
        const currentKey = localStorage.getItem('ai_api_key') || '';
        const currentBaseUrl = localStorage.getItem('ai_base_url') || 'https://api.openai.com/v1';
        const currentModelId = localStorage.getItem('ai_model_id') || 'gpt-4o-mini';

        // Load API key (show full key for visibility, use data-has-key to track state)
        if (currentKey) {
            apiKeyInput.value = currentKey;
            apiKeyInput.setAttribute('data-has-key', 'true');
        } else {
            apiKeyInput.value = '';
            apiKeyInput.removeAttribute('data-has-key');
        }

        // Load base URL and model ID
        baseUrlInput.value = currentBaseUrl;
        modelIdInput.value = currentModelId;

        settingsModal.classList.add('active');
        // Only focus on desktop to avoid opening keyboard on mobile
        if (window.innerWidth > 768) {
            apiKeyInput.focus();
        }
    }

    // Removed updateProviderHelp method as we're now using a single OpenAI-compatible provider

    migrateApiKeyStorage() {
        // Migrate old 'openai_api_key' to new 'ai_api_key' and 'ai_provider'
        const oldKey = localStorage.getItem('openai_api_key');
        if (oldKey && !localStorage.getItem('ai_api_key')) {
            localStorage.setItem('ai_api_key', oldKey);
            localStorage.setItem('ai_provider', 'openai');
            // Optionally remove old key
            // localStorage.removeItem('openai_api_key');
        }
    }

    closeChatbotSettings() {
        const settingsModal = document.getElementById('chatbotSettingsModal');
        const apiKeyInput = document.getElementById('apiKeyInput');
        
        if (settingsModal) {
            settingsModal.classList.remove('active');
        }
        
        if (apiKeyInput) {
            apiKeyInput.value = '';
            apiKeyInput.removeAttribute('data-masked');
        }
    }

    saveApiKey() {
        const apiKeyInput = document.getElementById('apiKeyInput');
        const baseUrlInput = document.getElementById('baseUrlInput');
        const modelIdInput = document.getElementById('modelIdInput');

        if (!apiKeyInput || !baseUrlInput || !modelIdInput) return;

        let apiKey = apiKeyInput.value.trim();
        const baseUrl = baseUrlInput.value.trim();
        const modelId = modelIdInput.value.trim();

        // If input is empty, clear the API key
        if (!apiKey) {
            localStorage.removeItem('ai_api_key');
            this.showMessage('API key cleared', 'success');
        } else {
            // Always validate and save the key since we now show the full key
            // Basic validation - most providers use keys starting with 'sk-'
            if (!apiKey.startsWith('sk-')) {
                if (!confirm(`This doesn't look like a valid OpenAI-compatible API key (should start with "sk-"). Save anyway?`)) {
                    return;
                }
            }
            localStorage.setItem('ai_api_key', apiKey);
            this.showMessage('Settings saved! AI assistant is ready to use.', 'success');
        }

        // Always save base URL and model ID
        if (!baseUrl) {
            this.showMessage('Please enter a Base URL', 'error');
            return;
        }

        if (!modelId) {
            this.showMessage('Please enter a Model ID', 'error');
            return;
        }

        localStorage.setItem('ai_base_url', baseUrl);
        localStorage.setItem('ai_model_id', modelId);

        // Update status
        this.loadApiKeyStatus();

        // Clear input (but keep data-masked attribute for display consistency)
        apiKeyInput.value = '';
        apiKeyInput.removeAttribute('data-masked');
    }

    clearApiKey() {
        if (confirm('Are you sure you want to clear your API key? You\'ll need to enter it again to use AI features.')) {
            localStorage.removeItem('ai_api_key');
            localStorage.removeItem('ai_base_url');
            localStorage.removeItem('ai_model_id');
            // Clear all input fields
            const apiKeyInput = document.getElementById('apiKeyInput');
            const baseUrlInput = document.getElementById('baseUrlInput');
            const modelIdInput = document.getElementById('modelIdInput');

            if (apiKeyInput) {
                apiKeyInput.value = '';
                apiKeyInput.removeAttribute('data-masked');
            }
            if (baseUrlInput) {
                baseUrlInput.value = '';
            }
            if (modelIdInput) {
                modelIdInput.value = '';
            }
            this.loadApiKeyStatus();
            this.showMessage('API key and settings cleared', 'success');
        }
    }

    loadApiKeyStatus() {
        const statusElement = document.getElementById('apiKeyStatus');
        const statusText = document.getElementById('apiKeyStatusText');

        if (!statusElement || !statusText) return;

        const apiKey = localStorage.getItem('ai_api_key');
        const baseUrl = localStorage.getItem('ai_base_url') || 'https://api.openai.com/v1';
        const modelId = localStorage.getItem('ai_model_id') || 'gpt-4o-mini';

        if (apiKey) {
            statusElement.className = 'settings-status configured';
            // Extract domain from base URL for display
            const urlMatch = baseUrl.match(/\/\/([^\/]+)/);
            const domain = urlMatch ? urlMatch[1] : baseUrl;
            statusText.textContent = `✓ API key configured (${domain} - ${modelId})`;
        } else {
            statusElement.className = 'settings-status not-configured';
            statusText.textContent = '⚠ API key not configured';
        }
    }

    // Clear chat functionality
    clearChat() {
        const messagesContainer = document.getElementById('chatbotMessages');
        if (!messagesContainer) return;

        // Keep only the welcome message
        const welcomeMessage = messagesContainer.querySelector('.chatbot-message-assistant');
        messagesContainer.innerHTML = '';

        if (welcomeMessage) {
            messagesContainer.appendChild(welcomeMessage);
        } else {
            // If welcome message was removed, add it back
            const newWelcomeMessage = document.createElement('div');
            newWelcomeMessage.className = 'chatbot-message chatbot-message-assistant';
            newWelcomeMessage.innerHTML = `
                <div class="message-content">
                    <p>Hello! I'm your AI Finance Assistant. I can help answer questions about your current financial snapshot, including:</p>
                    <ul style="margin: 0.5rem 0; padding-left: 1.5rem;">
                        <li>Your assets, liabilities, income, and expenses</li>
                        <li>Financial ratios and what they mean</li>
                        <li>Suggestions for improvement</li>
                        <li>Analysis of your financial health</li>
                    </ul>
                    <p style="margin-top: 0.5rem;">What would you like to know about your finances?</p>
                </div>
            `;
            messagesContainer.appendChild(newWelcomeMessage);
        }
    }

    async handleChatbotSend() {
        const inputField = document.getElementById('chatbotInput');
        const sendBtn = document.getElementById('chatbotSend');
        const loadingIndicator = document.getElementById('chatbotLoading');

        if (!inputField || !sendBtn) return;

        const userMessage = inputField.value.trim();
        if (!userMessage) return;

        // Add user message to chat
        this.addChatbotMessage(userMessage, true);
        inputField.value = '';

        // Disable input while processing
        inputField.disabled = true;
        sendBtn.disabled = true;
        if (loadingIndicator) loadingIndicator.style.display = 'block';

        try {
            // Get AI response
            const aiResponse = await this.sendChatbotMessage(userMessage);
            this.addChatbotMessage(aiResponse, false);
        } catch (error) {
            console.error('Error getting AI response:', error);
            this.addChatbotMessage('Sorry, I encountered an error. Please try again.', false);
        } finally {
            // Re-enable input
            inputField.disabled = false;
            sendBtn.disabled = false;
            if (loadingIndicator) loadingIndicator.style.display = 'none';
            inputField.focus();
        }
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const updateViewportHeightVar = () => {
        const h = window.visualViewport ? window.visualViewport.height : window.innerHeight;
        const vh = h * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
    };
    updateViewportHeightVar();
    window.addEventListener('resize', updateViewportHeightVar);
    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', updateViewportHeightVar);
    }
    window.financeTracker = new FinanceTracker();
});
