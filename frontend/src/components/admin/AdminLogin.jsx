import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useMutation } from '@tanstack/react-query';
import { AuthContext } from '../AuthContext';
import UITLogo from "/src/assets/logouit.png";

function AdminLogin() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [message, setMessage] = useState("");

    const { setIsAuthenticated, setUser } = useContext(AuthContext);
    const navigate = useNavigate();

    useEffect(() => {
        const logoutMessage = localStorage.getItem("logoutMessage");
        if (logoutMessage) {
            setMessage(logoutMessage);
            localStorage.removeItem("logoutMessage");
        }
    }, []);

    const loginMutation = useMutation({
        mutationFn: async ({ email, password }) => {
            const response = await axios.post(
                `${import.meta.env.VITE_API_BASE_URL}/admin/login`,
                { email, password },
                { withCredentials: true }
            );
            if (response.data?.status !== 'success') {
                throw new Error(response.data.message || "Đăng nhập thất bại");
            }
            return response.data;
        },
        onSuccess: (data) => {
            setIsAuthenticated(true);
            const userData = {
                admin_id: data.admin._id,
                name: data.admin.name,
                role: 'admin'
            };
            setUser(userData);
            localStorage.setItem("isAuthenticated", "true");
            localStorage.setItem("user", JSON.stringify(userData));
            navigate("/admin");
        },
        onError: (error) => {
            setMessage(error.response?.data?.message || error.message || "Lỗi máy chủ, vui lòng thử lại!");
        },
    });

    const handleLogin = (e) => {
        e.preventDefault();
        setMessage("");
        loginMutation.mutate({ email, password });
    };

    return (
        <div className="flex justify-center items-center min-h-screen bg-gray-100 dark:bg-[hsl(0,0%,7%)] transition-all duration-500">
            <div className="bg-white dark:bg-[hsl(240,95%,2%)] p-6 shadow-lg rounded-lg w-[400px]">
                <div className="flex items-center mb-4">
                    <img src={UITLogo} alt="UIT Logo" className="w-[50px] object-cover mr-3" />
                    <h2 className="text-lg ml-4 dark:text-white">UIT Admin Portal</h2>
                </div>
                <h3 className="mb-3 text-xl dark:text-gray-200">Đăng nhập Quản trị viên</h3>
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
                        className="bg-purple-600 text-white font-medium rounded-lg w-full py-2 hover:bg-purple-700 disabled:bg-purple-400"
                        disabled={loginMutation.isLoading}
                    >
                        {loginMutation.isLoading ? "Đang đăng nhập..." : "Đăng nhập"}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default AdminLogin;