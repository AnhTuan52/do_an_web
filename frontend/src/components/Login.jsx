import React, { useState, useEffect } from 'react';
import { createContext, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useMutation } from '@tanstack/react-query';
import { AuthContext } from '/src/components/AuthContext';
import UITLogo from "/src/assets/logouit.png";

export const ThemeContext = createContext();

function Login() {
    const [mssv, setMssv] = useState("");
    const [fMssv, setFMssv] = useState("");
    const [password, setPassword] = useState("");
    const [message, setMessage] = useState("");
    const [isForgotPassword, setIsForgotPassword] = useState(false);
    const [forgotPasswordMessage, setForgotPasswordMessage] = useState("");
    const [isRegistering, setIsRegistering] = useState(false);
    const [regPassword, setRegPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [cookieValue, setCookieValue] = useState("");

    const { setIsAuthenticated, loginMutation } = useContext(AuthContext);
    const navigate = useNavigate();

    useEffect(() => {
        const logoutMessage = localStorage.getItem("logoutMessage");
        if (logoutMessage) {
            setMessage(logoutMessage);
            localStorage.removeItem("logoutMessage");
        }
    }, []);

    // const loginMutation = useMutation({
    //     mutationFn: async ({ mssv, password }) => {
    //         const response = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/login`, { mssv, password }, { withCredentials: true });
    //         if (response.data?.status !== 'success') {
    //             setIsAuthenticated(false);
    //             throw new Error(response.data.message);
    //         }
    //         return response.data;
    //     },
    //     onSuccess: () => {
    //         setIsAuthenticated(true);
    //         navigate(`/user`);
    //     },
    //     onError: (error) => {
    //         setMessage(error.response?.data?.message || error.message || "Lỗi máy chủ, vui lòng thử lại!");
    //     },
    // });

    const forgotPasswordMutation = useMutation({
        mutationFn: async ({ fMssv }) => {
            const response = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/forgot_password`, { fMssv });
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

    const registerMutation = useMutation({
        mutationFn: async ({ mssv, regPassword, cookieValue }) => {
            const response = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/register`,
                { mssv, regPassword, cookieValue },
                { withCredentials: true }
            );
            if (response.data?.status !== 'success') {
                throw new Error(response.data.message);
            }
            return response.data;
        },
        onSuccess: (data) => {
            setMessage("Đăng ký thành công!");
        },
        onError: (error) => {
            setMessage(error.response?.data?.message || error.message || "Lỗi máy chủ, vui lòng thử lại!");
        },
    });

    const handleLogin = (e) => {
        e.preventDefault();
        setMessage("");
        loginMutation.mutate({ mssv, password });
    };


    const handleRegister = (e) => {
        e.preventDefault();
        setMessage("");

        if (regPassword !== confirmPassword) {
            setMessage("Mật khẩu không khớp.");
            return;
        }

        registerMutation.mutate({ mssv, regPassword, cookieValue });
    };

    const handleForgotPasswordClick = () => {
        setIsForgotPassword(true);
        setMessage("");
        setForgotPasswordMessage("");
    };

    const handleForgotPasswordSubmit = (e) => {
        e.preventDefault();
        setForgotPasswordMessage("");
        forgotPasswordMutation.mutate({ fMssv });
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
                        <h2 className="text-lg ml-4 dark:text-gray-100">UIT Student Assistant</h2>
                    </div>
                    <h3 className="mb-3 text-xl dark:text-gray-200">Quên mật khẩu</h3>
                    <form onSubmit={handleForgotPasswordSubmit}>
                        <div className="mb-3">
                            <label htmlFor="mssv" className="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-2">Mã số sinh viên</label>
                            <input
                                type="text"
                                className="border border-gray-300 rounded w-full px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                id="mssv"
                                value={fMssv}
                                onChange={(e) => setFMssv(e.target.value)}
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

    if (isRegistering) {
        return (
            <div className="flex justify-center items-center min-h-screen bg-gray-100 dark:bg-[hsl(0,0%,7%)] transition-all duration-500">
                <div className="bg-white dark:bg-[hsl(240,95%,2%)] p-6 shadow-lg rounded-lg w-[400px]">
                    <div className="flex items-center mb-4">
                        <img src={UITLogo} alt="UIT Logo" className="w-[50px] object-cover mr-3" />
                        <h2 className="text-lg ml-4 dark:text-gray-100">UIT Student Assistant</h2>
                    </div>
                    <h3 className="mb-3 text-xl dark:text-gray-200">Đăng ký tài khoản</h3>
                    <form onSubmit={handleRegister}>
                        <div className="mb-3">
                            <label htmlFor="mssv" className="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-2">Mã số sinh viên</label>
                            <input
                                type="text"
                                className="border border-gray-300 rounded w-full px-2 py-1.5"
                                id="mssv"
                                value={mssv}
                                onChange={(e) => setMssv(e.target.value)}
                                required
                            />
                        </div>
                        <div className="mb-3">
                            <label htmlFor="ckvalue" className="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-2">Cookie</label>
                            <input
                                type="text"
                                className="border border-gray-300 rounded w-full px-2 py-1.5"
                                id="ckvalue"
                                value={cookieValue}
                                onChange={(e) => setCookieValue(e.target.value)}
                                required
                            />
                        </div>
                        <div className="mb-3">
                            <label htmlFor="regPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-2">Mật khẩu</label>
                            <input
                                type="password"
                                className="border border-gray-300 rounded w-full px-2 py-1.5"
                                id="regPassword"
                                value={regPassword}
                                onChange={(e) => setRegPassword(e.target.value)}
                                required
                            />
                        </div>
                        <div className="mb-3">
                            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-2">Xác nhận mật khẩu</label>
                            <input
                                type="password"
                                className="border border-gray-300 rounded w-full px-2 py-1.5"
                                id="confirmPassword"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                            />
                        </div>
                        {message && (
                            <div className="bg-blue-100 text-red-800 border border-red-400 rounded text-sm px-3 py-3 text-center mb-3">
                                {message}
                            </div>
                        )}
                        <button
                            type="submit"
                            className="bg-green-600 text-white font-medium rounded-lg w-full py-2 hover:bg-green-700 disabled:bg-green-400"
                            disabled={registerMutation.isLoading}
                        >
                            {registerMutation.isLoading ? "Đang xử lí..." : "Đăng ký"}
                        </button>
                        <button
                            type="button"
                            className="bg-gray-500 text-white font-medium rounded-lg w-full py-2 mt-2 hover:bg-gray-600"
                            onClick={() => {
                                setIsRegistering(false);
                                setMessage("");
                            }}
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
                    <h2 className="text-lg ml-4 dark:text-white ">UIT Student Assistant</h2>
                </div>
                <form onSubmit={handleLogin}>
                    <div className="mb-3">
                        <label htmlFor="mssv" className="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-2">Tên đăng nhập</label>
                        <input
                            type="text"
                            className="border border-gray-300 rounded w-full px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            id="mssv"
                            value={mssv}
                            onChange={(e) => setMssv(e.target.value)}
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
                    <div className="mt-4 text-center">
                        <a href="/instructor-login" className="text-gray-600 hover:underline dark:text-gray-300">
                            Đăng nhập với tư cách giảng viên
                        </a>
                    </div>
                    <div className="mt-2 text-center">
                        <button type="button" className="bg-white text-green-600 border-green-600 border-2 font-medium rounded-lg w-full py-2 hover:bg-green-600 hover:text-white disabled:bg-green-400 transition-colors duration-300" onClick={() => setIsRegistering(true)}>
                            Đăng ký
                        </button>
                    </div>
                </form>
                <div className="mt-3 text-center">
                    <button type="button" className="text-blue-600 hover:underline" onClick={handleForgotPasswordClick}>
                        Quên mật khẩu?
                    </button>
                </div>
            </div>
        </div>
    );
}

export default Login;