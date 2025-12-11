# Hướng Dẫn Cập Nhật Contract-Zone Integration

## 📋 Tổng Quan Thay Đổi

Việc cập nhật này bao gồm:

1. **Frontend**: Thay đổi cột "Vị trí" thành "Dự án" trong quản lý hợp đồng
2. **Backend**: Cập nhật API để lấy thông tin dự án và zone
3. **Database**: Đồng bộ dữ liệu giữa contracts và warehouse_zones
4. **Terminology**: Thống nhất từ "Zone/Vị trí" thành "Kho"

## ✅ Đã Hoàn Thành

### 1. Frontend Updates
- ✅ **ContractManager.js**: Đã thay cột "Vị trí kho" thành "Dự án"
- ✅ **Contract Detail**: Thêm hiển thị tên dự án và kho riêng biệt
- ✅ **ProjectDetail.js**: Thay đổi thuật ngữ "zones" thành "kho"
- ✅ **Project Zone Modal**: Cập nhật labels thành "Kho"

### 2. Backend API Updates  
- ✅ **routes/contracts.js**: Thêm JOIN với projects và warehouse_zones
- ✅ **Contract List API**: Bao gồm project_name, zone_code, zone_name
- ✅ **Contract Detail API**: Thêm thông tin đầy đủ về dự án và zone

## 🔧 Cần Thực Hiện Thêm

### 1. Database Schema Migration

Bảng `contracts` hiện tại chỉ có cấu trúc cơ bản. Cần cập nhật để phù hợp với contract management system:

```sql
-- Thêm các cột cần thiết cho contract management
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS contract_title VARCHAR(500);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS customer_company_id INT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS template_id INT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS warehouse_location TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS warehouse_area DECIMAL(10,2);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS rental_price DECIMAL(15,2);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS deposit_amount DECIMAL(15,2);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS workflow_stage ENUM('preparation', 'legal_review', 'approval', 'signing', 'execution');

-- Cập nhật status enum để phù hợp
ALTER TABLE contracts MODIFY COLUMN status ENUM('draft', 'review', 'approved', 'signed', 'active', 'expired', 'terminated', 'cancelled');
```

### 2. Sample Data Creation

```sql
-- Tạo dữ liệu mẫu cho demo
INSERT INTO contracts (
    contract_number, customer_id, project_id, zone_id,
    contract_title, warehouse_location, warehouse_area, rental_price,
    start_date, end_date, status, created_by
) VALUES 
('HD240001', 1, 1, 1, 'Hợp đồng thuê Kho A1', 'Kho A1', 500, 150000, '2024-01-01', '2024-12-31', 'active', 1),
('HD240002', 1, 1, 2, 'Hợp đồng thuê Kho A2', 'Kho A2', 750, 140000, '2024-02-01', '2025-01-31', 'active', 1);
```

## 📱 Cách Test Tính Năng

### 1. Test Contract List
- Vào trang Quản lý hợp đồng
- Kiểm tra cột "Dự án" hiển thị đúng tên project
- Kiểm tra warehouse_location hiển thị dưới tên project

### 2. Test Contract Detail  
- Click vào một hợp đồng bất kỳ
- Kiểm tra thông tin dự án và kho được hiển thị riêng biệt

### 3. Test Project Detail
- Vào trang chi tiết dự án 
- Kiểm tra tab "Quản lý kho" 
- Kiểm tra các zone hiển thị với prefix "Kho"

## 🎯 Kết Quả Mong Đợi

### Trước
```
Cột: Vị trí kho
Data: "Khu vực A1"
```

### Sau  
```
Cột: Dự án
Data: "Kho xưởng Bình Dương"
      "Kho A1"
```

## 🔄 Script Automation

Đã tạo script `tmp_rovodev_update_contract_zone_terminology.js` để:
- Thêm cột project_id và zone_id vào contracts
- Cập nhật warehouse_location với prefix "Kho"  
- Cập nhật zone_name trong warehouse_zones

## 📞 Next Steps

1. **Chạy migration script** để cập nhật database schema
2. **Tạo sample data** cho testing
3. **Test frontend changes** 
4. **Verify API responses** include project and zone info
5. **Update any remaining references** to old terminology

## 🎉 Impact

- ✅ Terminoogy consistency: "Zone" → "Kho"
- ✅ Better data relationship: Contracts linked to Projects and Zones  
- ✅ Improved UX: Clear project context in contract management
- ✅ Scalable architecture: Proper foreign key relationships