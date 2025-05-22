import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { FaBell, FaPlus, FaEdit, FaTrash, FaCheck, FaTimes } from 'react-icons/fa';

function NotificationManagement() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingNotification, setEditingNotification] = useState(null);
    const [formData, setFormData] = useState({
        title: '',
        content: '',
        target_type: 'all',
        target_ids: []
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const queryClient = useQueryClient();

    // Fetch notifications
    const { data: notifications = [], isLoading } = useQuery({
        queryKey: ['admin-notifications'],
        queryFn: async () => {
            const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/admin/notifications`, { withCredentials: true });
            if (response.data.status !== 'success') {
                throw new Error(response.data.message || "Không thể tải danh sách thông báo");
            }
            return response.data.notifications;
        },
        onError: (error) => {
            console.error("Error fetching notifications:", error);
            setError("Không thể tải danh sách thông báo. Vui lòng thử lại sau.");
        }
    });

    // Create notification mutation
    const createNotificationMutation = useMutation({
        mutationFn: async (data) => {
            const response = await axios.post(
                `${import.meta.env.VITE_API_BASE_URL}/admin/notifications`,
                data,
                { withCredentials: true }
            );
            if (response.data.status !== 'success') {
                throw new Error(response.data.message || "Không thể tạo thông báo");
            }
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['admin-notifications']);
            setSuccess("Tạo thông báo thành công!");
            setIsModalOpen(false);
            resetForm();
            setTimeout(() => setSuccess(''), 3000);
        },
        onError: (error) => {
            console.error("Error creating notification:", error);
            setError(error.response?.data?.message || "Không thể tạo thông báo. Vui lòng thử lại.");
        }
    });

    // Update notification mutation
    const updateNotificationMutation = useMutation({
        mutationFn: async ({ id, data }) => {
            const response = await axios.put(
                `${import.meta.env.VITE_API_BASE_URL}/admin/notifications/${id}`,
                data,
                { withCredentials: true }
            );
            if (response.data.status !== 'success') {
                throw new Error(response.data.message || "Không thể cập nhật thông báo");
            }
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['admin-notifications']);
            setSuccess("Cập nhật thông báo thành công!");
            setIsModalOpen(false);
            resetForm();
            setTimeout(() => setSuccess(''), 3000);
        },
        onError: (error) => {
            console.error("Error updating notification:", error);
            setError(error.response?.data?.message || "Không thể cập nhật thông báo. Vui lòng thử lại.");
        }
    });

    // Delete notification mutation
    const deleteNotificationMutation = useMutation({
        mutationFn: async (id) => {
            const response = await axios.delete(
                `${import.meta.env.VITE_API_BASE_URL}/admin/notifications/${id}`,
                { withCredentials: true }
            );
            if (response.data.status !== 'success') {
                throw new Error(response.data.message || "Không thể xóa thông báo");
            }
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['admin-notifications']);
            setSuccess("Xóa thông báo thành công!");
            setTimeout(() => setSuccess(''), 3000);
        },
        onError: (error) => {
            console.error("Error deleting notification:", error);
            setError(error.response?.data?.message || "Không thể xóa thông báo. Vui lòng thử lại.");
        }
    });

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');

        if (!formData.title.trim() || !formData.content.trim()) {
            setError("Vui lòng nhập đầy đủ tiêu đề và nội dung thông báo");
            return;
        }

        if (editingNotification) {
            updateNotificationMutation.mutate({
                id: editingNotification._id,
                data: formData
            });
        } else {
            createNotificationMutation.mutate(formData);
        }
    };

    const handleEdit = (notification) => {
        setEditingNotification(notification);
        setFormData({
            title: notification.title,
            content: notification.content,
            target_type: notification.target_type,
            target_ids: notification.target_ids || [],
            is_active: notification.is_active
        });
        setIsModalOpen(true);
    };

    const handleDelete = (id) => {
        if (window.confirm("Bạn có chắc chắn muốn xóa thông báo này?")) {
            deleteNotificationMutation.mutate(id);
        }
    };

    const resetForm = () => {
        setFormData({
            title: '',
            content: '',
            target_type: 'all',
            target_ids: []
        });
        setEditingNotification(null);
    };

    const openModal = () => {
        resetForm();
        setIsModalOpen(true);
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Quản lý thông báo</h2>
                <button
                    onClick={openModal}
                    className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg flex items-center"
                >
                    <FaPlus className="mr-2" /> Tạo thông báo mới
                </button>
            </div>

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

            {isLoading ? (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
                </div>
            ) : (
                <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Tiêu đề</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Nội dung</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Đối tượng</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Trạng thái</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Ngày tạo</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                {notifications.length > 0 ? (
                                    notifications.map((notification) => (
                                        <tr key={notification._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                                                {notification.title}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
                                                {notification.content}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                                                    {notification.target_type === 'all' ? 'Tất cả' :
                                                        notification.target_type === 'students' ? 'Sinh viên' :
                                                            notification.target_type === 'instructors' ? 'Giảng viên' : 'Cụ thể'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                {notification.is_active ? (
                                                    <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                                                        <FaCheck className="inline mr-1" /> Hoạt động
                                                    </span>
                                                ) : (
                                                    <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">
                                                        <FaTimes className="inline mr-1" /> Không hoạt động
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                {new Date(notification.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                <button
                                                    onClick={() => handleEdit(notification)}
                                                    className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 mr-3"
                                                >
                                                    <FaEdit className="inline" /> Sửa
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(notification._id)}
                                                    className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                                                >
                                                    <FaTrash className="inline" /> Xóa
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                                            Không có thông báo nào
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modal for creating/editing notification */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-8 max-w-2xl w-full">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                                {editingNotification ? 'Chỉnh sửa thông báo' : 'Tạo thông báo mới'}
                            </h3>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="text-gray-400 hover:text-gray-500 dark:text-gray-300 dark:hover:text-gray-200"
                            >
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className="mb-4">
                                <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2" htmlFor="title">
                                    Tiêu đề
                                </label>
                                <input
                                    type="text"
                                    id="title"
                                    name="title"
                                    value={formData.title}
                                    onChange={handleInputChange}
                                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-300 dark:bg-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                    required
                                />
                            </div>

                            <div className="mb-4">
                                <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2" htmlFor="content">
                                    Nội dung
                                </label>
                                <textarea
                                    id="content"
                                    name="content"
                                    value={formData.content}
                                    onChange={handleInputChange}
                                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-300 dark:bg-gray-700 leading-tight focus:outline-none focus:shadow-outline h-32"
                                    required
                                ></textarea>
                            </div>

                            <div className="mb-4">
                                <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2" htmlFor="target_type">
                                    Đối tượng
                                </label>
                                <select
                                    id="target_type"
                                    name="target_type"
                                    value={formData.target_type}
                                    onChange={handleInputChange}
                                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-300 dark:bg-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                >
                                    <option value="all">Tất cả</option>
                                    <option value="students">Sinh viên</option>
                                    <option value="instructors">Giảng viên</option>
                                    <option value="specific">Cụ thể</option>
                                </select>
                            </div>

                            {editingNotification && (
                                <div className="mb-4">
                                    <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2" htmlFor="is_active">
                                        Trạng thái
                                    </label>
                                    <select
                                        id="is_active"
                                        name="is_active"
                                        value={formData.is_active}
                                        onChange={handleInputChange}
                                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-300 dark:bg-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                    >
                                        <option value={true}>Hoạt động</option>
                                        <option value={false}>Không hoạt động</option>
                                    </select>
                                </div>
                            )}

                            <div className="flex items-center justify-end mt-6">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-medium py-2 px-4 rounded-lg mr-2"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg"
                                    disabled={createNotificationMutation.isLoading || updateNotificationMutation.isLoading}
                                >
                                    {createNotificationMutation.isLoading || updateNotificationMutation.isLoading ? (
                                        <span className="flex items-center">
                                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Đang xử lý...
                                        </span>
                                    ) : (
                                        <span>{editingNotification ? 'Cập nhật' : 'Tạo mới'}</span>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default NotificationManagement;