import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { FaChalkboardTeacher, FaSearch, FaBook, FaSort, FaSortUp, FaSortDown } from 'react-icons/fa';

function InstructorManagement() {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedInstructor, setSelectedInstructor] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'ascending' });
    // Không cần state cho khóa học đã chọn vì không hiển thị chi tiết sinh viên
    // const [selectedCourse, setSelectedCourse] = useState(null);

    const ITEMS_PER_PAGE = 10;

    // Fetch instructors
    const { data: instructorsData = { instructors: [] }, isLoading, isError, error } = useQuery({
        queryKey: ['admin-instructors'],
        queryFn: async () => {
            try {
                const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/admin/instructors`, { withCredentials: true });
                if (response.data.status !== 'success') {
                    throw new Error(response.data.message || "Không thể tải danh sách giảng viên");
                }
                return response.data;
            } catch (error) {
                console.error("Error fetching instructors:", error);
                throw error;
            }
        },
        staleTime: 5 * 60 * 1000, // Cache trong 5 phút
        retry: 2
    });

    const instructors = instructorsData.instructors || [];

    // Fetch instructor details
    const { data: instructorDetails, isLoading: isLoadingDetails, error: detailsError, refetch: refetchDetails } = useQuery({
        queryKey: ['admin-instructor-details', selectedInstructor?._id],
        queryFn: async () => {
            if (!selectedInstructor?._id) return null;
            try {
                console.log("Fetching instructor details for ID:", selectedInstructor._id);
                const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/admin/instructors/${selectedInstructor._id}`, { withCredentials: true });
                console.log("API response:", response.data);
                if (response.data.status !== 'success') {
                    throw new Error(response.data.message || "Không thể tải thông tin giảng viên");
                }
                return response.data;
            } catch (error) {
                console.error("Error fetching instructor details:", error);
                throw error;
            }
        },
        enabled: !!selectedInstructor?._id,
        staleTime: 5 * 60 * 1000, // Cache trong 5 phút
        retry: 1
    });

    // Lọc giảng viên theo từ khóa tìm kiếm
    const filteredInstructors = useMemo(() => {
        if (!searchTerm.trim()) return instructors;

        const keyword = searchTerm.toLowerCase().trim();
        return instructors.filter(instructor =>
            (instructor.name && instructor.name.toLowerCase().includes(keyword)) ||
            (instructor.email && instructor.email.toLowerCase().includes(keyword)) ||
            (instructor.department && instructor.department.toLowerCase().includes(keyword)) ||
            (instructor.position && instructor.position.toLowerCase().includes(keyword)) ||
            (instructor.instructor_id && instructor.instructor_id.toLowerCase().includes(keyword))
        );
    }, [instructors, searchTerm]);

    // Sắp xếp danh sách giảng viên
    const sortedInstructors = useMemo(() => {
        const { key, direction } = sortConfig;
        return [...filteredInstructors].sort((a, b) => {
            const aValue = (a[key] || '').toString().toLowerCase();
            const bValue = (b[key] || '').toString().toLowerCase();

            if (aValue < bValue) return direction === 'ascending' ? -1 : 1;
            if (aValue > bValue) return direction === 'ascending' ? 1 : -1;
            return 0;
        });
    }, [filteredInstructors, sortConfig]);

    // Phân trang
    const paginatedInstructors = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return sortedInstructors.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [sortedInstructors, currentPage]);

    // Tổng số trang
    const totalPages = Math.ceil(filteredInstructors.length / ITEMS_PER_PAGE);

    // Xử lý sắp xếp khi click vào header
    const handleSort = (key) => {
        setSortConfig(prevConfig => ({
            key,
            direction: prevConfig.key === key && prevConfig.direction === 'ascending'
                ? 'descending'
                : 'ascending'
        }));
    };

    // Xử lý thay đổi trang
    const handlePageChange = (page) => {
        setCurrentPage(page);
    };

    const handleViewDetails = (instructor) => {
        setSelectedInstructor(instructor);
        setIsModalOpen(true);
    };

    // Hiển thị icon sắp xếp
    const getSortIcon = (key) => {
        if (sortConfig.key !== key) return <FaSort className="ml-1 text-gray-400" />;
        return sortConfig.direction === 'ascending' ?
            <FaSortUp className="ml-1 text-purple-500" /> :
            <FaSortDown className="ml-1 text-purple-500" />;
    };

    // Thêm event listener để đóng modal khi nhấn ESC
    React.useEffect(() => {
        const handleEsc = (event) => {
            if (event.key === 'Escape') {
                setIsModalOpen(false);
            }
        };
        window.addEventListener('keydown', handleEsc);

        // Ngăn scroll khi modal mở
        if (isModalOpen) {
            document.body.style.overflow = 'hidden';
        }

        return () => {
            window.removeEventListener('keydown', handleEsc);
            document.body.style.overflow = 'auto';
        };
    }, [isModalOpen]);

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Quản lý giảng viên</h2>
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Tìm kiếm giảng viên..."
                        className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-gray-100"
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setCurrentPage(1); // Reset về trang 1 khi tìm kiếm
                        }}
                    />
                    <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
                </div>
            ) : isError ? (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
                    <p className="text-red-700 dark:text-red-400 text-center">
                        Lỗi: {error?.message || 'Không thể tải danh sách giảng viên'}
                    </p>
                    <div className="flex justify-center mt-4">
                        <button
                            onClick={() => window.location.reload()}
                            className="bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg transition-colors"
                        >
                            Thử lại
                        </button>
                    </div>
                </div>
            ) : (
                <>
                    <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden mb-6">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-gray-50 dark:bg-gray-700">
                                    <tr>
                                        <th
                                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                                            onClick={() => handleSort('name')}
                                        >
                                            <div className="flex items-center">
                                                Họ tên
                                                {getSortIcon('name')}
                                            </div>
                                        </th>
                                        <th
                                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                                            onClick={() => handleSort('email')}
                                        >
                                            <div className="flex items-center">
                                                Email
                                                {getSortIcon('email')}
                                            </div>
                                        </th>
                                        <th
                                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                                            onClick={() => handleSort('department')}
                                        >
                                            <div className="flex items-center">
                                                Khoa
                                                {getSortIcon('department')}
                                            </div>
                                        </th>
                                        <th
                                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                                            onClick={() => handleSort('position')}
                                        >
                                            <div className="flex items-center">
                                                Chức vụ
                                                {getSortIcon('position')}
                                            </div>
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                            Thao tác
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                    {paginatedInstructors.length > 0 ? (
                                        paginatedInstructors.map((instructor) => (
                                            <tr key={instructor._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                                                    {instructor.name || 'N/A'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                    {instructor.email || 'N/A'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                    {instructor.department || 'N/A'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                    {instructor.position || 'Giảng viên'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                    <button
                                                        onClick={() => handleViewDetails(instructor)}
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
                                                {searchTerm ? 'Không tìm thấy giảng viên phù hợp' : 'Không có giảng viên nào'}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Phân trang */}
                    {totalPages > 1 && (
                        <div className="flex justify-between items-center">
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                                Hiển thị {paginatedInstructors.length} / {filteredInstructors.length} giảng viên
                            </div>
                            <div className="flex space-x-1">
                                <button
                                    onClick={() => handlePageChange(1)}
                                    disabled={currentPage === 1}
                                    className={`px-3 py-1 rounded ${currentPage === 1
                                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500'
                                        : 'bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                                        }`}
                                >
                                    &laquo;
                                </button>
                                <button
                                    onClick={() => handlePageChange(currentPage - 1)}
                                    disabled={currentPage === 1}
                                    className={`px-3 py-1 rounded ${currentPage === 1
                                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500'
                                        : 'bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                                        }`}
                                >
                                    &lt;
                                </button>

                                {/* Hiển thị các nút trang */}
                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                    // Tính toán số trang để hiển thị xung quanh trang hiện tại
                                    let pageNum;
                                    if (totalPages <= 5) {
                                        pageNum = i + 1;
                                    } else if (currentPage <= 3) {
                                        pageNum = i + 1;
                                    } else if (currentPage >= totalPages - 2) {
                                        pageNum = totalPages - 4 + i;
                                    } else {
                                        pageNum = currentPage - 2 + i;
                                    }

                                    return (
                                        <button
                                            key={pageNum}
                                            onClick={() => handlePageChange(pageNum)}
                                            className={`px-3 py-1 rounded ${currentPage === pageNum
                                                ? 'bg-purple-600 text-white'
                                                : 'bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                                                }`}
                                        >
                                            {pageNum}
                                        </button>
                                    );
                                })}

                                <button
                                    onClick={() => handlePageChange(currentPage + 1)}
                                    disabled={currentPage === totalPages}
                                    className={`px-3 py-1 rounded ${currentPage === totalPages
                                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500'
                                        : 'bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                                        }`}
                                >
                                    &gt;
                                </button>
                                <button
                                    onClick={() => handlePageChange(totalPages)}
                                    disabled={currentPage === totalPages}
                                    className={`px-3 py-1 rounded ${currentPage === totalPages
                                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500'
                                        : 'bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                                        }`}
                                >
                                    &raquo;
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Modal for instructor details */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]" onClick={() => setIsModalOpen(false)}>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto relative shadow-xl" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                                Thông tin chi tiết giảng viên
                            </h3>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="text-gray-400 hover:text-gray-500 dark:text-gray-300 dark:hover:text-gray-200 absolute top-4 right-4"
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
                        ) : detailsError ? (
                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                                <p className="text-red-700 dark:text-red-400 text-center">
                                    Lỗi: {detailsError?.message || 'Không thể tải thông tin giảng viên'}
                                </p>
                                <div className="flex justify-center mt-4">
                                    <button
                                        onClick={() => setIsModalOpen(false)}
                                        className="bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg transition-colors mr-2"
                                    >
                                        Đóng
                                    </button>
                                    <button
                                        onClick={() => refetchDetails()}
                                        className="bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg transition-colors"
                                    >
                                        Thử lại
                                    </button>
                                </div>
                            </div>
                        ) : instructorDetails ? (
                            <div className="space-y-6">
                                <div className="bg-green-50 dark:bg-gray-700 p-4 rounded-lg">
                                    <div className="flex items-center mb-4">
                                        <div className="bg-green-100 p-3 rounded-full mr-4">
                                            <FaChalkboardTeacher className="text-green-500 text-2xl" />
                                        </div>
                                        <div>
                                            <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                                                {instructorDetails?.instructor?.name || selectedInstructor.name || 'N/A'}
                                            </h4>
                                            <p className="text-gray-600 dark:text-gray-400">
                                                {instructorDetails?.instructor?.position || selectedInstructor.position || 'Giảng viên'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">Mã giảng viên:</p>
                                            <p className="font-medium text-gray-800 dark:text-gray-200">{instructorDetails?.instructor?.instructor_id || selectedInstructor.instructor_id || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">Học vị:</p>
                                            <p className="font-medium text-gray-800 dark:text-gray-200">{instructorDetails?.instructor?.degree || selectedInstructor.degree || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">Email:</p>
                                            <p className="font-medium text-gray-800 dark:text-gray-200">{instructorDetails?.instructor?.email || selectedInstructor.email || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">Khoa:</p>
                                            <p className="font-medium text-gray-800 dark:text-gray-200">{instructorDetails?.instructor?.department || selectedInstructor.department || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">Số điện thoại:</p>
                                            <p className="font-medium text-gray-800 dark:text-gray-200">{instructorDetails?.instructor?.phone || selectedInstructor.phone || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">Chuyên ngành:</p>
                                            <p className="font-medium text-gray-800 dark:text-gray-200">{instructorDetails?.instructor?.specialization || selectedInstructor.specialization || 'N/A'}</p>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4 flex items-center">
                                        <FaBook className="mr-2 text-green-500" /> Lớp học đang giảng dạy
                                    </h4>

                                    {instructorDetails?.classes && instructorDetails.classes.length > 0 ? (
                                        <div className="space-y-6">
                                            {/* Danh sách lớp học */}
                                            <div className="overflow-x-auto">
                                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                                    <thead className="bg-gray-50 dark:bg-gray-700">
                                                        <tr>
                                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Mã lớp</th>
                                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Tên môn học</th>
                                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Học kỳ</th>
                                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Số sinh viên</th>
                                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Năm học</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                                        {instructorDetails?.classes?.map((classItem) => (
                                                            <tr
                                                                key={classItem._id}
                                                                className="hover:bg-gray-50 dark:hover:bg-gray-700"
                                                            >
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
                                                                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                                                                        {classItem.student_count || 0}
                                                                    </span>
                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                                    {classItem.academic_year || 'N/A'}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>


                                        </div>
                                    ) : (
                                        <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                                            Không có lớp học nào đang giảng dạy
                                        </p>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                                Không thể tải thông tin giảng viên
                            </p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default InstructorManagement;