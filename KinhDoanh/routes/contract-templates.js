
router.get('/', requirePermission('contract_template_read'), catchAsync(async (req, res) => {
    const { template_type, is_active = true } = req.query;
    const pool = mysqlPool();

    let whereConditions = ['1=1'];
    const queryParams = [];

    if (template_type) {
        whereConditions.push('ct.template_type = ?');
        queryParams.push(template_type);
    }

    if (is_active !== undefined) {
        whereConditions.push('ct.is_active = ?');
        queryParams.push(is_active === 'true' || is_active === true ? 1 : 0);
    }

    const [templates] = await pool.execute(`
        SELECT 
            ct.*,
            u.username as created_by_name
        FROM contract_templates ct
        LEFT JOIN users u ON ct.created_by = u.id
        WHERE ${whereConditions.join(' AND ')}
        ORDER BY ct.is_default DESC, ct.created_at DESC
    `, queryParams);

    // Defensive: only try to count usage if the contracts.template_id column exists in the current database
    if (templates.length > 0) {
        const [[colInfo]] = await pool.execute(`
            SELECT COUNT(*) AS col_exists 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
              AND TABLE_NAME = 'contracts' 
              AND COLUMN_NAME = 'template_id'
        `);

        if (colInfo && colInfo.col_exists > 0) {
            // Get counts grouped by template_id for all returned templates
            const templateIds = templates.map(t => t.id);
            const placeholders = templateIds.map(() => '?').join(',');
            const [counts] = await pool.execute(
                `SELECT template_id, COUNT(*) AS cnt FROM contracts WHERE template_id IN (${placeholders}) GROUP BY template_id`,
                templateIds
            );

            const countsMap = counts.reduce((m, row) => {
                m[row.template_id] = row.cnt;
                return m;
            }, {});

            templates.forEach(t => {
                t.usage_count = countsMap[t.id] || 0;
            });
        } else {
            // Column does not exist, default usage_count to 0
            templates.forEach(t => { t.usage_count = 0; });
        }
    }

    res.json({
        success: true,
        data: templates
    });
}));


router.get('/:id', requirePermission('contract_template_read'), [
    param('id').isInt().withMessage('Template ID phải là số nguyên')
], catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Dữ liệu không hợp lệ',
            errors: errors.array()
        });
    }

    const templateId = req.params.id;
    const pool = mysqlPool();

    const [templates] = await pool.execute(`
        SELECT 
            ct.*,
            u.username as created_by_name
        FROM contract_templates ct
        LEFT JOIN users u ON ct.created_by = u.id
        WHERE ct.id = ?
    `, [templateId]);

    if (templates.length === 0) {
        return res.status(404).json({
            success: false,
            message: 'Mẫu hợp đồng không tìm thấy'
        });
    }

    const template = templates[0];
    
    // Handle variables field (MySQL2 may auto-parse JSON)
    if (Array.isArray(template.variables)) {
        // Already parsed by MySQL2
        // Keep as is
    } else if (template.variables && typeof template.variables === 'string') {
        // String that needs parsing
        try {
            template.variables = JSON.parse(template.variables);
        } catch (error) {
            console.error('Error parsing template variables:', error);
            template.variables = [];
        }
    } else {
        // Null, undefined, or other
        template.variables = [];
    }

    res.json({
        success: true,
        data: template
    });
}));


router.post('/', requirePermission('contract_template_create'), [
    body('template_name').trim().notEmpty().withMessage('Tên mẫu là bắt buộc'),
    body('template_code').trim().notEmpty().withMessage('Mã mẫu là bắt buộc'),
    body('template_content').trim().notEmpty().withMessage('Nội dung mẫu là bắt buộc'),
    body('variables').optional().isArray().withMessage('Variables phải là array')
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
        template_name,
        template_code,
        template_type = 'warehouse_rental',
        template_content,
        variables = [],
        version = '1.0',
        is_active = true,
        is_default = false
    } = req.body;

    const pool = mysqlPool();

    // Check if template code already exists
    const [existing] = await pool.execute(
        'SELECT id FROM contract_templates WHERE template_code = ?',
        [template_code]
    );

    if (existing.length > 0) {
        return res.status(400).json({
            success: false,
            message: 'Mã mẫu đã tồn tại'
        });
    }

    // If setting as default, remove default flag from others
    if (is_default) {
        await pool.execute(
            'UPDATE contract_templates SET is_default = FALSE WHERE template_type = ?',
            [template_type]
        );
    }

    const [result] = await pool.execute(`
        INSERT INTO contract_templates (
            template_name, template_code, template_type, template_content,
            variables, version, is_active, is_default, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
        template_name, template_code, template_type, template_content,
        JSON.stringify(variables), version, is_active, is_default, req.user.id
    ]);

    await logUserActivity(
        req.user.id,
        'CREATE_TEMPLATE',
        'contract_template',
        result.insertId,
        req.ip,
        req.get('User-Agent'),
        { templateCode: template_code, templateName: template_name }
    );

    res.status(201).json({
        success: true,
        message: 'Tạo mẫu hợp đồng thành công',
        data: { id: result.insertId }
    });
}));


router.post('/:id/generate', requirePermission('contract_create'), [
    param('id').isInt().withMessage('Template ID phải là số nguyên'),
    body('contract_id').isInt().withMessage('Contract ID phải là số nguyên'),
    body('variables').isObject().withMessage('Variables phải là object')
], catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Dữ liệu không hợp lệ',
            errors: errors.array()
        });
    }

    const templateId = req.params.id;
    const { contract_id, variables, document_name, category_id = 1 } = req.body;
    const pool = mysqlPool();

    // Get template
    const [templates] = await pool.execute(
        'SELECT * FROM contract_templates WHERE id = ? AND is_active = TRUE',
        [templateId]
    );

    if (templates.length === 0) {
        return res.status(404).json({
            success: false,
            message: 'Mẫu hợp đồng không tìm thấy hoặc không hoạt động'
        });
    }

    const template = templates[0];

    // Generate content by replacing variables
    let generatedContent = template.template_content;
    
    for (const [key, value] of Object.entries(variables)) {
        const regex = new RegExp(`{{${key}}}`, 'g');
        generatedContent = generatedContent.replace(regex, value || '');
    }

    // Get next version number
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
    await pool.execute(`
        UPDATE contract_documents 
        SET is_latest = FALSE 
        WHERE contract_id = ? AND category_id = ?
    `, [contract_id, category_id]);

    // Insert new document
    const [result] = await pool.execute(`
        INSERT INTO contract_documents (
            contract_id, category_id, document_name, document_type,
            version, is_latest, content, variables, status, created_by
        ) VALUES (?, ?, ?, 'contract', ?, TRUE, ?, ?, 'draft', ?)
    `, [
        contract_id, category_id, 
        document_name || `${template.template_name} v${newVersion}`,
        newVersion, generatedContent, JSON.stringify(variables), req.user.id
    ]);

    res.json({
        success: true,
        message: 'Tạo tài liệu từ mẫu thành công',
        data: {
            document_id: result.insertId,
            version: newVersion,
            content: generatedContent
        }
    });
}));

module.exports = router;