'use strict';
const path = require('path');
const express = require('express');
const { query, withTransaction, pool } = require('./db');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

/* ------------------------------------------------------------------ */
/* Допоміжні функції                                                    */
/* ------------------------------------------------------------------ */
class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const isDate = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
const isMonth = (s) => typeof s === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(s);
const positive = (v) => Number.isFinite(Number(v)) && Number(v) > 0;
const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

/** Визначає поточного користувача за заголовком X-User-Id. */
const auth = wrap(async (req, _res, next) => {
  const id = parseInt(req.get('X-User-Id'), 10);
  if (!id) throw new HttpError(401, 'Оберіть профіль користувача');
  const { rows } = await query('SELECT user_id FROM users WHERE user_id = $1', [id]);
  if (!rows.length) throw new HttpError(401, 'Користувача не знайдено');
  req.uid = id;
  next();
});

/* ------------------------------------------------------------------ */
/* Користувачі та довідники                                             */
/* ------------------------------------------------------------------ */
app.get('/api/users', wrap(async (_req, res) => {
  const { rows } = await query('SELECT user_id, email, full_name FROM users ORDER BY user_id');
  res.json(rows);
}));

app.post('/api/users', wrap(async (req, res) => {
  const email = str(req.body.email, 120).toLowerCase();
  const full_name = str(req.body.full_name, 100);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new HttpError(400, 'Некоректний email');
  if (full_name.length < 2) throw new HttpError(400, 'Вкажіть ім’я');
  const { rows } = await query(
    'INSERT INTO users (email, full_name) VALUES ($1,$2) RETURNING user_id, email, full_name',
    [email, full_name]
  );
  res.status(201).json(rows[0]);
}));

app.get('/api/meta', wrap(async (_req, res) => {
  const [cats, tags] = await Promise.all([
    query('SELECT category_id, name, type FROM categories ORDER BY type DESC, name'),
    query('SELECT tag_id, name FROM tags ORDER BY name'),
  ]);
  res.json({ categories: cats.rows, tags: tags.rows });
}));

app.post('/api/categories', auth, wrap(async (req, res) => {
  const name = str(req.body.name, 60);
  const type = req.body.type;
  if (!name) throw new HttpError(400, 'Вкажіть назву категорії');
  if (!['INCOME', 'EXPENSE'].includes(type)) throw new HttpError(400, 'Невірний тип категорії');
  const { rows } = await query(
    'INSERT INTO categories (name, type) VALUES ($1,$2) RETURNING category_id, name, type',
    [name, type]
  );
  res.status(201).json(rows[0]);
}));

/* ------------------------------------------------------------------ */
/* Рахунки                                                              */
/* ------------------------------------------------------------------ */
app.get('/api/accounts', auth, wrap(async (req, res) => {
  const { rows } = await query(
    `SELECT account_id, account_name, balance, currency, account_type
     FROM view_account_balances WHERE user_id = $1 ORDER BY account_id`,
    [req.uid]
  );
  res.json(rows);
}));

app.post('/api/accounts', auth, wrap(async (req, res) => {
  const account_name = str(req.body.account_name, 80);
  const currency = str(req.body.currency || 'UAH', 3).toUpperCase();
  const account_type = req.body.account_type || 'STANDARD';
  const balance = Number(req.body.balance || 0);
  if (!account_name) throw new HttpError(400, 'Вкажіть назву рахунку');
  if (!/^[A-Z]{3}$/.test(currency)) throw new HttpError(400, 'Валюта — 3 літери, напр. UAH');
  if (!Number.isFinite(balance)) throw new HttpError(400, 'Некоректний баланс');
  const { rows } = await query(
    `INSERT INTO accounts (user_id, account_name, balance, currency, account_type)
     VALUES ($1,$2,$3,$4,$5)
     RETURNING account_id, account_name, balance, currency, account_type`,
    [req.uid, account_name, balance, currency, account_type]
  );
  res.status(201).json(rows[0]);
}));

app.put('/api/accounts/:id', auth, wrap(async (req, res) => {
  const account_name = str(req.body.account_name, 80);
  if (!account_name) throw new HttpError(400, 'Вкажіть назву рахунку');
  const { rows } = await query(
    `UPDATE accounts SET account_name = $1, account_type = $2
     WHERE account_id = $3 AND user_id = $4
     RETURNING account_id, account_name, balance, currency, account_type`,
    [account_name, req.body.account_type || 'STANDARD', req.params.id, req.uid]
  );
  if (!rows.length) throw new HttpError(404, 'Рахунок не знайдено');
  res.json(rows[0]);
}));

