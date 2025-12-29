


router.post('/chat/start', authenticateToken, catchAsync(async (req, res) => {
    const userId = req.user.id;
    const sessionId = uuidv4();
    
    // Get user's AI configuration with lowest cost
    const aiConfig = await AIService.getOptimalAIConfig(userId);
    if (!aiConfig) {
        return res.status(400).json({
            success: false,
            message: 'Bạn chưa cấu hình API AI nào. Vui lòng liên hệ Admin để được hỗ trợ.'
        });
    }

    const pool = mysqlPool();
    
    // Create chat session
    await pool.execute(`
        INSERT INTO ai_chat_sessions (session_id, user_id, ai_provider, ai_model, status)
        VALUES (?, ?, ?, ?, 'active')
    `, [sessionId, userId, aiConfig.provider, aiConfig.model]);

    // Get database schema for context
    const schemaContext = await DatabaseService.getDatabaseSchemaForAI();

    // Sanitize user data before inserting into system prompt
    const sanitizeForPrompt = (text) => {
        if (!text) return '';
        return text
            .replace(/[<>{}[\]]/g, '')
            .replace(/\n{3,}/g, '\n\n')
            .substring(0, 200);
    };
    
    // Create system message with context
    const systemMessage = `Bạn là trợ lý AI thông minh của hệ thống KHO MVG - quản lý kho xưởng.

THÔNG TIN HỆ THỐNG:
- Tên hệ thống: KHO MVG (Quản lý hỗ trợ kinh doanh các dự án kho xưởng)
- User hiện tại: ${sanitizeForPrompt(req.user.full_name)} (Role: ${req.user.role})
- Quyền của user: ${JSON.stringify(req.user.permissions)}

CẤU TRÚC DATABASE:
${schemaContext}

NHIỆM VỤ CỦA BẠN:
1. Trả lời câu hỏi về dữ liệu kho xưởng, dự án, khách hàng, hợp đồng
2. Tạo SQL queries an toàn để truy vấn dữ liệu (chỉ SELECT, không được INSERT/UPDATE/DELETE)
3. Phân tích và báo cáo dữ liệu theo yêu cầu
4. Hỗ trợ tìm kiếm thông tin nhanh chóng
5. Đưa ra khuyến nghị kinh doanh dựa trên dữ liệu

QUY TẮC AN TOÀN:
- CHỈ được thực thi SQL SELECT queries
- Kiểm tra quyền hạn của user trước khi trả lời
- Không tiết lộ thông tin nhạy cảm không thuộc quyền của user
- Luôn validate input từ user
- Trả lời bằng tiếng Việt, chuyên nghiệp và thân thiện

Hãy chào user và sẵn sàng hỗ trợ!`;

    await AIService.addMessageToSession(sessionId, 'system', systemMessage);

    await logUserActivity(userId, 'AI_CHAT_START', 'ai_session', null, req.ip, req.get('User-Agent'), {
        sessionId, aiProvider: aiConfig.provider, aiModel: aiConfig.model
    }, true, sessionId, aiConfig.provider);

    res.json({
        success: true,
        message: 'Khởi tạo chat session thành công',
        data: {
            session_id: sessionId,
            ai_provider: aiConfig.provider,
            ai_model: aiConfig.model,
            welcome_message: `Xin chào ${req.user.full_name}! Tôi là trợ lý AI của hệ thống KHO MVG. Tôi có thể giúp bạn:

📊 Truy vấn và phân tích dữ liệu dự án, kho bãi
👥 Tìm kiếm thông tin khách hàng và hợp đồng  
📈 Tạo báo cáo thống kê theo yêu cầu
🔍 Tìm kiếm thông tin nhanh chóng
💡 Đưa ra khuyến nghị kinh doanh

Bạn muốn hỏi gì ạ?`
        }
    });
}));


