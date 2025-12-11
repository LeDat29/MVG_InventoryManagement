# 🏭 KHO MVG - Hệ thống Quản lý Hỗ trợ Kinh doanh các Dự án Kho xưởng

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/your-repo/kho-mvg)
[![Node.js](https://img.shields.io/badge/Node.js-18.x-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18.x-61dafb.svg)](https://reactjs.org/)
[![PWA](https://img.shields.io/badge/PWA-Ready-orange.svg)](https://web.dev/progressive-web-apps/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## 📋 Mô tả

**KHO MVG** là hệ thống quản lý toàn diện cho các dự án kho xưởng, được thiết kế để hỗ trợ kinh doanh hiệu quả với các tính năng:

- ✅ **Quản lý Dự án**: CRUD dự án, Google Maps integration, quản lý zones với color coding
- ✅ **Quản lý Khách hàng**: Hồ sơ khách hàng, hợp đồng thuê, cảnh báo hết hạn
- ✅ **Quản lý Hồ sơ**: Upload/download files, template hợp đồng tự động, danh mục tài liệu
- ✅ **Authentication**: JWT với refresh token, role-based permissions, comprehensive logging
- ✅ **PWA Support**: Có thể cài đặt như app mobile, offline functionality
- ✅ **Responsive Design**: Tối ưu cho desktop và mobile

## 🛠️ Tech Stack

### Backend
- **Node.js** + **Express.js** - RESTful API server
- **MongoDB** - Document storage (logs, files metadata)
- **MySQL** - Relational data (users, projects, contracts)
- **JWT** - Authentication & authorization
- **Multer** - File upload handling
- **Winston** - Comprehensive logging system

### Frontend  
- **React.js 18** - Modern UI library
- **Bootstrap 5** + **React-Bootstrap** - Responsive UI components
- **React Router** - SPA navigation
- **React Query** - API state management & caching
- **Chart.js** - Data visualization
- **Google Maps API** - Map integration
- **PWA** - Progressive Web App capabilities

## 🚀 Cài đặt

### Yêu cầu hệ thống
- **Node.js** >= 18.x
- **MongoDB** >= 6.0
- **MySQL** >= 8.0
- **Google Maps API Key**

### 1. Clone Repository
```bash
git clone https://github.com/your-repo/kho-mvg.git
cd kho-mvg
```

### 2. Cài đặt Dependencies
```bash
# Install backend dependencies
npm install

# Install frontend dependencies  
cd client && npm install
cd ..
```

### 3. Cấu hình Environment
```bash
# Copy environment file
cp .env.example .env

# Edit environment variables
nano .env
```

**Cấu hình `.env`:**
```env
# Server
PORT=5000
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb://localhost:27017/kho_mvg

# MySQL
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=kho_mvg

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your-refresh-token-secret

# Google Maps
GOOGLE_MAPS_API_KEY=your-google-maps-api-key

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads

# Email (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### 4. Khởi tạo Database
```bash
# Start MongoDB service
sudo systemctl start mongod

# Start MySQL service  
sudo systemctl start mysql

# Run the application to auto-create tables
npm run dev
```

### 5. Chạy ứng dụng

#### Development Mode
```bash
# Start backend server (http://localhost:5000)
npm run dev

# In another terminal, start frontend (http://localhost:3000)  
npm run dev:frontend
```

#### Production Mode
```bash
# Build frontend
npm run build

# Start production server
npm start
```

## 📱 PWA Installation

Ứng dụng hỗ trợ cài đặt như một Progressive Web App:

1. Mở ứng dụng trên Chrome/Safari mobile
2. Nhấn vào banner "Cài đặt ứng dụng" 
3. Hoặc sử dụng menu "Add to Home Screen"

## 🔐 Authentication

### Default Admin Account
- **Username**: `admin`
- **Password**: `admin123`
- **Role**: `admin` (full permissions)

### Demo Accounts (Development)
- **Manager**: `manager` / `manager123`
- **Staff**: `staff` / `staff123`  
- **Viewer**: `viewer` / `viewer123`

### Role-based Permissions

| Role | Permissions |
|------|-------------|
| **Admin** | Toàn quyền hệ thống |
| **Manager** | Quản lý dự án, khách hàng, hợp đồng |
| **Staff** | Xem và chỉnh sửa được assign |
| **Viewer** | Chỉ xem dữ liệu |

## 🗺️ Google Maps Setup

1. Tạo Google Cloud Project
2. Enable Maps JavaScript API
3. Create API Key với restrictions:
   ```
   - HTTP referrers: your-domain.com/*
   - API restrictions: Maps JavaScript API
   ```
4. Add API key vào `.env`

## 📊 Features Overview

### 1. Quản lý Dự án (2.1)
- **2.1.1** ✅ CRUD thông tin dự án kho
- **2.1.2** ✅ Google Maps với zones color-coded (đỏ/xanh/cam/trắng)
- **2.1.3** ✅ Quản lý hồ sơ pháp lý  
- **2.1.4** ✅ Thống kê diện tích sử dụng
- **2.1.5** 🚧 Import bản vẽ mặt bằng (planned)
- **2.1.6** 🚧 Export file bản vẽ (planned)
- **2.1.7** 🚧 Quản lý công việc định kỳ (planned)

### 2. Quản lý Khách hàng (2.2)  
- **2.2.1** ✅ CRUD thông tin khách hàng
- **2.2.2** ✅ Quản lý hợp đồng, cảnh báo hết hạn
- **2.2.3** ✅ Template hợp đồng tự động

### 3. Quản lý Hồ sơ (2.3)
- **2.3.1-2.3.4** ✅ Quản lý danh mục hồ sơ (project/customer/contract/task)

### 4. Additional Features
- ✅ **Dashboard**: Thống kê tổng quan với charts
- ✅ **Reports**: Báo cáo doanh thu, tỷ lệ thuê
- ✅ **User Management**: Quản lý người dùng, roles, permissions
- ✅ **File Management**: Upload/download với security
- ✅ **API Documentation**: Swagger UI tự động
- ✅ **Logging**: Comprehensive activity logs

## 📚 API Documentation

Truy cập Swagger UI tại: `http://localhost:5000/api/docs`

### Key API Endpoints

#### Authentication
```bash
POST /api/auth/login          # Login
POST /api/auth/logout         # Logout  
POST /api/auth/refresh        # Refresh token
GET  /api/auth/profile        # Get user profile
```

#### Projects
```bash
GET    /api/projects          # List projects
POST   /api/projects          # Create project
GET    /api/projects/:id      # Get project details
PUT    /api/projects/:id      # Update project
GET    /api/projects/:id/zones # Get project zones
```

#### Customers & Contracts
```bash
GET    /api/customers         # List customers
POST   /api/customers         # Create customer
GET    /api/customers/:id     # Get customer details
GET    /api/contracts         # List contracts
POST   /api/customers/contracts # Create contract
```

#### Documents
```bash
GET    /api/documents         # List documents
POST   /api/documents/upload  # Upload files
GET    /api/documents/download/:id # Download file
```

## 🔧 Development

### Available Scripts

```bash
npm run dev              # Start development server
npm run dev:frontend     # Start React development server
npm run build           # Build for production  
npm run test            # Run tests
npm run docs            # Generate JSDoc documentation
npm run install:all     # Install all dependencies
```

### Project Structure

```
kho-mvg/
├── 📁 client/                 # React frontend
│   ├── 📁 public/            # Static files + PWA config
│   ├── 📁 src/
│   │   ├── 📁 components/    # Reusable components
│   │   ├── 📁 contexts/      # React contexts
│   │   ├── 📁 pages/         # Page components
│   │   └── 📄 index.js       # App entry point
│   └── 📄 package.json
├── 📁 config/                # Backend configuration
├── 📁 middleware/            # Express middleware
├── 📁 routes/                # API routes
├── 📁 uploads/               # File uploads
├── 📁 logs/                  # Application logs  
├── 📄 server.js              # Backend entry point
├── 📄 package.json
└── 📄 README.md
```

## 🚀 Deployment

### Local Server
```bash
npm run build
npm start
```

### CPanel Hosting

1. **Upload files** qua File Manager
2. **Setup Node.js App** trong CPanel:
   ```
   - Node.js Version: 18.x
   - Application Root: /public_html/kho-mvg
   - Application URL: your-domain.com
   ```
3. **Cài đặt dependencies**:
   ```bash
   npm install --production
   ```
4. **Configure database** connections
5. **Set environment variables** trong CPanel

### Docker (Optional)
```bash
# Build image
docker build -t kho-mvg .

# Run container
docker run -p 5000:5000 -e NODE_ENV=production kho-mvg
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run backend tests only  
npm run test:backend

# Run frontend tests only
cd client && npm test
```

## 📝 Logging

Hệ thống logging comprehensive với Winston:

- **Application logs**: `logs/app.log`
- **Error logs**: `logs/error.log`  
- **Security logs**: `logs/security.log`
- **User activity**: Database + logs
- **API requests**: Detailed request/response logging

## 🔒 Security Features

- ✅ **JWT Authentication** với refresh tokens
- ✅ **Rate Limiting** chống abuse
- ✅ **Input Validation** với express-validator  
- ✅ **SQL Injection Protection** với parameterized queries
- ✅ **XSS Protection** với helmet.js
- ✅ **File Upload Security** với mimetype validation
- ✅ **Comprehensive Logging** cho audit trail

## 🤝 Contributing

1. Fork repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## 📜 License

Distributed under the MIT License. See `LICENSE` for more information.

## 📞 Support

- **Email**: admin@kho-mvg.com
- **Documentation**: `/api/docs`
- **Issues**: [GitHub Issues](https://github.com/your-repo/kho-mvg/issues)

## 🎯 Roadmap

### Phase 1 - Completed ✅
- [x] Core backend API với authentication
- [x] React frontend với PWA support  
- [x] Project & Customer management
- [x] Document management system
- [x] Basic reporting & dashboard

### Phase 2 - Planned 🚧
- [ ] Google Maps zones drawing tools
- [ ] Advanced file import (DWG, CAD)
- [ ] Email notifications system
- [ ] Mobile-specific optimizations
- [ ] Advanced reporting & analytics

### Phase 3 - Future 💭  
- [ ] Multi-tenant support
- [ ] API integrations (ERP systems)
- [ ] Advanced workflow automation
- [ ] Machine learning insights

---

🏭 **KHO MVG** - Quản lý kho xưởng thông minh và hiệu quả!