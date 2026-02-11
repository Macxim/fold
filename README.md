# Fold - Multi-Asset Portfolio Tracker

Fold is a modern, responsive multi-asset portfolio tracking application. It allows users to track their investments across Crypto, Stocks, and Bank accounts in one unified dashboard with real-time pricing and historical performance tracking.

## 🚀 Features

- **Multi-Asset Support**: Track Crypto (via CoinGecko), Stocks (via Yahoo Finance), and Bank account balances.
- **Real-Time Pricing**: Automatic price updates for crypto and stocks with batch fetching for efficiency.
- **Portfolio Analytics**:
  - Total portfolio value in USD/EUR.
  - Interactive asset allocation charts (Pie/Bar).
  - Historical performance graph (Line chart).
- **History Tracking**: Automatically syncs daily portfolio value to Supabase for long-term tracking.
- **Dynamic UI**: Responsive design with liquid layouts, glassmorphism effects, and dark mode support.
- **Multi-Currency Support**: Switch between USD and EUR for your total portfolio view.

## 🛠 Tech Stack

- **Framework**: [Next.js 15+](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Database/Backend**: [Supabase](https://supabase.com/) (Auth, Database, RLS)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **Charts**: [Recharts](https://recharts.org/)
- **Testing**: [Vitest](https://vitest.dev/) & [Testing Library](https://testing-library.com/)

## 🏁 Getting Started

### Prerequisites

- Node.js (Latest LTS recommended)
- A Supabase project

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd fold
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure Environment Variables:
   Create a `.env.local` file in the root directory:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your-project-url
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your-anon-key
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 🧪 Testing

The project uses Vitest for unit and component testing.

```bash
# Run tests once
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## 🔐 Database Security

This project uses Row Level Security (RLS) in Supabase. Ensure you have the following tables in your `public` schema:
- `portfolio_assets`
- `portfolio_history`

Proper RLS policies are required to allow the application to securely interact with these tables.
