(async () => {
  const { mysqlPool } = require('./config/database');
  const pool = mysqlPool();
  try {
    const now = new Date().toISOString();
    const [r] = await pool.execute('SELECT 1');
    console.log('ok', r);
    const [c] = await pool.execute('SHOW TABLES LIKE "contracts"');
    console.log('contracts table exists:', c.length);
    const [cols] = await pool.execute('SHOW COLUMNS FROM contracts');
    console.log('contracts columns:', cols.map(x=>x.Field));
  } catch (err) {
    console.error('err', err.message, err.code);
  } finally { try{ await pool.end(); }catch(e){} }
})();