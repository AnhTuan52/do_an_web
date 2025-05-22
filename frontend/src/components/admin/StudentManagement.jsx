import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { FaUserGraduate, FaSearch, FaChartBar, FaGraduationCap } from 'react-icons/fa';
import { Bar, Line, Pie, Doughnut } from 'react-chartjs-2';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    ArcElement,
    Title,
    Tooltip,
    Legend
} from 'chart.js';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    ChartDataLabels
);

function StudentManagement() {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [selectedStudentId, setSelectedStudentId] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [showOverallBarChart, setShowOverallBarChart] = useState(false);
    const isDarkMode = document.documentElement.classList.contains('dark');

    // Fetch students
    const { data: students = [], isLoading } = useQuery({
        queryKey: ['admin-students'],
        queryFn: async () => {
            const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/admin/students`, { withCredentials: true });
            if (response.data.status !== 'success') {
                throw new Error(response.data.message || "Không thể tải danh sách sinh viên");
            }
            return response.data.students;
        },
        onError: (error) => {
            console.error("Error fetching students:", error);
        }
    });

    // Fetch academic records for selected student
    const { data: academicRecords, isLoading: isLoadingAcademicRecords } = useQuery({
        queryKey: ['student-academic-records', selectedStudentId],
        queryFn: async () => {
            if (!selectedStudentId) return null;

            const response = await axios.get(
                `${import.meta.env.VITE_API_BASE_URL}/admin/students/${selectedStudentId}/academic_records`,
                { withCredentials: true }
            );

            if (response.data.status === 'success') {
                return response.data.data;
            }
            return null;
        },
        enabled: !!selectedStudentId, // Only run query when selectedStudentId is available
        onError: (error) => {
            console.error("Error fetching academic records:", error);
        }
    });

    const filteredStudents = students.filter(student =>
        (student.mssv && student.mssv.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (student.name && student.name.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const handleViewDetails = (student) => {
        setSelectedStudent(student);
        setSelectedStudentId(student.id);
        setIsModalOpen(true);
    };

    // Chuẩn bị dữ liệu cho biểu đồ từ dữ liệu thực tế
    const prepareChartData = () => {
        if (!academicRecords || !academicRecords.academic_records) {
            return {
                semesterAverageData: null,
                overallChartData: null,
                overallBarChartData: null
            };
        }

        // Lấy danh sách học kỳ và điểm trung bình
        const semesters = academicRecords.academic_records.map(record => record.semester);
        const averages = academicRecords.academic_records.map(record => record.semester_average || 0);

        // Tính toán số môn đạt và không đạt
        let passedCourses = 0;
        let failedCourses = 0;
        let totalCredits = 0;
        let failedCredits = 0;

        academicRecords.academic_records.forEach(semesterRecord => {
            semesterRecord.courses.forEach(course => {
                if (course.complete === "Qua môn") {
                    passedCourses++;
                    totalCredits += course.credits;
                } else if (course.complete === "Không đạt") {
                    failedCourses++;
                    failedCredits += course.credits;
                }
            });
        });

        // Dữ liệu biểu đồ điểm trung bình theo học kỳ
        const semesterAverageData = {
            labels: semesters,
            datasets: [
                {
                    label: 'Điểm trung bình',
                    data: averages,
                    borderColor: 'rgb(75, 192, 192)',
                    backgroundColor: 'rgba(75, 192, 192, 0.5)',
                    tension: 0.1
                }
            ]
        };

        // Dữ liệu biểu đồ tròn tổng quan
        const overallChartData = {
            labels: ["Tổng môn đạt", "Tổng môn chưa hoàn thành"],
            datasets: [{
                data: [passedCourses, failedCourses],
                backgroundColor: ["hsl(209, 97%, 51%)", "hsl(3, 78%, 51%)"],
                borderColor: ["hsl(204, 81.90%, 66.70%)", "hsl(347, 100.00%, 79.40%)"],
                borderWidth: 1,
            }]
        };

        // Dữ liệu biểu đồ cột chi tiết
        const overallBarChartData = {
            labels: ["Tổng môn đạt", "Tổng tín chỉ đạt", "Tổng môn chưa hoàn thành", "Tổng tín chỉ chưa hoàn thành"],
            datasets: [{
                label: "Số liệu",
                data: [passedCourses, totalCredits, failedCourses, failedCredits],
                backgroundColor: "rgba(54, 162, 235, 0.6)",
                borderColor: "rgb(54, 162, 235)",
                borderWidth: 1,
            }]
        };

        return {
            semesterAverageData,
            overallChartData,
            overallBarChartData
        };
    };

    const { semesterAverageData, overallChartData, overallBarChartData } = prepareChartData();

    // Tùy chọn cho biểu đồ
    const lineChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
                labels: {
                    color: isDarkMode ? "#fff" : "#111"
                }
            },
            datalabels: {
                color: isDarkMode ? "#fff" : "#111",
                anchor: 'end',
                align: 'top',
                formatter: (value) => value
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                max: 10,
                ticks: {
                    color: isDarkMode ? "#fff" : "#111"
                }
            },
            x: {
                ticks: {
                    color: isDarkMode ? "#fff" : "#111"
                }
            }
        }
    };

    const pieChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
                labels: {
                    color: isDarkMode ? "#fff" : "#111"
                }
            },
            datalabels: {
                color: "#000",
                formatter: (value, context) => {
                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                    const percentage = total ? ((value / total) * 100).toFixed(1) : 0;
                    return `${percentage}%`;
                }
            }
        }
    };

    const barChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
                labels: {
                    color: isDarkMode ? "#fff" : "#111"
                }
            },
            datalabels: {
                color: isDarkMode ? "#fff" : "#111",
                anchor: 'end',
                align: 'top'
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                ticks: {
                    color: isDarkMode ? "#fff" : "#111"
                }
            },
            x: {
                ticks: {
                    color: isDarkMode ? "#fff" : "#111"
                }
            }
        }
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Quản lý sinh viên</h2>
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Tìm kiếm sinh viên..."
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
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">MSSV</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Họ tên</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Email</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Khoa</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                {filteredStudents.length > 0 ? (
                                    filteredStudents.map((student) => (
                                        <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                                                {student.mssv}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                {student.name || 'N/A'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                {student.email || 'N/A'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                {student.faculty || 'N/A'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                <button
                                                    onClick={() => handleViewDetails(student)}
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
                                            {searchTerm ? 'Không tìm thấy sinh viên phù hợp' : 'Không có sinh viên nào'}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modal for student details - Full screen with z-index higher than sidebar */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1001]">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 md:p-8 w-[95%] md:w-[90%] max-w-6xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                                Thông tin chi tiết sinh viên
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

                        {selectedStudent ? (
                            <div className="space-y-6">
                                {/* Thông tin cá nhân */}
                                <div className="bg-purple-50 dark:bg-gray-700 p-4 rounded-lg">
                                    <div className="flex items-center mb-4">
                                        <div className="bg-purple-100 p-3 rounded-full mr-4">
                                            <FaUserGraduate className="text-purple-500 text-2xl" />
                                        </div>
                                        <div>
                                            <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                                                {selectedStudent.name || 'N/A'}
                                            </h4>
                                            <p className="text-gray-600 dark:text-gray-400">
                                                MSSV: {selectedStudent.mssv}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">Email:</p>
                                            <p className="font-medium text-gray-800 dark:text-gray-200">{selectedStudent.email || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">Khoa:</p>
                                            <p className="font-medium text-gray-800 dark:text-gray-200">{selectedStudent.faculty || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">Ngày sinh:</p>
                                            <p className="font-medium text-gray-800 dark:text-gray-200">
                                                {selectedStudent.birth_date || 'N/A'}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">Giới tính:</p>
                                            <p className="font-medium text-gray-800 dark:text-gray-200">
                                                {selectedStudent.gender || 'N/A'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Kết quả học tập */}
                                {isLoadingAcademicRecords ? (
                                    <div className="flex justify-center items-center h-64">
                                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
                                    </div>
                                ) : academicRecords ? (
                                    <div className="space-y-6">
                                        {/* Biểu đồ điểm trung bình theo học kỳ */}
                                        {semesterAverageData && (
                                            <div className="bg-white dark:bg-gray-700 p-4 rounded-lg shadow">
                                                <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4 flex items-center">
                                                    <FaChartBar className="mr-2 text-blue-500" /> Điểm trung bình theo học kỳ
                                                </h4>
                                                <div style={{ height: "250px" }} className="w-full">
                                                    <Line data={semesterAverageData} options={lineChartOptions} />
                                                </div>
                                            </div>
                                        )}

                                        {/* Biểu đồ tổng quan */}
                                        {overallChartData && (
                                            <div className="bg-white dark:bg-gray-700 p-4 rounded-lg shadow">
                                                <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4 flex items-center">
                                                    <FaGraduationCap className="mr-2 text-green-500" /> Tổng quan kết quả học tập
                                                </h4>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    <div style={{ height: "250px" }} className="w-full">
                                                        <Pie data={overallChartData} options={pieChartOptions} />
                                                    </div>
                                                    <div className="flex flex-col justify-center">
                                                        <button
                                                            className="mt-4 py-2 px-5 bg-blue-600 text-white border-none rounded-lg cursor-pointer text-sm font-medium transition-colors duration-300 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 mx-auto block"
                                                            onClick={() => setShowOverallBarChart(!showOverallBarChart)}
                                                        >
                                                            {showOverallBarChart ? "Ẩn chi tiết" : "Xem chi tiết"}
                                                        </button>
                                                        {showOverallBarChart && (
                                                            <div style={{ height: "250px", marginTop: "20px" }} className="w-full mt-6">
                                                                <Bar data={overallBarChartData} options={barChartOptions} />
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Bảng kết quả học tập */}
                                        <div>
                                            <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4 flex items-center">
                                                <FaChartBar className="mr-2 text-purple-500" /> Kết quả học tập chi tiết
                                            </h4>

                                            {academicRecords.academic_records && academicRecords.academic_records.length > 0 ? (
                                                <div className="space-y-6">
                                                    {academicRecords.academic_records.map((semesterRecord, semesterIndex) => (
                                                        <div key={semesterIndex} className="bg-white dark:bg-gray-700 p-4 rounded-lg shadow">
                                                            <h5 className="text-md font-semibold text-gray-800 dark:text-gray-100 mb-3">
                                                                {semesterRecord.semester} (GPA: {semesterRecord.semester_average || 'N/A'})
                                                            </h5>

                                                            <div className="overflow-x-auto">
                                                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                                                    <thead className="bg-gray-50 dark:bg-gray-600">
                                                                        <tr>
                                                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Mã môn</th>
                                                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Tên môn học</th>
                                                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Tín chỉ</th>
                                                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Quá trình</th>
                                                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Giữa kỳ</th>
                                                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Thực hành</th>
                                                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Cuối kỳ</th>
                                                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Tổng kết</th>
                                                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Trạng thái</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="bg-white dark:bg-gray-700 divide-y divide-gray-200 dark:divide-gray-600">
                                                                        {semesterRecord.courses.map((course, courseIndex) => (
                                                                            <tr key={courseIndex} className="hover:bg-gray-50 dark:hover:bg-gray-600">
                                                                                <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                                                                                    {course.course_code}
                                                                                </td>
                                                                                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                                                    {course.course_name}
                                                                                </td>
                                                                                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                                                    {course.credits}
                                                                                </td>
                                                                                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                                                    {course.scores.process !== null ? course.scores.process : 'N/A'}
                                                                                </td>
                                                                                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                                                    {course.scores.midterm !== null ? course.scores.midterm : 'N/A'}
                                                                                </td>
                                                                                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                                                    {course.scores.practice !== null ? course.scores.practice : 'N/A'}
                                                                                </td>
                                                                                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                                                    {course.scores.final !== null ? course.scores.final : 'N/A'}
                                                                                </td>
                                                                                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                                                    <span className={`px-2 py-1 rounded-full text-xs ${course.total_score >= 8 ? 'bg-green-100 text-green-800' :
                                                                                            course.total_score >= 6.5 ? 'bg-blue-100 text-blue-800' :
                                                                                                course.total_score >= 5 ? 'bg-yellow-100 text-yellow-800' :
                                                                                                    course.total_score !== null ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                                                                                        }`}>
                                                                                        {course.total_score !== null ? course.total_score : 'N/A'}
                                                                                    </span>
                                                                                </td>
                                                                                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                                                    <span className={`px-2 py-1 rounded-full text-xs ${course.complete === "Qua môn" ? 'bg-green-100 text-green-800' :
                                                                                            course.complete === "Không đạt" ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                                                                                        }`}>
                                                                                        {course.complete}
                                                                                    </span>
                                                                                </td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        </div>
                                                    ))}

                                                    {/* Tổng kết */}
                                                    {academicRecords.summary && (
                                                        <div className="bg-purple-50 dark:bg-gray-600 p-4 rounded-lg">
                                                            <h5 className="text-md font-semibold text-gray-800 dark:text-gray-100 mb-3">Tổng kết</h5>
                                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                                <div className="bg-white dark:bg-gray-700 p-3 rounded-lg shadow">
                                                                    <p className="text-sm text-gray-500 dark:text-gray-400">Tổng số tín chỉ đã học:</p>
                                                                    <p className="text-xl font-bold text-purple-600 dark:text-purple-400">{academicRecords.summary.total_credits_taken}</p>
                                                                </div>
                                                                <div className="bg-white dark:bg-gray-700 p-3 rounded-lg shadow">
                                                                    <p className="text-sm text-gray-500 dark:text-gray-400">Tổng số tín chỉ tích lũy:</p>
                                                                    <p className="text-xl font-bold text-purple-600 dark:text-purple-400">{academicRecords.summary.total_credits_accumulated}</p>
                                                                </div>
                                                                <div className="bg-white dark:bg-gray-700 p-3 rounded-lg shadow">
                                                                    <p className="text-sm text-gray-500 dark:text-gray-400">Điểm trung bình tích lũy:</p>
                                                                    <p className="text-xl font-bold text-purple-600 dark:text-purple-400">{academicRecords.summary.overall_average}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                                                    Không có dữ liệu kết quả học tập
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                                        Không thể tải thông tin học tập của sinh viên
                                    </p>
                                )}
                            </div>
                        ) : (
                            <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                                Không thể tải thông tin sinh viên
                            </p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default StudentManagement;