import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import { FaChalkboardTeacher, FaBell } from 'react-icons/fa';

// Default data
const defaultInstructor = {
    full_name: "Giảng viên",
    email: "instructor@example.com",
    department: "Khoa Công nghệ Thông tin",
    position: "Giảng viên"
};

const defaultNotifications = [
    {
        id: 1,
        title: "Thông báo hệ thống",
        content: "Chào mừng đến với hệ thống quản lý đào tạo",
        date: "Hôm nay",
        isNew: true
    },
    {
        id: 2,
        title: "Cập nhật lịch học",
        content: "Lịch học học kỳ mới đã được cập nhật",
        date: "Hôm qua",
        isNew: false
    }
];

function InstructorHome() {
    const [notifications] = useState(defaultNotifications);

    // Fetch instructor and classes data
    const { data, isLoading, error } = useQuery({
        queryKey: ['instructor-dashboard'],
        queryFn: async () => {
            const response = await api.get('/api/instructor/courses');

            if (response.data.status !== 'success') {
                throw new Error(response.data.message || 'Không thể tải thông tin giảng viên');
            }

            return {
                instructor: response.data.instructor || {},
                courses: response.data.courses || [],
            };
        },
        staleTime: 1000 * 60 * 5,
    });

    // Extract data with safe defaults
    const instructor = data?.instructor || defaultInstructor;
    const classes = data?.courses || [];

    // Loading state
    if (isLoading) {
        return <p className="m-4 text-gray-600">Đang tải dữ liệu...</p>;
    }

    // Error state
    if (error) {
        return (
            <div className="m-4 p-4 border border-red-300 bg-red-50 rounded-md">
                <h3 className="text-lg font-semibold text-red-700 mb-2">Lỗi khi tải dữ liệu</h3>
                <p className="text-red-600 mb-2">{error.message}</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center w-full my-5 mx-auto p-3.5 bg-white rounded-lg">
            {instructor ? (
                <>
                    <div className="welcome w-full max-w-[1200px] mb-5">
                        <div className="flex justify-between items-center">
                            <div>
                                <h2 className="text-[40px] mb-3 text-gray-800 font-bold">Trang chủ Giảng viên</h2>
                                <p className="text-xl ml-2 text-blue-600">Chào mừng, {instructor.full_name || instructor.name}!</p>
                            </div>
                            <div className="relative">
                                <button className="p-3 bg-blue-50 rounded-full hover:bg-blue-100 transition-colors">
                                    <FaBell className="text-blue-600 text-xl" />
                                    <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                                        {notifications.filter(n => n.isNew).length}
                                    </span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Notifications Section */}
                    <div className="w-full max-w-[1200px] mb-6">
                        <div className="bg-white p-5 rounded-lg shadow-md">
                            <div className="flex justify-between items-center mb-4">
                                <h4 className="text-lg font-bold text-gray-800 flex items-center">
                                    <FaBell className="mr-2 text-blue-500" /> Thông báo mới
                                </h4>
                                <span className="text-sm text-blue-500 cursor-pointer hover:underline">Xem tất cả</span>
                            </div>

                            <div className="space-y-3">
                                {notifications.map(notification => (
                                    <div key={notification.id} className={`p-3 rounded-lg border ${notification.isNew ? 'border-blue-200 bg-blue-50' : 'border-gray-200'}`}>
                                        <div className="flex justify-between">
                                            <h5 className="font-semibold text-gray-800">{notification.title}</h5>
                                            <span className="text-xs text-gray-500">{notification.date}</span>
                                        </div>
                                        <p className="text-gray-600 mt-1">{notification.content}</p>
                                        {notification.isNew && (
                                            <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full mt-2">Mới</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-[1200px] items-start">
                        {/* Instructor Information */}
                        <div className="bg-white p-5 rounded-lg shadow-md">
                            <h4 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">Thông tin giảng viên</h4>
                            <div className="grid gap-3">
                                <div className="flex">
                                    <p className="w-32 font-semibold text-gray-700">Họ tên:</p>
                                    <p className="text-gray-800">{instructor.full_name || instructor.name}</p>
                                </div>
                                <div className="flex">
                                    <p className="w-32 font-semibold text-gray-700">Email:</p>
                                    <p className="text-gray-800">{instructor.email}</p>
                                </div>
                                <div className="flex">
                                    <p className="w-32 font-semibold text-gray-700">Khoa:</p>
                                    <p className="text-gray-800">{instructor.department || "Khoa Công nghệ Thông tin"}</p>
                                </div>
                                <div className="flex">
                                    <p className="w-32 font-semibold text-gray-700">Chức vụ:</p>
                                    <p className="text-gray-800">{instructor.position || "Giảng viên"}</p>
                                </div>
                            </div>
                        </div>

                        {/* Classes Information */}
                        <div className="bg-white p-5 rounded-lg shadow-md">
                            <h4 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">Lớp học đang giảng dạy</h4>

                            {classes && classes.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full bg-white rounded-lg overflow-hidden">
                                        <thead>
                                            <tr className="bg-gradient-to-r from-blue-50 to-indigo-50 text-gray-700">
                                                <th className="py-3 px-4 border-b border-gray-200 text-left font-semibold">Mã lớp</th>
                                                <th className="py-3 px-4 border-b border-gray-200 text-left font-semibold">Tên môn học</th>
                                                <th className="py-3 px-4 border-b border-gray-200 text-left font-semibold">Học kỳ</th>
                                                <th className="py-3 px-4 border-b border-gray-200 text-center font-semibold">Thao tác</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {classes.slice(0, 3).map((classItem, index) => (
                                                <tr key={classItem._id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors`}>
                                                    <td className="py-3 px-4 border-b border-gray-200 font-medium text-blue-700">{classItem.class_code || classItem.course_code || 'N/A'}</td>
                                                    <td className="py-3 px-4 border-b border-gray-200">{classItem.course_name || 'N/A'}</td>
                                                    <td className="py-3 px-4 border-b border-gray-200">{classItem.semester || 'N/A'}</td>
                                                    <td className="py-3 px-4 border-b border-gray-200 text-center">
                                                        <Link
                                                            to={`/instructor/classes/${classItem._id}`}
                                                            className="inline-flex items-center px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm transition-colors"
                                                        >
                                                            Chi tiết
                                                        </Link>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-center py-8 bg-gray-50 rounded-lg">
                                    <p className="text-gray-500">Không có lớp học nào.</p>
                                    <Link to="/instructor/classes" className="mt-2 inline-block text-blue-500 hover:underline">
                                        Xem tất cả lớp học
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>
                </>
            ) : (
                <div className="p-6 border border-red-300 bg-red-50 rounded-lg shadow-sm max-w-[800px] mx-auto my-10">
                    <div className="flex items-center mb-4">
                        <div className="bg-red-100 p-3 rounded-full mr-4">
                            <FaChalkboardTeacher className="text-red-500 text-2xl" />
                        </div>
                        <h3 className="text-xl font-semibold text-red-700">Không thể tải dữ liệu giảng viên</h3>
                    </div>
                    <p className="text-gray-700 mb-4">Hệ thống không thể tải thông tin giảng viên. Điều này có thể xảy ra do một trong các nguyên nhân sau:</p>
                    <ul className="list-disc pl-5 mb-4 text-gray-700 space-y-1">
                        <li>Phiên đăng nhập của bạn đã hết hạn</li>
                        <li>Máy chủ đang gặp sự cố</li>
                        <li>Kết nối mạng không ổn định</li>
                    </ul>
                    <div className="flex space-x-3 mt-4">
                        <button onClick={() => window.location.reload()} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors">
                            Làm mới trang
                        </button>
                        <Link to="/login" className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors">
                            Đăng nhập lại
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}

export default InstructorHome;
