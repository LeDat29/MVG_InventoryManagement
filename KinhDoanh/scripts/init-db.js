/**
 * Database Initialization Script - KHO MVG
 * Script khởi tạo cơ sở dữ liệu và dữ liệu demo
 */

require('dotenv').config();
const { connectMongoDB, connectMySQL, initializeDatabase } = require('../config/database');
const { createExtendedTables, initializeSchemaDocumentation, initializeAIFunctions } = require('../config/database-extended');
const { initializeLogger, logger } = require('../config/logger');
const bcrypt = require('bcryptjs');

// Initialize logger
initializeLogger();

/**
 * Tạo dữ liệu demo cho development
 */
async function createDemoData() {
    try {
        const { mysqlPool } = require('../config/database');
        const pool = mysqlPool();

        logger.info('Creating demo data...');

        // Create demo document categories
        const categories = [
            {
                category_code: 'HD_CHINH',
                category_name: 'Hợp đồng chính',
                category_type: 'contract',
                description: 'Hợp đồng thuê kho chính thức',
                is_required: true,
                sort_order: 1
            },
            {
                category_code: 'HD_PHU_LUC',
                category_name: 'Phụ lục hợp đồng',
                category_type: 'contract',
                description: 'Các phụ lục bổ sung hợp đồng',
                is_required: false,
                sort_order: 2
            },
            {
                category_code: 'BANG_VE_KT',
                category_name: 'Bản vẽ kỹ thuật',
                category_type: 'project',
                description: 'Bản vẽ mặt bằng, thiết kế kho',
                is_required: true,
                sort_order: 1
            },
            {
                category_code: 'GIAY_TO_PL',
                category_name: 'Giấy tờ pháp lý',
                category_type: 'customer',
                description: 'GPKD, MST, các giấy tờ pháp lý khác',
                is_required: true,
                sort_order: 1
            },
            {
                category_code: 'CONG_VIEC_PCCC',
                category_name: 'Kiểm tra PCCC',
                category_type: 'task',
                description: 'Kiểm tra phòng cháy chữa cháy định kỳ',
                is_required: true,
                sort_order: 1
            }
        ];

        for (const category of categories) {
            await pool.execute(
                `INSERT INTO document_categories (category_code, category_name, category_type, description, required_fields, is_required, sort_order)
                 VALUES (?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE category_name = VALUES(category_name)`,
                [
                    category.category_code,
                    category.category_name,
                    category.category_type,
                    category.description,
                    JSON.stringify([]),
                    category.is_required,
                    category.sort_order
                ]
            );
        }

        // Create demo users
        const users = [
            {
                username: 'manager',
                email: 'manager@kho-mvg.com',
                password_hash: await bcrypt.hash('manager123', 12),
                full_name: 'Nguyễn Văn Manager',
                phone: '0987654321',
                role: 'manager',
                permissions: JSON.stringify(['project_view', 'project_update', 'customer_view', 'customer_update', 'contract_view', 'contract_create'])
            },
            {
                username: 'staff',
                email: 'staff@kho-mvg.com',
                password_hash: await bcrypt.hash('staff123', 12),
                full_name: 'Trần Thị Staff',
                phone: '0912345678',
                role: 'staff',
                permissions: JSON.stringify(['project_view', 'customer_view', 'contract_view'])
            },
            {
                username: 'viewer',
                email: 'viewer@kho-mvg.com',
                password_hash: await bcrypt.hash('viewer123', 12),
                full_name: 'Lê Văn Viewer',
                phone: '0901234567',
                role: 'viewer',
                permissions: JSON.stringify(['project_view', 'customer_view', 'contract_view'])
            }
        ];

        for (const user of users) {
            await pool.execute(
                `INSERT INTO users (username, email, password_hash, full_name, phone, role, permissions, created_by)
                 VALUES (?, ?, ?, ?, ?, ?, ?, 1)
                 ON DUPLICATE KEY UPDATE full_name = VALUES(full_name)`,
                [user.username, user.email, user.password_hash, user.full_name, user.phone, user.role, user.permissions]
            );
        }

        // Create demo projects
        const projects = [
            {
                name: 'Khu kho xưởng Bình Dương',
                code: 'KX-BD-001',
                description: 'Khu kho xưởng hiện đại tại Thuận An, Bình Dương với đầy đủ tiện ích',
                address: '123 Đường Mỹ Phước Tân Vạn, Phường An Phú, TP Thuận An, Bình Dương',
                province: 'Bình Dương',
                district: 'TP Thuận An',
                ward: 'Phường An Phú',
                latitude: 10.9045,
                longitude: 106.7213,
                total_area: 15000,
                available_area: 15000,
                status: 'operational',
                owner_info: JSON.stringify({
                    name: 'Công ty TNHH Đầu tư Bình Dương',
                    phone: '0274 123 456',
                    email: 'contact@binhduong-invest.com'
                }),
                legal_documents: JSON.stringify({
                    business_license: 'GP-BD-123456789',
                    construction_permit: 'XD-BD-987654321',
                    fire_safety_cert: 'PCCC-BD-111222333'
                }),
                created_by: 1
            },
            {
                name: 'Trung tâm Logistics Đồng Nai',
                code: 'KX-DN-002',
                description: 'Trung tâm logistics quy mô lớn tại Biên Hòa, Đồng Nai',
                address: '456 Đường Võ Thị Sáu, Phường Thống Nhất, TP Biên Hòa, Đồng Nai',
                province: 'Đồng Nai',
                district: 'TP Biên Hòa',
                ward: 'Phường Thống Nhất',
                latitude: 10.9465,
                longitude: 106.8420,
                total_area: 20000,
                available_area: 20000,
                status: 'construction',
                owner_info: JSON.stringify({
                    name: 'Tập đoàn Logistics Việt Nam',
                    phone: '0251 234 567',
                    email: 'info@vn-logistics.com'
                }),
                created_by: 1
            },
            {
                name: 'Kho Tân Phú',
                code: 'KX-TP-003',
                description: 'Kho xưởng nhỏ tại Tân Phú, TP.HCM phù hợp cho doanh nghiệp vừa và nhỏ',
                address: '789 Đường Tây Thạnh, Phường Tây Thạnh, Quận Tân Phú, TP.HCM',
                province: 'TP.HCM',
                district: 'Quận Tân Phú',
                ward: 'Phường Tây Thạnh',
                latitude: 10.8030,
                longitude: 106.6245,
                total_area: 8000,
                available_area: 8000,
                status: 'planning',
                owner_info: JSON.stringify({
                    name: 'Công ty CP Phát triển TP.HCM',
                    phone: '028 345 678',
                    email: 'hcm@development.com'
                }),
                created_by: 1
            }
        ];

        for (const project of projects) {
            const [result] = await pool.execute(
                `INSERT INTO projects (name, code, description, address, province, district, ward, latitude, longitude, total_area, available_area, status, owner_info, legal_documents, created_by)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE name = VALUES(name)`,
                [project.name, project.code, project.description, project.address, project.province, project.district, project.ward, project.latitude, project.longitude, project.total_area, project.available_area, project.status, project.owner_info, project.legal_documents, project.created_by]
            );
        }

        // Create demo warehouse zones for first project
        const zones = [
            {
                project_id: 1,
                zone_code: 'A1',
                zone_name: 'Khu vực A1 - Hàng điện tử',
                area: 500,
                zone_type: 'rental',
                status: 'available',
                rental_price: 150000
            },
            {
                project_id: 1,
                zone_code: 'A2',
                zone_name: 'Khu vực A2 - Hàng gia dụng',
                area: 600,
                zone_type: 'rental',
                status: 'available',
                rental_price: 140000
            },
            {
                project_id: 1,
                zone_code: 'B1',
                zone_name: 'Khu vực B1 - Hàng may mặc',
                area: 450,
                zone_type: 'rental',
                status: 'available',
                rental_price: 160000
            },
            {
                project_id: 1,
                zone_code: 'C1',
                zone_name: 'Văn phòng điều hành',
                area: 200,
                zone_type: 'fixed_service',
                status: 'maintenance',
                rental_price: 0
            }
        ];

        for (const zone of zones) {
            await pool.execute(
                `INSERT INTO warehouse_zones (project_id, zone_code, zone_name, area, zone_type, status, rental_price)
                 VALUES (?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE zone_name = VALUES(zone_name)`,
                [zone.project_id, zone.zone_code, zone.zone_name, zone.area, zone.zone_type, zone.status, zone.rental_price]
            );
        }

        // Create demo customers
        const customers = [
            {
                customer_code: 'KH001',
                company_name: 'Công ty TNHH ABC Logistics',
                contact_person: 'Nguyễn Văn A',
                email: 'contact@abc-logistics.vn',
                phone: '0123456789',
                address: '123 Đường Nguyễn Trãi, Quận 1, TP.HCM',
                tax_code: '0123456789',
                business_license: 'GP-HCM-123456',
                customer_type: 'company',
                credit_rating: 'A',
                bank_info: JSON.stringify({
                    bank_name: 'Vietcombank',
                    account_number: '1234567890',
                    account_holder: 'CONG TY TNHH ABC LOGISTICS'
                }),
                notes: 'Khách hàng VIP, thanh toán đúng hạn',
                created_by: 1
            },
            {
                customer_code: 'KH002',
                company_name: 'Công ty CP DEF Trading',
                contact_person: 'Trần Thị B',
                email: 'info@def-trading.com',
                phone: '0987654321',
                address: '456 Đường Lê Lợi, Quận 3, TP.HCM',
                tax_code: '0987654321',
                business_license: 'GP-HCM-654321',
                customer_type: 'company',
                credit_rating: 'B',
                bank_info: JSON.stringify({
                    bank_name: 'Techcombank',
                    account_number: '0987654321',
                    account_holder: 'CONG TY CP DEF TRADING'
                }),
                created_by: 1
            },
            {
                customer_code: 'KH003',
                company_name: null,
                contact_person: 'Lê Văn C',
                email: 'levanc@gmail.com',
                phone: '0912345678',
                address: '789 Đường Đinh Tiên Hoàng, Quận Bình Thạnh, TP.HCM',
                customer_type: 'individual',
                credit_rating: 'B',
                notes: 'Khách hàng cá nhân, kinh doanh nhỏ lẻ',
                created_by: 1
            }
        ];

        for (const customer of customers) {
            await pool.execute(
                `INSERT INTO customers (customer_code, company_name, contact_person, email, phone, address, tax_code, business_license, customer_type, credit_rating, bank_info, notes, created_by)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE contact_person = VALUES(contact_person)`,
                [customer.customer_code, customer.company_name, customer.contact_person, customer.email, customer.phone, customer.address, customer.tax_code, customer.business_license, customer.customer_type, customer.credit_rating, customer.bank_info, customer.notes, customer.created_by]
            );
        }

        // Create demo project tasks
        const tasks = [
            {
                project_id: 1,
                task_name: 'Kiểm tra phòng cháy chữa cháy',
                task_type: 'safety_check',
                description: 'Kiểm tra hệ thống PCCC, bình chữa cháy, lối thoát hiểm',
                schedule_type: 'monthly',
                schedule_config: JSON.stringify({ day: 1, hour: 8 }),
                priority: 'high',
                estimated_duration: 120,
                checklist: JSON.stringify([
                    'Kiểm tra bình chữa cháy',
                    'Kiểm tra hệ thống báo cháy',
                    'Kiểm tra lối thoát hiểm',
                    'Kiểm tra đèn chiếu sáng khẩn cấp'
                ]),
                next_due_date: '2024-03-01 08:00:00',
                created_by: 1
            },
            {
                project_id: 1,
                task_name: 'Kiểm tra an ninh',
                task_type: 'security_check',
                description: 'Kiểm tra camera, hệ thống báo động, an ninh tổng thể',
                schedule_type: 'weekly',
                schedule_config: JSON.stringify({ day: 1, hour: 6 }),
                priority: 'medium',
                estimated_duration: 60,
                checklist: JSON.stringify([
                    'Kiểm tra camera giám sát',
                    'Kiểm tra cửa ra vào',
                    'Kiểm tra hệ thống báo động',
                    'Kiểm tra đèn chiếu sáng'
                ]),
                next_due_date: '2024-02-19 06:00:00',
                created_by: 1
            }
        ];

        for (const task of tasks) {
            await pool.execute(
                `INSERT INTO project_tasks (project_id, task_name, task_type, description, schedule_type, schedule_config, priority, estimated_duration, checklist, next_due_date, created_by)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE task_name = VALUES(task_name)`,
                [task.project_id, task.task_name, task.task_type, task.description, task.schedule_type, task.schedule_config, task.priority, task.estimated_duration, task.checklist, task.next_due_date, task.created_by]
            );
        }

        logger.info('Demo data created successfully');

    } catch (error) {
        logger.error('Error creating demo data:', error);
        throw error;
    }
}

