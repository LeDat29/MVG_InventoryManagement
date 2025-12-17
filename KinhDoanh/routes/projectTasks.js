/**
 * Project Tasks Routes
 * Feature 2.1.7 - Quản lý công việc định kỳ
 */

const express = require('express');
const router = express.Router({ mergeParams: true });
const { param, body, query, validationResult } = require('express-validator');
const { authenticateToken, requirePermission, requireRole } = require('../middleware/auth');
const { mysqlPool } = require('../config/database');
const { catchAsync } = require('../middleware/errorHandler');

/**
 * GET /api/projects/:projectId/tasks
 * Lấy danh sách tasks của dự án
 */
router.get('/', authenticateToken, catchAsync(async (req, res) => {
    const projectIdParam = req.params.projectId || req.params.id;
    const projectId = parseInt(projectIdParam);
    const { status, assigned_to, task_type } = req.query;
    const pageRaw = req.query.page;
    const limitRaw = req.query.limit;
    const pageNum = Number(pageRaw) > 0 ? Number(pageRaw) : 1;
    const limitNum = Number(limitRaw) > 0 ? Number(limitRaw) : 20;
    const offset = (pageNum - 1) * limitNum;

    const pool = mysqlPool();
    
    // Validate projectId
    if (!projectId || isNaN(projectId) || projectId <= 0) {
        return res.status(400).json({
            success: false,
            message: 'Project ID không hợp lệ'
        });
    }

    // Build query with parameterized statements to prevent SQL injection
    let query = `
        SELECT 
            t.*, 
            u1.full_name as assigned_to_name,
            u2.full_name as created_by_name
        FROM project_tasks t
        LEFT JOIN users u1 ON t.assigned_to = u1.id
        LEFT JOIN users u2 ON t.created_by = u2.id
        WHERE t.project_id = ?
    `;
    
    const queryParams = [projectId];

    if (status) {
        query += ` AND t.status = ?`;
        queryParams.push(status);
    }

    if (assigned_to) {
        const assignedToNum = Number(assigned_to);
        if (!isNaN(assignedToNum)) {
            query += ` AND t.assigned_to = ?`;
            queryParams.push(assignedToNum);
        }
    }

    if (task_type) {
        query += ` AND t.task_type = ?`;
        queryParams.push(task_type);
    }

    query += ` ORDER BY t.priority DESC, t.next_due_date ASC LIMIT ? OFFSET ?`;
    queryParams.push(limitNum, offset);

    const [tasks] = await pool.execute(query, queryParams);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM project_tasks t WHERE t.project_id = ?';
    const countParams = [projectId];
    
    if (status) {
        countQuery += ' AND t.status = ?';
        countParams.push(status);
    }
    if (assigned_to) {
        countQuery += ' AND assigned_to = ?';
        countParams.push(assigned_to);
    }
    if (task_type) {
        countQuery += ' AND task_type = ?';
        countParams.push(task_type);
    }

    const [countResult] = await pool.execute(countQuery, countParams.filter(p => p !== undefined));

    // Ensure response is always JSON
    res.setHeader('Content-Type', 'application/json');
    res.json({
        success: true,
        data: {
            tasks: tasks || [],
            pagination: {
                page: pageNum,
                limit: limitNum,
                total: countResult[0]?.total || 0,
                pages: Math.ceil((countResult[0]?.total || 0) / limitNum)
            }
        }
    });
}));

/**
 * POST /api/projects/:projectId/tasks
 * Tạo task mới
 */
