import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import api from '../../utils/api';

/**
 * Component Dashboard chính cho giảng viên
 * Hiển thị nội dung chính và quản lý các route con
 */
function InstructorDashboard() {
    const location = useLocation();
    const [instructorStats, setInstructorStats] = useState({
        totalCourses: 0,
        activeCourses: 0
    });
    const [loading, setLoading] = useState(true);

    // Lấy thống kê cơ bản cho giảng viên
    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await api.get('/api/instructor/stats');

                if (response.data?.status === 'success') {
                    setInstructorStats({
                        totalCourses: response.data.totalCourses || 0,
                        activeCourses: response.data.activeCourses || 0
                    });
                }
            } catch (error) {
                console.error('Lỗi khi lấy thống kê:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    return (
        <div className="w-full">
            {/* Hiển thị breadcrumb hoặc thông tin điều hướng nếu cần */}
            {location.pathname !== '/instructor' &&
                location.pathname !== '/instructor/' &&
                location.pathname !== '/instructor/home' && (
                    <div className="bg-white p-4 mb-4 rounded-lg shadow">
                        <nav className="text-sm">
                            <ol className="list-reset flex">
                                <li><a href="/instructor" className="text-blue-600 hover:text-blue-800">Trang chủ</a></li>
                                <li><span className="mx-2 text-gray-500">/</span></li>
                                <li className="text-gray-500">{location.pathname.split('/').pop()}</li>
                            </ol>
                        </nav>
                    </div>
                )}

            {/* Hiển thị nội dung chính */}
            <Outlet context={[instructorStats, loading]} />
        </div>
    );
}

export default InstructorDashboard;

