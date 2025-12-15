(async () => {
  const { mysqlPool } = require('./config/database');
  const pool = mysqlPool();
  try {
    const [db] = await pool.execute('SELECT DATABASE() as db');
    console.log('DB:', db[0]);
    const [tables] = await pool.execute('SHOW TABLES LIKE "customers"');
    console.log('customers table exists:', tables.length);
    const [res] = await pool.execute('SELECT COUNT(*) as cnt FROM customers');
    console.log('customers count:', res[0].cnt);
  } catch (err) {
    console.error('DB error:', err && err.message ? err.message : err);
  } finally {
    try { await pool.end(); } catch(e){}
  }
})();