import React, { useState, useContext } from 'react';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { FaCog, FaKey, FaUser, FaShieldAlt } from 'react-icons/fa';
import { AuthContext } from '../AuthContext';

function AdminSettings() {
    const { user } = useContext(AuthContext);
    const [activeTab, setActiveTab] = useState('profile');
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Update profile mutation
    const updateProfileMutation = useMutation({
        mutationFn: async (data) => {
            const response = await axios.put(
                `${import.meta.env.VITE_API_BASE_URL}/admin/profile`,
                data,
                { withCredentials: true }
            );
            if (response.data.status !== 'success') {
                throw new Error(response.data.message || "Không thể cập nhật thông tin");
            }
            return response.data;
        },
        onSuccess: () => {
            setSuccess("Cập nhật thông tin thành công!");
            setTimeout(() => setSuccess(''), 3000);
        },
        onError: (error) => {
            console.error("Error updating profile:", error);
            setError(error.response?.data?.message || "Không thể cập nhật thông tin. Vui lòng thử lại.");
        }
    });

    // Change password mutation
    const changePasswordMutation = useMutation({
        mutationFn: async (data) => {
            const response = await axios.put(
                `${import.meta.env.VITE_API_BASE_URL}/admin/change-password`,
                data,
                { withCredentials: true }
            );
            if (response.data.status !== 'success') {
                throw new Error(response.data.message || "Không thể đổi mật khẩu");
            }
            return response.data;
        },
        onSuccess: () => {
            setSuccess("Đổi mật khẩu thành công!");
            setFormData(prev => ({
                ...prev,
                currentPassword: '',
                newPassword: '',
                confirmPassword: ''
            }));
            setTimeout(() => setSuccess(''), 3000);
        },
        onError: (error) => {
            console.error("Error changing password:", error);
            setError(error.response?.data?.message || "Không thể đổi mật khẩu. Vui lòng thử lại.");
        }
    });

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setError('');
    };

    const handleProfileSubmit = (e) => {
        e.preventDefault();
        setError('');

        if (!formData.name.trim() || !formData.email.trim()) {
            setError("Vui lòng nhập đầy đủ thông tin");
            return;
        }

        updateProfileMutation.mutate({
            name: formData.name,
            email: formData.email
        });
    };

    const handlePasswordSubmit = (e) => {
        e.preventDefault();
        setError('');

        if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
            setError("Vui lòng nhập đầy đủ thông tin");
            return;
        }

        if (formData.newPassword !== formData.confirmPassword) {
            setError("Mật khẩu mới không khớp");
            return;
        }

        if (formData.newPassword.length < 6) {
            setError("Mật khẩu mới phải có ít nhất 6 ký tự");
            return;
        }

        changePasswordMutation.mutate({
            currentPassword: formData.currentPassword,
            newPassword: formData.newPassword
        });
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6">Cài đặt tài khoản</h2>

            <div className="flex flex-col md:flex-row gap-6">
                <div className="w-full md:w-1/4">
                    <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-4">
                        <ul>
                            <li className="mb-2">
                                <button
                                    onClick={() => setActiveTab('profile')}
                                    className={`flex items-center w-full p-3 rounded-lg text-left ${activeTab === 'profile'
                                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-200'
                                            : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                                        }`}
                                >
                                    <FaUser className="mr-3" />
                                    <span>Thông tin cá nhân</span>
                                </button>
                            </li>
                            <li className="mb-2">
                                <button
                                    onClick={() => setActiveTab('password')}
                                    className={`flex items-center w-full p-3 rounded-lg text-left ${activeTab === 'password'
                                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-200'
                                            : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                                        }`}
                                >
                                    <FaKey className="mr-3" />
                                    <span>Đổi mật khẩu</span>
                                </button>
                            </li>
                            <li>
                                <button
                                    onClick={() => setActiveTab('security')}
                                    className={`flex items-center w-full p-3 rounded-lg text-left ${activeTab === 'security'
                                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-200'
                                            : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                                        }`}
                                >
                                    <FaShieldAlt className="mr-3" />
                                    <span>Bảo mật</span>
                                </button>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="w-full md:w-3/4">
                    <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6">
                        {error && (
                            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                                {error}
                            </div>
                        )}

                        {success && (
                            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
                                {success}
                            </div>
                        )}

                        {activeTab === 'profile' && (
                            <div>
                                <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4">Thông tin cá nhân</h3>
                                <form onSubmit={handleProfileSubmit}>
                                    <div className="mb-4">
                                        <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2" htmlFor="name">
                                            Họ tên
                                        </label>
                                        <input
                                            type="text"
                                            id="name"
                                            name="name"
                                            value={formData.name}
                                            onChange={handleInputChange}
                                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-300 dark:bg-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                            placeholder="Nhập họ tên"
                                        />
                                    </div>
                                    <div className="mb-4">
                                        <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2" htmlFor="email">
                                            Email
                                        </label>
                                        <input
                                            type="email"
                                            id="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleInputChange}
                                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-300 dark:bg-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                            placeholder="Nhập email"
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg"
                                        disabled={updateProfileMutation.isLoading}
                                    >
                                        {updateProfileMutation.isLoading ? "Đang cập nhật..." : "Cập nhật thông tin"}
                                    </button>
                                </form>
                            </div>
                        )}

                        {activeTab === 'password' && (
                            <div>
                                <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4">Đổi mật khẩu</h3>
                                <form onSubmit={handlePasswordSubmit}>
                                    <div className="mb-4">
                                        <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2" htmlFor="currentPassword">
                                            Mật khẩu hiện tại
                                        </label>
                                        <input
                                            type="password"
                                            id="currentPassword"
                                            name="currentPassword"
                                            value={formData.currentPassword}
                                            onChange={handleInputChange}
                                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-300 dark:bg-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                            placeholder="Nhập mật khẩu hiện tại"
                                        />
                                    </div>
                                    <div className="mb-4">
                                        <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2" htmlFor="newPassword">
                                            Mật khẩu mới
                                        </label>
                                        <input
                                            type="password"
                                            id="newPassword"
                                            name="newPassword"
                                            value={formData.newPassword}
                                            onChange={handleInputChange}
                                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-300 dark:bg-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                            placeholder="Nhập mật khẩu mới"
                                        />
                                    </div>
                                    <div className="mb-4">
                                        <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2" htmlFor="confirmPassword">
                                            Xác nhận mật khẩu mới
                                        </label>
                                        <input
                                            type="password"
                                            id="confirmPassword"
                                            name="confirmPassword"
                                            value={formData.confirmPassword}
                                            onChange={handleInputChange}
                                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-300 dark:bg-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                            placeholder="Nhập lại mật khẩu mới"
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg"
                                        disabled={changePasswordMutation.isLoading}
                                    >
                                        {changePasswordMutation.isLoading ? "Đang cập nhật..." : "Đổi mật khẩu"}
                                    </button>
                                </form>
                            </div>
                        )}

                        {activeTab === 'security' && (
                            <div>
                                <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4">Bảo mật tài khoản</h3>
                                <div className="bg-yellow-50 dark:bg-gray-700 p-4 rounded-lg mb-4">
                                    <div className="flex items-center">
                                        <FaShieldAlt className="text-yellow-500 mr-3 text-xl" />
                                        <h4 className="font-medium text-gray-800 dark:text-gray-200">Lời khuyên bảo mật</h4>
                                    </div>
                                    <ul className="mt-3 space-y-2 text-gray-600 dark:text-gray-400 pl-8 list-disc">
                                        <li>Sử dụng mật khẩu mạnh với ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt</li>
                                        <li>Không sử dụng cùng một mật khẩu cho nhiều tài khoản khác nhau</li>
                                        <li>Thay đổi mật khẩu định kỳ, ít nhất 3 tháng một lần</li>
                                        <li>Không chia sẻ mật khẩu với người khác</li>
                                        <li>Đăng xuất khỏi tài khoản khi sử dụng máy tính công cộng</li>
                                    </ul>
                                </div>

                                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                                    <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-2">Phiên đăng nhập hiện tại</h4>
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <p className="text-gray-600 dark:text-gray-400">Đăng nhập lần cuối: {new Date().toLocaleString()}</p>
                                            <p className="text-gray-600 dark:text-gray-400">IP: 127.0.0.1</p>
                                        </div>
                                        <button className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-md text-sm">
                                            Đăng xuất tất cả thiết bị
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default AdminSettings;