/**
 * Main initialization function
 */
async function initializeSystem() {
    try {
        logger.info('🚀 Starting KHO MVG system initialization...');

        // Connect to databases
        logger.info('📡 Connecting to databases...');
        await connectMongoDB();
        logger.info('✅ MongoDB connected');

        await connectMySQL();
        logger.info('✅ MySQL connected');

        // Initialize database schemas
        logger.info('🗄️ Initializing database schemas...');
        await initializeDatabase();
        logger.info('✅ Database schemas initialized');

        // Initialize extended tables for User Management & AI
        logger.info('🚀 Creating extended tables for User Management & AI...');
        await createExtendedTables();
        logger.info('✅ Extended tables created');

        // Initialize database schema documentation for AI
        logger.info('📚 Initializing database schema documentation...');
        await initializeSchemaDocumentation();
        logger.info('✅ Schema documentation initialized');

        // Initialize AI function definitions
        logger.info('🤖 Initializing AI function definitions...');
        await initializeAIFunctions();
        logger.info('✅ AI functions initialized');

        // Create demo data for development
        if (process.env.NODE_ENV === 'development') {
            logger.info('🎭 Creating demo data...');
            await createDemoData();
            logger.info('✅ Demo data created');
        }

        logger.info('🎉 KHO MVG system initialization completed successfully!');
        logger.info('');
        logger.info('📋 Default Admin Account:');
        logger.info('   Username: admin');
        logger.info('   Password: admin123');
        logger.info('');
        logger.info('🌐 Access the application at:');
        logger.info(`   Backend:  http://localhost:${process.env.PORT || 5000}`);
        logger.info(`   Frontend: http://localhost:3000`);
        logger.info(`   API Docs: http://localhost:${process.env.PORT || 5000}/api/docs`);
        logger.info('');

    } catch (error) {
        logger.error('❌ System initialization failed:', error);
        process.exit(1);
    } finally {
        // Close database connections
        const { closeDatabases } = require('../config/database');
        await closeDatabases();
        process.exit(0);
    }
}

// Run initialization if this script is executed directly
if (require.main === module) {
    initializeSystem();
}

module.exports = {
    initializeSystem,
    createDemoData
};