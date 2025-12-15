# Hướng Dẫn Sử Dụng Tính Năng Mới - Trang Quản Lý Dự Án

**Phiên bản:** 1.0  
**Ngày cập nhật:** 12/12/2025

---

## 📖 Mục Lục

1. [Xem Thông Tin Dự Án](#xem-thông-tin-dự-án)
2. [Quản Lý Giám Đốc & Người Quản Lý](#quản-lý-giám-đốc--người-quản-lý)
3. [Quản Lý Kho](#quản-lý-kho)
4. [Quản Lý Tài Liệu](#quản-lý-tài-liệu)
5. [Chỉnh Sửa Dự Án](#chỉnh-sửa-dự-án)

---

## 🏢 Xem Thông Tin Dự Án

### 1. Truy Cập Trang Dự Án
```
Quản lý Dự án > Chọn một dự án trong danh sách
```

### 2. Giao Diện Chính
Trang chi tiết dự án bao gồm:

#### 📊 Thống Kê (4 Cards Responsive):
```
┌──────────────────────────────────────────────────┐
│ Tổng Diện Tích  │ Tỷ Lệ Thuê  │ Số Kho  │ Doanh Thu│
├──────────────────────────────────────────────────┤
│ 15,000 m²       │ 80%         │ 25      │ 2.5M ₫   │
│ • Cho thuê:     │ Bar chart   │ • Đã    │ • Từ cho │
│   12,000 m²     │ • Đã thuê:  │   thuê: │   thuê   │
│ • Đã cọc:       │   20 kho    │   20    │   2.5M ₫ │
│   2,000 m²      │ • Cọc:      │ • Cọc:  │ • Tiềm   │
│ • Còn trống:    │   0 kho     │   5     │   năng:  │
│   1,000 m²      │ • Còn trống:│ • Còn:  │   500K ₫ │
│                 │   5 kho     │   0     │          │
└──────────────────────────────────────────────────┘
```

**💡 Lợi ích:** Cung cấp cái nhìn toàn diện về tình hình dự án

---

## 👥 Quản Lý Giám Đốc & Người Quản Lý

### Cách 1: Xem trong Tab "Thông Tin Chung"

#### Bước 1: Mở Dự Án
```
Quản lý Dự án > Chọn dự án > Tab "Thông tin chung"
```

#### Bước 2: Thông Tin được hiển thị
```
LEFT COLUMN (Thông tin dự án)      RIGHT COLUMN (Thông tin liên lạc)
├─ Tên dự án: ...                  ├─ Chủ sở hữu
├─ Mã dự án: ...                   │  ├─ Tên: ...
├─ Mô tả: ...                      │  ├─ Điện thoại: ...
├─ Địa chỉ: ...                    │  ├─ Email: ...
├─ Tỉnh/Thành: ...                 │
└─ Trạng thái: ...                 ├─ Giám đốc dự án
                                   │  ├─ Tên: Nguyễn Văn Kiên
                                   │  ├─ Chức vụ: Giám đốc dự án
                                   │  ├─ Điện thoại: 0987654321
                                   │  ├─ Email: kien@abc.com
                                   │
                                   ├─ Người quản lý dự án
                                   │  ├─ Tên: Trần Thị Liên
                                   │  ├─ Chức vụ: Người quản lý dự án
                                   │  ├─ Điện thoại: 0976543210
                                   │  ├─ Email: lien@abc.com
                                   │
                                   └─ Thống kê diện tích
                                      ├─ Tổng: 15,000 m²
                                      ├─ Đã dùng: 12,000 m²
                                      ├─ Còn: 3,000 m²
                                      └─ Cố định: 500 m²
```

### Cách 2: Xem trong Tab "Đội Dự Án"

#### Bước 1: Mở Tab "Đội Dự Án"
```
Chi tiết dự án > Tab "Đội dự án"
```

#### Bước 2: Giao diện hiển thị
```
┌──────────────────────────────┬──────────────────────────────┐
│   GIÁM ĐỐC DỰ ÁN            │   NGƯỜI QUẢN LÝ DỰ ÁN       │
├──────────────────────────────┼──────────────────────────────┤
│ [👤 Avatar]                  │ [👤 Avatar]                  │
│ Nguyễn Văn Kiên              │ Trần Thị Liên               │
│ Giám đốc dự án               │ Người quản lý dự án         │
│                              │                              │
│ Email: kien@abc.com          │ Email: lien@abc.com         │
│ Điện thoại: 0987654321       │ Điện thoại: 0976543210      │
└──────────────────────────────┴──────────────────────────────┘
```

**💡 Lợi ích:** Xem nhanh thông tin liên hệ của người phụ trách

---

## 🏭 Quản Lý Kho

### 1. Thêm Kho Mới

#### Bước 1: Truy Cập Tab "Quản Lý Kho"
```
Chi tiết dự án > Tab "Quản lý kho"
```

#### Bước 2: Click Nút "Thêm Kho"
```
┌─────────────────────────────────┐
│ [Import bản vẽ]  [+ Thêm kho]  │  <- Click nút này
└─────────────────────────────────┘
```

#### Bước 3: Điền Thông Tin Kho
```
┌────────────────────────────────────┐
│    THÊM KHO MỚI                    │
├────────────────────────────────────┤
│ Mã Kho:                  [A1    ]  │
│ Tên Kho:           [Khu vực A1]   │
│ Diện tích (m²):           [500]   │
│ Giá thuê (đ/m²/tháng): [150000]   │
│                                    │
│ Trạng thái:                        │
│ ┌──────────────────────────────┐  │
│ │ ▼ Chưa cho thuê           ▼│  │
│ ├──────────────────────────────┤  │
│ │ • Chưa cho thuê            │  │
│ │ • Đã cho thuê             │  │
│ │ • Đã cọc                  │  │
│ │ • Bảo trì                 │  │
│ └──────────────────────────────┘  │
│                                    │
│ [Hủy]  [Lưu Kho]                  │
└────────────────────────────────────┘
```

#### Bước 4: Click "Lưu Kho"
- Kho mới sẽ được thêm vào danh sách
- Có thể thấy ngay trong bảng danh sách kho

**💡 Lưu ý:**
- Mã kho nên là duy nhất (vd: A1, A2, B1...)
- Giá thuê là giá hàng tháng cho 1 m²
- Chọn trạng thái phù hợp

### 2. Import Bản Vẽ

#### Bước 1: Click Nút "Import Bản Vẽ"
```
Tab "Quản lý kho" > Click [Import bản vẽ]
```

#### Bước 2: Chọn File Bản Vẽ
```
Định dạng hỗ trợ:
├─ Kỹ thuật: *.dxf, *.dwg, *.pdf
└─ Hình ảnh: *.png, *.jpg, *.jpeg
```

#### Bước 3: Confirm Import
```
Dialog: "Đã import bản vẽ: Floor_Plan_A.dxf"
```

**💡 Lợi ích:**
- Quản lý bản vẽ công trình
- Có thể xem lại bản vẽ sau này
- Hỗ trợ nhiều định dạng

### 3. Xem Chi Tiết Kho

#### Click vào hàng kho trong bảng
```
┌────┬──────────────────────────────────────┐
│ ID │ Mã kho │ Tên         │ Diện tích      │
├────┼────────┼─────────────┼────────────────┤
│ 1  │ A1     │ Khu vực A1  │ 500 m²         │  <- Click
│ 2  │ A2     │ Khu vực A2  │ 750 m²        │
└────┴────────┴─────────────┴────────────────┘
```

#### Modal hiển thị chi tiết
```
┌─────────────────────────────────┐
│ Chi tiết Kho A1                 │
├─────────────────────────────────┤
│ THÔNG TIN KHO │ THÔNG TIN KHÁCH │
├────────────────┼─────────────────┤
│ Mã kho: A1     │ Công ty: ABC    │
│ Tên: Khu vực   │ Người liên hệ   │
│ Diện tích:500m²│ Số hợp đồng:... │
│ Trạng thái:... │ Ngày hết hạn:...│
│ Giá thuê:...   │                 │
└────────────────┴─────────────────┘
```

---

## 📄 Quản Lý Tài Liệu

### 1. Upload Tài Liệu

#### Bước 1: Truy Cập Tab "Hồ Sơ Pháp Lý"
```
Chi tiết dự án > Tab "Hồ sơ pháp lý"
```

#### Bước 2: Click "Upload Tài Liệu"
```
┌──────────────────────────┐
│ [Upload tài liệu]        │  <- Click nút này
└──────────────────────────┘
```

#### Bước 3: Upload Files
```
┌────────────────────────────────────────┐
│    UPLOAD TÀI LIỆU DỰ ÁN                │
├────────────────────────────────────────┤
│                                        │
│  ☁️                                     │
│  Kéo thả hoặc click để chọn tài liệu   │
│                                        │
│  Hỗ trợ: PDF, DOC, DOCX, XLS,        │
│  XLSX, IMG, JPG, PNG                  │
│                                        │
└────────────────────────────────────────┘

Hoặc click để chọn files
```

#### Bước 4: Xem Danh Sách Tài Liệu Chọn
```
Tài liệu đã chọn (3):
├─ 📄 Giấy phép kinh doanh.pdf (256 KB)
├─ 📄 Bản vẽ công trình.dwg (1024 KB)
└─ 📄 Hợp đồng thuê.docx (512 KB)
```

#### Bước 5: Click "Hoàn Tất Upload"
```
[Đóng]  [Hoàn tất upload]  <- Click nút này
```

### 2. Xem Danh Sách Tài Liệu

#### Tất cả tài liệu đã upload hiển thị trong Tab
```
┌────┬──────────────────────────┬──────────┬───────────┬───────┐
│    │ Tên tài liệu             │ Dung lượng│ Ngày upload│ Xóa  │
├────┼──────────────────────────┼──────────┼───────────┼───────┤
│ 📄 │ Giấy phép kinh doanh.pdf │ 256 KB   │ 12/12/2025│ [🗑️]  │
│ 📄 │ Bản vẽ công trình.dwg    │ 1024 KB  │ 12/12/2025│ [🗑️]  │
│ 📄 │ Hợp đồng thuê.docx       │ 512 KB   │ 12/12/2025│ [🗑️]  │
└────┴──────────────────────────┴──────────┴───────────┴───────┘
```

### 3. Xóa Tài Liệu

#### Click Nút Xóa
```
Hàng tài liệu > Click nút [🗑️] ở cột "Thao tác"
```

Tài liệu sẽ bị xóa khỏi danh sách

**💡 Lưu ý:**
- Hỗ trợ upload multiple files cùng lúc
- Giới hạn kích thước: Tùy hệ thống
- Tài liệu sẽ được lưu trên server

---

## ✏️ Chỉnh Sửa Dự Án

### 1. Mở Modal Chỉnh Sửa

#### Bước 1: Chi Tiết Dự Án
```
Chi tiết dự án > Header > Click [✎️ Chỉnh sửa]
```

#### Bước 2: Navigate đến Edit Page
```
Hệ thống sẽ chuyển hướng đến:
/projects/{id}/edit
```

**💡 Lợi ích:**
- Nhanh chóng chỉnh sửa thông tin dự án
- Cập nhật Giám đốc, Người quản lý
- Sửa đổi diện tích, giá thuê, trạng thái

---

## 📱 Responsive Design

### Desktop (1200px+)
```
┌──────────────────────────────────────┐
│ ┌──────────────────────────────────┐ │
│ │      Thống Kê (4 cột)            │ │
│ │ Diện tích │ Tỷ lệ │ Kho │ Doanh  │ │
│ └──────────────────────────────────┘ │
│ ┌──────────────────────────────────┐ │
│ │       Danh sách kho              │ │
│ └──────────────────────────────────┘ │
└──────────────────────────────────────┘
```

### Tablet (768px - 1199px)
```
┌──────────────────────────────┐
│ ┌──────────────┬──────────────┐
│ │ Diện tích    │ Tỷ lệ        │
│ ├──────────────┼──────────────┤
│ │ Kho          │ Doanh        │
│ └──────────────┴──────────────┘
└──────────────────────────────┘
```

### Mobile (< 768px)
```
┌──────────────┐
│ Diện tích    │
├──────────────┤
│ Tỷ lệ        │
├──────────────┤
│ Kho          │
├──────────────┤
│ Doanh        │
└──────────────┘
```

**💡 Lợi ích:** Hỗ trợ tất cả thiết bị (desktop, tablet, điện thoại)

---

## 🔍 Các Tab Chính

| Tab | Mục Đích | Nội Dung |
|-----|----------|---------|
| **Thông tin chung** | Xem thông tin cơ bản dự án | Tên, địa chỉ, trạng thái, chủ sở hữu, giám đốc, quản lý, diện tích |
| **Quản lý kho** | Quản lý các khu kho/khoảng | Danh sách kho, thêm/sửa/xóa kho, import bản vẽ, xem chi tiết |
| **Bản đồ** | Xem vị trí dự án trên bản đồ | Google Maps integration |
| **Công việc** | Quản lý các task/công việc | Task list, deadline, assignee |
| **Hồ sơ pháp lý** | Quản lý tài liệu | Upload, view, xóa tài liệu |
| **Đội dự án** | Xem thông tin đội ngũ | Giám đốc, Người quản lý |

---

## ⚡ Mẹo & Thủ Thuật

### 1. Quick View Statistics
- Tất cả thông tin quan trọng được hiển thị trên 4 cards ở đầu trang
- Không cần cuộn để xem overview

### 2. Responsive Cards
- Tự động điều chỉnh theo kích thước màn hình
- Trên desktop: 4 cột, Tablet: 2x2, Mobile: 1 cột

### 3. Export Data
- Click [📥 Xuất báo cáo] để download thông tin dự án

### 4. Search & Filter
- Sử dụng thanh tìm kiếm để nhanh chóng tìm dự án

---

## ❌ Khắc Phục Sự Cố

### Problem: File upload thất bại
**Solution:**
- Kiểm tra định dạng file (phải là PDF, DOC, DOCX, XLS, XLSX, IMG, JPG, PNG)
- Kiểm tra kích thước file (không quá giới hạn)
- Kiểm tra kết nối internet

### Problem: Thêm kho không hoạt động
**Solution:**
- Điền đầy đủ thông tin (Mã kho, Tên, Diện tích, Giá thuê)
- Chọn trạng thái hợp lệ
- Click "Lưu Kho" (không phải các nút khác)

### Problem: Không thấy dự án được chỉnh sửa
**Solution:**
- Làm mới trang (F5 hoặc Ctrl+R)
- Kiểm tra quyền "project_update"
- Liên hệ quản trị viên

---

## 📞 Liên Hệ Hỗ Trợ

Nếu gặp bất kỳ vấn đề nào:
- Liên hệ: support@kho-mvg.local
- Email: support@kho-mvg.com
- Hotline: 1900-xxxx

---

**Cập nhật lần cuối:** 12/12/2025  
**Phiên bản:** 1.0  
**Trạng thái:** ✅ Đầy đủ