app.delete('/api/accounts/:id', auth, wrap(async (req, res) => {
  const { rowCount } = await query(
    'DELETE FROM accounts WHERE account_id = $1 AND user_id = $2',
    [req.params.id, req.uid]
  );
  if (!rowCount) throw new HttpError(404, 'Рахунок не знайдено');
  res.status(204).end();
}));

/** Переказ між рахунками — виконується в одній транзакції БД. */
app.post('/api/transfer', auth, wrap(async (req, res) => {
  const from = parseInt(req.body.from, 10);
  const to = parseInt(req.body.to, 10);
  const amount = Number(req.body.amount);
  if (!positive(amount)) throw new HttpError(400, 'Сума має бути додатною');
  await withTransaction(async (c) => {
    const { rows } = await c.query(
      `SELECT account_id, currency FROM accounts
       WHERE user_id = $1 AND account_id = ANY($2::int[]) FOR UPDATE`,
      [req.uid, [from, to]]
    );
    if (rows.length !== 2) throw new HttpError(404, 'Рахунок не знайдено');
    if (rows[0].currency !== rows[1].currency)
      throw new HttpError(400, 'Переказ можливий лише між рахунками однієї валюти');
    await c.query('SELECT transfer_funds($1,$2,$3)', [from, to, amount]);
  });
  res.json({ ok: true });
}));

/* ------------------------------------------------------------------ */
/* Транзакції                                                           */
/* ------------------------------------------------------------------ */
const TX_SELECT = `
  SELECT t.transaction_id AS id, t.amount, t.transaction_date AS date, t.description,
         c.category_id, c.name AS category, c.type,
         a.account_id, a.account_name AS account, a.currency,
         COALESCE(array_agg(tg.name ORDER BY tg.name) FILTER (WHERE tg.name IS NOT NULL), '{}') AS tags
  FROM transactions t
  JOIN accounts   a ON a.account_id  = t.account_id
  JOIN categories c ON c.category_id = t.category_id
  LEFT JOIN transaction_tags tt ON tt.transaction_id = t.transaction_id
  LEFT JOIN tags tg ON tg.tag_id = tt.tag_id`;

function txFilters(req) {
  const where = ['a.user_id = $1'];
  const params = [req.uid];
  const add = (sql, val) => { params.push(val); where.push(sql.replace(/\?/g, `$${params.length}`)); };
  const q = req.query;
  if (q.q) add('(t.description ILIKE ? OR c.name ILIKE ?)', `%${String(q.q).slice(0, 60)}%`);
  if (['INCOME', 'EXPENSE'].includes(q.type)) add('c.type = ?', q.type);
  if (parseInt(q.category, 10)) add('c.category_id = ?', parseInt(q.category, 10));
  if (parseInt(q.account, 10)) add('a.account_id = ?', parseInt(q.account, 10));
  if (isDate(q.from)) add('t.transaction_date >= ?', q.from);
  if (isDate(q.to)) add('t.transaction_date <= ?', q.to);
  return { where: where.join(' AND '), params };
}

app.get('/api/transactions', auth, wrap(async (req, res) => {
  const { where, params } = txFilters(req);
  const W = where;
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 200);
  const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
  const [rows, total] = await Promise.all([
    query(
      `${TX_SELECT} WHERE ${W}
       GROUP BY t.transaction_id, c.category_id, a.account_id
       ORDER BY t.transaction_date DESC, t.transaction_id DESC
       LIMIT ${limit} OFFSET ${offset}`,
      params
    ),
    query(
      `SELECT COUNT(*)::int AS n FROM transactions t
       JOIN accounts a ON a.account_id = t.account_id
       JOIN categories c ON c.category_id = t.category_id WHERE ${W}`,
      params
    ),
  ]);
  res.json({ items: rows.rows, total: total.rows[0].n });
}));

app.get('/api/transactions/export.csv', auth, wrap(async (req, res) => {
  const { where, params } = txFilters(req);
  const { rows } = await query(
    `${TX_SELECT} WHERE ${where}
     GROUP BY t.transaction_id, c.category_id, a.account_id
     ORDER BY t.transaction_date DESC, t.transaction_id DESC`,
    params
  );
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = ['Дата,Тип,Категорія,Рахунок,Сума,Валюта,Опис,Теги'];
  for (const r of rows) {
    lines.push([
      r.date, r.type === 'INCOME' ? 'Дохід' : 'Витрата', r.category, r.account,
      r.amount, r.currency, r.description, r.tags.join('; '),
    ].map(esc).join(','));
  }
  res.set('Content-Type', 'text/csv; charset=utf-8');
  res.set('Content-Disposition', 'attachment; filename="fintrack-transactions.csv"');
  res.send('\uFEFF' + lines.join('\r\n'));
}));

