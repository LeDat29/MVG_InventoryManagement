/**
 * Project Zones Routes - KHO MVG
 * Quản lý các khu vực trong dự án
 */

const express = require('express');
const { body, validationResult, param } = require('express-validator');
const { mysqlPool } = require('../config/database');
const { logger, logUserActivity } = require('../config/logger');
const { catchAsync } = require('../middleware/errorHandler');
const { requirePermission } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });

router.get('/', catchAsync(async (req, res) => {
    const projectId = req.params.id;
    const status = req.query.status;
    const zoneType = req.query.zone_type;

    const pool = mysqlPool();

    // Detect if is_active column exists to avoid SQL errors
    const [colCheck] = await pool.execute(`
        SELECT COUNT(*) AS col_exists
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'warehouse_zones'
          AND COLUMN_NAME = 'is_active'
    `);
    const hasIsActive = colCheck[0]?.col_exists > 0;

    let query = `
         SELECT wz.*, 
             c.customer_code, COALESCE(c.name, c.full_name) AS company_name, c.representative_name as contact_person,
               ct.contract_number, ct.start_date, ct.end_date, ct.rental_price as current_rental_price
        FROM warehouse_zones wz
        LEFT JOIN contracts ct ON wz.id = ct.zone_id AND ct.status = 'active'
        LEFT JOIN customers c ON ct.customer_id = c.id
        WHERE wz.project_id = ? ${hasIsActive ? 'AND wz.is_active = TRUE' : ''} /* filter by is_active only if column exists */
    `;
    const params = [projectId];

    if (status) {
        query += ' AND wz.status = ?';
        params.push(status);
    }

    if (zoneType) {
        query += ' AND wz.zone_type = ?';
        params.push(zoneType);
    }

    query += ' ORDER BY wz.zone_code';

    // pool already initialized above
    const [zones] = await pool.execute(query, params);

    // Parse JSON fields và thêm thông tin color
    zones.forEach(zone => {
        // Parse JSON fields safely
        try {
            zone.coordinates = zone.coordinates ? JSON.parse(zone.coordinates) : null;
        } catch (e) {
            zone.coordinates = null;
        }
        try {
            zone.facilities = zone.facilities ? JSON.parse(zone.facilities) : null;
        } catch (e) {
            zone.facilities = null;
        }
        
        // Thêm thông tin màu sắc dựa trên status
        switch (zone.status) {
            case 'available':
                zone.color = '#dc3545'; // Đỏ - chưa cho thuê
                zone.color_name = 'Đỏ - Chưa cho thuê';
                break;
            case 'rented':
                zone.color = '#28a745'; // Xanh - đã cho thuê
                zone.color_name = 'Xanh - Đã cho thuê';
                break;
            case 'deposited':
                zone.color = '#fd7e14'; // Cam - đã nhận cọc
                zone.color_name = 'Cam - Đã nhận cọc';
                break;
            case 'maintenance':
                zone.color = '#ffffff'; // Trắng - bảo trì/cố định
                zone.color_name = 'Trắng - Khu vực cố định';
                break;
            default:
                zone.color = '#6c757d'; // Xám - không xác định
                zone.color_name = 'Xám - Không xác định';
        }

        // Thêm thông tin khách thuê nếu có
        if (zone.customer_code) {
            zone.tenant_info = {
                customer_code: zone.customer_code,
                company_name: zone.company_name,
                contact_person: zone.contact_person,
                contract_number: zone.contract_number,
                start_date: zone.start_date,
                end_date: zone.end_date,
                current_rental_price: zone.current_rental_price
            };
        }
        
        // Xóa các field trực tiếp để tránh duplicate
        delete zone.customer_code;
        delete zone.company_name;
        delete zone.contact_person;
        delete zone.contract_number;
        delete zone.start_date;
        delete zone.end_date;
        delete zone.current_rental_price;
    });

    const colorLegend = {
        available: { color: '#dc3545', name: 'Đỏ - Chưa cho thuê' },
        rented: { color: '#28a745', name: 'Xanh - Đã cho thuê' },
        deposited: { color: '#fd7e14', name: 'Cam - Đã nhận cọc' },
        maintenance: { color: '#ffffff', name: 'Trắng - Khu vực cố định/bảo trì' }
    };

    if (req.user && req.user.id) {
    await logUserActivity(req.user.id, 'VIEW_PROJECT_ZONES', 'project', projectId, req.ip, req.get('User-Agent'));
  }

    res.json({
        success: true,
        data: {
            zones,
            color_legend: colorLegend,
            total_zones: zones.length
        }
    });
}));


