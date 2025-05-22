import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { FaUserGraduate, FaChalkboardTeacher, FaBook, FaBell, FaChartLine } from 'react-icons/fa';

function AdminHome() {
    const [stats, setStats] = useState({
        studentCount: 0,
        instructorCount: 0,
        classCount: 0,
        notificationCount: 0
    });

    // Fetch students
    const { data: students = [], isLoading: isLoadingStudents, isError: isStudentsError } = useQuery({
        queryKey: ['admin-students'],
        queryFn: async () => {
            try {
                const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/admin/students`, { withCredentials: true });
                console.log("API response for students:", response.data);
                if (response.data.status !== 'success') {
                    throw new Error(response.data.message || "Không thể tải danh sách sinh viên");
                }
                const studentsData = response.data.students || [];
                console.log("Students data length:", studentsData.length);
                return studentsData;
            } catch (error) {
                if (error.response && (error.response.status === 401 || error.response.status === 403)) {
                    console.log("Authentication error when fetching students");
                }
                throw error;
            }
        },
        onSuccess: (data) => {
            // Update the student count in stats
            console.log("onSuccess students data:", data);
            console.log("onSuccess students length:", data.length);
            setStats(prev => {
                const newStats = { ...prev, studentCount: data.length };
                console.log("New stats after student update:", newStats);
                return newStats;
            });
        },
        onError: (error) => {
            console.error("Error fetching students:", error);
        },
        retry: false // Don't retry on error
    });

    // Fetch instructors
    const { data: instructors = [], isLoading: isLoadingInstructors, isError: isInstructorsError } = useQuery({
        queryKey: ['admin-instructors'],
        queryFn: async () => {
            try {
                const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/admin/instructors`, { withCredentials: true });
                if (response.data.status !== 'success') {
                    throw new Error(response.data.message || "Không thể tải danh sách giảng viên");
                }
                return response.data.instructors || [];
            } catch (error) {
                if (error.response && (error.response.status === 401 || error.response.status === 403)) {
                    console.log("Authentication error when fetching instructors");
                }
                throw error;
            }
        },
        onSuccess: (data) => {
            // Update the instructor count in stats
            setStats(prev => ({ ...prev, instructorCount: data.length }));
        },
        onError: (error) => {
            console.error("Error fetching instructors:", error);
        },
        retry: false // Don't retry on error
    });

    // Fetch classes
    const { data: classes = [], isLoading: isLoadingClasses, isError: isClassesError } = useQuery({
        queryKey: ['admin-classes'],
        queryFn: async () => {
            try {
                const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/admin/classes`, { withCredentials: true });
                if (response.data.status !== 'success') {
                    throw new Error(response.data.message || "Không thể tải danh sách lớp học");
                }
                return response.data.classes || [];
            } catch (error) {
                if (error.response && (error.response.status === 401 || error.response.status === 403)) {
                    console.log("Authentication error when fetching classes");
                }
                throw error;
            }
        },
        onSuccess: (data) => {
            // Update the class count in stats
            setStats(prev => ({ ...prev, classCount: data.length }));
        },
        onError: (error) => {
            console.error("Error fetching classes:", error);
        },
        retry: false // Don't retry on error
    });

    // Fetch notifications
    const { data: notifications = [], isLoading: isLoadingNotifications, isError: isNotificationsError } = useQuery({
        queryKey: ['admin-notifications'],
        queryFn: async () => {
            try {
                const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/admin/notifications`, { withCredentials: true });
                if (response.data.status !== 'success') {
                    throw new Error(response.data.message || "Không thể tải danh sách thông báo");
                }
                return response.data.notifications || [];
            } catch (error) {
                if (error.response && (error.response.status === 401 || error.response.status === 403)) {
                    console.log("Authentication error when fetching notifications");
                }
                throw error;
            }
        },
        onSuccess: (data) => {
            // Update the notification count in stats
            setStats(prev => ({ ...prev, notificationCount: data.length }));
        },
        onError: (error) => {
            console.error("Error fetching notifications:", error);
        },
        retry: false // Don't retry on error
    });

    // Trạng thái loading tổng hợp
    const isLoading = isLoadingStudents || isLoadingInstructors || isLoadingClasses || isLoadingNotifications;

    // Check if any of the queries have authentication errors
    const hasAuthError = isStudentsError || isInstructorsError || isClassesError || isNotificationsError;

    // Log stats for debugging
    console.log("Current stats:", stats);
    console.log("Students array:", students);
    console.log("Students length:", students.length);

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="welcome flex flex-1 flex-col justify-center p-0 m-0 mb-5 w-full max-w-[1200px]">
                <h2 className="text-[40px] mb-3 text-gray-800 dark:text-gray-100 font-bold">Trang quản trị</h2>
                <p className="text-xl ml-2 text-purple-600 dark:text-purple-400">Chào mừng đến với hệ thống quản trị!</p>
            </div>

            {hasAuthError && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
                    <p className="text-red-700 dark:text-red-400 text-center font-medium">
                        Phiên đăng nhập đã hết hạn hoặc bạn không có quyền truy cập. Vui lòng đăng nhập lại.
                    </p>
                    <div className="flex justify-center mt-4">
                        <Link
                            to="/login"
                            className="bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg transition-colors"
                        >
                            Đăng nhập
                        </Link>
                    </div>
                </div>
            )}

            {isLoading && !hasAuthError && (
                <div className="flex justify-center items-center my-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
                </div>
            )}

            {/* Stats Cards */}
            {!isLoading && !hasAuthError && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow-md p-6 text-white">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-lg font-semibold">Sinh viên</p>
                                <h3 className="text-3xl font-bold mt-2">{isLoading ? '...' : students.length}</h3>
                            </div>
                            <FaUserGraduate className="text-4xl opacity-80" />
                        </div>
                        <Link to="/admin/students" className="block mt-4 text-sm text-blue-100 hover:text-white">
                            Xem chi tiết →
                        </Link>
                    </div>

                    <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg shadow-md p-6 text-white">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-lg font-semibold">Giảng viên</p>
                                <h3 className="text-3xl font-bold mt-2">{isLoading ? '...' : instructors.length}</h3>
                            </div>
                            <FaChalkboardTeacher className="text-4xl opacity-80" />
                        </div>
                        <Link to="/admin/instructors" className="block mt-4 text-sm text-green-100 hover:text-white">
                            Xem chi tiết →
                        </Link>
                    </div>

                    <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-lg shadow-md p-6 text-white">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-lg font-semibold">Lớp học</p>
                                <h3 className="text-3xl font-bold mt-2">{isLoading ? '...' : classes.length}</h3>
                            </div>
                            <FaBook className="text-4xl opacity-80" />
                        </div>
                        <Link to="/admin/classes" className="block mt-4 text-sm text-yellow-100 hover:text-white">
                            Xem chi tiết →
                        </Link>
                    </div>

                    <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg shadow-md p-6 text-white">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-lg font-semibold">Thông báo</p>
                                <h3 className="text-3xl font-bold mt-2">{isLoading ? '...' : notifications.length}</h3>
                            </div>
                            <FaBell className="text-4xl opacity-80" />
                        </div>
                        <Link to="/admin/notifications" className="block mt-4 text-sm text-purple-100 hover:text-white">
                            Xem chi tiết →
                        </Link>
                    </div>
                </div>
            )}

            {/* Recent Students */}
            {!isLoading && !hasAuthError && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Sinh viên gần đây</h3>
                            <Link to="/admin/students" className="text-blue-500 hover:underline text-sm">
                                Xem tất cả
                            </Link>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full">
                                <thead>
                                    <tr className="bg-gray-50 dark:bg-gray-700">
                                        <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">MSSV</th>
                                        <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Họ tên</th>
                                        <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Khoa</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                                    {students.slice(0, 5).map((student) => (
                                        <tr key={student._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                            <td className="py-2 px-4 text-sm text-gray-900 dark:text-gray-100">{student.mssv}</td>
                                            <td className="py-2 px-4 text-sm text-gray-900 dark:text-gray-100">{student.name || 'N/A'}</td>
                                            <td className="py-2 px-4 text-sm text-gray-900 dark:text-gray-100">{student.faculty || 'N/A'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Recent Classes */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Lớp học gần đây</h3>
                            <Link to="/admin/classes" className="text-blue-500 hover:underline text-sm">
                                Xem tất cả
                            </Link>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full">
                                <thead>
                                    <tr className="bg-gray-50 dark:bg-gray-700">
                                        <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Mã lớp</th>
                                        <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Tên môn học</th>
                                        <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Học kỳ</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                                    {classes.slice(0, 5).map((classItem) => (
                                        <tr key={classItem._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                            <td className="py-2 px-4 text-sm text-gray-900 dark:text-gray-100">{classItem.class_code || 'N/A'}</td>
                                            <td className="py-2 px-4 text-sm text-gray-900 dark:text-gray-100">{classItem.course_name || 'N/A'}</td>
                                            <td className="py-2 px-4 text-sm text-gray-900 dark:text-gray-100">{classItem.semester || 'N/A'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Recent Notifications */}
            {!isLoading && !hasAuthError && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Thông báo gần đây</h3>
                        <Link to="/admin/notifications" className="text-blue-500 hover:underline text-sm">
                            Xem tất cả
                        </Link>
                    </div>
                    <div className="space-y-4">
                        {notifications.slice(0, 3).map((notification) => (
                            <div key={notification._id} className="border-l-4 border-blue-500 pl-4 py-2">
                                <h4 className="text-lg font-medium text-gray-800 dark:text-gray-200">{notification.title}</h4>
                                <p className="text-gray-600 dark:text-gray-400 mt-1">{notification.content}</p>
                                <div className="flex justify-between mt-2">
                                    <span className="text-xs text-gray-500 dark:text-gray-500">
                                        {new Date(notification.created_at).toLocaleDateString()}
                                    </span>
                                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                                        {notification.target_type === 'all' ? 'Tất cả' :
                                            notification.target_type === 'students' ? 'Sinh viên' :
                                                notification.target_type === 'instructors' ? 'Giảng viên' : 'Cụ thể'}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default AdminHome;