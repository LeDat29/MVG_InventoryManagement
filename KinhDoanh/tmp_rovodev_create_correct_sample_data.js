/**
 * Create correct sample data for contracts system
 */

const mysql = require('mysql2/promise');

async function createSampleData() {
    try {
        console.log('🔄 Creating sample data...');
        
        const connection = await mysql.createConnection({
            host: 'localhost',
            port: 3306,
            user: 'root',
            password: '',
            database: 'kho_mvg'
        });

        console.log('✅ Connected to MySQL');

        // 1. Create sample customers with correct columns
        console.log('📊 Creating sample customers...');
        
        const customers = [
            {
                customer_code: 'KH001',
                customer_type: 'company',
                name: 'Công ty TNHH ABC Logistics',
                tax_code: '0123456789',
                address: '123 Đường ABC, Q1, TP.HCM',
                representative_name: 'Nguyễn Văn A',
                representative_phone: '0123456789',
                representative_email: 'nguyenvana@email.com',
                phone: '0123456789',
                email: 'contact@abclogistics.com',
                status: 'active',
                notes: 'Khách hàng VIP, thanh toán đúng hạn',
                created_by: 1
            },
            {
                customer_code: 'KH002',
                customer_type: 'company',
                name: 'Công ty CP DEF Trading',
                tax_code: '0987654321',
                address: '456 Đường XYZ, Q2, TP.HCM',
                representative_name: 'Trần Thị B',
                representative_phone: '0987654321',
                representative_email: 'tranthib@email.com',
                phone: '0987654321',
                email: 'info@deftrading.com',
                status: 'active',
                notes: 'Khách hàng thường xuyên',
                created_by: 1
            },
            {
                customer_code: 'KH003',
                customer_type: 'company',
                name: 'Công ty TNHH GHI Import',
                tax_code: '0912345678',
                address: '789 Đường DEF, Q3, TP.HCM',
                representative_name: 'Lê Văn C',
                representative_phone: '0912345678',
                representative_email: 'levanc@email.com',
                phone: '0912345678',
                email: 'contact@ghiimport.com',
                status: 'active',
                notes: 'Khách hàng mới, tiềm năng lớn',
                created_by: 1
            }
        ];

        for (const customer of customers) {
            await connection.execute(`
                INSERT INTO customers (
                    customer_code, customer_type, name, tax_code, address,
                    representative_name, representative_phone, representative_email,
                    phone, email, status, notes, created_by,
                    created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
                ON DUPLICATE KEY UPDATE 
                    name = VALUES(name),
                    tax_code = VALUES(tax_code),
                    address = VALUES(address),
                    updated_at = NOW()
            `, [
                customer.customer_code, customer.customer_type, customer.name,
                customer.tax_code, customer.address, customer.representative_name,
                customer.representative_phone, customer.representative_email,
                customer.phone, customer.email, customer.status,
                customer.notes, customer.created_by
            ]);
        }

        console.log('✅ Created 3 sample customers');

        // 2. Create sample contract template
        console.log('📄 Creating sample contract template...');
        
        const templateContent = `
<div style="font-family: 'Times New Roman', serif; max-width: 800px; margin: 0 auto; padding: 20px;">
    <div style="text-align: center; margin-bottom: 30px;">
        <h1>HỢP ĐỒNG THUÊ KHO</h1>
        <p><strong>Số: {{contract_number}}</strong></p>
        <p>Ngày ký: {{signed_date}}</p>
    </div>

    <h3>CÁC BÊN THAM GIA HỢP ĐỒNG</h3>
    
    <div style="margin-bottom: 20px;">
        <h4>BÊN CHO THUÊ (Bên A):</h4>
        <p><strong>Tên:</strong> {{party_a_name}}</p>
        <p><strong>Địa chỉ:</strong> {{party_a_address}}</p>
        <p><strong>Người đại diện:</strong> {{party_a_representative}} - {{party_a_position}}</p>
        <p><strong>CMND/CCCD:</strong> {{party_a_id_number}}</p>
    </div>
    
    <div style="margin-bottom: 20px;">
        <h4>BÊN THUÊ (Bên B):</h4>
        <p><strong>Tên công ty:</strong> {{party_b_name}}</p>
        <p><strong>Địa chỉ:</strong> {{party_b_address}}</p>
        <p><strong>Mã số thuế:</strong> {{party_b_tax_code}}</p>
        <p><strong>Người đại diện:</strong> {{party_b_representative}} - {{party_b_position}}</p>
    </div>

    <h3>ĐIỀU KHOẢN HỢP ĐỒNG</h3>
    
    <div style="margin-bottom: 15px;">
        <h4>Điều 1: Đối tượng thuê</h4>
        <p>Bên A đồng ý cho Bên B thuê kho tại vị trí: <strong>{{warehouse_location}}</strong></p>
        <p>Diện tích: <strong>{{warehouse_area}} m²</strong></p>
    </div>
    
    <div style="margin-bottom: 15px;">
        <h4>Điều 2: Thời hạn thuê</h4>
        <p>Từ ngày: <strong>{{start_date}}</strong> đến ngày: <strong>{{end_date}}</strong></p>
    </div>
    
    <div style="margin-bottom: 15px;">
        <h4>Điều 3: Giá thuê và thanh toán</h4>
        <p>Giá thuê: <strong>{{rental_price}}/tháng</strong></p>
        <p>Tiền cọc: <strong>{{deposit_amount}}</strong></p>
        <p>Chu kỳ thanh toán: <strong>{{payment_cycle}}</strong></p>
        <p>Hạn thanh toán: Trước ngày <strong>{{payment_due_date}}</strong> hàng tháng</p>
    </div>
    
    <div style="margin-bottom: 15px;">
        <h4>Điều 4: Mục đích sử dụng</h4>
        <p>{{warehouse_purpose}}</p>
    </div>
    
    <div style="margin-bottom: 15px;">
        <h4>Điều 5: Điều khoản đặc biệt</h4>
        <p>{{special_terms}}</p>
    </div>

    <div style="display: flex; justify-content: space-between; margin-top: 50px;">
        <div style="text-align: center;">
            <p><strong>BÊN A</strong></p>
            <p>(Ký tên và đóng dấu)</p>
            <br><br><br>
            <p>{{party_a_representative}}</p>
        </div>
        <div style="text-align: center;">
            <p><strong>BÊN B</strong></p>
            <p>(Ký tên và đóng dấu)</p>
            <br><br><br>
            <p>{{party_b_representative}}</p>
        </div>
    </div>
</div>`;

        const templateVariables = [
            {"name": "contract_number", "type": "text", "required": true, "description": "Số hợp đồng"},
            {"name": "signed_date", "type": "date", "required": true, "description": "Ngày ký hợp đồng"},
            {"name": "party_a_name", "type": "text", "required": true, "description": "Tên bên cho thuê"},
            {"name": "party_a_address", "type": "text", "required": true, "description": "Địa chỉ bên cho thuê"},
            {"name": "party_a_representative", "type": "text", "required": true, "description": "Người đại diện bên A"},
            {"name": "party_a_position", "type": "text", "required": true, "description": "Chức vụ người đại diện bên A"},
            {"name": "party_a_id_number", "type": "text", "required": true, "description": "CMND/CCCD người đại diện bên A"},
            {"name": "party_b_name", "type": "text", "required": true, "description": "Tên công ty bên thuê"},
            {"name": "party_b_address", "type": "text", "required": true, "description": "Địa chỉ bên thuê"},
            {"name": "party_b_tax_code", "type": "text", "required": true, "description": "Mã số thuế bên thuê"},
            {"name": "party_b_representative", "type": "text", "required": true, "description": "Người đại diện bên B"},
            {"name": "party_b_position", "type": "text", "required": false, "description": "Chức vụ người đại diện bên B"},
            {"name": "warehouse_location", "type": "text", "required": true, "description": "Vị trí kho"},
            {"name": "warehouse_area", "type": "number", "required": true, "description": "Diện tích kho (m²)"},
            {"name": "start_date", "type": "date", "required": true, "description": "Ngày bắt đầu"},
            {"name": "end_date", "type": "date", "required": true, "description": "Ngày kết thúc"},
            {"name": "rental_price", "type": "currency", "required": true, "description": "Giá thuê/tháng"},
            {"name": "deposit_amount", "type": "currency", "required": false, "description": "Tiền cọc"},
            {"name": "payment_cycle", "type": "text", "required": true, "description": "Chu kỳ thanh toán"},
            {"name": "payment_due_date", "type": "number", "required": true, "description": "Ngày hạn thanh toán"},
            {"name": "warehouse_purpose", "type": "text", "required": false, "description": "Mục đích sử dụng kho"},
            {"name": "special_terms", "type": "text", "required": false, "description": "Điều khoản đặc biệt"}
        ];

        await connection.execute(`
            INSERT INTO contract_templates (
                template_name, template_code, template_type, template_content, 
                variables, version, is_active, is_default, created_by, 
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
            ON DUPLICATE KEY UPDATE 
                template_content = VALUES(template_content),
                variables = VALUES(variables),
                updated_at = NOW()
        `, [
            'Hợp đồng thuê kho tiêu chuẩn',
            'STANDARD_WAREHOUSE_RENTAL',
            'warehouse_rental',
            templateContent,
            JSON.stringify(templateVariables),
            '1.0',
            true,
            true,
            1
        ]);

        console.log('✅ Created contract template');

        // 3. Create sample contracts
        console.log('📋 Creating sample contracts...');
        
        const contracts = [
            {
                contract_number: 'HD202400001',
                contract_title: 'Hợp đồng thuê kho - Công ty ABC Logistics',
                customer_id: 1,
                template_id: 1,
                party_a_name: 'CÔNG TY KHO MVG',
                party_a_address: 'Khu công nghiệp ABC, Bình Dương',
                party_a_representative: 'Nguyễn Văn Nam',
                party_a_position: 'Giám đốc',
                party_a_id_number: '123456789',
                party_b_name: 'Công ty TNHH ABC Logistics',
                party_b_address: '123 Đường ABC, Q1, TP.HCM',
                party_b_representative: 'Nguyễn Văn A',
                party_b_position: 'Giám đốc',
                party_b_tax_code: '0123456789',
                warehouse_location: 'Khu A, Lô 01, Tầng 1',
                warehouse_area: 500.00,
                rental_price: 50000000.00,
                deposit_amount: 100000000.00,
                start_date: '2024-01-01',
                end_date: '2024-12-31',
                payment_cycle: 'monthly',
                payment_due_date: 5,
                payment_method: 'Chuyển khoản',
                special_terms: 'Không được chứa hàng nguy hiểm, dễ cháy nổ.',
                status: 'active',
                workflow_stage: 'execution',
                created_by: 1,
                assigned_to: 1
            }
        ];

        for (const contract of contracts) {
            await connection.execute(`
                INSERT INTO contracts (
                    contract_number, contract_title, customer_id, template_id,
                    party_a_name, party_a_address, party_a_representative, party_a_position, party_a_id_number,
                    party_b_name, party_b_address, party_b_representative, party_b_position, party_b_tax_code,
                    warehouse_location, warehouse_area, rental_price, deposit_amount,
                    start_date, end_date, payment_cycle, payment_due_date, payment_method,
                    special_terms, status, workflow_stage, created_by, assigned_to,
                    created_at, updated_at
                ) VALUES (
                    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW()
                )
                ON DUPLICATE KEY UPDATE updated_at = NOW()
            `, [
                contract.contract_number, contract.contract_title, contract.customer_id, contract.template_id,
                contract.party_a_name, contract.party_a_address, contract.party_a_representative, 
                contract.party_a_position, contract.party_a_id_number,
                contract.party_b_name, contract.party_b_address, contract.party_b_representative,
                contract.party_b_position, contract.party_b_tax_code,
                contract.warehouse_location, contract.warehouse_area, contract.rental_price, 
                contract.deposit_amount, contract.start_date, contract.end_date, contract.payment_cycle, 
                contract.payment_due_date, contract.payment_method,
                contract.special_terms, contract.status, contract.workflow_stage, 
                contract.created_by, contract.assigned_to
            ]);
        }

        console.log('✅ Created sample contracts');

        console.log('\n🎉 Sample data created successfully!');
        console.log('📊 Summary:');
        console.log('   ✅ 3 customers with proper structure');
        console.log('   ✅ 1 contract template with variables');
        console.log('   ✅ 1 sample contract');
        
        await connection.end();
        
    } catch (error) {
        console.error('❌ Error creating sample data:', error.message);
        console.error(error.stack);
    }
}

createSampleData();