app.post('/api/transactions', auth, wrap(async (req, res) => {
  const b = req.body;
  const amount = Number(b.amount);
  const date = b.date || new Date().toISOString().slice(0, 10);
  const tags = Array.isArray(b.tags)
    ? [...new Set(b.tags.map((t) => str(t, 40).toLowerCase()).filter(Boolean))].slice(0, 10)
    : [];
  if (!positive(amount)) throw new HttpError(400, 'Сума має бути додатною');
  if (!isDate(date)) throw new HttpError(400, 'Некоректна дата');

  const id = await withTransaction(async (c) => {
    const acc = await c.query(
      `SELECT account_id, balance, account_type FROM accounts
       WHERE account_id = $1 AND user_id = $2 FOR UPDATE`,
      [b.account_id, req.uid]
    );
    if (!acc.rows.length) throw new HttpError(404, 'Рахунок не знайдено');
    const cat = await c.query('SELECT type FROM categories WHERE category_id = $1', [b.category_id]);
    if (!cat.rows.length) throw new HttpError(404, 'Категорію не знайдено');
    const a = acc.rows[0];
    if (cat.rows[0].type === 'EXPENSE' && a.account_type !== 'CREDIT' && Number(a.balance) < amount)
      throw new HttpError(400, 'Недостатньо коштів на рахунку');

    const ins = await c.query(
      `INSERT INTO transactions (account_id, category_id, amount, transaction_date, description)
       VALUES ($1,$2,$3,$4,$5) RETURNING transaction_id`,
      [b.account_id, b.category_id, amount, date, str(b.description, 255) || null]
    );
    const txId = ins.rows[0].transaction_id;
    for (const name of tags) {
      const tg = await c.query(
        `INSERT INTO tags (name) VALUES ($1)
         ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING tag_id`,
        [name]
      );
      await c.query(
        'INSERT INTO transaction_tags (transaction_id, tag_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
        [txId, tg.rows[0].tag_id]
      );
    }
    return txId;
  });
  res.status(201).json({ id });
}));

app.delete('/api/transactions/:id', auth, wrap(async (req, res) => {
  const { rowCount } = await query(
    `DELETE FROM transactions t USING accounts a
     WHERE t.transaction_id = $1 AND a.account_id = t.account_id AND a.user_id = $2`,
    [req.params.id, req.uid]
  );
  if (!rowCount) throw new HttpError(404, 'Операцію не знайдено');
  res.status(204).end();
}));

/* ------------------------------------------------------------------ */
/* Цілі накопичення                                                     */
/* ------------------------------------------------------------------ */
app.get('/api/goals', auth, wrap(async (req, res) => {
  const { rows } = await query(
    `SELECT goal_id, title, target_amount, current_amount, deadline, goal_status, priority
     FROM goals WHERE user_id = $1
     ORDER BY (goal_status = 'ACTIVE') DESC, priority, deadline NULLS LAST`,
    [req.uid]
  );
  res.json(rows);
}));

app.post('/api/goals', auth, wrap(async (req, res) => {
  const title = str(req.body.title, 100);
  const target = Number(req.body.target_amount);
  const current = Number(req.body.current_amount || 0);
  const priority = [1, 2, 3].includes(Number(req.body.priority)) ? Number(req.body.priority) : 2;
  const deadline = isDate(req.body.deadline) ? req.body.deadline : null;
  if (!title) throw new HttpError(400, 'Вкажіть назву цілі');
  if (!positive(target)) throw new HttpError(400, 'Цільова сума має бути додатною');
  if (!(current >= 0)) throw new HttpError(400, 'Накопичена сума не може бути від’ємною');
  const { rows } = await query(
    `INSERT INTO goals (user_id, title, target_amount, current_amount, deadline, priority)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING goal_id`,
    [req.uid, title, target, current, deadline, priority]
  );
  res.status(201).json(rows[0]);
}));

