# e-COM Expense Tracker — Administrator Web App

Standalone **Administrator** portal for **e-COM Services**, replacing the hand-typed Excel workbook (`docs/expenditure.xlsx`, *"Expenditure Tracker"*). Deployed on its own domain (`admin.expenses.ecom.com`), completely separate from the employee web application.

## Scope & Architecture

- **Admin-only application**: Manages users, categories, the item catalog (including employee suggestions & duplicate merging), all expense records, petty cash ledger & opening balances, monthly/annual reports, Excel/PDF exports, dry-run `.xlsx` data imports, and organisation settings.
- **Zero shared frontend code with the employee app**: The two apps communicate exclusively via the shared REST API.
- **Bearer-token authentication**: Uses `Authorization: Bearer <token>` headers (no cross-domain cookies). Non-administrator accounts receive `403 { code: "employee_account" }` and are directed to `VITE_EMPLOYEE_APP_URL`.
- **30-minute idle timeout**: Automatically warns after 30 minutes of inactivity and signs out after a 60-second countdown.
- **Exact money math**: All arithmetic is computed in integer pesewas (`1 GHS = 100 pesewas`) and formatted as `GH₵ 1,250.00` via `Intl.NumberFormat`.

## Folder Structure

```text
expense-tracker-admin/
├── docs/
│   ├── expenditure.xlsx          # Source legacy spreadsheet
│   └── import-report.md          # Generated anomaly report (76 anomalies)
├── scripts/
│   └── import-xlsx.ts            # CLI importer (ExcelJS -> src/mocks/seed/ + docs/import-report.md)
└── src/
    ├── api/                      # Axios client, query keys, typed TanStack Query hooks
    ├── components/
    │   ├── layout/               # Sidebar, AppShell, IdleTimeout dialog
    │   ├── shared/               # PageHeader, StatCard, DataTable, ConfirmDialog, CurrencyText, UserChip
    │   └── ui/                   # Button, Input, Select, Dialog, Switch, Tabs, Badge, OptionCard, Combobox
    ├── features/
    │   ├── auth/                 # LoginPage (split layout, employee_account redirect message)
    │   ├── dashboard/            # DashboardPage (KPIs, category donut, monthly trend, recent records)
    │   ├── expenses/             # ExpensesPage, ExpenseDetailsPage, ExpenseFormPage (+ Quick Entry)
    │   ├── petty-cash/           # PettyCashPage (5 sheet figures, running balance ledger, opening balance)
    │   ├── reports/              # ReportsPage (Monthly & Annual tabs, tracker Excel & PDF export)
    │   ├── categories/           # CategoriesPage (@dnd-kit reorder), CategoryFormPage
    │   ├── items/                # ItemsPage (All & Pending tabs, Approve/Reject/Merge dialog)
    │   ├── users/                # UsersPage, UserFormPage (self-deactivation/demotion guard)
    │   ├── import/               # ImportPage (browser dry-run preview, anomaly filter, CSV export)
    │   └── settings/             # SettingsPage (profile, avatar, password, organisation settings)
    ├── hooks/                    # useDebounce, useIdleTimeout
    ├── lib/
    │   ├── exporters/            # trackerWorkbook.ts (original 5-col block layout), expensesWorkbook.ts, pdfReport.ts
    │   ├── formatters/           # Date, month, number, and label helpers
    │   ├── importer/             # Shared parser: parseLegacyAmount, parseLegacyDate, parseExpenditureSheet
    │   ├── money/                # Integer pesewa calculations & currency formatting
    │   └── reports/              # Period math, petty cash formulas, monthly & annual aggregation
    ├── mocks/
    │   ├── seed/                 # Seed JSON generated from docs/expenditure.xlsx + demo users/suggestions
    │   ├── db.ts                 # localStorage-backed mock database
    │   ├── service.ts            # Pure domain service logic
    │   └── handlers.ts           # MSW v3 HTTP handlers
    ├── routes/                   # React Router v7 routes & RequireAdmin guard
    ├── stores/                   # Zustand stores (auth token/user, light/dark theme, mobile drawer)
    └── types/                    # Strict TypeScript domain & API contracts
```

