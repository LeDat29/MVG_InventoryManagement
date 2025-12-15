const request = require('supertest');
const app = require('../../server'); // ??m b?o ???ng d?n ?úng ??n file server.js
const { mysqlPool } = require('../../config/database');

describe('Contract Management API', () => {
  let contractId;

  afterAll(async () => {
    // ?óng k?t n?i MySQL sau khi t?t c? các bài ki?m tra hoàn thành
    const pool = mysqlPool();
    await pool.end();
  });

  const retryOnDeadlock = async (fn, retries = 3) => {
    while (retries > 0) {
      try {
        return await fn();
      } catch (err) {
        if (err.message.includes('Deadlock')) {
          console.warn(`??  Deadlock detected, retrying... (${4 - retries} attempt)`);
          retries -= 1;
          if (retries === 0) {
            throw new Error(`Deadlock could not be resolved: ${err.message}`);
          }
        } else {
          throw err;
        }
      }
    }
  };

  it('should fetch the list of contracts', async () => {
    await retryOnDeadlock(async () => {
      const res = await request(app).get('/api/contracts').expect(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.contracts)).toBe(true);
    });
  });

  it('should create a new contract', async () => {
    const newContract = {
      contract_title: 'H?p ??ng thuê kho ABC',
      customer_id: 1, // ??m b?o ID khách hàng t?n t?i trong DB
      template_id: 1, // ??m b?o ID m?u h?p ??ng t?n t?i trong DB
      warehouse_location: 'Khu A',
      warehouse_area: 100,
      rental_price: 5000000,
      start_date: '2023-12-01',
      end_date: '2024-12-01'
    };

    await retryOnDeadlock(async () => {
      const res = await request(app).post('/api/contracts').send(newContract).expect(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('id');
      contractId = res.body.data.id;
    });
  });

  it('should fetch contract details', async () => {
    await retryOnDeadlock(async () => {
      const res = await request(app).get(`/api/contracts/${contractId}`).expect(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.contract).toHaveProperty('id', contractId);
    });
  });
});