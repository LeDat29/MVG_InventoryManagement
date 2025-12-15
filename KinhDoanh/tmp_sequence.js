const request = require('supertest');
const app = require('./server');

(async () => {
  try {
    const newCustomer = { name: 'Temp Co', representative_name: 'Rep', phone: '0123' };
    const resCreate = await request(app).post('/api/customers').send(newCustomer);
    console.log('CREATE status', resCreate.status, resCreate.body);
    const id = resCreate.body.data && resCreate.body.data.id;
    const resGet = await request(app).get(`/api/customers/${id}`);
    console.log('GET status', resGet.status);
    console.log('GET body', resGet.body);
  } catch (e) {
    console.error('Error', e);
  } finally {
    const { mysqlPool } = require('./config/database');
    const pool = mysqlPool();
    if (pool) await pool.end();
  }
})();