router.get('/:zoneId', [
    param('zoneId').isInt().withMessage('Zone ID phải là số nguyên')
], catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Dữ liệu không hợp lệ',
            errors: errors.array()
        });
    }

    const projectId = req.params.id;
    const zoneId = req.params.zoneId;

    const pool = mysqlPool();

    // Detect if is_active column exists
    const [colCheck2] = await pool.execute(`
        SELECT COUNT(*) AS col_exists
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'warehouse_zones'
          AND COLUMN_NAME = 'is_active'
    `);
    const hasIsActive2 = colCheck2[0]?.col_exists > 0;

    const [zones] = await pool.execute(`
        SELECT wz.*, 
               c.customer_code, COALESCE(c.name, c.full_name) AS company_name, c.representative_name as contact_person, c.email, c.phone,
               ct.contract_number, ct.start_date, ct.end_date, ct.rental_price,
               ct.deposit_amount, ct.payment_cycle, ct.status as contract_status
        FROM warehouse_zones wz
        LEFT JOIN contracts ct ON wz.id = ct.zone_id AND ct.status = 'active'
        LEFT JOIN customers c ON ct.customer_id = c.id
        WHERE wz.id = ? AND wz.project_id = ? ${hasIsActive2 ? 'AND wz.is_active = TRUE' : ''}
    `, [zoneId, projectId]);

    if (zones.length === 0) {
        return res.status(404).json({
            success: false,
            message: 'Zone không tìm thấy'
        });
    }

    const zone = zones[0];
    zone.coordinates = zone.coordinates ? JSON.parse(zone.coordinates) : null;
    zone.facilities = zone.facilities ? JSON.parse(zone.facilities) : null;

    // Thêm thông tin khách thuê nếu có
    if (zone.customer_code) {
        zone.tenant_info = {
            customer_code: zone.customer_code,
            company_name: zone.company_name,
            contact_person: zone.contact_person,
            email: zone.email,
            phone: zone.phone,
            contract_number: zone.contract_number,
            start_date: zone.start_date,
            end_date: zone.end_date,
            rental_price: zone.rental_price,
            deposit_amount: zone.deposit_amount,
            payment_cycle: zone.payment_cycle,
            contract_status: zone.contract_status
        };
    }

    // Lịch sử hợp đồng
    const [contractHistory] = await pool.execute(`
        SELECT ct.*, COALESCE(c.name, c.full_name) AS company_name, c.representative_name as contact_person
        FROM contracts ct
        LEFT JOIN customers c ON ct.customer_id = c.id
        WHERE ct.zone_id = ?
        ORDER BY ct.created_at DESC
        LIMIT 10
    `, [zoneId]);

    if (req.user && req.user.id) {
        await logUserActivity(req.user.id, 'VIEW_ZONE_DETAIL', 'warehouse_zone', zoneId, req.ip, req.get('User-Agent'));
    }

    res.json({
        success: true,
        data: {
            zone,
            contract_history: contractHistory
        }
    });
}));


