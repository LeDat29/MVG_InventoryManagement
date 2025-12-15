# Changelog

Tất cả các thay đổi đáng chú ý cho dự án này sẽ được ghi lại trong tài liệu này.
Định dạng tuân theo Keep a Changelog và phiên bản theo SemVer (khi áp dụng).


## [Unreleased]
- Thu thập phản hồi người dùng và tinh chỉnh hiệu năng Frontend/Backend.
- Bổ sung tài liệu phát triển và kịch bản kiểm thử bổ sung cho các luồng quan trọng (Customers, Contracts, Projects).


## [1.0.0] - 2025-12-12
Tổng hợp các cải tiến, tính năng, và sửa lỗi lớn đã được thực hiện trong giai đoạn hoàn thiện hệ thống.

### Added
- Tích hợp Google Maps và các thành phần bản đồ:
  - `ProjectMapView`, `GoogleMapWrapper`, `WarehouseZone`, `MapLegend` (client/src/components/Map/*)
  - Hỗ trợ hiển thị Zone, Project, và chú giải bản đồ; tối ưu lazy-load để cải thiện hiệu năng.
- Trình quản lý quyền (Permissions) và Quản lý người dùng:
  - `PermissionManager`, `AIConfigManager`, `AIConfigTabs`, `UserManagement` với UI và logic phân quyền.
  - Bổ sung routes và middleware liên quan (`middleware/auth.js`, `routes/users.js`).
- Quản lý Hợp đồng & Tài liệu hợp đồng:
  - `ContractCreator`, `ContractManager`, `ContractTemplateManager`, `DocumentManager` (UI), cùng các routes `routes/contracts.js`, `routes/contract-templates.js`, `routes/contract-documents.js`.
  - Luồng tạo hợp đồng, quản lý mẫu hợp đồng, và upload tài liệu hợp đồng.
- Quản lý Khách hàng:
  - `CustomerFormTabs`, `CustomerForm`, `CompanyInfoTab`, `PersonalInfoTab`, `ContractInfoTab`.
  - `routes/customers.js` với API CRUD và tích hợp lọc/phan trang (khi áp dụng).
- Quản lý Dự án và Nhiệm vụ:
  - Trang Dự án (`pages/Projects`), chỉnh sửa dự án (`ProjectEdit`), chi tiết dự án (`ProjectDetail`).
  - `routes/projects.js`, `routes/projectTasks.js`, `routes/projectZones.js`.
- Theo dõi hiệu năng và tối ưu gói:
  - `PerformanceDashboard`, `PerformanceOptimizer`, `performanceMonitor`, `bundleOptimizer`, `cacheOptimizer`.
- AI Assistant và cấu hình AI:
  - `routes/ai-assistant.js`, `routes/ai-assistant-configs.js` và thành phần UI `AI/ChatBot`, `FloatingChatButton`.
- Tài liệu API và theo dõi lỗi client:
  - `routes/apiDocs.js` cho tài liệu API.
  - `routes/client-errors.js` và script DB để thu thập lỗi từ client.
- Cấu hình Service Worker và chỉ báo trạng thái offline:
  - `SERVICE_WORKER_*` reports, `OfflineIndicator` component.
- Thiết lập hạ tầng kiểm thử tự động:
  - Unit, Integration, E2E (Jest + Playwright), scripts `tests/playwright/*`. Báo cáo bao phủ code trong thư mục `coverage`.

### Changed
- Cấu trúc router backend được chuẩn hóa và mở rộng:
  - Các routes: `auth`, `users`, `customers`, `projects`, `documents`, `contracts`, `projectTasks`, `projectZones`, `client-errors`, `ai-assistant`, `ai-assistant-configs`, `metrics`, `apiDocs`.
- Cải thiện quy trình đăng nhập và kiểm soát phiên (`routes/auth.js`, `middleware/auth.js`).
- Tối ưu hóa truy vấn DB và thêm index để cải thiện hiệu năng (xem `scripts/add-indexes.sql`, `scripts/auto-create-missing-tables.js`).
- Cải thiện giao diện điều hướng (`Navbar`, `Sidebar`) và bố cục trang (xem `LAYOUT_FIXES_SUMMARY.md`).

### Fixed
- Sửa lỗi route và định tuyến API: `API_ROUTING_FIX.md`, `API_ROUTING_SUCCESS.md`.
- Khắc phục lỗi liên quan đến Users API và cấu hình AI: `FIX_USERS_API_GUIDE.md`, `AI_CONFIG_FIX_SUCCESS.md`, `UPDATE_AI_CONFIG_INTEGRATION.md`.
- Sửa lỗi lưu Khách hàng và hiển thị hợp đồng khách hàng:
  - `CUSTOMER_SAVE_FIX_REPORT.md`, `CUSTOMER_CONTRACT_DISPLAY_FIX_REPORT.md`.
- Ổn định trang Dự án (Projects page) và nút “Edit”: `PROJECTS_PAGE_FIX_REPORT.md`, `EDIT_BUTTON_FIX_COMPLETE.md`.
- Khắc phục sự cố Service Worker/Offline: `SERVICE_WORKER_FIX_SUMMARY.md`, `SERVICE_WORKER_FINAL_CLEANUP.md`.
- Sửa lỗi đăng nhập và xác thực: `LOGIN_FINAL_FIX_REPORT.md`, `FINAL_DEBUG_GUIDE.md`.
- Dọn dẹp ESLint, cải thiện chất lượng mã: `ESLINT_FIX_AND_FINAL_STATUS.md`, `FINAL_ESLINT_CLEANUP_REPORT.md`.

### Database
- Thiết lập và cập nhật lược đồ cơ sở dữ liệu:
  - `scripts/init-db.js`, `scripts/auto-init-db.js`, `scripts/auto-create-missing-tables.js`.
  - Thêm bảng và index: `scripts/add-client-error-tables.sql`, `scripts/add-project-tasks.sql`, `scripts/add-indexes.sql`.
  - Cập nhật lược đồ hợp đồng/quản lý zone: `scripts/contract-management-schema.sql`, `scripts/add-is-active-to-zones.js`.
  - Di trú mã hóa khóa API: `scripts/migrate-encrypt-api-keys.js`, tiện ích `utils/encryption.js`.
  - Báo cáo dọn dẹp bảng không dùng: `UNUSED_TABLES_CLEANUP_REPORT.md`.

### Performance
- Tối ưu bundle/lazy-loading cho Frontend (Map, Users, Contracts, Projects).
- Thêm `rateLimiter` middleware và tối ưu logging (`config/logger.js`, `middleware/rateLimiter.js`).
- Báo cáo tối ưu hiệu năng: `PERFORMANCE_OPTIMIZATION_REPORT.md`, `FINAL_PERFORMANCE_MONITORING_SUCCESS_REPORT.md`.

### Security
- Cải thiện xác thực và phân quyền (middleware `auth`, `PermissionManager`, kiểm soát truy cập granular ở routes).
- Mã hóa dữ liệu nhạy cảm và khóa API (`utils/encryption.js`, `scripts/migrate-encrypt-api-keys.js`).

### Testing
- Unit tests: services (`AIService`, `DatabaseService`), middleware (`auth`), utils (`encryption`).
- Integration tests: routes `auth`, `ai-assistant`, `contracts`, `customers`.
- E2E tests: Playwright specs cho quản lý dự án và xác thực.
- Báo cáo tổng hợp: `FINAL_COMPREHENSIVE_TEST_REPORT.md`, `COMPREHENSIVE_API_TEST_RESULTS.md`, thư mục `coverage`.

### Deprecated/Removed
- Dọn dẹp cấu hình cũ và tài nguyên thừa; loại bỏ các bảng không sử dụng (xem `UNUSED_TABLES_CLEANUP_REPORT.md`).

### Known Issues
- Theo dõi tại `REMAINING_ISSUES.md` và các báo cáo tiến độ trong `test-reports/`.


[Unreleased]: ./
[1.0.0]: ./