app.post('/api/goals/:id/contribute', auth, wrap(async (req, res) => {
  const amount = Number(req.body.amount);
  const account_id = Number(req.body.account_id);

  if (!positive(amount)) throw new HttpError(400, 'Сума має бути додатною');
  if (!account_id) throw new HttpError(400, 'Оберіть рахунок для поповнення');

  const result = await withTransaction(async (c) => {
    // 1. Перевіряємо, чи існує ціль і чи вона активна
    const goal = await c.query(
      `SELECT target_amount, current_amount, title FROM goals 
       WHERE goal_id = $1 AND user_id = $2 AND goal_status = 'ACTIVE' FOR UPDATE`,
      [req.params.id, req.uid]
    );
    if (!goal.rows.length) throw new HttpError(404, 'Активну ціль не знайдено');

    // 2. Перевіряємо, чи є достатньо грошей на рахунку (якщо це не кредитний)
    const acc = await c.query(
      `SELECT balance, account_type FROM accounts 
       WHERE account_id = $1 AND user_id = $2 FOR UPDATE`,
      [account_id, req.uid]
    );
    if (!acc.rows.length) throw new HttpError(404, 'Рахунок не знайдено');
    
    const account = acc.rows[0];
    if (account.account_type !== 'CREDIT' && Number(account.balance) < amount) {
      throw new HttpError(400, 'Недостатньо коштів на рахунку');
    }

    // 3. Створюємо транзакцію (витрата)
    // Знаходимо або створюємо категорію "Заощадження"
    let cat = await c.query(`SELECT category_id FROM categories WHERE name='Заощадження' AND type='EXPENSE'`);
    if (!cat.rows.length) {
      cat = await c.query(`INSERT INTO categories(name, type) VALUES('Заощадження', 'EXPENSE') RETURNING category_id`);
    }
    const category_id = cat.rows[0].category_id;

    await c.query(
      `INSERT INTO transactions (account_id, category_id, amount, transaction_date, description) 
       VALUES ($1, $2, $3, CURRENT_DATE, $4)`,
      [account_id, category_id, amount, `Поповнення цілі: ${goal.rows[0].title}`]
    );

    // 4. Оновлюємо ціль
    const updatedGoal = await c.query(
      `UPDATE goals 
       SET current_amount = current_amount + $1,
           goal_status = CASE WHEN current_amount + $1 >= target_amount THEN 'COMPLETED' ELSE goal_status END
       WHERE goal_id = $2 AND user_id = $3
       RETURNING goal_id, current_amount, goal_status`,
      [amount, req.params.id, req.uid]
    );

    return updatedGoal.rows[0];
  });

  res.json(result);
}));

app.put('/api/goals/:id', auth, wrap(async (req, res) => {
  const status = ['ACTIVE', 'COMPLETED', 'CANCELLED'].includes(req.body.goal_status)
    ? req.body.goal_status : null;
  if (!status) throw new HttpError(400, 'Невірний статус');
  const { rowCount } = await query(
    'UPDATE goals SET goal_status = $1 WHERE goal_id = $2 AND user_id = $3',
    [status, req.params.id, req.uid]
  );
  if (!rowCount) throw new HttpError(404, 'Ціль не знайдено');
  res.json({ ok: true });
}));

app.delete('/api/goals/:id', auth, wrap(async (req, res) => {
  const { rowCount } = await query(
    'DELETE FROM goals WHERE goal_id = $1 AND user_id = $2', [req.params.id, req.uid]);
  if (!rowCount) throw new HttpError(404, 'Ціль не знайдено');
  res.status(204).end();
}));

/* ------------------------------------------------------------------ */
/* Бюджети                                                              */
/* ------------------------------------------------------------------ */
const BUDGET_SQL = `
  SELECT b.budget_id, b.category_id, c.name AS category, b.limit_amount,
         b.period_start, b.period_end,
         COALESCE((
           SELECT SUM(t.amount) FROM transactions t
           JOIN accounts a ON a.account_id = t.account_id
           WHERE a.user_id = b.user_id AND t.category_id = b.category_id
             AND t.transaction_date BETWEEN b.period_start AND b.period_end
         ), 0) AS spent
  FROM budgets b JOIN categories c ON c.category_id = b.category_id
  WHERE b.user_id = $1`;

app.get('/api/budgets', auth, wrap(async (req, res) => {
  const { rows } = await query(`${BUDGET_SQL} ORDER BY b.period_start DESC, c.name`, [req.uid]);
  res.json(rows);
}));

