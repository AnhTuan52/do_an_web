import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useMutation } from '@tanstack/react-query';
import { AuthContext } from '../AuthContext';
import UITLogo from "/src/assets/logouit.png";

function InstructorLogin() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [message, setMessage] = useState("");
    const [isForgotPassword, setIsForgotPassword] = useState(false);
    const [forgotPasswordMessage, setForgotPasswordMessage] = useState("");

    const { setIsAuthenticated, setUser, loginMutation } = useContext(AuthContext);
    const navigate = useNavigate();

    useEffect(() => {
        const logoutMessage = localStorage.getItem("logoutMessage");
        if (logoutMessage) {
            setMessage(logoutMessage);
            localStorage.removeItem("logoutMessage");
        }
    }, []);

    const forgotPasswordMutation = useMutation({
        mutationFn: async ({ email }) => {
            const response = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/instructor/forgot_password`, { email });
            if (response.data?.status !== 'success') {
                throw new Error(response.data.message);
            }
            return response.data;
        },
        onSuccess: (data) => {
            setForgotPasswordMessage(data.message);
        },
        onError: (error) => {
            setForgotPasswordMessage(error.response?.data?.message || error.message || "Lỗi máy chủ, vui lòng thử lại!");
        },
    });

    const handleLogin = (e) => {
        e.preventDefault();
        setMessage("");
        console.log("Đang đăng nhập với email:", email);

        // Thử gọi trực tiếp API để debug
        fetch(`${import.meta.env.VITE_API_BASE_URL}/instructor/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
            credentials: 'include'
        })
            .then(response => {
                console.log("Response status:", response.status);
                return response.json();
            })
            .then(data => {
                console.log("Login response:", data);
                if (data.status === "success") {
                    // Xử lý đăng nhập thành công trực tiếp
                    setIsAuthenticated(true);
                    const userData = {
                        instructor_id: data.instructor_id,
                        name: data.name,
                        role: data.role
                    };
                    setUser(userData);
                    localStorage.setItem("isAuthenticated", "true");
                    localStorage.setItem("user", JSON.stringify(userData));
                    console.log("Chuyển hướng đến /instructor");
                    navigate("/instructor");
                } else {
                    setMessage(data.message || "Đăng nhập thất bại");
                }
            })
            .catch(error => {
                console.error("Login error:", error);
                setMessage("Lỗi kết nối đến server");
            });
    };

    const handleForgotPasswordClick = () => {
        setIsForgotPassword(true);
        setMessage("");
        setForgotPasswordMessage("");
    };

    const handleForgotPasswordSubmit = (e) => {
        e.preventDefault();
        setForgotPasswordMessage("");
        forgotPasswordMutation.mutate({ email });
    };

    const handleBackToLogin = () => {
        setIsForgotPassword(false);
        setForgotPasswordMessage("");
    };

    if (isForgotPassword) {
        return (
            <div className="flex justify-center items-center min-h-screen bg-gray-100 dark:bg-[hsl(0,0%,7%)]">
                <div className="bg-white dark:bg-[hsl(240,95%,2%)] p-6 shadow-lg rounded-lg w-[400px]">
                    <div className="flex items-center mb-4">
                        <img src={UITLogo} alt="UIT Logo" className="w-[50px] object-cover mr-3" />
                        <h2 className="text-lg ml-4 dark:text-gray-100">UIT Instructor Portal</h2>
                    </div>
                    <h3 className="mb-3 text-xl dark:text-gray-200">Quên mật khẩu</h3>
                    <form onSubmit={handleForgotPasswordSubmit}>
                        <div className="mb-3">
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-2">Email</label>
                            <input
                                type="email"
                                className="border border-gray-300 rounded w-full px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                id="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        {forgotPasswordMessage && (
                            <div className={
                                forgotPasswordMessage.includes('thành công')
                                    ? "bg-green-100 text-green-800 border border-green-400 rounded px-3 py-2 mb-3"
                                    : "bg-red-100 text-red-800 border border-red-400 rounded px-3 py-2 mb-3"
                            }>
                                {forgotPasswordMessage}
                            </div>
                        )}
                        <button
                            type="submit"
                            className="bg-blue-600 text-white font-medium rounded-lg w-full py-2 hover:bg-blue-700 disabled:bg-blue-400"
                            disabled={forgotPasswordMutation.isLoading}
                        >
                            {forgotPasswordMutation.isLoading ? "Đang gửi yêu cầu..." : "Lấy lại mật khẩu"}
                        </button>
                        <button
                            type="button"
                            className="bg-gray-500 text-white font-medium rounded-lg w-full py-2 mt-2 hover:bg-gray-600"
                            onClick={handleBackToLogin}
                        >
                            Quay lại đăng nhập
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="flex justify-center items-center min-h-screen bg-gray-100 dark:bg-[hsl(0,0%,7%)] transition-all duration-500">
            <div className="bg-white dark:bg-[hsl(240,95%,2%)] p-6 shadow-lg rounded-lg w-[400px]">
                <div className="flex items-center mb-4">
                    <img src={UITLogo} alt="UIT Logo" className="w-[50px] object-cover mr-3" />
                    <h2 className="text-lg ml-4 dark:text-white">UIT Instructor Portal</h2>
                </div>
                <h3 className="mb-3 text-xl dark:text-gray-200">Đăng nhập Giảng viên</h3>
                <form onSubmit={handleLogin}>
                    <div className="mb-3">
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-2">Email</label>
                        <input
                            type="email"
                            className="border border-gray-300 rounded w-full px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div className="mb-3">
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-2">Mật khẩu</label>
                        <input
                            type="password"
                            className="border border-gray-300 rounded w-full px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    {message && (
                        <div className="bg-red-100 text-red-800 border border-red-400 rounded text-sm px-3 py-3 text-center mb-3">
                            {message}
                        </div>
                    )}
                    <button
                        type="submit"
                        className="bg-blue-600 text-white font-medium rounded-lg w-full py-2 hover:bg-blue-700 disabled:bg-blue-400"
                        disabled={loginMutation.isLoading}
                    >
                        {loginMutation.isLoading ? "Đang đăng nhập..." : "Đăng nhập"}
                    </button>
                    <div className="mt-2 text-center">
                        <button
                            type="button"
                            className="text-blue-600 hover:underline"
                            onClick={handleForgotPasswordClick}
                        >
                            Quên mật khẩu?
                        </button>
                    </div>
                    <div className="mt-4 text-center">
                        <a href="/" className="text-gray-600 hover:underline dark:text-gray-300">
                            Đăng nhập với tư cách sinh viên
                        </a>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default InstructorLogin;