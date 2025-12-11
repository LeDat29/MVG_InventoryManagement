# ✅ TEST CHECKLIST - User Management Features

**Tester**: _________________  
**Date**: _________________  
**Browser**: _________________

---

## 🔐 PERMISSION MANAGEMENT UI (2.4.2)

### Access & Navigation
- [ ] Login với admin account
- [ ] Navigate to "Quản lý User" menu
- [ ] Click icon "🔑" trên một user
- [ ] Modal "Quản lý phân quyền" xuất hiện

### List View Mode
- [ ] Checkbox select/unselect projects hoạt động
- [ ] Expand project hiển thị permissions grid
- [ ] Permissions grouped theo: Dự án, Khách hàng, Hợp đồng, Hồ sơ, Báo cáo
- [ ] Tick/untick individual permissions
- [ ] "Chọn tất cả" button works
- [ ] "Bỏ chọn tất cả" button works

### Matrix View Mode
- [ ] Switch to "Ma trận phân quyền" mode
- [ ] Table hiển thị đầy đủ projects và permissions
- [ ] Checkbox select/unselect trong matrix
- [ ] Quick actions (✓/✗) hoạt động

### Save Functionality
- [ ] Click "Lưu phân quyền"
- [ ] Loading spinner hiển thị
- [ ] Success message xuất hiện
- [ ] Modal tự động đóng sau 2 giây
- [ ] Reload page → permissions đã lưu

### Edge Cases
- [ ] Chọn 0 projects → Save button disabled
- [ ] Unselect project → permissions bị clear
- [ ] Close modal → changes không lưu
- [ ] Multiple projects với nhiều permissions

---

## 🤖 AI CONFIG MANAGER UI (2.4.3)

### Access & Navigation
- [ ] Login với admin account
- [ ] Navigate to "Quản lý User" menu
- [ ] Click icon "🤖" trên một user
- [ ] Modal "Quản lý API AI Models" xuất hiện

### View Existing Configs
- [ ] Danh sách configs hiển thị (nếu có)
- [ ] Provider icons hiển thị: 🤖, ✨, 🧠, 🐙
- [ ] API keys được masked: `sk-t****cdef`
- [ ] Cost và usage stats hiển thị
- [ ] Active/Inactive badges

### Add New Config
- [ ] Click "Thêm cấu hình"
- [ ] 4 provider cards: OpenAI, Gemini, Claude, Copilot
- [ ] Click provider → default model và cost fill

### OpenAI Config
- [ ] Select OpenAI
- [ ] Enter API key: `sk-...` (test key nếu có)
- [ ] Click "Test" button
- [ ] Test connection success/fail message
- [ ] Select model: gpt-3.5-turbo, gpt-4, gpt-4-turbo
- [ ] Set cost: default $0.002
- [ ] Set priority: 1
- [ ] Toggle Active/Inactive
- [ ] Click "Thêm mới"
- [ ] Success message, modal về list view

### Gemini Config
- [ ] Tương tự OpenAI với Gemini API key
- [ ] Models: gemini-pro, gemini-pro-vision, gemini-ultra

### Claude Config
- [ ] Tương tự với Claude API key
- [ ] Models: claude-3-sonnet, claude-3-opus, claude-3-haiku

### Edit Config
- [ ] Click "✏️" icon trên config
- [ ] Form hiển thị với data cũ (API key rỗng)
- [ ] Update model hoặc cost
- [ ] Click "Cập nhật"
- [ ] Success message

### Delete Config
- [ ] Click "🗑️" icon
- [ ] Confirm dialog xuất hiện
- [ ] Click OK
- [ ] Config bị xóa
- [ ] Success message

### Edge Cases
- [ ] API key rỗng → Test button disabled
- [ ] Invalid API key → Test fail
- [ ] Priority duplicate → still works (backend handles)
- [ ] Close modal → changes lost (for Add form)

---

## 📊 ACTIVITY LOGS UI (2.4.4)

### Access & Navigation (Admin Only)
- [ ] Login với admin account
- [ ] Menu "Lịch sử hoạt động" visible
- [ ] Click menu
- [ ] Page "/admin/activity-logs" loads

### Non-Admin Access
- [ ] Logout, login với manager/staff
- [ ] Menu "Lịch sử hoạt động" không visible
- [ ] Direct URL `/admin/activity-logs` → Access denied

