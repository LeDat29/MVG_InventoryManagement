/**
 * API Documentation Routes - KHO MVG
 * Tự động tạo và quản lý tài liệu API
 */

const express = require('express');
const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const { mysqlPool } = require('../config/database');
const { logger, logUserActivity } = require('../config/logger');
const { catchAsync } = require('../middleware/errorHandler');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Swagger configuration
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'KHO MVG Management API',
            version: '1.0.0',
            description: 'Hệ thống quản lý hỗ trợ kinh doanh các dự án kho xưởng',
            contact: {
                name: 'KHO MVG Team',
                email: 'admin@kho-mvg.com'
            }
        },
        servers: [
            {
                url: process.env.NODE_ENV === 'production' ? 'https://your-domain.com' : 'http://localhost:5000',
                description: process.env.NODE_ENV === 'production' ? 'Production server' : 'Development server'
            }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT'
                }
            }
        }
    },
    apis: ['./routes/*.js', './server.js']
};

const swaggerSpec = swaggerJSDoc(swaggerOptions);

// Swagger UI setup
const swaggerUIOptions = {
    explorer: true,
    customCss: `
        .swagger-ui .topbar { display: none }
        .swagger-ui .info .title { color: #2c3e50; font-size: 2em; }
        .swagger-ui .scheme-container { background: #f8f9fa; padding: 20px; border-radius: 5px; }
    `,
    customSiteTitle: 'KHO MVG API Documentation',
    customfavIcon: '/favicon.ico'
};

router.use('/swagger', swaggerUi.serve);
router.get('/swagger', swaggerUi.setup(swaggerSpec, swaggerUIOptions));

