'use strict';
require('dotenv').config();
const { Pool, types } = require('pg');

// NUMERIC (oid 1700) повертаємо як число, DATE (oid 1082) — як рядок YYYY-MM-DD
types.setTypeParser(1700, (v) => parseFloat(v));
types.setTypeParser(1082, (v) => v);

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/fintrack',
  max: 10,
});

const query = (text, params) => pool.query(text, params);

/** Виконує колбек усередині транзакції БД (BEGIN / COMMIT / ROLLBACK). */
async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { pool, query, withTransaction };