router.post('/', requirePermission('zone_create'), [
    body('zone_code').trim().notEmpty().withMessage('Mã zone là bắt buộc')
        .isLength({ max: 50 }).withMessage('Mã zone không được quá 50 ký tự'),
    body('area').isFloat({ min: 0 }).withMessage('Diện tích phải là số dương'),
    body('zone_type').optional().isIn(['rental', 'fixed_service', 'common_area']).withMessage('Loại zone không hợp lệ'),
    body('status').optional().isIn(['available', 'rented', 'deposited', 'maintenance']).withMessage('Trạng thái zone không hợp lệ')
], catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Dữ liệu không hợp lệ',
            errors: errors.array()
        });
    }

    const projectId = req.params.id;
    const {
        zone_code, zone_name, area, zone_type = 'rental', 
        status = 'available', rental_price, coordinates, 
        facilities, description
    } = req.body;

    const pool = mysqlPool();

    // Kiểm tra mã zone đã tồn tại trong dự án
    const [existingZones] = await pool.execute(
        'SELECT id FROM warehouse_zones WHERE project_id = ? AND zone_code = ? AND is_active = TRUE',
        [projectId, zone_code]
    );

    if (existingZones.length > 0) {
        return res.status(409).json({
            success: false,
            message: 'Mã zone đã tồn tại trong dự án này'
        });
    }

    // Kiểm tra dự án có tồn tại
    const [projects] = await pool.execute(
        'SELECT id, total_area, used_area FROM projects WHERE id = ? AND is_active = TRUE',
        [projectId]
    );

    if (projects.length === 0) {
        return res.status(404).json({
            success: false,
            message: 'Dự án không tìm thấy'
        });
    }

    // Tạo zone mới
    const [result] = await pool.execute(`
        INSERT INTO warehouse_zones (
            project_id, zone_code, zone_name, area, zone_type, 
            status, rental_price, coordinates, facilities, description
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
        projectId, zone_code, zone_name, area, zone_type,
        status, rental_price,
        coordinates ? JSON.stringify(coordinates) : null,
        facilities ? JSON.stringify(facilities) : null,
        description
    ]);

    // Cập nhật diện tích đã sử dụng trong dự án
    await pool.execute(`
        UPDATE projects SET 
            used_area = used_area + ?,
            available_area = total_area - (used_area + ?)
        WHERE id = ?
    `, [area, area, projectId]);

    await logUserActivity(
        req.user.id,
        'CREATE_ZONE',
        'warehouse_zone',
        result.insertId,
        req.ip,
        req.get('User-Agent'),
        { projectId, zoneCode: zone_code, area }
    );

    res.status(201).json({
        success: true,
        message: 'Tạo zone thành công',
        data: {
            id: result.insertId,
            zone_code,
            area
        }
    });
}));


router.patch('/:zoneId/status', requirePermission('zone_update'), [
    param('zoneId').isInt().withMessage('Zone ID phải là số nguyên'),
    body('status').isIn(['available', 'rented', 'deposited', 'maintenance']).withMessage('Trạng thái không hợp lệ')
], catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Dữ liệu không hợp lệ',
            errors: errors.array()
        });
    }

    const projectId = req.params.id;
    const zoneId = req.params.zoneId;
    const { status, reason } = req.body;

    const pool = mysqlPool();

    // Lấy trạng thái hiện tại
    const [zones] = await pool.execute(
        'SELECT zone_code, status as current_status FROM warehouse_zones WHERE id = ? AND project_id = ? AND is_active = TRUE',
        [zoneId, projectId]
    );

    if (zones.length === 0) {
        return res.status(404).json({
            success: false,
            message: 'Zone không tìm thấy'
        });
    }

    const currentStatus = zones[0].current_status;
    
    if (currentStatus === status) {
        return res.status(400).json({
            success: false,
            message: 'Trạng thái zone đã là ' + status
        });
    }

    // Cập nhật trạng thái
    const [result] = await pool.execute(
        'UPDATE warehouse_zones SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [status, zoneId]
    );

    await logUserActivity(
        req.user.id,
        'UPDATE_ZONE_STATUS',
        'warehouse_zone',
        zoneId,
        req.ip,
        req.get('User-Agent'),
        { 
            projectId, 
            zoneCode: zones[0].zone_code,
            oldStatus: currentStatus, 
            newStatus: status, 
            reason 
        }
    );

    res.json({
        success: true,
        message: `Cập nhật trạng thái zone thành công: ${currentStatus} → ${status}`,
        data: {
            zone_id: zoneId,
            old_status: currentStatus,
            new_status: status
        }
    });
}));


router.patch('/bulk-update', requirePermission('zone_bulk_update'), [
    body('zones').isArray().withMessage('Zones phải là array'),
    body('zones.*.zone_code').notEmpty().withMessage('Zone code là bắt buộc')
], catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Dữ liệu không hợp lệ',
            errors: errors.array()
        });
    }

    const projectId = req.params.id;
    const { zones } = req.body;

    const pool = mysqlPool();
    let updatedCount = 0;
    let createdCount = 0;

    // Transaction để đảm bảo data consistency
    await pool.execute('START TRANSACTION');

    try {
        for (const zoneData of zones) {
            const { zone_code, coordinates, status, area, zone_name } = zoneData;

            // Kiểm tra zone đã tồn tại
            const [existingZones] = await pool.execute(
                'SELECT id FROM warehouse_zones WHERE project_id = ? AND zone_code = ? AND is_active = TRUE',
                [projectId, zone_code]
            );

            if (existingZones.length > 0) {
                // Update existing zone
                await pool.execute(`
                    UPDATE warehouse_zones SET 
                        coordinates = ?,
                        status = COALESCE(?, status),
                        area = COALESCE(?, area),
                        zone_name = COALESCE(?, zone_name),
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                `, [
                    coordinates ? JSON.stringify(coordinates) : null,
                    status, area, zone_name,
                    existingZones[0].id
                ]);
                updatedCount++;
            } else {
                // Create new zone
                await pool.execute(`
                    INSERT INTO warehouse_zones (
                        project_id, zone_code, zone_name, area, 
                        coordinates, status
                    ) VALUES (?, ?, ?, ?, ?, ?)
                `, [
                    projectId, zone_code, zone_name, area || 0,
                    coordinates ? JSON.stringify(coordinates) : null,
                    status || 'available'
                ]);
                createdCount++;
            }
        }

        await pool.execute('COMMIT');

        await logUserActivity(
            req.user.id,
            'BULK_UPDATE_ZONES',
            'project',
            projectId,
            req.ip,
            req.get('User-Agent'),
            { updatedCount, createdCount, totalZones: zones.length }
        );

        res.json({
            success: true,
            message: 'Cập nhật hàng loạt zones thành công',
            data: {
                updated: updatedCount,
                created: createdCount,
                total: zones.length
            }
        });
    } catch (error) {
        await pool.execute('ROLLBACK');
        throw error;
    }
}));

module.exports = router;