router.post('/chat/message', authenticateToken, [
    body('session_id').notEmpty().withMessage('Session ID là bắt buộc'),
    body('message').trim().isLength({ min: 1 }).withMessage('Tin nhắn không được rỗng')
], catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Dữ liệu không hợp lệ',
            errors: errors.array()
        });
    }

    const { session_id, message } = req.body;
    const userId = req.user.id;
    
    // Additional validation for message length and content
    if (message.length > 5000) {
        return res.status(400).json({
            success: false,
            message: 'Tin nhắn quá dài (tối đa 5000 ký tự)'
        });
    }
    
    // Check for suspicious patterns (potential prompt injection)
    const suspiciousPatterns = [
        /ignore\s+(all\s+)?(previous|above|prior)\s+instructions/i,
        /system\s*:\s*(you\s+are|act\s+as|behave\s+like)/i,
        /\[INST\]|\[\/INST\]/i,
        /\<\|system\|\>|\<\|assistant\|\>|\<\|user\|\>/i,
        /forget\s+(everything|all|previous)/i,
        /disregard\s+(the|all|previous)/i
    ];
    
    for (const pattern of suspiciousPatterns) {
        if (pattern.test(message)) {
            logger.warn('Potential prompt injection detected', {
                userId: req.user.id,
                sessionId: session_id,
                messagePreview: message.substring(0, 100)
            });
            return res.status(400).json({
                success: false,
                message: 'Tin nhắn chứa nội dung không hợp lệ hoặc vi phạm quy tắc sử dụng'
            });
        }
    }

    const pool = mysqlPool();

    // Verify session belongs to user
    const [sessions] = await pool.execute(
        'SELECT * FROM ai_chat_sessions WHERE session_id = ? AND user_id = ? AND status = "active"',
        [session_id, userId]
    );

    if (sessions.length === 0) {
        return res.status(404).json({
            success: false,
            message: 'Session không tìm thấy hoặc đã kết thúc'
        });
    }

    const session = sessions[0];

    // Check for cached response first
    const cachedResponse = await AIService.getCachedResponse(message);
    
    let response, sqlQuery, queryResult, aiCost = 0, tokensUsed = 0;

    if (cachedResponse) {
        response = cachedResponse.response_data;
        sqlQuery = cachedResponse.sql_query;
        
        // Execute the cached SQL if it's a data query
        if (sqlQuery && sqlQuery.trim().toUpperCase().startsWith('SELECT')) {
            try {
                queryResult = await DatabaseService.executeSafeQuery(sqlQuery, userId, req.user.permissions);
            } catch (error) {
                logger.error('Cached query execution failed:', error);
                queryResult = { error: 'Lỗi thực thi câu query cached' };
            }
        }

        // Update cache usage
        await pool.execute(
            'UPDATE ai_query_cache SET usage_count = usage_count + 1, last_used_at = NOW() WHERE question_hash = ?',
            [cachedResponse.question_hash]
        );

        logger.info('Used cached AI response', { sessionId: session_id, questionHash: cachedResponse.question_hash });
    } else {
        // Get fresh AI response
        const aiResult = await AIService.processUserMessage(session_id, message, userId, req.user);
        response = aiResult.response;
        sqlQuery = aiResult.sqlQuery;
        queryResult = aiResult.queryResult;
        aiCost = aiResult.cost;
        tokensUsed = aiResult.tokensUsed;
    }

    // Add user message to session
    await AIService.addMessageToSession(session_id, 'user', message, 0, 0);

    // Add assistant response to session
    await AIService.addMessageToSession(session_id, 'assistant', response, tokensUsed, aiCost, null, sqlQuery ? {
        sql_query: sqlQuery,
        query_result: queryResult
    } : null);

    // Update session totals
    await pool.execute(`
        UPDATE ai_chat_sessions 
        SET total_messages = total_messages + 2, 
            total_tokens = total_tokens + ?, 
            total_cost = total_cost + ?
        WHERE session_id = ?
    `, [tokensUsed, aiCost, session_id]);

    await logUserActivity(userId, 'AI_CHAT_MESSAGE', 'ai_session', null, req.ip, req.get('User-Agent'), {
        sessionId: session_id, 
        messageLength: message.length,
        hasQuery: !!sqlQuery,
        fromCache: !!cachedResponse,
        cost: aiCost
    }, true, session_id, session.ai_provider, aiCost);

    res.json({
        success: true,
        data: {
            response,
            sql_query: sqlQuery,
            query_result: queryResult,
            tokens_used: tokensUsed,
            cost: aiCost,
            from_cache: !!cachedResponse
        }
    });
}));


router.get('/chat/:sessionId/messages', [
    param('sessionId').notEmpty().withMessage('Session ID không hợp lệ')
], authenticateToken, catchAsync(async (req, res) => {
    const { sessionId } = req.params;
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    const pool = mysqlPool();

    // Verify session ownership
    const [sessions] = await pool.execute(
        'SELECT * FROM ai_chat_sessions WHERE session_id = ? AND user_id = ?',
        [sessionId, userId]
    );

    if (sessions.length === 0) {
        return res.status(404).json({
            success: false,
            message: 'Session không tìm thấy'
        });
    }

    // Get messages
    const [messages] = await pool.execute(`
        SELECT role, content, tokens_used, cost, response_time_ms, function_name, function_arguments, created_at
        FROM ai_chat_messages 
        WHERE session_id = ? 
        ORDER BY created_at DESC 
        LIMIT ? OFFSET ?
    `, [sessionId, limit, offset]);

    res.json({
        success: true,
        data: {
            session: sessions[0],
            messages: messages.reverse(), // Reverse to show chronological order
            pagination: {
                limit,
                offset,
                has_more: messages.length === limit
            }
        }
    });
}));


router.get('/chat/sessions', authenticateToken, catchAsync(async (req, res) => {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;

    const pool = mysqlPool();

    const [sessions] = await pool.execute(`
        SELECT session_id, title, ai_provider, ai_model, total_messages, total_tokens, total_cost, 
               status, started_at, ended_at
        FROM ai_chat_sessions 
        WHERE user_id = ? 
        ORDER BY started_at DESC 
        LIMIT ? OFFSET ?
    `, [userId, limit, offset]);

    res.json({
        success: true,
        data: { sessions }
    });
}));


