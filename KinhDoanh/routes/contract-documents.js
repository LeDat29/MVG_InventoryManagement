/**
 * Contract Documents Routes - KHO MVG
 * Quản lý tài liệu hợp đồng và version control
 */

const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { requireAuth, requirePermission } = require('../middleware/auth');
const { mysqlPool } = require('../config/database');
const { logUserActivity } = require('../utils/activityLogger');
const { catchAsync } = require('../utils/errorHandler');

const router = express.Router();

// Apply authentication middleware
router.use(requireAuth);

/**
 * @swagger
 * /api/contract-documents/categories:
 *   get:
 *     summary: Lấy danh sách danh mục tài liệu
 */
router.get('/categories', requirePermission('contract_read'), catchAsync(async (req, res) => {
    const pool = mysqlPool();

    const [categories] = await pool.execute(`
        SELECT * FROM document_categories 
        WHERE is_active = TRUE 
        ORDER BY sort_order ASC, category_name ASC
    `);

    // Build hierarchical structure
    const categoriesMap = new Map();
    const rootCategories = [];

    categories.forEach(cat => {
        cat.children = [];
        categoriesMap.set(cat.id, cat);
        
        if (cat.parent_id === null) {
            rootCategories.push(cat);
        }
    });

    categories.forEach(cat => {
        if (cat.parent_id !== null) {
            const parent = categoriesMap.get(cat.parent_id);
            if (parent) {
                parent.children.push(cat);
            }
        }
    });

    res.json({
        success: true,
        data: {
            flat: categories,
            hierarchical: rootCategories
        }
    });
}));

/**
 * @swagger
 * /api/contract-documents/{contract_id}:
 *   get:
 *     summary: Lấy tài liệu của hợp đồng
 */
router.get('/:contract_id', requirePermission('contract_read'), [
    param('contract_id').isInt().withMessage('Contract ID phải là số nguyên')
], catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Dữ liệu không hợp lệ',
            errors: errors.array()
        });
    }

    const contractId = req.params.contract_id;
    const { category_id, latest_only = false } = req.query;
    const pool = mysqlPool();

    let whereConditions = ['cd.contract_id = ?'];
    const queryParams = [contractId];

    if (category_id) {
        whereConditions.push('cd.category_id = ?');
        queryParams.push(category_id);
    }

    if (latest_only === 'true') {
        whereConditions.push('cd.is_latest = TRUE');
    }

    const [documents] = await pool.execute(`
        SELECT 
            cd.*,
            dc.category_name,
            dc.category_code,
            dc.is_required,
            u.username as created_by_name,
            parent.document_name as parent_document_name,
            parent.version as parent_version,
            (SELECT COUNT(*) FROM contract_documents child 
             WHERE child.parent_document_id = cd.id) as child_versions_count
        FROM contract_documents cd
        LEFT JOIN document_categories dc ON cd.category_id = dc.id
        LEFT JOIN users u ON cd.created_by = u.id
        LEFT JOIN contract_documents parent ON cd.parent_document_id = parent.id
        WHERE ${whereConditions.join(' AND ')}
        ORDER BY dc.sort_order, cd.category_id, cd.version DESC, cd.created_at DESC
    `, queryParams);

    // Group by category
    const documentsByCategory = {};
    const allCategories = new Set();

    documents.forEach(doc => {
        allCategories.add(doc.category_id);
        if (!documentsByCategory[doc.category_id]) {
            documentsByCategory[doc.category_id] = {
                category_id: doc.category_id,
                category_name: doc.category_name,
                category_code: doc.category_code,
                is_required: doc.is_required,
                documents: []
            };
        }
        documentsByCategory[doc.category_id].documents.push(doc);
    });

    res.json({
        success: true,
        data: {
            documents: documents,
            by_category: Object.values(documentsByCategory),
            stats: {
                total_documents: documents.length,
                categories_count: allCategories.size,
                final_documents: documents.filter(d => d.status === 'final').length,
                draft_documents: documents.filter(d => d.status === 'draft').length
            }
        }
    });
}));

/**
 * @swagger
 * /api/contract-documents/document/{id}:
 *   get:
 *     summary: Lấy chi tiết tài liệu
 */
