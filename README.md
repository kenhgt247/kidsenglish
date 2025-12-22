
# 🦖 Dino English Adventure

Dino English Adventure là một ứng dụng web học tiếng Anh tương tác đỉnh cao dành cho trẻ em, được xây dựng bằng **React**, **Framer Motion**, và **Google Gemini AI**. Trò chơi bao gồm chuỗi **22 màn chơi** giáo dục đa dạng.

## 🌟 Tính năng nổi bật
- **22 Màn chơi hấp dẫn**: Từ Word Jungle cơ bản đến Size Explorer và Traffic Hero.
- **Tương tác giọng nói AI**: Sử dụng Gemini API (`gemini-3-flash-preview`) để tạo giọng nói dẫn dắt bé bằng tiếng Anh bản xứ.
- **Hệ thống bản đồ tương tác**: Bé có thể thấy chú khủng long 🦖 di chuyển và nhảy qua từng cấp độ đã mở khóa.
- **Giao diện Retina-Ready**: Màu sắc rực rỡ, hiệu ứng vật lý chân thực.
- **Lưu trữ tiến trình**: Tự động lưu điểm và cấp độ đã mở vào LocalStorage.

## 🚀 Hướng dẫn cài đặt

### 1. Chuẩn bị
- Đảm bảo máy tính đã cài đặt [Node.js](https://nodejs.org/).
- Clone dự án về máy:
```bash
git clone https://github.com/your-username/dino-english.git
cd dino-english
```

### 2. Cài đặt thư viện
```bash
npm install
```

### 3. Cấu hình API Key
Ứng dụng cần **Gemini API Key** để hoạt động (cho giọng nói AI).
- Tạo file `.env` tại thư mục gốc.
- Thêm dòng sau vào file `.env`:
```env
API_KEY=YOUR_GEMINI_API_KEY_HERE
```

### 4. Chạy dự án ở môi trường phát triển
```bash
npm start
```

## 📦 Triển khai thực tế

### Triển khai lên Vercel / Netlify
1. Đẩy dự án lên GitHub.
2. Kết nối GitHub với Vercel/Netlify.
3. Trong phần **Environment Variables**, thêm biến `API_KEY`.
4. Nhấn **Deploy**.

## 🛠️ Công nghệ sử dụng
- **React 18**: Framework chính.
- **Tailwind CSS**: Thiết kế giao diện.
- **Framer Motion**: Chuyển động và animation.
- **Google GenAI SDK**: Tích hợp trí tuệ nhân tạo Gemini.
- **Howler.js**: Hệ thống âm thanh SFX.
- **Lucide React**: Thư viện icon cao cấp.

---
*Chúc các bé có hành trình chinh phục tiếng Anh tuyệt vời cùng Asking!* 🦖✨
