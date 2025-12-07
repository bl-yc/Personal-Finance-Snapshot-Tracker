# Personal Finance Snapshot Tracker

A sophisticated, client-side personal finance web application that empowers users to maintain comprehensive financial snapshots, perform detailed financial analysis, and gain AI-powered insights into their money management. Track your entire financial picture with advanced categorization, real-time calculations, interactive visualizations, and intelligent financial guidance.

## 🌟 Key Features

### 📊 Advanced Financial Tracking
- **Multi-Snapshot Management**: Create, rename, duplicate, and switch between different financial periods
- **Comprehensive Categorization**:
  - **Assets**: 7 categories including Cash Equivalents, Investments, Retirement, Property, Vehicles, Insurance, and Other Assets
  - **Liabilities**: 3 term-based categories (Short-term, Medium-term, Long-term)
  - **Income**: 4 sources (Employment, Business/Self-Employment, Passive, Other)
  - **Expenses**: 4 priority levels (Essential/Fixed, Variable/Living, Discretionary/Lifestyle, Other)
- **Liquidity Tracking**: Classify assets as High, Medium, or Low liquidity with smart guidance
- **Smart Categorization**: Built-in examples and validation for each financial category

### 🧮 Financial Analysis Dashboard
- **Real-Time Summary Calculations**: Net Worth, Monthly Cash Flow, Savings Rate
- **Interactive Pie Charts**: Visual breakdown of assets, liabilities, income, and expenses by category
- **Comprehensive Financial Ratios**:
  - **Basic Liquidity Ratio**: Emergency fund coverage (months of expenses)
  - **Debt-to-Asset Ratio**: Financial leverage assessment
  - **Solvency Ratio**: Long-term financial stability measure
  - **Savings Ratio**: Monthly savings percentage
  - **Liquid Assets to Net Worth Ratio**: Emergency preparedness indicator
- **Color-Coded Indicators**: Visual health assessment for all financial metrics

### 🤖 AI-Powered Financial Assistant
- **Personal Finance Chatbot**: Get personalized insights about your financial data
- **Context-Aware Analysis**: AI understands your complete financial snapshot
- **OpenAI-Compatible APIs**: Support for various AI providers (OpenAI, DeepSeek, etc.)
- **Intelligent Questions**: Ask about ratios, trends, improvement suggestions, and more
- **Privacy-First**: All AI processing happens through your configured API key

### 📋 Advanced Data Management
- **Excel-Style Tables**: Sort, filter, and resize columns in data tables
- **Bulk Edit Mode**: Efficiently modify multiple items with inline editing
- **Advanced Filtering**: Text search, range filters, category filters with autocomplete
- **Import/Export**: JSON-based data backup and restoration
- **Search & Sort Snapshots**: Find and organize your financial history
- **Column Resizing**: Customize table layouts to your preferences

### 📱 Responsive Design & Accessibility
- **Mobile-Optimized**: Full functionality on phones, tablets, and desktops
- **Progressive Web App**: Installable, works offline, fast loading
- **Accessibility Features**: Screen reader support, keyboard navigation, high contrast modes
- **Touch-Friendly**: Optimized for mobile interaction patterns

## 🚀 Getting Started

### Prerequisites
- Modern web browser (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)
- Internet connection (optional, for AI assistant features)

### Quick Start Guide

1. **Launch the Application**
   ```bash
   # Clone or download the repository
   # Navigate to the Finance_Website folder
   # Open index.html in your web browser
   ```

2. **Create Your First Snapshot**
   - Click "New Snapshot" in the left sidebar
   - Name your financial snapshot (e.g., "Current Month")

3. **Add Your Financial Data**
   - **Assets**: Add your savings, investments, property, etc.
   - **Liabilities**: Record debts with appropriate terms
   - **Income**: Log all income sources with categories
   - **Expenses**: Track spending across priority levels

4. **Explore Financial Insights**
   - View real-time summaries and ratios
   - Review pie charts for visual breakdowns
   - Ask the AI assistant for personalized advice
   - Export data regularly for backup

5. **Manage Multiple Snapshots**
   - Create new snapshots for different periods
   - Compare financial progress over time
   - Search and sort your snapshot history