router.get('/document/:id', requirePermission('contract_read'), [
    param('id').isInt().withMessage('Document ID phải là số nguyên')
], catchAsync(async (req, res) => {
    const documentId = req.params.id;
    const pool = mysqlPool();

    const [documents] = await pool.execute(`
        SELECT 
            cd.*,
            dc.category_name,
            dc.category_code,
            u.username as created_by_name,
            c.contract_number,
            c.contract_title
        FROM contract_documents cd
        LEFT JOIN document_categories dc ON cd.category_id = dc.id
        LEFT JOIN users u ON cd.created_by = u.id
        LEFT JOIN contracts c ON cd.contract_id = c.id
        WHERE cd.id = ?
    `, [documentId]);

    if (documents.length === 0) {
        return res.status(404).json({
            success: false,
            message: 'Tài liệu không tìm thấy'
        });
    }

    const document = documents[0];

    // Get version history
    const [versions] = await pool.execute(`
        SELECT 
            cd.id, cd.version, cd.status, cd.created_at,
            u.username as created_by_name,
            CASE WHEN cd.id = ? THEN TRUE ELSE FALSE END as is_current
        FROM contract_documents cd
        LEFT JOIN users u ON cd.created_by = u.id
        WHERE cd.contract_id = ? AND cd.category_id = ?
        ORDER BY cd.version DESC
    `, [documentId, document.contract_id, document.category_id]);

    // Parse variables if JSON
    if (document.variables) {
        try {
            document.variables = JSON.parse(document.variables);
        } catch (e) {
            document.variables = {};
        }
    }

    // Parse signed_by if JSON
    if (document.signed_by) {
        try {
            document.signed_by = JSON.parse(document.signed_by);
        } catch (e) {
            document.signed_by = [];
        }
    }

    res.json({
        success: true,
        data: {
            document,
            versions
        }
    });
}));

/**
 * @swagger
 * /api/contract-documents:
 *   post:
 *     summary: Tạo tài liệu mới
 */
router.post('/', requirePermission('contract_create'), [
    body('contract_id').isInt().withMessage('Contract ID phải là số nguyên'),
    body('category_id').isInt().withMessage('Category ID phải là số nguyên'),
    body('document_name').trim().notEmpty().withMessage('Tên tài liệu là bắt buộc'),
    body('content').optional().isString().withMessage('Nội dung phải là string')
], catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Dữ liệu không hợp lệ',
            errors: errors.array()
        });
    }

    const {
        contract_id,
        category_id,
        document_name,
        document_type = 'contract',
        content = '',
        variables = {},
        parent_document_id = null,
        signature_required = false
    } = req.body;

    const pool = mysqlPool();

    // Check if contract exists and user has access
    const [contracts] = await pool.execute(
        'SELECT id FROM contracts WHERE id = ?',
        [contract_id]
    );

    if (contracts.length === 0) {
        return res.status(404).json({
            success: false,
            message: 'Hợp đồng không tìm thấy'
        });
    }

    // Get next version
    const [existingDocs] = await pool.execute(`
        SELECT version FROM contract_documents 
        WHERE contract_id = ? AND category_id = ?
        ORDER BY version DESC LIMIT 1
    `, [contract_id, category_id]);

    let newVersion = '1.0';
    if (existingDocs.length > 0) {
        const lastVersion = parseFloat(existingDocs[0].version);
        newVersion = (lastVersion + 0.1).toFixed(1);
    }

    // Mark previous versions as not latest
    if (!parent_document_id) {
        await pool.execute(`
            UPDATE contract_documents 
            SET is_latest = FALSE 
            WHERE contract_id = ? AND category_id = ?
        `, [contract_id, category_id]);
    }

    // Insert document
    const [result] = await pool.execute(`
        INSERT INTO contract_documents (
            contract_id, category_id, document_name, document_type,
            version, is_latest, parent_document_id, content, variables,
            signature_required, status, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?)
    `, [
        contract_id, category_id, document_name, document_type,
        newVersion, parent_document_id ? false : true, parent_document_id,
        content, JSON.stringify(variables), signature_required, req.user.id
    ]);

    await logUserActivity(
        req.user.id,
        'CREATE_DOCUMENT',
        'contract_document',
        result.insertId,
        req.ip,
        req.get('User-Agent'),
        { contractId: contract_id, documentName: document_name, version: newVersion }
    );

    res.status(201).json({
        success: true,
        message: 'Tạo tài liệu thành công',
        data: {
            id: result.insertId,
            version: newVersion
        }
    });
}));

/**
 * @swagger
 * /api/contract-documents/{id}:
 *   put:
 *     summary: Cập nhật tài liệu
 */