### Filters - User
- [ ] Dropdown "Người dùng" có danh sách users
- [ ] Select một user
- [ ] Table refresh với logs của user đó
- [ ] "Tổng" badge update

### Filters - Action
- [ ] Dropdown "Hành động" có các actions
- [ ] Select "LOGIN"
- [ ] Table chỉ hiển thị login logs
- [ ] Badges có icons: 🔑, ➕, ✏️, 🗑️, 🤖

### Filters - AI Assisted
- [ ] Select "Có AI hỗ trợ"
- [ ] Table chỉ hiển thị rows có AI icon
- [ ] Rows highlighted màu vàng
- [ ] Badge "🤖 AI" count update

### Filters - Date Range
- [ ] Set "Từ ngày": 2024-12-01
- [ ] Set "Đến ngày": 2024-12-31
- [ ] Table filter theo date range
- [ ] Clear filters → về default

### Table Display
- [ ] Columns: ID, Người dùng, Hành động, Entity, AI, IP, Thời gian, Chi tiết
- [ ] AI-assisted rows có background vàng
- [ ] Hover rows → hover effect
- [ ] Username và full name hiển thị

### Log Detail Modal
- [ ] Click "ℹ️" button trên row có details
- [ ] Modal xuất hiện với đầy đủ info
- [ ] JSON details formatted đẹp
- [ ] Close modal

### Pagination
- [ ] Bottom có pagination controls
- [ ] "Trước" button (disabled nếu page 1)
- [ ] Page numbers (1, 2, 3, 4, 5)
- [ ] "Sau" button
- [ ] Click page 2 → table update
- [ ] Stats update: "Hiển thị 51-100 / 500"

### Export CSV
- [ ] Click "Xuất CSV" button
- [ ] Loading spinner hiển thị
- [ ] File download: `activity-logs-2024-12-XX.csv`
- [ ] Open CSV trong Excel
- [ ] Columns đúng: ID, User, Action, Entity Type, Entity ID, AI Assisted, IP, Created At, Details
- [ ] UTF-8 encoding đúng (tiếng Việt không lỗi font)
- [ ] Special characters escaped đúng

### Performance
- [ ] Load page < 3 giây
- [ ] Filter < 2 giây
- [ ] Export CSV < 5 giây (với ~1000 records)

---

## 🎨 UI/UX GENERAL

### Responsive Design
- [ ] Desktop (1920x1080): Full layout đẹp
- [ ] Laptop (1366x768): Vẫn đẹp
- [ ] Tablet (768x1024): Columns adjust
- [ ] Mobile (375x667): Stack layout, scrollable

### Browser Compatibility
- [ ] Chrome: All features work
- [ ] Firefox: All features work
- [ ] Edge: All features work
- [ ] Safari: All features work (nếu có Mac)

### Accessibility
- [ ] Tab navigation works
- [ ] Enter key submit forms
- [ ] ESC key close modals
- [ ] Focus indicators visible

---

## 🔐 SECURITY

### Permission Checks
- [ ] Staff user không thấy "Quản lý User" menu
- [ ] Direct URL `/users` → Access denied hoặc limited view
- [ ] Manager có thể view nhưng không edit (nếu không có permission)
- [ ] Admin có full access

### API Security
- [ ] Network tab: API keys không exposed
- [ ] localStorage: token có, API keys không có
- [ ] Error messages không leak sensitive info

---

## 🐛 BUG REPORT TEMPLATE

Nếu tìm thấy lỗi, ghi lại:

```
Bug ID: #___
Page: _______________
Action: _______________
Expected: _______________
Actual: _______________
Browser: _______________
Screenshot: _______________
```

---

## ✅ SIGN-OFF

### Tester
- [ ] All critical features tested
- [ ] No blocking bugs found
- [ ] Minor issues documented
- [ ] Ready for production

**Signature**: _________________  
**Date**: _________________

### Product Owner
- [ ] Reviewed test results
- [ ] Approved for release
- [ ] Documentation complete

**Signature**: _________________  
**Date**: _________________

---

## 📝 NOTES

_Ghi chú thêm:_

```



```

---

**Status**: ⏳ Waiting for Testing  
**Priority**: 🔴 High  
**Estimated Time**: 2-3 hours for full testing