app.put('/api/budgets/:id', auth, wrap(async (req, res) => {
  const { limit_amount } = req.body;
  if (!positive(limit_amount)) throw new HttpError(400, 'Ліміт має бути додатним');
  
  const { rows } = await query(
    `UPDATE budgets SET limit_amount = $1 
     WHERE budget_id = $2 AND user_id = $3 
     RETURNING budget_id, limit_amount`,
    [limit_amount, req.params.id, req.uid]
  );
  if (!rows.length) throw new HttpError(404, 'Бюджет не знайдено');
  res.json(rows[0]);
}));

app.post('/api/budgets', auth, wrap(async (req, res) => {
  const { category_id, limit_amount, period_start, period_end } = req.body;
  if (!positive(limit_amount)) throw new HttpError(400, 'Ліміт має бути додатним');
  if (!isDate(period_start) || !isDate(period_end) || period_end < period_start)
    throw new HttpError(400, 'Некоректний період');
  const cat = await query('SELECT type FROM categories WHERE category_id = $1', [category_id]);
  if (!cat.rows.length || cat.rows[0].type !== 'EXPENSE')
    throw new HttpError(400, 'Бюджет можна встановити лише для категорії витрат');
  const { rows } = await query(
    `INSERT INTO budgets (user_id, category_id, limit_amount, period_start, period_end)
     VALUES ($1,$2,$3,$4,$5) RETURNING budget_id`,
    [req.uid, category_id, limit_amount, period_start, period_end]
  );
  res.status(201).json(rows[0]);
}));

app.delete('/api/budgets/:id', auth, wrap(async (req, res) => {
  const { rowCount } = await query(
    'DELETE FROM budgets WHERE budget_id = $1 AND user_id = $2', [req.params.id, req.uid]);
  if (!rowCount) throw new HttpError(404, 'Бюджет не знайдено');
  res.status(204).end();
}));

