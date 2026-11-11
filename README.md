# Gentric Membership · Hostinger

Bản Next.js chạy trên Node.js 22/24 với MariaDB. Không dùng Docker hoặc Cloudflare Workers.

## Deploy hPanel qua GitHub

Repository được kết nối với Hostinger Node.js Web App. Mỗi lần push lên nhánh `main`, Hostinger tự build và triển khai. Cấu hình: Next.js, Node 22.x, build `npm run build`, start `npm run start`, output `.next`.

Có thể triển khai thủ công bằng ZIP khi cần khôi phục: nén các thư mục `app`, `lib`, `public` cùng `package.json`, `package-lock.json`, `tsconfig.json`, `next.config.ts` và `README.md`. Không đưa `.env.local`, `node_modules`, `.next` hoặc `outputs` vào repository hay file triển khai.

Tạo database MariaDB riêng cho ứng dụng. Khai báo các biến server-only: APP_ORIGIN, ADMIN_SECRET, DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD. APP_ORIGIN là origin HTTPS của ứng dụng. DB_HOST lấy từ hPanel, không tự điền IP ngẫu nhiên. Tệp .env.example chỉ mô tả cấu hình, không chứa khóa thật.

Schema được khởi tạo idempotent ở lần truy cập DB đầu tiên; chỉ CREATE TABLE IF NOT EXISTS. Dữ liệu lưu trong MariaDB, không nằm trong folder deployment. Các lần ghi điểm/đổi quà chạy trong transaction với khóa chung, ngăn chi vượt điểm và tồn quà khi nhiều yêu cầu đồng thời.

Trang `/` là trang giới thiệu công khai. Đăng nhập `/admin` để nhập danh sách khách và hóa đơn. Trang thẻ dùng `/member/<mã>?key=<khóa>`. Giữ nguyên mã khách KiotViet. Import không lấy số điện thoại/địa chỉ/email.

## Local

npm ci
npm run dev

Điền .env.local bằng cấu hình MariaDB thử nghiệm riêng trước khi kiểm thử API. Không dùng DB production cho fixture kiểm thử.

## Bản nguồn

Bản Sites cũ ở ../gentric-membership được giữ riêng. UI dùng cùng thiết kế; phần database của bản này đã chuyển sang mysql2/MariaDB.

