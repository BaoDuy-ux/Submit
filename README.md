# IS207 Fashion — Đồ án cuối kỳ môn IS207.Q22

Hệ thống thương mại điện tử thời trang gồm **website khách hàng**, **trang quản trị** và **Backend REST API** (Spring Boot) kết nối **MySQL**.

---

## 1. Thành viên nhóm

> **(Nhóm tự điền lại cho đúng)**

| STT | MSSV | Họ và tên | Vai trò |
|-----|------|-----------|---------|
| 1 | `24521062` | `Ngô Thiên Minh` | Nhóm trưởng |
| 2 |`24521657` |`Đặng Trần Thiện` | Thành viên |
| 3 |`24520377` |`Lê Đăng Bảo Duy` | Thành viên |

**Tên nhóm:** `Nhóm 1`

---

## 2. Mô tả đề tài

Website bán quần áo thời trang trực tuyến:

- **Khách hàng**: xem/lọc sản phẩm, chi tiết sản phẩm, giỏ hàng, đặt hàng, đăng nhập/đăng ký, quên mật khẩu, hỗ trợ qua chat.
- **Quản trị**: dashboard KPI, quản lý sản phẩm (CRUD + import), quản lý đơn hàng, khách hàng, báo cáo & thống kê (biểu đồ), cảnh báo tồn kho.

---

## 3. Công nghệ sử dụng

| Lớp | Công nghệ |
|-----|-----------|
| Backend | Java 17, Spring Boot 4, Spring Security (JWT), Spring Data JPA/Hibernate, Validation |
| Database | MySQL (utf8mb4) |
| Frontend | HTML5, CSS3, JavaScript (ES6+), Fetch API |
| Bảo mật | JWT (stateless), BCrypt, phân quyền customer/admin, CORS |
| Hạ tầng | Docker, Railway (API + MySQL), Vercel (frontend), Cloudinary (ảnh), Resend (email) |

---

## 4. Cấu trúc thư mục nộp

```
.
├── README.md                 # File này
├── Source/                   # Toàn bộ source code
│   ├── customer/             # Website khách hàng (static)
│   ├── admin/                # Trang quản trị (static)
│   ├── Sale_App/             # Backend Spring Boot (Maven)
│   └── scripts/              # Script import dữ liệu, backup DB
├── Database/
│   └── web_is207_backup.sql  # Backup đầy đủ cấu trúc + dữ liệu (MySQL)
└── Docs/
    ├── BaoCao_IS207.docx     # File tóm tắt đồ án (theo template)
    └── Slide_IS207.pptx      # Slide chụp giao diện chức năng
```

---

## 5. Hướng dẫn chạy local

### 5.1. Yêu cầu
- JDK 17+
- MySQL 8+
- (Tuỳ chọn) Python 3 để chạy frontend bằng web server tĩnh

### 5.2. Tạo và nạp database

```sql
CREATE DATABASE IF NOT EXISTS web_is207 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Nạp dữ liệu mẫu từ file backup:

```bash
mysql -u root -p web_is207 < Database/web_is207_backup.sql
```

> Hoặc dùng MySQL Workbench / phpMyAdmin → Import file `web_is207_backup.sql`.

### 5.3. Chạy backend

```bash
cd Source/Sale_App
./mvnw spring-boot:run         # Windows: mvnw.cmd spring-boot:run
```

Backend chạy tại `http://localhost:8080`. Kiểm tra: mở `http://localhost:8080/api/products`.

> Cấu hình DB mặc định trong `Source/Sale_App/src/main/resources/application.properties`
> (mặc định `root` / `123456789`, database `web_is207`). Sửa lại cho khớp máy bạn nếu cần.

### 5.4. Chạy frontend

```bash
cd Source/customer
python -m http.server 5500     # → http://localhost:5500

cd Source/admin
python -m http.server 5501     # → http://localhost:5501
```

Khi chạy ở localhost, frontend tự gọi API `http://localhost:8080`.

---

## 6. Tài khoản mặc định

| Vai trò | Tài khoản | Mật khẩu |
|---------|-----------|----------|
| Admin | `admin` | `admin123` |
| Khách hàng (demo) | `0900000000` | `123456` |

> Tài khoản admin có sẵn trong file backup. Nếu DB trống, bật `APP_SEED_ENABLED=true` để tạo lại.

---

## 7. Demo online (tham khảo)

| Thành phần | URL |
|-----------|-----|
| Website khách hàng (Vercel) | https://fe-is-207-4f8ysfva8-baoduy-uxs-projects.vercel.app |
| Trang quản trị (Vercel) | https://is207-admin.vercel.app |
| Backend API (Railway) | https://backendis207-production.up.railway.app |

> Lưu ý: bản online dùng gói miễn phí (Railway) nên có thể "ngủ"/chậm khi lâu không truy cập.
> Để chấm điểm ổn định, khuyến nghị chạy local theo mục 5.

---

## 8. Yêu cầu kỹ thuật đã đáp ứng

- Kiến trúc 3 lớp (Presentation – Application – Data), client–server.
- REST API + JSON, phân tách rõ frontend/backend.
- Xác thực JWT (stateless), phân quyền theo vai trò, mật khẩu hash BCrypt.
- ORM với JPA/Hibernate, thiết kế CSDL quan hệ (5 bảng).
- Triển khai online (Docker + Railway + Vercel), tích hợp dịch vụ ngoài (Cloudinary, Resend).
- Validation dữ liệu, xử lý CORS, quản lý cấu hình theo profile/biến môi trường.

---

## 9. Ghi chú

- Thanh toán (thẻ/OTP) là **mô phỏng** phục vụ demo, chưa tích hợp cổng thanh toán thật.
- Chat box phía khách hàng là **trợ lý ảo rule-based**, không lưu server.
- File cấu hình chứa thông tin nhạy cảm (mật khẩu email, khoá API) **không** được đưa vào source theo đúng thực hành bảo mật.
