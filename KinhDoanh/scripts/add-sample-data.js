/**
 * Add Sample Data for Testing
 * Thêm dữ liệu mẫu để kiểm thử các trang
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'kho_mvg',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function addSampleData() {
  const connection = await pool.getConnection();
  
  try {
    console.log('📝 Adding sample data...\n');

    // 1. Add sample projects
    console.log('Adding projects...');
    const projectsData = [
      {
        name: 'Kho xưởng Bình Dương',
        code: 'KX-BD-001',
        address: '123 Đường ABC, Thuận An, Bình Dương',
        province: 'Bình Dương',
        status: 'operational',
        total_area: 15000
      },
      {
        name: 'Trung tâm logistics Đồng Nai',
        code: 'KX-DN-002',
        address: '456 Đường XYZ, Biên Hòa, Đồng Nai',
        province: 'Đồng Nai',
        status: 'construction',
        total_area: 20000
      }
    ];

    for (const project of projectsData) {
      await connection.execute(
        'INSERT IGNORE INTO projects (name, code, address, province, status, total_area, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())',
        [project.name, project.code, project.address, project.province, project.status, project.total_area]
      );
    }
    console.log('✅ Projects added\n');

    // 2. Add sample customers
    console.log('Adding customers...');
    const customersData = [
      {
        name: 'ABC Logistics Co., Ltd',
        representative_name: 'Nguyễn Văn A',
        email: 'contact@abclogistics.com',
        phone: '0901234567',
        customer_type: 'corporate',
        address: '789 Đường Logistics, District 1, HCMC'
      },
      {
        name: 'XYZ Trading Inc',
        representative_name: 'Trần Thị B',
        email: 'info@xyztrading.com',
        phone: '0912345678',
        customer_type: 'corporate',
        address: '456 Đường Trading, District 2, HCMC'
      },
      {
        name: 'Tech Solutions Co',
        representative_name: 'Lê Văn C',
        email: 'hello@techsolutions.com',
        phone: '0923456789',
        customer_type: 'corporate',
        address: '321 Đường Tech, District 5, HCMC'
      }
    ];

    for (const customer of customersData) {
      await connection.execute(
        'INSERT IGNORE INTO customers (name, representative_name, email, phone, customer_type, address, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())',
        [customer.name, customer.representative_name, customer.email, customer.phone, customer.customer_type, customer.address]
      );
    }
    console.log('✅ Customers added\n');

    // 3. Add sample zones
    console.log('Adding warehouse zones...');
    const zonesData = [
      {
        project_id: 1,
        zone_name: 'Zone A1',
        area: 500,
        zone_type: 'storage',
        is_active: 1
      },
      {
        project_id: 1,
        zone_name: 'Zone A2',
        area: 750,
        zone_type: 'storage',
        is_active: 1
      },
      {
        project_id: 1,
        zone_name: 'Zone B1',
        area: 1000,
        zone_type: 'workshop',
        is_active: 1
      }
    ];

    for (const zone of zonesData) {
      await connection.execute(
        'INSERT IGNORE INTO warehouse_zones (project_id, zone_name, area, zone_type, is_active, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
        [zone.project_id, zone.zone_name, zone.area, zone.zone_type, zone.is_active]
      );
    }
    console.log('✅ Warehouse zones added\n');

    // 4. Add sample contracts
    console.log('Adding contracts...');
    const contractsData = [
      {
        contract_number: 'HD-2024-001',
        description: 'Hợp đồng thuê kho Zone A1',
        customer_id: 1,
        project_id: 1,
        zone_id: 1,
        status: 'active',
        start_date: new Date('2024-01-15'),
        end_date: new Date('2025-01-15'),
        total_value: 50000000,
        workflow_stage: 'execution'
      },
      {
        contract_number: 'HD-2024-002',
        description: 'Hợp đồng thuê kho Zone A2',
        customer_id: 2,
        project_id: 1,
        zone_id: 2,
        status: 'signed',
        start_date: new Date('2024-02-01'),
        end_date: new Date('2025-02-01'),
        total_value: 75000000,
        workflow_stage: 'execution'
      },
      {
        contract_number: 'HD-2024-003',
        description: 'Hợp đồng thuê xưởng Zone B1',
        customer_id: 3,
        project_id: 1,
        zone_id: 3,
        status: 'review',
        start_date: new Date('2024-03-01'),
        end_date: new Date('2025-03-01'),
        total_value: 100000000,
        workflow_stage: 'approval'
      }
    ];

    for (const contract of contractsData) {
      await connection.execute(
        'INSERT IGNORE INTO contracts (contract_number, description, customer_id, project_id, zone_id, status, start_date, end_date, total_value, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())',
        [contract.contract_number, contract.description, contract.customer_id, contract.project_id, contract.zone_id, contract.status, contract.start_date, contract.end_date, contract.total_value]
      );
    }
    console.log('✅ Contracts added\n');

    // 5. Add sample documents
    console.log('Adding documents...');
    const documentsData = [
      {
        filename: 'hop-dong-001.pdf',
        originalname: 'Hợp đồng HD-2024-001.pdf',
        mimetype: 'application/pdf',
        size: 2048576,
        resource_type: 'contract',
        resource_id: 1,
        category: 'Hợp đồng chính'
      },
      {
        filename: 'bang-ve-kx-001.dwg',
        originalname: 'Bản vẽ Kho A1.dwg',
        mimetype: 'application/acad',
        size: 5242880,
        resource_type: 'project',
        resource_id: 1,
        category: 'Bản vẽ kỹ thuật'
      }
    ];

    for (const doc of documentsData) {
      try {
        await connection.execute(
          'INSERT IGNORE INTO documents (originalname, mimetype, size, resource_type, resource_id, category, uploaded_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())',
          [doc.originalname, doc.mimetype, doc.size, doc.resource_type, doc.resource_id, doc.category, 1]
        );
      } catch (e) {
        console.warn('Document insert warning:', e.message);
      }
    }
    console.log('✅ Documents added\n');

    console.log('✅ All sample data added successfully!\n');
    console.log('Summary:');
    console.log('  - 2 Projects');
    console.log('  - 3 Customers');
    console.log('  - 3 Warehouse Zones');
    console.log('  - 3 Contracts');
    console.log('  - 2 Documents');

  } catch (error) {
    console.error('Error adding sample data:', error.message);
    process.exit(1);
  } finally {
    connection.release();
    await pool.end();
    process.exit(0);
  }
}

addSampleData().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
