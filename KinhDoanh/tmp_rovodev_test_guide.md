# 🧪 HƯỚNG DẪN TEST NHANH - 15 PHÚT

**Mục tiêu**: Verify 3 chức năng mới hoạt động đúng  
**Thời gian**: 15 phút  
**Yêu cầu**: Server đang chạy, có admin account

---

## BƯỚC 1: KIỂM TRA SERVER (1 phút)

### Kiểm tra backend:
```bash
# Server phải đang chạy
curl http://localhost:5000/api/health

# Response mong đợi:
# {"success": true, "message": "API is running"}
```

### Kiểm tra frontend:
```bash
# Mở browser
http://localhost:3000
```

**✅ Pass**: Login page hiển thị  
**❌ Fail**: Nếu không load, chạy: `cd client && npm start`

---

## BƯỚC 2: TEST PERMISSION MANAGER (5 phút)

### 2.1 Access:
1. Login với admin: `admin / admin123` (hoặc credentials của bạn)
2. Click menu **"Quản lý User"** (icon: 👥)
3. Tìm một user bất kỳ, click icon **🔑 (Key)**

**✅ Pass**: Modal "Quản lý phân quyền" xuất hiện  
**❌ Fail**: Nếu không có icon 🔑, check permission: `user_permissions_manage`

### 2.2 Test List View:
1. Tick checkbox một project
2. Project expand → hiển thị permissions grid
3. Tick vài permissions: `project_view`, `customer_view`
4. Click **"Chọn tất cả"** → All permissions checked
5. Click **"Bỏ chọn tất cả"** → All unchecked

**✅ Pass**: Buttons hoạt động smooth  
**❌ Fail**: Check console errors (F12)

### 2.3 Test Matrix View:
1. Click button **"📊 Ma trận phân quyền"**
2. Table hiển thị với projects và permissions
3. Tick vài checkboxes trong matrix
4. Click quick action **✓** (chọn tất cả)

**✅ Pass**: Matrix responsive, checkboxes work  
**❌ Fail**: Có thể do CSS issue

### 2.4 Save:
1. Chọn 1 project với 3-4 permissions
2. Click **"💾 Lưu phân quyền"**
3. Wait spinner
4. Success message xuất hiện
5. Modal tự đóng sau 2s

**✅ Pass**: Reload page → permissions vẫn còn  
**❌ Fail**: Check network tab → API call `/api/users/:id/project-permissions`

**📸 Screenshot**: Capture success state

---

## BƯỚC 3: TEST AI CONFIG MANAGER (5 phút)

### 3.1 Access:
1. Trong User Management, click icon **🤖 (Robot)** trên cùng user
2. Modal "Quản lý API AI Models" xuất hiện

**✅ Pass**: Modal loads với existing configs hoặc empty state  
**❌ Fail**: Check API `/api/users/:id/ai-configs`

### 3.2 Add Config (Simulation):
1. Click **"Thêm cấu hình"**
2. Click provider card: **OpenAI 🤖**
3. Form hiển thị với default model: `gpt-3.5-turbo`
4. Enter fake API key: `sk-test-fake-key-12345678901234567890`
5. Cost: `0.002` (default)
6. Priority: `1`

**⚠️ NOTE**: Không click "Test" vì key fake  
**⚠️ NOTE**: Không click "Thêm mới" (sẽ fail vì key invalid)

**✅ Pass**: Form responsive, fields work  
**❌ Fail**: Check console errors

### 3.3 Test Connection (Skip):
**Reason**: Cần real API key. Chỉ verify button exists.

1. API key field có
2. "Test" button có và disabled khi key rỗng
3. Fill key → Test button enabled

**✅ Pass**: Button logic đúng  

### 3.4 View Existing Configs (If Any):
1. Click "Quay lại" về list view
2. Xem configs (nếu đã có từ trước)
3. Provider icons: 🤖, ✨, 🧠, 🐙
4. API keys masked: `sk-t****cdef`
5. Active/Inactive badges

**✅ Pass**: Display clean, masked properly  
**❌ Fail**: Keys không masked → security issue!

**📸 Screenshot**: Capture list view

---

## BƯỚC 4: TEST ACTIVITY LOGS (4 phút)

### 4.1 Access (Admin Only):
1. Menu sidebar có **"Lịch sử hoạt động"** (icon: 📊)
2. Click menu
3. Page `/admin/activity-logs` loads

