const request = require('supertest');
const express = require('express');

// Mock middleware/auth
jest.mock('../../middleware/auth', () => ({
  requireAuth: (req, res, next) => { req.user = { id: 1, role: 'admin', permissions: ['contract_read'] }; next(); },
  requirePermission: (perm) => (req, res, next) => { next(); }
}));

// Mock logger
jest.mock('../../config/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));

const mockExecute = jest.fn();
jest.mock('../../config/database', () => ({ mysqlPool: () => ({ execute: mockExecute }) }));

let app;

beforeEach(() => {
  jest.resetModules();
  mockExecute.mockReset();

  app = express();
  app.use(express.json());
  const contractsRouter = require('../../routes/contracts');
  app.use('/api/contracts', contractsRouter);
});

test('GET /api/contracts returns normalized list with pagination', async () => {
  const now = new Date();
  const row = {
    id: 1,
    contract_number: 'HD20240010',
    rental_price: '1500000',
    zone_area: 120,
    start_date: now.toISOString().slice(0,19).replace('T',' '),
    end_date: new Date(now.getTime() + 365*24*3600*1000).toISOString().slice(0,19).replace('T',' '),
    created_at: now.toISOString().slice(0,19).replace('T',' ')
  };

  // For first execute (SELECT ... LIMIT ? OFFSET ?) return [rows]
  mockExecute.mockImplementationOnce((sql, params) => Promise.resolve([[row], []]));
  // For total count
  mockExecute.mockImplementationOnce((sql, params) => Promise.resolve([[{ total: 1 }], []]));

  const res = await request(app).get('/api/contracts?page=1&limit=10');

  expect(res.status).toBe(200);
  expect(res.body.success).toBe(true);
  expect(Array.isArray(res.body.data.contracts)).toBe(true);
  const c = res.body.data.contracts[0];
  expect(c).toHaveProperty('id', 1);
  expect(c).toHaveProperty('contract_number', 'HD20240010');
  expect(typeof c.rental_price).toBe('number');
  expect(c.start_date).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  expect(res.body.data.pagination).toHaveProperty('total', 1);
});

test('GET /api/contracts/:id returns 200 with contract detail when found', async () => {
  const now = new Date();
  const contractRow = [{
    id: 5,
    contract_number: 'HD20240005',
    contract_title: 'Test Contract',
    warehouse_area: 50,
    rental_price: 500000,
    start_date: now.toISOString().slice(0,19).replace('T',' '),
    end_date: new Date(now.getTime() + 30*24*3600*1000).toISOString().slice(0,19).replace('T',' '),
    created_at: now.toISOString().slice(0,19).replace('T',' '),
    customer_company_name: 'ACME Ltd.'
  }];

  // when fetching contract by id -> first execute returns contractRow
  mockExecute.mockImplementationOnce((sql, params) => Promise.resolve([contractRow, []]));
  // documents
  mockExecute.mockImplementationOnce((sql, params) => Promise.resolve([[], []]));
  // variables
  mockExecute.mockImplementationOnce((sql, params) => Promise.resolve([[], []]));
  // workflowHistory
  mockExecute.mockImplementationOnce((sql, params) => Promise.resolve([[], []]));
  // reviews
  mockExecute.mockImplementationOnce((sql, params) => Promise.resolve([[], []]));

  const res = await request(app).get('/api/contracts/5');
  expect(res.status).toBe(200);
  expect(res.body.success).toBe(true);
  expect(res.body.data.contract).toBeDefined();
  expect(res.body.data.contract.contract_number).toBe('HD20240005');
});
