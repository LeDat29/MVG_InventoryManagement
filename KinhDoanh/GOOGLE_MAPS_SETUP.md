# HƯỚNG DẪN SETUP GOOGLE MAPS API

## 🗺️ Bước 1: Tạo Google Maps API Key

### 1.1. Truy cập Google Cloud Console
```
https://console.cloud.google.com/
```

### 1.2. Tạo hoặc chọn Project
1. Click vào dropdown project ở top bar
2. Click "New Project"
3. Đặt tên: "KHO-MVG" hoặc tên bạn muốn
4. Click "Create"

### 1.3. Enable APIs
1. Vào **APIs & Services** > **Library**
2. Search và enable các APIs sau:
   - ✅ **Maps JavaScript API** (bắt buộc)
   - ✅ **Places API** (optional - nếu cần search địa chỉ)
   - ✅ **Geocoding API** (optional - nếu cần convert address to coordinates)

### 1.4. Tạo API Key
1. Vào **APIs & Services** > **Credentials**
2. Click **+ CREATE CREDENTIALS** > **API key**
3. Copy API key được tạo

### 1.5. Restrict API Key (Bảo mật)
1. Click vào API key vừa tạo
2. Chọn tab **Application restrictions**:
   - Development: Chọn "None" (hoặc "HTTP referrers" với localhost)
   - Production: Chọn "HTTP referrers" và thêm domain của bạn

3. Chọn tab **API restrictions**:
   - Select APIs: Maps JavaScript API, Places API, Geocoding API

4. Click **Save**

---

## 🔧 Bước 2: Cấu hình trong Project

### 2.1. Thêm API Key vào .env
```bash
# File: client/.env
REACT_APP_GOOGLE_MAPS_API_KEY=AIzaSy...your_actual_key_here
```

### 2.2. Restart Development Server
```bash
cd client
npm start
```

---

## 🎯 Bước 3: Test Google Maps

### 3.1. Cập nhật tọa độ cho Project
1. Đăng nhập vào hệ thống
2. Vào Projects > Project Detail
3. Click tab "Cơ bản"
4. Cập nhật:
   - **Latitude**: Vĩ độ (VD: 10.762622 cho TP.HCM)
   - **Longitude**: Kinh độ (VD: 106.660172 cho TP.HCM)

### 3.2. Lấy tọa độ từ Google Maps
1. Mở https://www.google.com/maps
2. Right-click vào vị trí muốn lấy
3. Click vào số tọa độ đầu tiên (copy)
4. Format: `latitude, longitude`

**Ví dụ các địa điểm:**
```
Hồ Chí Minh:    10.762622, 106.660172
Hà Nội:         21.028511, 105.804817
Đà Nẵng:        16.047079, 108.206230
```

### 3.3. Tạo Zones
1. Vào tab "Zones"
2. Click "Thêm Zone"
3. Nhập thông tin:
   - Mã zone: A01
   - Tên: Kho A - Tầng 1
   - Diện tích: 500 m²
   - Trạng thái: available/rented/deposited/fixed_service
   - Tọa độ: Array of {lat, lng}

**Format tọa độ zones:**
```json
[
  {"lat": 10.762622, "lng": 106.660172},
  {"lat": 10.762722, "lng": 106.660172},
  {"lat": 10.762722, "lng": 106.660272},
  {"lat": 10.762622, "lng": 106.660272}
]
```

---

## 💰 Chi phí Google Maps

### Free Tier (Tháng đầu + $200 credit)
- **$200 free credit** mỗi tháng
- Maps JavaScript API: $7 per 1000 loads
- Với $200 credit = ~28,000 map loads/tháng
- **Đủ cho dự án nhỏ/vừa!**

### Tips tiết kiệm:
1. Restrict API key properly
2. Cache map tiles
3. Limit zoom level changes
4. Use lazy loading

---

## 🐛 Troubleshooting

### Lỗi: "Google Maps JavaScript API error: RefererNotAllowedMapError"
**Nguyên nhân**: API key bị restrict domain không đúng

**Giải pháp**:
1. Vào Google Cloud Console > Credentials
2. Edit API key
3. Application restrictions: 
   - Development: Chọn "None"
   - Production: Thêm domain vào "HTTP referrers"

---

### Lỗi: "This page can't load Google Maps correctly"
**Nguyên nhân**: Billing chưa enable hoặc API chưa enable

**Giải pháp**:
1. Check Billing account đã được setup
2. Check Maps JavaScript API đã được enable
3. Đợi 5-10 phút sau khi enable API

---

### Lỗi: "Map is blank / gray"
**Nguyên nhân**: 
- Tọa độ không hợp lệ
- API key chưa được set

**Giải pháp**:
1. Check console (F12) xem có lỗi gì
2. Verify REACT_APP_GOOGLE_MAPS_API_KEY trong .env
3. Restart development server
4. Check latitude/longitude của project

---

### Zone không hiển thị
**Nguyên nhân**: 
- Coordinates chưa đúng format
- Zone không có coordinates

**Giải pháp**:
```javascript
// Check trong database: warehouse_zones.coordinates
// Format đúng:
[
  {"lat": 10.762622, "lng": 106.660172},
  {"lat": 10.762722, "lng": 106.660172},
  {"lat": 10.762722, "lng": 106.660272},
  {"lat": 10.762622, "lng": 106.660272}
]

// KHÔNG phải:
"10.762622, 106.660172"
```

---

## ✅ Checklist Setup

- [ ] Tạo Google Cloud Project
- [ ] Enable Maps JavaScript API
- [ ] Tạo API Key
- [ ] Restrict API Key (security)
- [ ] Setup Billing (nếu cần)
- [ ] Thêm API key vào `client/.env`
- [ ] Restart development server
- [ ] Cập nhật latitude/longitude cho project
- [ ] Tạo zones với coordinates
- [ ] Test map hiển thị đúng
- [ ] Test zones với màu sắc
- [ ] Test click/hover zones

---

## 📚 Resources

- [Google Maps JavaScript API Docs](https://developers.google.com/maps/documentation/javascript)
- [React Google Maps API](https://react-google-maps-api-docs.netlify.app/)
- [Pricing Calculator](https://mapsplatform.google.com/pricing/)
- [API Key Best Practices](https://developers.google.com/maps/api-security-best-practices)

---

## 🎓 Next Steps

Sau khi Google Maps hoạt động:
1. Implement thêm Zone (Create/Edit/Delete)
2. Import layout từ CAD/PDF
3. Export layout to PDF/PNG
4. Drawing tools để vẽ zones trực tiếp trên map
5. Measure tools để đo diện tích

---

**Version**: 1.0  
**Last Updated**: 2024-12-05
