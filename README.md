# LiraTrack

LiraTrack is a full-stack personal finance app built for the Lebanese market. It helps users track cash, cards, wallets, expenses, income, and net worth across USD and LBP while keeping exchange-rate context visible throughout the experience.

The app is designed around real Lebanese money habits: mixed-currency spending, cash wallets, card balances, USD-equivalent net worth, and the need to understand LBP values through current market rates.

## Features

- User authentication with email/password, Google sign-in, email verification, password reset, optional two-factor authentication, and account deletion.
- Guided onboarding flow for new users, including profile completion for Google sign-in users.
- Wallet tracking for cash, Visa, Mastercard, Meza, USD wallets, and LBP wallets.
- Native USD and LBP support with USD-equivalent reporting.
- Exchange-rate integration with automatic rate refresh and fallback providers.
- Dashboard summary for net worth, wallet totals, latest rate, expected income, expected expenses, and projected savings.
- Transaction tracking with income and expense categories.
- Pending transaction review queue for imported, scanned, scheduled, or drafted transactions.
- Receipt OCR flow for extracting transaction details from uploaded receipts.
- SMS parsing support for creating transaction drafts from bank/card messages.
- Recurring transaction schedules for monthly or repeated financial activity.
- Category and tag organization for clearer spending breakdowns.
- Wallet detail pages with wallet-specific transaction history.
- PDF export support for financial reporting.
- Bilingual interface support for English and Arabic.
- Dockerized frontend, backend, and PostgreSQL services.
- Production-oriented CORS, origin checks, and security headers.

## Lebanese Market Focus

LiraTrack is built around problems Lebanese users deal with daily:

- keeping separate USD and LBP balances understandable
- converting LBP activity into a USD-equivalent net worth
- tracking cash-heavy spending
- handling wallets, cards, and bank-style accounts together
- showing the exchange rate used for calculations
- supporting Arabic labels and bilingual usage
- reviewing receipt and SMS-based transaction drafts before saving them

## Tech Stack

Frontend:

- Next.js
- React
- TypeScript
- Tailwind CSS
- Axios
- Lucide icons
- jsPDF

Backend:

- FastAPI
- SQLAlchemy
- Alembic
- PostgreSQL
- PyJWT
- Passlib / bcrypt
- PyOTP
- PaddleOCR
- APScheduler
- HTTPX

Infrastructure:

- Docker
- Docker Compose
- PostgreSQL 16

## Project Structure

```text
.
|-- app/                  # FastAPI application
|   |-- api/              # API routers
|   |-- core/             # config, security, database, middleware
|   |-- models/           # SQLAlchemy models
|   |-- schemas/          # Pydantic schemas
|   `-- services/         # business logic and integrations
|-- alembic/              # database migrations
|-- backend/              # backend Dockerfiles
|-- frontend/             # Next.js app
|-- scripts/              # local development helpers
|-- docker-compose.yml
|-- docker-compose.dev.yml
`-- requirements.txt
```

## Local Development

Create a local `.env` file from `.env.example` and fill in the required values.

Start the development stack:

```powershell
docker compose -f docker-compose.dev.yml up --build -d
```

Open the app:

```text
http://localhost:3000
```

Backend health check:

```text
http://localhost:8000/health
```

Stop the stack:

```powershell
docker compose -f docker-compose.dev.yml down
```

## Security

LiraTrack includes:

- signed JWT access and refresh tokens
- signed Google OAuth state
- email verification
- optional TOTP-based two-factor authentication
- password hashing with bcrypt
- restricted CORS configuration
- origin checks for state-changing requests
- security headers for browser protection
- production startup validation for required configuration

## Status

This project is a portfolio project and demonstrates a complete full-stack finance product: authentication, financial data modeling, exchange-rate handling, OCR, recurring schedules, responsive UI, bilingual support, and containerized deployment.
