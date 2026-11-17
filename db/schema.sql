-- FinTrack: схема БД (PostgreSQL 14+)
-- Відповідає моделі з лабораторних робіт №4–7 (варіант 23)

DROP VIEW  IF EXISTS view_account_balances;
DROP TABLE IF EXISTS transaction_tags, budgets, goals, transactions, tags, categories, accounts, users CASCADE;

CREATE TABLE users (
    user_id     SERIAL PRIMARY KEY,
    email       VARCHAR(120) NOT NULL UNIQUE,
    full_name   VARCHAR(100) NOT NULL,
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE TABLE accounts (
    account_id   SERIAL PRIMARY KEY,
    user_id      INT           NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    account_name VARCHAR(80)   NOT NULL,
    balance      NUMERIC(14,2) NOT NULL DEFAULT 0,
    currency     CHAR(3)       NOT NULL DEFAULT 'UAH',
    account_type VARCHAR(20)   NOT NULL DEFAULT 'STANDARD'
                 CHECK (account_type IN ('STANDARD','SAVINGS','CREDIT'))
);

CREATE TABLE categories (
    category_id SERIAL PRIMARY KEY,
    name        VARCHAR(60) NOT NULL UNIQUE,
    type        VARCHAR(7)  NOT NULL CHECK (type IN ('INCOME','EXPENSE'))
);

CREATE TABLE transactions (
    transaction_id   SERIAL PRIMARY KEY,
    account_id       INT           NOT NULL REFERENCES accounts(account_id)     ON DELETE CASCADE,
    category_id      INT           NOT NULL REFERENCES categories(category_id),
    amount           NUMERIC(14,2) NOT NULL CHECK (amount > 0),
    transaction_date DATE          NOT NULL DEFAULT CURRENT_DATE,
    description      VARCHAR(255)
);
CREATE INDEX idx_tx_date    ON transactions(transaction_date);
CREATE INDEX idx_tx_account ON transactions(account_id);

CREATE TABLE goals (
    goal_id        SERIAL PRIMARY KEY,
    user_id        INT           NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    title          VARCHAR(100)  NOT NULL,
    target_amount  NUMERIC(14,2) NOT NULL CHECK (target_amount > 0),
    current_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (current_amount >= 0),
    deadline       DATE,
    goal_status    VARCHAR(12)   NOT NULL DEFAULT 'ACTIVE'
                   CHECK (goal_status IN ('ACTIVE','COMPLETED','CANCELLED')),
    priority       SMALLINT      NOT NULL DEFAULT 2 CHECK (priority BETWEEN 1 AND 3)
);

CREATE TABLE budgets (
    budget_id    SERIAL PRIMARY KEY,
    user_id      INT           NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    category_id  INT           NOT NULL REFERENCES categories(category_id),
    limit_amount NUMERIC(14,2) NOT NULL CHECK (limit_amount > 0),
    period_start DATE          NOT NULL,
    period_end   DATE          NOT NULL,
    CHECK (period_end >= period_start)
);

CREATE TABLE tags (
    tag_id SERIAL PRIMARY KEY,
    name   VARCHAR(40) NOT NULL UNIQUE
);

CREATE TABLE transaction_tags (
    transaction_id INT NOT NULL REFERENCES transactions(transaction_id) ON DELETE CASCADE,
    tag_id         INT NOT NULL REFERENCES tags(tag_id)                 ON DELETE CASCADE,
    PRIMARY KEY (transaction_id, tag_id)
);

-- Представлення з лаб. №7
CREATE VIEW view_account_balances AS
SELECT a.account_id, u.user_id, u.full_name AS owner, a.account_name,
       a.balance, a.currency, a.account_type
FROM accounts a JOIN users u ON u.user_id = a.user_id;

-- Тригер: баланс рахунку автоматично змінюється разом з операціями
CREATE OR REPLACE FUNCTION apply_tx_to_balance() RETURNS trigger AS $$
DECLARE
    delta NUMERIC(14,2);
    t     VARCHAR(7);
BEGIN
    IF TG_OP = 'INSERT' THEN
        SELECT type INTO t FROM categories WHERE category_id = NEW.category_id;
        delta := CASE WHEN t = 'INCOME' THEN NEW.amount ELSE -NEW.amount END;
        UPDATE accounts SET balance = balance + delta WHERE account_id = NEW.account_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        SELECT type INTO t FROM categories WHERE category_id = OLD.category_id;
        delta := CASE WHEN t = 'INCOME' THEN -OLD.amount ELSE OLD.amount END;
        UPDATE accounts SET balance = balance + delta WHERE account_id = OLD.account_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tx_balance
AFTER INSERT OR DELETE ON transactions
FOR EACH ROW EXECUTE FUNCTION apply_tx_to_balance();

-- Функція переказу між рахунками (атомарна операція, лаб. №7)
CREATE OR REPLACE FUNCTION transfer_funds(p_from INT, p_to INT, p_amount NUMERIC)
RETURNS void AS $$
BEGIN
    IF p_amount <= 0 THEN RAISE EXCEPTION 'Сума переказу має бути додатною'; END IF;
    IF p_from = p_to THEN RAISE EXCEPTION 'Рахунки мають відрізнятися'; END IF;
    UPDATE accounts SET balance = balance - p_amount WHERE account_id = p_from;
    UPDATE accounts SET balance = balance + p_amount WHERE account_id = p_to;
    IF (SELECT balance FROM accounts WHERE account_id = p_from) < 0
       AND (SELECT account_type FROM accounts WHERE account_id = p_from) <> 'CREDIT' THEN
        RAISE EXCEPTION 'Недостатньо коштів на рахунку';
    END IF;
END;
$$ LANGUAGE plpgsql;
