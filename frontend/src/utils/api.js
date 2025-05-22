import axios from 'axios';

// Tạo instance axios với cấu hình mặc định
const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000',
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    }
});

// Thêm interceptor để xử lý request
api.interceptors.request.use(
    (config) => {
        // Không thêm header CORS ở client side - đây là trách nhiệm của server
        console.log(`API Request: ${config.method.toUpperCase()} ${config.url}`);
        return config;
    },
    (error) => {
        console.error('API Request Error:', error);
        return Promise.reject(error);
    }
);

// Thêm interceptor để xử lý response
api.interceptors.response.use(
    (response) => {
        // Trả về response trực tiếp
        return response;

        return response;
    },
    (error) => {
        // Xử lý lỗi 401 (Unauthorized)
        if (error.response && error.response.status === 401) {
            // Nếu token hết hạn hoặc không hợp lệ, chuyển hướng về trang đăng nhập
            localStorage.removeItem('isAuthenticated');
            localStorage.removeItem('user');
            window.location.href = '/';
        }

        console.error('API Response Error:', error.response?.status, error.response?.data || error.message);
        return Promise.reject(error);
    }
);

export default api;