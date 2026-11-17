'use strict';
// Створює таблиці та заповнює їх тестовими даними: npm run db:init
const fs = require('fs');
const path = require('path');
const { pool } = require('./db');

(async () => {
  try {
    for (const file of ['schema.sql', 'seed.sql']) {
      const sql = fs.readFileSync(path.join(__dirname, '..', 'db', file), 'utf8');
      await pool.query(sql);
      console.log(`✔ ${file} виконано`);
    }
  } catch (e) {
    console.error('✖ Помилка ініціалізації:', e.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