router.put('/:id', requirePermission('contract_update'), [
    param('id').isInt().withMessage('Document ID phải là số nguyên'),
    body('document_name').optional().trim().notEmpty().withMessage('Tên tài liệu không được trống'),
    body('content').optional().isString().withMessage('Nội dung phải là string')
], catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Dữ liệu không hợp lệ',
            errors: errors.array()
        });
    }

    const documentId = req.params.id;
    const {
        document_name,
        content,
        variables,
        status,
        is_locked = false
    } = req.body;

    const pool = mysqlPool();

    // Check if document exists and is not locked
    const [documents] = await pool.execute(
        'SELECT id, is_locked, status FROM contract_documents WHERE id = ?',
        [documentId]
    );

    if (documents.length === 0) {
        return res.status(404).json({
            success: false,
            message: 'Tài liệu không tìm thấy'
        });
    }

    if (documents[0].is_locked && documents[0].status === 'final') {
        return res.status(400).json({
            success: false,
            message: 'Không thể chỉnh sửa tài liệu đã được khóa hoặc finalized'
        });
    }

    // Build update query
    const updateFields = [];
    const updateValues = [];

    if (document_name !== undefined) {
        updateFields.push('document_name = ?');
        updateValues.push(document_name);
    }

    if (content !== undefined) {
        updateFields.push('content = ?');
        updateValues.push(content);
    }

    if (variables !== undefined) {
        updateFields.push('variables = ?');
        updateValues.push(JSON.stringify(variables));
    }

    if (status !== undefined) {
        updateFields.push('status = ?');
        updateValues.push(status);
    }

    if (is_locked !== undefined) {
        updateFields.push('is_locked = ?');
        updateValues.push(is_locked);
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    updateValues.push(documentId);

    await pool.execute(`
        UPDATE contract_documents 
        SET ${updateFields.join(', ')} 
        WHERE id = ?
    `, updateValues);

    await logUserActivity(
        req.user.id,
        'UPDATE_DOCUMENT',
        'contract_document',
        documentId,
        req.ip,
        req.get('User-Agent'),
        { status, isLocked: is_locked }
    );

    res.json({
        success: true,
        message: 'Cập nhật tài liệu thành công'
    });
}));

/**
 * @swagger
 * /api/contract-documents/{id}/create-version:
 *   post:
 *     summary: Tạo phiên bản mới của tài liệu
 */
router.post('/:id/create-version', requirePermission('contract_update'), [
    param('id').isInt().withMessage('Document ID phải là số nguyên'),
    body('comment').optional().isString().withMessage('Comment phải là string')
], catchAsync(async (req, res) => {
    const parentDocumentId = req.params.id;
    const { comment = 'Tạo phiên bản mới' } = req.body;
    const pool = mysqlPool();

    // Get parent document
    const [parentDocs] = await pool.execute(
        'SELECT * FROM contract_documents WHERE id = ?',
        [parentDocumentId]
    );

    if (parentDocs.length === 0) {
        return res.status(404).json({
            success: false,
            message: 'Tài liệu gốc không tìm thấy'
        });
    }

    const parentDoc = parentDocs[0];

    // Get next version number
    const [existingVersions] = await pool.execute(`
        SELECT version FROM contract_documents 
        WHERE contract_id = ? AND category_id = ?
        ORDER BY version DESC LIMIT 1
    `, [parentDoc.contract_id, parentDoc.category_id]);

    const lastVersion = parseFloat(existingVersions[0].version);
    const newVersion = (lastVersion + 0.1).toFixed(1);

    // Mark all versions as not latest
    await pool.execute(`
        UPDATE contract_documents 
        SET is_latest = FALSE 
        WHERE contract_id = ? AND category_id = ?
    `, [parentDoc.contract_id, parentDoc.category_id]);

    // Create new version
    const [result] = await pool.execute(`
        INSERT INTO contract_documents (
            contract_id, category_id, document_name, document_type,
            version, is_latest, parent_document_id, content, variables,
            signature_required, status, created_by
        ) VALUES (?, ?, ?, ?, ?, TRUE, ?, ?, ?, ?, 'draft', ?)
    `, [
        parentDoc.contract_id, parentDoc.category_id, 
        `${parentDoc.document_name} v${newVersion}`, parentDoc.document_type,
        newVersion, parentDocumentId, parentDoc.content, parentDoc.variables,
        parentDoc.signature_required, req.user.id
    ]);

    await logUserActivity(
        req.user.id,
        'CREATE_DOCUMENT_VERSION',
        'contract_document',
        result.insertId,
        req.ip,
        req.get('User-Agent'),
        { parentId: parentDocumentId, newVersion, comment }
    );

    res.json({
        success: true,
        message: 'Tạo phiên bản mới thành công',
        data: {
            id: result.insertId,
            version: newVersion
        }
    });
}));

module.exports = router;