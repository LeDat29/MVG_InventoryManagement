const request = require('supertest');
const app = require('./server');

(async () => {
  try {
    const newCustomer = {
      name: 'Công ty ABC',
      representative_name: 'Nguy?n V?n A',
      phone: '0123456789',
      email: 'abc@example.com',
      address: '123 ???ng ABC, TP.HCM'
    };

    const res = await request(app).post('/api/customers').send(newCustomer);
    console.log('Status:', res.status);
    console.log('Headers:', res.headers);
    console.log('Body:', res.body);
    console.log('Text:', res.text);
  } catch (err) {
    console.error('Request error:', err);
  } finally {
    const { mysqlPool } = require('./config/database');
    const pool = mysqlPool();
    if (pool) await pool.end();
  }
})();