router.post('/chat/:sessionId/end', authenticateToken, catchAsync(async (req, res) => {
    const { sessionId } = req.params;
    const userId = req.user.id;

    const pool = mysqlPool();

    const [result] = await pool.execute(`
        UPDATE ai_chat_sessions 
        SET status = 'ended', ended_at = NOW() 
        WHERE session_id = ? AND user_id = ? AND status = 'active'
    `, [sessionId, userId]);

    if (result.affectedRows === 0) {
        return res.status(404).json({
            success: false,
            message: 'Session không tìm thấy hoặc đã kết thúc'
        });
    }

    await logUserActivity(userId, 'AI_CHAT_END', 'ai_session', null, req.ip, req.get('User-Agent'), {
        sessionId
    }, true, sessionId);

    res.json({
        success: true,
        message: 'Đã kết thúc chat session'
    });
}));


router.post('/chat/rate', authenticateToken, [
    body('session_id').notEmpty().withMessage('Session ID là bắt buộc'),
    body('message_id').isInt().withMessage('Message ID phải là số nguyên'),
    body('follow_up_question').optional().isString()
], catchAsync(async (req, res) => {
    const { session_id, message_id, follow_up_question } = req.body;
    const userId = req.user.id;

    const pool = mysqlPool();

    // Verify message belongs to user's session
    const [messages] = await pool.execute(`
        SELECT acm.*, acs.user_id 
        FROM ai_chat_messages acm
        JOIN ai_chat_sessions acs ON acm.session_id = acs.session_id
        WHERE acm.id = ? AND acm.session_id = ? AND acs.user_id = ?
    `, [message_id, session_id, userId]);

    if (messages.length === 0) {
        return res.status(404).json({
            success: false,
            message: 'Message không tìm thấy'
        });
    }

    const message = messages[0];

    // Calculate satisfaction score
    let satisfactionScore = 100; // Default perfect score
    
    if (follow_up_question) {
        // User has follow-up question about the same topic
        // Reduce satisfaction score
        satisfactionScore = Math.max(satisfactionScore - 5, 0);
        
        // Check if this is about the same question (simple similarity check)
        const [previousMessages] = await pool.execute(`
            SELECT content FROM ai_chat_messages 
            WHERE session_id = ? AND id < ? AND role = 'user' 
            ORDER BY id DESC LIMIT 1
        `, [session_id, message_id]);

        if (previousMessages.length > 0) {
            const originalQuestion = previousMessages[0].content;
            const questionHash = crypto.createHash('md5').update(originalQuestion.toLowerCase()).digest('hex');
            
            // Update cached response with lower satisfaction score
            await pool.execute(`
                UPDATE ai_query_cache 
                SET satisfaction_score = GREATEST(satisfaction_score - 5, 0),
                    success_count = success_count + 1
                WHERE question_hash = ?
            `, [questionHash]);
        }
    }

    await logUserActivity(userId, 'AI_RESPONSE_RATED', 'ai_message', message_id, req.ip, req.get('User-Agent'), {
        sessionId: session_id,
        satisfactionScore,
        hasFollowUp: !!follow_up_question
    }, true, session_id);

    res.json({
        success: true,
        message: 'Đã ghi nhận đánh giá của bạn',
        data: {
            satisfaction_score: satisfactionScore
        }
    });
}));


router.get('/admin/cache', authenticateToken, catchAsync(async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Chỉ Admin mới có quyền truy cập'
        });
    }

    const pool = mysqlPool();
    const [cache] = await pool.execute(`
        SELECT id, question, sql_query, satisfaction_score, usage_count, success_count, last_used_at, created_at
        FROM ai_query_cache 
        ORDER BY usage_count DESC, satisfaction_score DESC
        LIMIT 100
    `);

    res.json({
        success: true,
        data: { cache }
    });
}));


router.put('/admin/cache/:id', authenticateToken, [
    body('sql_query').notEmpty().withMessage('SQL query là bắt buộc'),
    body('satisfaction_score').isInt({ min: 0, max: 100 }).withMessage('Satisfaction score phải từ 0-100')
], catchAsync(async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Chỉ Admin mới có quyền truy cập'
        });
    }

    const { id } = req.params;
    const { sql_query, satisfaction_score } = req.body;

    const pool = mysqlPool();
    const [result] = await pool.execute(
        'UPDATE ai_query_cache SET sql_query = ?, satisfaction_score = ?, updated_by = ? WHERE id = ?',
        [sql_query, satisfaction_score, req.user.id, id]
    );

    if (result.affectedRows === 0) {
        return res.status(404).json({
            success: false,
            message: 'Cache entry không tìm thấy'
        });
    }

    await logUserActivity(req.user.id, 'AI_CACHE_UPDATE', 'ai_cache', id, req.ip, req.get('User-Agent'), {
        newScore: satisfaction_score
    });

    res.json({
        success: true,
        message: 'Cập nhật cache thành công'
    });
}));

module.exports = router;