### AI Assistant Setup
1. Click the chatbot icon (🤖) in the bottom-right corner
2. Click the settings gear (⚙️) to open configuration
3. Enter your OpenAI-compatible API key and endpoint details
4. Test the connection and start asking financial questions

## 🛠️ Technical Architecture

### Core Technologies
- **Frontend Framework**: Vanilla JavaScript (ES6+) with object-oriented architecture
- **UI Rendering**: Dynamic HTML generation with CSS Grid and Flexbox
- **Data Visualization**: Chart.js for interactive financial charts
- **State Management**: In-memory JavaScript objects with localStorage persistence
- **API Integration**: Fetch API for AI assistant communication

### Key Classes & Components
- **FinanceTracker**: Main application controller and state manager
- **Chart Management**: Dynamic chart creation and destruction handling
- **Table Engine**: Advanced sorting, filtering, and editing capabilities
- **AI Assistant**: Context-aware financial advice generation
- **Data Validation**: Real-time input validation and error handling

### Data Structure
```javascript
{
  snapshots: [{
    id: "unique_id",
    label: "Snapshot Name",
    createdAt: "2025-01-01T00:00:00.000Z",
    data: {
      assets: [{ name, amount, category, liquidity }],
      liabilities: [{ name, amount, term }],
      incomes: [{ name, amount, category }],
      expenses: [{ name, amount, category }]
    }
  }]
}
```

## 🔒 Privacy & Security

### Data Storage
- **Client-Side Only**: All financial data stored locally in browser LocalStorage
- **Zero External Transmission**: No data sent to external servers unless you configure AI assistant
- **Export Control**: Full data export and import capabilities
- **Clear Data Option**: Completely remove all stored data with one click

### AI Assistant Privacy
- **API Key Management**: Your API keys never leave your browser
- **Contextual Data**: Only anonymized financial summaries sent to AI providers
- **No Personal Information**: Application doesn't collect or store personal details
- **Provider Choice**: Use any OpenAI-compatible API provider

## 📊 Financial Ratios Reference

| Ratio | Formula | Target Range | Interpretation |
|-------|---------|--------------|----------------|
| **Basic Liquidity** | Cash ÷ Monthly Expenses | 3-6 months | Emergency fund coverage |
| **Debt-to-Asset** | Debt ÷ Assets | < 20% | Financial leverage level |
| **Solvency** | Net Worth ÷ Assets | > 20% | Long-term stability |
| **Savings** | Savings ÷ Income | > 20% | Monthly savings rate |
| **Liquid Assets** | Liquid Assets ÷ Net Worth | > 20% | Emergency preparedness |

## 🤝 Contributing

### Development Setup
1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/Personal-Finance-Snapshot-Tracker.git`
3. Navigate to project folder: `cd Personal-Finance-Snapshot-Tracker/Finance_Website`
4. Open in browser: Open `index.html` directly

### Guidelines
- **Code Style**: Follow JavaScript ES6+ standards
- **Comments**: Document complex financial calculations
- **Testing**: Test all calculations with various data scenarios
- **Performance**: Ensure smooth operation with large datasets
- **Privacy**: Never compromise client-side data security

### Feature Requests & Bug Reports
- Use GitHub Issues for feature requests and bug reports
- Include browser/version, steps to reproduce, and expected behavior
- For financial calculation bugs, include sample data and expected results

## 📈 Roadmap & Future Enhancements

- **Advanced Analytics**: Trend analysis across multiple snapshots
- **Budget Planning**: Automated budgeting based on historical data
- **Investment Tracking**: Performance metrics and portfolio analysis
- **Goal Setting**: Financial goal tracking with progress visualization
- **Multi-Currency**: Support for international users
- **Collaborative Features**: Shared snapshots for couples/families

## 📄 License

This project is open-source and available for personal use.

## 🙏 Acknowledgments

- Built with vanilla JavaScript for maximum compatibility
- Chart.js for beautiful data visualizations
- OpenAI API ecosystem for intelligent financial insights
- Inspired by personal finance management principles
- Designed for accessibility and privacy-first principles

---

**Made with ❤️** by someone who believes everyone deserves clear financial clarity.

*Found a bug or have an idea? [Send feedback](mailto:hello@myfinsnap.com)*