router.post('/', [
    authenticateToken,
    requirePermission('project_edit'),
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('task_type').isIn(['fire_safety', 'security', 'maintenance', 'inspection', 'cleaning', 'equipment_check', 'other']),
    body('frequency').isIn(['daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'semiannual', 'yearly', 'one_time']),
    body('start_date').isISO8601(),
    body('due_date').isISO8601()
], catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }

    const projectIdParam = req.params.projectId || req.params.id;
    const projectId = parseInt(projectIdParam);
    
    if (!projectId || isNaN(projectId) || projectId <= 0) {
        return res.status(400).json({
            success: false,
            message: 'Project ID không hợp lệ'
        });
    }
    
    const {
        title,
        description,
        task_type,
        frequency,
        start_date,
        due_date,
        assigned_to,
        priority = 'medium',
        is_recurring = false,
        notify_before_days = 3
    } = req.body;

    const pool = mysqlPool();

    const [result] = await pool.execute(`
        INSERT INTO project_tasks (
            project_id, task_type, title, description, frequency,
            start_date, due_date, assigned_to, priority,
            is_recurring, notify_before_days, next_due_date, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
        projectId, task_type, title, description, frequency,
        start_date, due_date, assigned_to, priority,
        is_recurring, notify_before_days, is_recurring ? due_date : null,
        req.user.id
    ]);

    // Log history
    await pool.execute(`
        INSERT INTO task_history (task_id, user_id, action, new_value)
        VALUES (?, ?, 'created', ?)
    `, [result.insertId, req.user.id, JSON.stringify({ title, task_type, priority })]);

    res.status(201).json({
        success: true,
        data: { id: result.insertId },
        message: 'Task created successfully'
    });
}));

/**
 * GET /api/projects/:projectId/tasks/:taskId
 * Lấy chi tiết task
 */
router.get('/:taskId', authenticateToken, catchAsync(async (req, res) => {
    const { taskId } = req.params;
    const pool = mysqlPool();

    const [tasks] = await pool.execute(`
        SELECT 
            t.*,
            u1.full_name as assigned_to_name,
            u2.full_name as created_by_name,
            u3.full_name as completed_by_name
        FROM project_tasks t
        LEFT JOIN users u1 ON t.assigned_to = u1.id
        LEFT JOIN users u2 ON t.created_by = u2.id
        LEFT JOIN users u3 ON t.completed_by = u3.id
        WHERE t.id = ?
    `, [taskId]);

    if (tasks.length === 0) {
        return res.status(404).json({ success: false, message: 'Task not found' });
    }

    // Get comments
    const [comments] = await pool.execute(`
        SELECT c.*, u.full_name as user_name
        FROM task_comments c
        JOIN users u ON c.user_id = u.id
        WHERE c.task_id = ?
        ORDER BY c.created_at DESC
    `, [taskId]);

    res.json({
        success: true,
        data: {
            task: tasks[0],
            comments
        }
    });
}));

/**
 * PUT /api/projects/:projectId/tasks/:taskId
 * Cập nhật task
 */
router.put('/:taskId', [
    authenticateToken,
    requirePermission('project_edit')
], catchAsync(async (req, res) => {
    const { taskId } = req.params;
    const updates = req.body;
    const pool = mysqlPool();

    // Get old values for history
    const [oldTask] = await pool.execute('SELECT * FROM project_tasks WHERE id = ?', [taskId]);
    if (oldTask.length === 0) {
        return res.status(404).json({ success: false, message: 'Task not found' });
    }

    const allowedFields = [
        'title', 'description', 'task_type', 'frequency', 'start_date',
        'due_date', 'assigned_to', 'priority', 'status', 'notify_before_days'
    ];

    const updateFields = [];
    const updateValues = [];

    Object.keys(updates).forEach(key => {
        if (allowedFields.includes(key)) {
            updateFields.push(`${key} = ?`);
            updateValues.push(updates[key]);
        }
    });

    if (updateFields.length === 0) {
        return res.status(400).json({ success: false, message: 'No valid fields to update' });
    }

    updateFields.push('updated_by = ?');
    updateValues.push(req.user.id);
    updateValues.push(taskId);

    await pool.execute(
        `UPDATE project_tasks SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues
    );

    // Log history
    await pool.execute(`
        INSERT INTO task_history (task_id, user_id, action, old_value, new_value)
        VALUES (?, ?, 'updated', ?, ?)
    `, [taskId, req.user.id, JSON.stringify(oldTask[0]), JSON.stringify(updates)]);

    res.json({
        success: true,
        message: 'Task updated successfully'
    });
}));

/**
 * PATCH /api/projects/:projectId/tasks/:taskId/complete
 * Đánh dấu task hoàn thành
 */
router.patch('/:taskId/complete', [
    authenticateToken,
    body('completion_notes').optional().isString()
], catchAsync(async (req, res) => {
    const { taskId } = req.params;
    const { completion_notes } = req.body;
    const pool = mysqlPool();

    // Get task info
    const [task] = await pool.execute(
        'SELECT * FROM project_tasks WHERE id = ?',
        [taskId]
    );

    if (task.length === 0) {
        return res.status(404).json({ success: false, message: 'Task not found' });
    }

    const currentTask = task[0];

    // Update task as completed
    await pool.execute(`
        UPDATE project_tasks 
        SET status = 'completed',
            completed_by = ?,
            completed_at = NOW(),
            completion_notes = ?,
            last_completed_at = NOW(),
            updated_by = ?
        WHERE id = ?
    `, [req.user.id, completion_notes, req.user.id, taskId]);

    // If recurring, calculate next due date
    if (currentTask.is_recurring) {
        const nextDue = calculateNextDueDate(currentTask.due_date, currentTask.frequency);
        
        await pool.execute(`
            UPDATE project_tasks 
            SET next_due_date = ?
            WHERE id = ?
        `, [nextDue, taskId]);
    }

    // Log history
    await pool.execute(`
        INSERT INTO task_history (task_id, user_id, action, new_value)
        VALUES (?, ?, 'completed', ?)
    `, [taskId, req.user.id, JSON.stringify({ completion_notes })]);

    res.json({
        success: true,
        message: 'Task completed successfully'
    });
}));

/**
 * DELETE /api/projects/:projectId/tasks/:taskId
 * Xóa task
 */
router.delete('/:taskId', [
    authenticateToken,
    requirePermission('project_delete')
], catchAsync(async (req, res) => {
    const { taskId } = req.params;
    const pool = mysqlPool();

    await pool.execute('DELETE FROM project_tasks WHERE id = ?', [taskId]);

    res.json({
        success: true,
        message: 'Task deleted successfully'
    });
}));

/**
 * Helper: Calculate next due date based on frequency
 */
function calculateNextDueDate(currentDueDate, frequency) {
    const date = new Date(currentDueDate);
    
    switch (frequency) {
        case 'daily':
            date.setDate(date.getDate() + 1);
            break;
        case 'weekly':
            date.setDate(date.getDate() + 7);
            break;
        case 'biweekly':
            date.setDate(date.getDate() + 14);
            break;
        case 'monthly':
            date.setMonth(date.getMonth() + 1);
            break;
        case 'quarterly':
            date.setMonth(date.getMonth() + 3);
            break;
        case 'semiannual':
            date.setMonth(date.getMonth() + 6);
            break;
        case 'yearly':
            date.setFullYear(date.getFullYear() + 1);
            break;
        default:
            return null;
    }
    
    return date.toISOString().split('T')[0];
}

module.exports = router;