/* ------------------------------------------------------------------ */
/* Зведення для головної сторінки                                       */
/* ------------------------------------------------------------------ */
app.get('/api/summary', auth, wrap(async (req, res) => {
  const now = new Date().toISOString().slice(0, 7);
  const month = isMonth(req.query.month) ? req.query.month : now;
  const monthStart = `${month}-01`;

  const cur = await query(
    `SELECT currency, SUM(balance) AS total, COUNT(*)::int AS n
     FROM accounts WHERE user_id = $1 GROUP BY currency ORDER BY (currency = 'UAH') DESC, n DESC`,
    [req.uid]
  );
  const currencies = cur.rows;
  const currency = /^[A-Z]{3}$/.test(req.query.cur || '')
    ? req.query.cur : (currencies[0] ? currencies[0].currency : 'UAH');

  // Використовуємо пряму підстановку для дат та валюти, щоб уникнути проблем з типами
  const own = `a.user_id = $1 AND a.currency = '${currency}'`;

  const [cmp, series, byCat, top, minMonth, budgets] = await Promise.all([
    // доходи/витрати вибраного та попереднього місяця
    query(
      `SELECT to_char(date_trunc('month', t.transaction_date), 'YYYY-MM') AS ym,
              COALESCE(SUM(t.amount) FILTER (WHERE c.type = 'INCOME'), 0)  AS income,
              COALESCE(SUM(t.amount) FILTER (WHERE c.type = 'EXPENSE'), 0) AS expense
       FROM transactions t JOIN accounts a ON a.account_id = t.account_id
       JOIN categories c ON c.category_id = t.category_id
       WHERE ${own}
         AND t.transaction_date >= ('${monthStart}'::date - interval '1 month')
         AND t.transaction_date <  ('${monthStart}'::date + interval '1 month')
       GROUP BY 1`,
      [req.uid]
    ),
    // динаміка за 6 місяців
    query(
      `SELECT to_char(m, 'YYYY-MM') AS ym,
              COALESCE(SUM(t.amount) FILTER (WHERE c.type = 'INCOME'), 0)  AS income,
              COALESCE(SUM(t.amount) FILTER (WHERE c.type = 'EXPENSE'), 0) AS expense
       FROM generate_series('${monthStart}'::date - interval '5 months', '${monthStart}'::date, interval '1 month') m
       LEFT JOIN transactions t ON date_trunc('month', t.transaction_date) = date_trunc('month', m)
            AND t.account_id IN (SELECT account_id FROM accounts WHERE user_id = $1 AND currency = '${currency}')
       LEFT JOIN categories c ON c.category_id = t.category_id
       GROUP BY m ORDER BY m`,
      [req.uid]
    ),
    // витрати за категоріями (запит 2 з лаб. №5)
    query(
      `SELECT c.name AS category, SUM(t.amount) AS total
       FROM transactions t JOIN accounts a ON a.account_id = t.account_id
       JOIN categories c ON c.category_id = t.category_id
       WHERE ${own} AND c.type = 'EXPENSE'
         AND date_trunc('month', t.transaction_date) = date_trunc('month', '${monthStart}'::date)
       GROUP BY c.name ORDER BY total DESC`,
      [req.uid]
    ),
    // найбільші витрати періоду (запит 5 з лаб. №5)
    query(
      `SELECT t.transaction_id AS id, t.description, t.amount, t.transaction_date AS date, c.name AS category
       FROM transactions t JOIN accounts a ON a.account_id = t.account_id
       JOIN categories c ON c.category_id = t.category_id
       WHERE ${own} AND c.type = 'EXPENSE'
         AND date_trunc('month', t.transaction_date) = date_trunc('month', '${monthStart}'::date)
       ORDER BY t.amount DESC LIMIT 3`,
      [req.uid]
    ),
    // місяць з найменшими витратами (запит 4 з лаб. №5)
    query(
      `SELECT to_char(t.transaction_date, 'YYYY-MM') AS ym, SUM(t.amount) AS total
       FROM transactions t JOIN accounts a ON a.account_id = t.account_id
       JOIN categories c ON c.category_id = t.category_id
       WHERE ${own} AND c.type = 'EXPENSE'
       GROUP BY 1 ORDER BY total ASC LIMIT 1`,
      [req.uid]
    ),
    // перевищення бюджетів (запит 3 з лаб. №5) - ВИПРАВЛЕНО
    query(`${BUDGET_SQL} 
           AND b.period_start <= ('${monthStart}'::date + interval '1 month' - interval '1 day')::date
           AND b.period_end >= '${monthStart}'::date 
           ORDER BY c.name`, [req.uid]),
  ]);

  // Статистика за весь час
  const allTime = await query(
    `SELECT 
       COUNT(DISTINCT to_char(transaction_date, 'YYYY-MM'))::int as months,
       COALESCE(SUM(t.amount) FILTER (WHERE c.type = 'INCOME'), 0) as total_income,
       COALESCE(SUM(t.amount) FILTER (WHERE c.type = 'EXPENSE'), 0) as total_expense
     FROM transactions t
     JOIN accounts a ON a.account_id = t.account_id
     JOIN categories c ON c.category_id = t.category_id
     WHERE a.user_id = $1`,
    [req.uid]
  );
  const all_time = {
    months: allTime.rows[0].months || 0,
    total_income: allTime.rows[0].total_income || 0,
    total_expense: allTime.rows[0].total_expense || 0,
  };

  const get = (ym) => cmp.rows.find((r) => r.ym === ym) || { income: 0, expense: 0 };
  const d = new Date(`${monthStart}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() - 1);
  const prev = get(d.toISOString().slice(0, 7));
  const curr = get(month);

  res.json({
    month, currency,
    currencies,
    balance: (currencies.find((c) => c.currency === currency) || { total: 0 }).total,
    income: curr.income, expense: curr.expense,
    prev_income: prev.income, prev_expense: prev.expense,
    series: series.rows, by_category: byCat.rows, top_expenses: top.rows,
    min_month: minMonth.rows[0] || null,
    budgets: budgets.rows, // <-- ПОВЕРНУЛИ БЮДЖЕТИ
    all_time: all_time
  });
}));

/* ------------------------------------------------------------------ */
/* Обробка помилок                                                      */
/* ------------------------------------------------------------------ */
app.use('/api', (_req, _res, next) => next(new HttpError(404, 'Маршрут не знайдено')));

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  let status = err.status || 500;
  let message = err.message;
  switch (err.code) {
    case '23505': status = 409; message = 'Такий запис уже існує'; break;
    case '23514': status = 400; message = 'Значення не відповідає обмеженням'; break;
    case '23503': status = 409; message = 'Запис пов’язаний з іншими даними'; break;
    case '22P02': status = 400; message = 'Некоректний формат даних'; break;
    case 'P0001': status = 400; break; // RAISE EXCEPTION з функцій БД
    default:
      if (status === 500) { console.error(err); message = 'Внутрішня помилка сервера'; }
  }
  res.status(status).json({ error: message });
});

const PORT = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(PORT, () => console.log(`FinTrack: http://localhost:${PORT}`));
  process.on('SIGINT', () => pool.end().then(() => process.exit(0)));
}
module.exports = app;