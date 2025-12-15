(async () => {
  const { mysqlPool } = require('./config/database');
  const pool = mysqlPool();
  try {
    const customerId = 24;
    const [rows] = await pool.execute(`
        SELECT c.id, c.customer_code, c.name, c.full_name, c.company_name, 
               c.representative_name, c.phone, c.email, c.address, 
               c.tax_code, c.business_license, c.bank_info, 
               c.customer_type, c.credit_rating, c.status, 
               c.id_number, c.representative_phone, c.representative_email,
               c.warehouse_purpose, c.notes,
               c.created_at, c.updated_at, c.created_by,
               u.username as created_by_username
        FROM customers c
        LEFT JOIN users u ON c.created_by = u.id
        WHERE c.id = ?
    `, [customerId]);
    console.log('Query result:', rows);
  } catch (err) {
    console.error('Query error:', err.message, err);
  } finally {
    try { await pool.end(); } catch(e){}
  }
})();