**✅ Pass**: Page loads với table  
**❌ Fail**: "Không có quyền" → Check role = 'admin'

### 4.2 Test Filters:
**User Filter**:
1. Dropdown "Người dùng" → Select bạn (admin)
2. Table refresh → chỉ hiển thị logs của bạn
3. Badge "Tổng" update

**✅ Pass**: Filtered correctly

**Action Filter**:
1. Dropdown "Hành động" → Select "LOGIN"
2. Table chỉ hiển thị login logs
3. Badges có icon: 🔑

**✅ Pass**: Action filtered

**AI Assisted Filter**:
1. Select "Có AI hỗ trợ"
2. Rows có background màu vàng
3. Badge 🤖 count

**✅ Pass**: AI logs highlighted

**Date Range**:
1. "Từ ngày": Chọn 1 tuần trước
2. "Đến ngày": Hôm nay
3. Table filter

**✅ Pass**: Date filter works

### 4.3 Test Pagination:
1. Bottom có pagination (nếu >50 logs)
2. Click page 2
3. Table update với rows 51-100

**✅ Pass**: Pagination smooth  
**❌ Fail**: Check API params

### 4.4 Test Export CSV:
1. Set filters: User = bạn, Date = last week
2. Click **"Xuất CSV"** button
3. Spinner hiển thị
4. File download: `activity-logs-2024-XX-XX.csv`
5. Open trong Excel
6. Columns: ID, User, Action, Entity Type, AI Assisted, IP, Created At, Details

**✅ Pass**: CSV format đúng, UTF-8 OK  
**❌ Fail**: File corrupt hoặc encoding lỗi

### 4.5 Test Log Detail:
1. Click icon **ℹ️** trên row có details
2. Modal xuất hiện
3. Full info: User, Action, Entity, AI, IP, User Agent, Time
4. JSON details formatted
5. Close modal

**✅ Pass**: Modal clean, JSON readable  

**📸 Screenshot**: Capture table và modal

---

## BƯỚC 5: TEST RESPONSIVE (Optional - 2 phút)

### Desktop → Mobile:
1. Press F12 → Toggle device toolbar
2. Select iPhone 12 Pro (390x844)
3. Test 3 pages:
   - User Management
   - Permission Manager modal
   - Activity Logs

**✅ Pass**: Layout stacks, scrollable, buttons accessible  
**❌ Fail**: Horizontal scroll hoặc buttons không click được

---

## 📊 TEST SUMMARY CHECKLIST

Copy kết quả vào đây:

```
[ ] Server running OK
[ ] Permission Manager - Access OK
[ ] Permission Manager - List view OK
[ ] Permission Manager - Matrix view OK
[ ] Permission Manager - Save OK
[ ] AI Config Manager - Access OK
[ ] AI Config Manager - Form OK
[ ] AI Config Manager - Display OK
[ ] Activity Logs - Access OK
[ ] Activity Logs - User filter OK
[ ] Activity Logs - Action filter OK
[ ] Activity Logs - AI filter OK
[ ] Activity Logs - Date filter OK
[ ] Activity Logs - Pagination OK
[ ] Activity Logs - Export CSV OK
[ ] Activity Logs - Detail modal OK
[ ] Responsive - Mobile OK
```

**Total**: ___/17 tests passed

---

## 🐛 COMMON ISSUES & FIXES

### Issue 1: "Cannot read property of undefined"
**Fix**: Reload page, check localStorage token

### Issue 2: Modal không mở
**Fix**: Check console errors, verify user permissions

### Issue 3: API 401 Unauthorized
**Fix**: Re-login, token expired

### Issue 4: CSV không download
**Fix**: Check browser pop-up blocker

### Issue 5: Filters không hoạt động
**Fix**: Check backend logs, verify API responses

---

## ✅ TEST PASSED - NEXT STEPS

Nếu **tất cả tests pass**:
1. ✅ Mark as READY FOR UAT
2. ✅ Deploy to staging
3. ✅ Prepare demo for stakeholders

Nếu **có issues**:
1. ❌ Document bugs trong `TEST_CHECKLIST.md`
2. ❌ Report to developer (me!)
3. ❌ Fix và re-test

---

## 📝 NOTES SPACE

Ghi chú bugs hoặc issues:

```




```

---

**Tester**: _________________  
**Date**: _________________  
**Result**: PASS / FAIL / PARTIAL  
**Time Taken**: _______ phút

