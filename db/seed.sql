-- Тестові дані FinTrack.
-- На час заповнення тригер балансу вимкнено, а підсумкові баланси
-- розраховуються в кінці скрипта (виключно з операцій).
ALTER TABLE transactions DISABLE TRIGGER trg_tx_balance;

INSERT INTO users (email, full_name) VALUES
 ('ivan.franko@example.com',    'Іван Франко'),
 ('lesya.ukrainka@example.com', 'Леся Українка'),
 ('taras.shevchenko@example.com','Тарас Шевченко');

-- Початковий баланс ставимо 0, він перерахується в кінці скрипта
INSERT INTO accounts (user_id, account_name, balance, currency, account_type) VALUES
 (1,'Картка Моно',      0,'UAH','STANDARD'),
 (1,'Готівка',          0,'UAH','SAVINGS'),
 (1,'Накопичувальна',   0,'UAH','SAVINGS'),
 (1,'Кредитка',         0,'UAH','CREDIT'),
 (2,'Картка Приват',    0,'UAH','STANDARD'),
 (3,'Валютний рахунок', 0,'USD','STANDARD');

-- Увага: числові id категорій використовуються нижче, тому нові категорії додаємо ЛИШЕ в кінець списку.
INSERT INTO categories (name, type) VALUES
 ('Зарплата','INCOME'),('Фріланс','INCOME'),('Подарунки','INCOME'),
 ('Продукти','EXPENSE'),('Транспорт','EXPENSE'),('Розваги','EXPENSE'),
 ('Здоров''я','EXPENSE'),('Комунальні','EXPENSE'),('Підписки','EXPENSE'),('Одяг','EXPENSE'),
 ('Інше','INCOME');

INSERT INTO tags (name) VALUES ('відпустка'),('подарунок'),('регулярне'),('терміново'),('робота');

-- Операції за останні 5 місяців (користувач 1, рахунок 1)
INSERT INTO transactions (account_id, category_id, amount, transaction_date, description)
SELECT 1, 1, 42000,
       date_trunc('month', CURRENT_DATE) - (m || ' month')::interval + interval '4 days',
       'Зарплата'
FROM generate_series(0,4) m;

INSERT INTO transactions (account_id, category_id, amount, transaction_date, description)
SELECT 1, 2, 6000 + m*700,
       date_trunc('month', CURRENT_DATE) - (m || ' month')::interval + interval '8 days',
       'Проєкт на замовлення'
FROM generate_series(0,4) m;

INSERT INTO transactions (account_id, category_id, amount, transaction_date, description)
SELECT 1, 4, 650 + (m*97 % 420) + w*35,
       date_trunc('month', CURRENT_DATE) - (m || ' month')::interval + ((w*7+1) || ' days')::interval,
       (ARRAY['Сільпо','АТБ','Ринок','Фора'])[1 + (m+w) % 4]
FROM generate_series(0,4) m, generate_series(0,3) w;

INSERT INTO transactions (account_id, category_id, amount, transaction_date, description)
SELECT 1, 5, 300 + (m*53 % 250),
       date_trunc('month', CURRENT_DATE) - (m || ' month')::interval + interval '6 days',
       'Проїзд та таксі'
FROM generate_series(0,4) m;

INSERT INTO transactions (account_id, category_id, amount, transaction_date, description)
SELECT 1, 8, 3100 + (m*41 % 300),
       date_trunc('month', CURRENT_DATE) - (m || ' month')::interval + interval '9 days',
       'Комунальні платежі'
FROM generate_series(0,4) m;

INSERT INTO transactions (account_id, category_id, amount, transaction_date, description)
SELECT 1, 9, 420,
       date_trunc('month', CURRENT_DATE) - (m || ' month')::interval + interval '2 days',
       'Netflix та Spotify'
FROM generate_series(0,4) m;

INSERT INTO transactions (account_id, category_id, amount, transaction_date, description)
SELECT 1, 6, 900 + (m*211 % 1700),
       date_trunc('month', CURRENT_DATE) - (m || ' month')::interval + interval '10 days',
       'Кіно, кафе, концерт'
FROM generate_series(0,4) m;

INSERT INTO transactions (account_id, category_id, amount, transaction_date, description) VALUES
 (1,10,3200,  CURRENT_DATE - 2,  'Зимова куртка'),
 (1, 7,1450,  CURRENT_DATE - 4,  'Аптека та вітаміни'),
 (1, 3,2000,  CURRENT_DATE - 6,  'Подарунок від родини'),
 (5, 1,38000, CURRENT_DATE - 8,  'Зарплата'),
 (5, 4,2100,  CURRENT_DATE - 5,  'Продукти на тиждень'),
 (6, 2,800,   CURRENT_DATE - 3,  'Міжнародний переказ');

INSERT INTO transaction_tags (transaction_id, tag_id)
SELECT transaction_id, 3 FROM transactions
WHERE description IN ('Netflix та Spotify','Комунальні платежі','Зарплата');

INSERT INTO transaction_tags (transaction_id, tag_id)
SELECT transaction_id, 2 FROM transactions WHERE description = 'Подарунок від родини';

INSERT INTO transaction_tags (transaction_id, tag_id)
SELECT transaction_id, 5 FROM transactions WHERE description = 'Проєкт на замовлення';

ALTER TABLE transactions ENABLE TRIGGER trg_tx_balance;

-- Баланс формується ВИКЛЮЧНО з операцій (доходи - витрати). Без штучних стартових сум.
UPDATE accounts a
SET balance = COALESCE((
    SELECT SUM(CASE WHEN c.type = 'INCOME' THEN t.amount ELSE -t.amount END)
    FROM transactions t JOIN categories c ON c.category_id = t.category_id
    WHERE t.account_id = a.account_id), 0);

INSERT INTO goals (user_id, title, target_amount, current_amount, deadline, goal_status, priority) VALUES
 (1,'Відпустка в Карпатах', 45000, 18000,  CURRENT_DATE + 120, 'ACTIVE',    2),
 (1,'Ноутбук',              60000, 52000,  CURRENT_DATE + 60,  'ACTIVE',    1),
 (1,'Фінансова подушка',   150000, 60000,  CURRENT_DATE + 365, 'ACTIVE',    1),
 (1,'Курси англійської',    12000, 12000,  CURRENT_DATE - 10,  'COMPLETED', 3),
 (2,'Новий велосипед',      25000, 6000,   CURRENT_DATE + 200, 'ACTIVE',    3);

INSERT INTO budgets (user_id, category_id, limit_amount, period_start, period_end)
SELECT u, c, l,
       date_trunc('month', CURRENT_DATE)::date,
       (date_trunc('month', CURRENT_DATE) + interval '1 month - 1 day')::date
FROM (VALUES (1,4,9000),(1,6,2500),(1,5,1200),(1,10,2500),(2,4,6000)) AS b(u,c,l);