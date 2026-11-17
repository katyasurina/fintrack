# FinTrack — сервіс трекінгу особистих фінансів

Стек: **PostgreSQL** · **Node.js + Express** · **node-postgres (pg)** · HTML/CSS/JS без фреймворків (графіки — власний SVG).

## Запуск

1. Встановіть Node.js 18+ та PostgreSQL 14+.
2. Створіть базу: `createdb fintrack` (або через pgAdmin).
3. Скопіюйте `.env.example` → `.env` і вкажіть свій `DATABASE_URL`.
4. Встановіть залежності та ініціалізуйте БД:
   ```
   npm install
   npm run db:init     # виконує db/schema.sql та db/seed.sql
   npm start
   ```
5. Відкрийте http://localhost:3000

## Структура

| Шлях | Призначення |
|---|---|
| `db/schema.sql` | 8 таблиць, обмеження, індекси, VIEW, тригер балансу, функція переказу |
| `db/seed.sql` | тестові дані (3 користувачі, 6 рахунків, ~60 операцій) |
| `server/db.js` | пул підключень, обгортка транзакцій |
| `server/index.js` | REST API |
| `public/` | інтерфейс (index.html, styles.css, app.js) |

## Зв'язок з лабораторними

- Лаб. 4: 8 сутностей, зв'язки 1:N та M:N (`transaction_tags`).
- Лаб. 5: запити «витрати за категоріями», «перевищення бюджету», «місяць з мін. витратами», «топ витрат» — у `/api/summary`.
- Лаб. 6: `accounts.account_type`, таблиця `goals` з `goal_status` та `priority`.
- Лаб. 7: `view_account_balances`, переказ між рахунками в одній транзакції (`transfer_funds`).
