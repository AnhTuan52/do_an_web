import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { FaBook, FaSearch, FaUserGraduate, FaChalkboardTeacher } from 'react-icons/fa';

function ClassManagement() {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedClass, setSelectedClass] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Fetch classes
    const { data: classes = [], isLoading } = useQuery({
        queryKey: ['admin-classes'],
        queryFn: async () => {
            const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/admin/classes`, { withCredentials: true });
            if (response.data.status !== 'success') {
                throw new Error(response.data.message || "Không thể tải danh sách lớp học");
            }
            return response.data.classes;
        },
        onError: (error) => {
            console.error("Error fetching classes:", error);
        }
    });

    // Fetch class details
    const { data: classDetails, isLoading: isLoadingDetails } = useQuery({
        queryKey: ['admin-class-details', selectedClass?._id],
        queryFn: async () => {
            if (!selectedClass?._id) return null;
            const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/admin/classes/${selectedClass._id}`, { withCredentials: true });
            if (response.data.status !== 'success') {
                throw new Error(response.data.message || "Không thể tải thông tin lớp học");
            }
            return response.data;
        },
        enabled: !!selectedClass?._id,
        onError: (error) => {
            console.error("Error fetching class details:", error);
        }
    });

    const filteredClasses = classes.filter(classItem =>
        (classItem.class_code && classItem.class_code.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (classItem.course_name && classItem.course_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (classItem.semester && classItem.semester.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const handleViewDetails = (classItem) => {
        setSelectedClass(classItem);
        setIsModalOpen(true);
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Quản lý lớp học</h2>
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Tìm kiếm lớp học..."
                        className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-gray-100"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                </div>
            </div>

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
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Mã lớp</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Tên môn học</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Học kỳ</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Giảng viên</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                {filteredClasses.length > 0 ? (
                                    filteredClasses.map((classItem) => (
                                        <tr key={classItem._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                                                {classItem.class_code || 'N/A'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                {classItem.course_name || 'N/A'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                {classItem.semester || 'N/A'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                {classItem.instructor_name || 'N/A'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                <button
                                                    onClick={() => handleViewDetails(classItem)}
                                                    className="text-purple-600 hover:text-purple-900 dark:text-purple-400 dark:hover:text-purple-300"
                                                >
                                                    Xem chi tiết
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                                            {searchTerm ? 'Không tìm thấy lớp học phù hợp' : 'Không có lớp học nào'}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modal for class details */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                                Thông tin chi tiết lớp học
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

                        {isLoadingDetails ? (
                            <div className="flex justify-center items-center h-64">
                                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
                            </div>
                        ) : classDetails ? (
                            <div className="space-y-6">
                                <div className="bg-yellow-50 dark:bg-gray-700 p-4 rounded-lg">
                                    <div className="flex items-center mb-4">
                                        <div className="bg-yellow-100 p-3 rounded-full mr-4">
                                            <FaBook className="text-yellow-500 text-2xl" />
                                        </div>
                                        <div>
                                            <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                                                {classDetails.class.course_name || 'N/A'}
                                            </h4>
                                            <p className="text-gray-600 dark:text-gray-400">
                                                Mã lớp: {classDetails.class.class_code || 'N/A'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">Học kỳ:</p>
                                            <p className="font-medium text-gray-800 dark:text-gray-200">{classDetails.class.semester || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">Số tín chỉ:</p>
                                            <p className="font-medium text-gray-800 dark:text-gray-200">{classDetails.class.credits || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">Phòng học:</p>
                                            <p className="font-medium text-gray-800 dark:text-gray-200">{classDetails.class.room || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">Thời gian học:</p>
                                            <p className="font-medium text-gray-800 dark:text-gray-200">
                                                {classDetails.class.schedule ?
                                                    `${classDetails.class.schedule.day_of_week || ''} ${classDetails.class.schedule.start_time || ''}-${classDetails.class.schedule.end_time || ''}` :
                                                    'N/A'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4 flex items-center">
                                        <FaChalkboardTeacher className="mr-2 text-yellow-500" /> Giảng viên
                                    </h4>

                                    {classDetails.instructor ? (
                                        <div className="bg-white dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                                            <div className="flex items-center">
                                                <div className="bg-green-100 p-2 rounded-full mr-3">
                                                    <FaChalkboardTeacher className="text-green-500" />
                                                </div>
                                                <div>
                                                    <h5 className="font-medium text-gray-800 dark:text-gray-200">{classDetails.instructor.name || 'N/A'}</h5>
                                                    <p className="text-sm text-gray-600 dark:text-gray-400">{classDetails.instructor.email || 'N/A'}</p>
                                                    <p className="text-sm text-gray-600 dark:text-gray-400">{classDetails.instructor.department || 'N/A'}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                                            Không có thông tin giảng viên
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4 flex items-center">
                                        <FaUserGraduate className="mr-2 text-yellow-500" /> Danh sách sinh viên
                                    </h4>

                                    {classDetails.students && classDetails.students.length > 0 ? (
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                                <thead className="bg-gray-50 dark:bg-gray-700">
                                                    <tr>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">MSSV</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Họ tên</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Email</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Khoa</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                                    {classDetails.students.map((student) => (
                                                        <tr key={student._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                                                                {student.mssv || 'N/A'}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                                {student.personal_info?.full_name || 'N/A'}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                                {student.email || 'N/A'}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                                {student.faculty || 'N/A'}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                                            Không có sinh viên nào trong lớp
                                        </p>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                                Không thể tải thông tin lớp học
                            </p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default ClassManagement;