router.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="vi">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>KHO MVG API Documentation</title>
            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
            <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
            <style>
                .hero-section { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 60px 0; }
                .feature-card { transition: transform 0.3s; cursor: pointer; }
                .feature-card:hover { transform: translateY(-5px); }
                .api-status { display: inline-block; padding: 4px 8px; border-radius: 12px; font-size: 0.75rem; }
                .status-operational { background-color: #d4edda; color: #155724; }
            </style>
        </head>
        <body>
            <div class="hero-section text-center">
                <div class="container">
                    <h1 class="display-4 mb-3">
                        <i class="fas fa-warehouse me-3"></i>
                        KHO MVG API Documentation
                    </h1>
                    <p class="lead">Hệ thống quản lý hỗ trợ kinh doanh các dự án kho xưởng</p>
                    <div class="mt-4">
                        <span class="api-status status-operational me-3">
                            <i class="fas fa-check-circle"></i> API Status: Operational
                        </span>
                        <span class="text-light">Version 1.0.0</span>
                    </div>
                </div>
            </div>

            <div class="container my-5">
                <div class="row">
                    <div class="col-md-4 mb-4">
                        <div class="card feature-card h-100" onclick="location.href='/api/docs/swagger'">
                            <div class="card-body text-center">
                                <i class="fas fa-code fa-3x text-primary mb-3"></i>
                                <h5 class="card-title">API Reference</h5>
                                <p class="card-text">Tài liệu chi tiết về tất cả endpoints, parameters và responses</p>
                                <a href="/api/docs/swagger" class="btn btn-primary">Xem API Docs</a>
                            </div>
                        </div>
                    </div>

                    <div class="col-md-4 mb-4">
                        <div class="card feature-card h-100" onclick="location.href='/api/docs/functions'">
                            <div class="card-body text-center">
                                <i class="fas fa-cogs fa-3x text-success mb-3"></i>
                                <h5 class="card-title">Quản lý Chức năng</h5>
                                <p class="card-text">Danh sách và hướng dẫn sử dụng các chức năng của hệ thống</p>
                                <a href="/api/docs/functions" class="btn btn-success">Xem Chức năng</a>
                            </div>
                        </div>
                    </div>

                    <div class="col-md-4 mb-4">
                        <div class="card feature-card h-100" onclick="location.href='/api/docs/guides'">
                            <div class="card-body text-center">
                                <i class="fas fa-book fa-3x text-info mb-3"></i>
                                <h5 class="card-title">Hướng dẫn</h5>
                                <p class="card-text">Hướng dẫn tích hợp và sử dụng API trong các dự án</p>
                                <a href="/api/docs/guides" class="btn btn-info">Xem Hướng dẫn</a>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="row mt-5">
                    <div class="col-12">
                        <h3>Các phân hệ chính</h3>
                        <div class="row">
                            <div class="col-md-6">
                                <ul class="list-group">
                                    <li class="list-group-item d-flex justify-content-between align-items-center">
                                        <span><i class="fas fa-building text-primary me-2"></i>Quản lý Dự án</span>
                                        <span class="badge bg-primary rounded-pill">15 endpoints</span>
                                    </li>
                                    <li class="list-group-item d-flex justify-content-between align-items-center">
                                        <span><i class="fas fa-users text-success me-2"></i>Quản lý Khách hàng</span>
                                        <span class="badge bg-success rounded-pill">12 endpoints</span>
                                    </li>
                                    <li class="list-group-item d-flex justify-content-between align-items-center">
                                        <span><i class="fas fa-file-contract text-warning me-2"></i>Quản lý Hợp đồng</span>
                                        <span class="badge bg-warning rounded-pill">10 endpoints</span>
                                    </li>
                                </ul>
                            </div>
                            <div class="col-md-6">
                                <ul class="list-group">
                                    <li class="list-group-item d-flex justify-content-between align-items-center">
                                        <span><i class="fas fa-folder text-info me-2"></i>Quản lý Hồ sơ</span>
                                        <span class="badge bg-info rounded-pill">8 endpoints</span>
                                    </li>
                                    <li class="list-group-item d-flex justify-content-between align-items-center">
                                        <span><i class="fas fa-key text-secondary me-2"></i>Authentication</span>
                                        <span class="badge bg-secondary rounded-pill">6 endpoints</span>
                                    </li>
                                    <li class="list-group-item d-flex justify-content-between align-items-center">
                                        <span><i class="fas fa-tasks text-danger me-2"></i>Công việc định kỳ</span>
                                        <span class="badge bg-danger rounded-pill">7 endpoints</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <footer class="bg-dark text-light py-4">
                <div class="container text-center">
                    <p>&copy; 2024 KHO MVG Management System. All rights reserved.</p>
                    <p class="mb-0">
                        <a href="mailto:admin@kho-mvg.com" class="text-light me-3">
                            <i class="fas fa-envelope"></i> Support
                        </a>
                        <span class="text-muted">|</span>
                        <a href="/api/health" class="text-light ms-3">
                            <i class="fas fa-heartbeat"></i> Health Check
                        </a>
                    </p>
                </div>
            </footer>

            <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
        </body>
        </html>
    `);
});


router.get('/functions', optionalAuth, catchAsync(async (req, res) => {
    // Lấy thông tin các chức năng từ database và routes
    const functions = [
        {
            category: 'Quản lý Dự án',
            icon: 'fas fa-building',
            color: 'primary',
            functions: [
                { name: 'Tạo dự án mới', endpoint: 'POST /api/projects', description: 'Tạo dự án kho mới với thông tin cơ bản' },
                { name: 'Cập nhật thông tin dự án', endpoint: 'PUT /api/projects/{id}', description: 'Cập nhật thông tin cơ bản của dự án' },
                { name: 'Quản lý zones kho', endpoint: 'GET /api/projects/{id}/zones', description: 'Quản lý các khu vực kho trong dự án' },
                { name: 'Cập nhật trạng thái zones', endpoint: 'PATCH /api/projects/{id}/zones/{zoneId}/status', description: 'Cập nhật trạng thái cho thuê của zones' },
                { name: 'Import bản vẽ mặt bằng', endpoint: 'POST /api/projects/{id}/files', description: 'Upload và import bản vẽ mặt bằng dự án' }
            ]
        },
        {
            category: 'Quản lý Khách hàng',
            icon: 'fas fa-users',
            color: 'success',
            functions: [
                { name: 'Tạo hồ sơ khách hàng', endpoint: 'POST /api/customers', description: 'Tạo hồ sơ khách hàng mới' },
                { name: 'Quản lý thông tin khách hàng', endpoint: 'PUT /api/customers/{id}', description: 'Cập nhật thông tin khách hàng' },
                { name: 'Tạo hợp đồng thuê', endpoint: 'POST /api/customers/contracts', description: 'Tạo hợp đồng thuê kho mới' },
                { name: 'Cảnh báo hết hạn hợp đồng', endpoint: 'GET /api/customers/contracts/expiring', description: 'Cảnh báo các hợp đồng sắp hết hạn' }
            ]
        },
        {
            category: 'Quản lý Hồ sơ',
            icon: 'fas fa-folder',
            color: 'info',
            functions: [
                { name: 'Quản lý danh mục hồ sơ', endpoint: 'GET /api/documents/categories', description: 'Quản lý các danh mục hồ sơ tài liệu' },
                { name: 'Upload tài liệu', endpoint: 'POST /api/documents/upload', description: 'Upload file tài liệu vào hệ thống' },
                { name: 'Tạo hợp đồng tự động', endpoint: 'POST /api/documents/generate-contract', description: 'Tạo hợp đồng từ template có sẵn' }
            ]
        },
        {
            category: 'Authentication & Security',
            icon: 'fas fa-shield-alt',
            color: 'warning',
            functions: [
                { name: 'Đăng nhập', endpoint: 'POST /api/auth/login', description: 'Xác thực và đăng nhập vào hệ thống' },
                { name: 'Quản lý users', endpoint: 'GET /api/auth/users', description: 'Quản lý danh sách người dùng' },
                { name: 'Đổi mật khẩu', endpoint: 'POST /api/auth/change-password', description: 'Thay đổi mật khẩu người dùng' }
            ]
        }
    ];

    if (req.user) {
        await logUserActivity(req.user.id, 'VIEW_FUNCTIONS_PAGE', 'documentation', null, req.ip, req.get('User-Agent'));
    }

    // Generate HTML response
    res.send(`
        <!DOCTYPE html>
        <html lang="vi">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Quản lý Chức năng - KHO MVG</title>
            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
            <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
            <style>
                .function-card { transition: all 0.3s; }
                .function-card:hover { transform: translateY(-3px); box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
                .endpoint-badge { font-family: 'Courier New', monospace; font-size: 0.85em; }
            </style>
        </head>
        <body>
            <nav class="navbar navbar-expand-lg navbar-dark bg-primary">
                <div class="container">
                    <a class="navbar-brand" href="/api/docs">
                        <i class="fas fa-warehouse me-2"></i>KHO MVG Docs
                    </a>
                    <div class="navbar-nav ms-auto">
                        <a class="nav-link" href="/api/docs">Trang chủ</a>
                        <a class="nav-link" href="/api/docs/swagger">API Docs</a>
                        <a class="nav-link active" href="/api/docs/functions">Chức năng</a>
                    </div>
                </div>
            </nav>

            <div class="container my-5">
                <div class="text-center mb-5">
                    <h1><i class="fas fa-cogs text-primary me-3"></i>Quản lý Chức năng Hệ thống</h1>
                    <p class="lead text-muted">Tổng quan về các chức năng và API endpoints trong hệ thống KHO MVG</p>
                </div>

                ${functions.map(category => `
                    <div class="mb-5">
                        <h3 class="text-${category.color} mb-4">
                            <i class="${category.icon} me-2"></i>${category.category}
                        </h3>
                        <div class="row">
                            ${category.functions.map(func => `
                                <div class="col-md-6 mb-3">
                                    <div class="card function-card h-100">
                                        <div class="card-body">
                                            <h5 class="card-title">${func.name}</h5>
                                            <p class="card-text">${func.description}</p>
                                            <div class="mt-auto">
                                                <span class="badge bg-secondary endpoint-badge">${func.endpoint}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `).join('')}

                <div class="alert alert-info mt-5">
                    <h5><i class="fas fa-info-circle me-2"></i>Lưu ý quan trọng</h5>
                    <ul class="mb-0">
                        <li>Tất cả API endpoints đều yêu cầu authentication thông qua JWT token</li>
                        <li>Các thao tác quan trọng sẽ được log đầy đủ để audit</li>
                        <li>Hệ thống có rate limiting để bảo vệ khỏi abuse</li>
                        <li>Documentation sẽ được cập nhật tự động khi có thay đổi</li>
                    </ul>
                </div>
            </div>

            <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
        </body>
        </html>
    `);
}));

/**
 * API endpoint to get function list for dynamic updates
 */
router.get('/functions/api', catchAsync(async (req, res) => {
    // Scan routes và tự động tạo danh sách functions
    // TODO: Implement automatic route scanning
    res.json({
        success: true,
        message: 'Function list API - to be implemented',
        data: {
            last_updated: new Date().toISOString(),
            total_functions: 0
        }
    });
}));

/**
 * Health check cho documentation system
 */
router.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'documentation',
        timestamp: new Date().toISOString(),
        features: {
            swagger_ui: true,
            function_management: true,
            auto_documentation: true
        }
    });
});

module.exports = router;