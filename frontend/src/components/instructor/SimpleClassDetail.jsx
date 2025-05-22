import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../utils/api';
import { FaArrowLeft } from 'react-icons/fa';

function SimpleClassDetail() {
    // Get classId from URL
    const location = window.location.pathname;
    const pathParts = location.split('/');
    const classId = pathParts[pathParts.length - 1];

    console.log('SimpleClassDetail component initialized with classId:', classId);

    // Fetch class details
    const { data, isLoading, error } = useQuery({
        queryKey: ['simple-class-details', classId],
        queryFn: async () => {
            try {
                // Sử dụng API mới để lấy thông tin chi tiết khóa học
                const response = await api.get(`/api/instructor/courses/${classId}`);
                console.log('API response:', response.data);
                return response.data;
            } catch (error) {
                console.error('Error fetching data:', error);
                throw error;
            }
        },
        enabled: !!classId,
    });

    // Loading state
    if (isLoading) {
        return (
            <div className="container mx-auto p-4">
                <div className="text-center py-10">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-4"></div>
                    <p className="text-gray-600">Đang tải dữ liệu...</p>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="container mx-auto p-4">
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                    <p className="font-bold">Lỗi!</p>
                    <p>{error.message}</p>
                </div>
            </div>
        );
    }

    // No data state
    if (!data) {
        return (
            <div className="container mx-auto p-4">
                <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
                    <p className="font-bold">Không có dữ liệu</p>
                    <p>Không thể tải thông tin lớp học.</p>
                </div>
            </div>
        );
    }

    // Success state
    const course = data.course || {};

    return (
        <div className="container mx-auto p-4">
            {/* Back button */}
            <Link
                to="/instructor/dashboard/courses"
                className="flex items-center text-blue-600 hover:text-blue-800 mb-4"
            >
                <FaArrowLeft className="mr-2" /> Quay lại danh sách lớp
            </Link>

            {/* Class details */}
            <div className="bg-white shadow-md rounded-lg p-6 mb-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">{course.course_name || 'Không có tên'}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <p className="text-gray-600 font-semibold">Mã lớp:</p>
                        <p>{course.class_code || 'N/A'}</p>
                    </div>
                    <div>
                        <p className="text-gray-600 font-semibold">Mã khóa học:</p>
                        <p>{course.course_code || 'N/A'}</p>
                    </div>
                    <div>
                        <p className="text-gray-600 font-semibold">Học kỳ:</p>
                        <p>{course.semester || 'N/A'}</p>
                    </div>
                    <div>
                        <p className="text-gray-600 font-semibold">Số tín chỉ:</p>
                        <p>{course.credits || 'N/A'}</p>
                    </div>
                </div>
            </div>

            {/* Debug info */}
            <div className="mt-8 p-4 bg-gray-100 rounded-lg">
                <h3 className="text-lg font-semibold mb-2">Debug Information</h3>
                <pre className="bg-gray-800 text-white p-4 rounded overflow-auto max-h-96">
                    {JSON.stringify(data, null, 2)}
                </pre>
            </div>
        </div>
    );
}

export default SimpleClassDetail;