## Setup & Scripts

```bash
# 1. Copy environment variables
cp .env.example .env

# 2. Parse docs/expenditure.xlsx into src/mocks/seed/*.json and docs/import-report.md
npm run import:xlsx

# 3. Start development server (http://localhost:5174)
npm run dev

# 4. Run typecheck, linter, unit tests, and production build
npm run typecheck
npm run lint
npm test
npm run build
```

### Demo Credentials

- **Administrator**: `admin@ecom.com` / `password123`
- **Employee (tests `403 employee_account` redirect notice)**: `efua@ecom.com` / `password123`

## Environment Variables

| Variable | Description | Example |
|---|---|---|
| `VITE_API_BASE_URL` | Base URL of the shared REST API (no trailing slash). Leave empty in mock mode. | `https://api.expenses.ecom.com` |
| `VITE_USE_MOCKS` | `"true"` enables the in-browser MSW mock server seeded from `src/mocks/seed/`. Set `"false"` for the real backend. | `true` |
| `VITE_EMPLOYEE_APP_URL` | Public URL of the separate employee web app (linked when an employee attempts to sign in here). | `https://expenses.ecom.com` |

## Switching from Mocks to the Real API

1. Set `VITE_USE_MOCKS=false` and `VITE_API_BASE_URL=https://api.expenses.ecom.com` in `.env`.
2. Ensure the backend implements the endpoints documented in `src/api/` and returns `403 { "code": "employee_account", "message": "Employee accounts sign in on the employee site" }` when a non-admin authenticates against `/api/auth/login` or `/api/auth/me`.

## CORS Requirements (Separate Admin & Employee Domains)

Because the Administrator app (`https://admin.expenses.ecom.com`) and the Employee app (`https://expenses.ecom.com`) are hosted on separate origins and authenticate via Bearer tokens (`withCredentials: false`):

- **`Access-Control-Allow-Origin`**: Must explicitly allow both `https://admin.expenses.ecom.com` and `https://expenses.ecom.com` (plus `http://localhost:5174` and `http://localhost:5173` in development).
- **`Access-Control-Allow-Headers`**: `Authorization, Content-Type, Accept`
- **`Access-Control-Allow-Methods`**: `GET, POST, PUT, DELETE, OPTIONS`
- **`Access-Control-Expose-Headers`**: `Content-Disposition` (if downloads are served from the backend).

## Assumptions Recorded

1. **Month Block Authority**: When a date cell in `docs/expenditure.xlsx` disagrees with its 5-column month block (e.g., `2025-02-25` inside February 2026, `2028-08-31` inside August 2026, or June dates pasted into the May/September blocks), the month block is used for the year and month while preserving the day-of-month, and a `month_mismatch` warning is logged in `docs/import-report.md`.
2. **Text Date Ranges**: Entries like `"12-13/03/2026"` use the first day (`2026-03-12`) and are flagged as `odd_date` + `text_date`. Malformed years like `"09/06/206"` take the year from the sheet (`2026`) and are flagged.
3. **Never Invent Missing Values**: Row `Sheet1!AV26:AZ26` (October Electricity) has a unit price (`Ghc 1010`) without a quantity or date; it is skipped and logged as an `error` (`missing_value`).
4. **Petty Cash Opening Balance**: Derived as `GH₵ 930.25` for January 2026 from the sheet's first *Balance after cash-out* (`GH₵ 792.23` on `2026-01-08`) plus cash-out (`GH₵ 138.02`) on that date, and editable via the **Set opening balance** dialog.
5. **Cross-Category Duplicate Items**: `"Funnel"` appears under both *Cleaning & Hygiene Supplies* (`B64`) and *Other* (`B124`); de-duplication is scoped per category so both are preserved and flagged so the admin can merge them if desired.
