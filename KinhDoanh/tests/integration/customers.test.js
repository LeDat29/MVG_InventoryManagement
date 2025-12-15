const request = require('supertest');
const app = require('../../server'); // ??m b?o ???ng d?n ?úng ??n file server.js
const { mysqlPool } = require('../../config/database');

describe('Customer Management API', () => {
  let customerId;

  beforeAll(async () => {
    if (app.startServer) {
      await app.startServer({ listen: false });
    }
  });

  afterAll(async () => {
    // ?óng k?t n?i MySQL sau khi t?t c? các bài ki?m tra hoàn thành
    const pool = mysqlPool();
    await pool.end();
  });

  it('should fetch the list of customers', async () => {
    const res = await request(app).get('/api/customers').expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.customers)).toBe(true);
  });

  it('should create a new customer', async () => {
    const newCustomer = {
      name: 'Công ty ABC',
      representative_name: 'Nguy?n V?n A',
      phone: '0123456789',
      email: 'abc@example.com',
      address: '123 ???ng ABC, TP.HCM'
    };

    const res = await request(app).post('/api/customers').send(newCustomer).expect(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('id');
    customerId = res.body.data.id;
  });

  it('should fetch customer details', async () => {
    const res = await request(app).get(`/api/customers/${customerId}`).expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.customer).toHaveProperty('id', customerId);
  });

  it('should update customer details', async () => {
    const updatedCustomer = {
      name: 'Công ty XYZ',
      phone: '0987654321'
    };

    const res = await request(app).put(`/api/customers/${customerId}`).send(updatedCustomer).expect(200);
    expect(res.body.success).toBe(true);
    expect(typeof res.body.message).toBe('string');
    expect(res.body.message.length).toBeGreaterThan(0);
  });

  it('should delete the customer', async () => {
    const res = await request(app).delete(`/api/customers/${customerId}`).expect(200);
    expect(res.body.success).toBe(true);
    expect(typeof res.body.message).toBe('string');
    const msg = (res.body.message || '').toLowerCase();
    const ascii = msg.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    expect(msg.includes('thành công') || ascii.includes('thanh cong')).toBe(true);
  });
});