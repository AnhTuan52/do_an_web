import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../utils/api';
import { formatSchedule, formatCredits, formatStatus, calculateTotalGrade } from '../../utils/courseUtils';
import { FaArrowLeft, FaUserGraduate, FaClipboardList, FaCalendarAlt, FaSave, FaUndo, FaEdit, FaTimes, FaCheck, FaChartBar, FaExclamationTriangle, FaTrophy, FaSadTear } from 'react-icons/fa';
import { Bar, Pie } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';

// Đăng ký các thành phần của Chart.js
ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement
);

function ClassDetail() {
    const { classId } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    // Lưu classId vào localStorage khi thay đổi
    useEffect(() => {
        if (classId) {
            localStorage.setItem('lastClassId', classId);
            // Invalidate queries khi classId thay đổi
            queryClient.invalidateQueries(['class-details', classId]);
        }
    }, [classId, queryClient]);

    // State management
    const [activeTab, setActiveTab] = useState('details');
    const [editingStudentId, setEditingStudentId] = useState(null);
    const [editMode, setEditMode] = useState(false);
    const [grades, setGrades] = useState({
        midterm: '',
        final: '',
        assignments: '',
        attendance: '',
        total: '',
    });
    const [originalGrades, setOriginalGrades] = useState({});
    const [hasChanges, setHasChanges] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });

    // Fetch course details
    const classDetailsQuery = useQuery({
        queryKey: ['class-details', classId],
        queryFn: async () => {
            try {
                const response = await api.get(`/api/instructor/courses/${classId}`);

                // Lấy dữ liệu khóa học từ response
                let courseData;
                if (response.data.status === 'success' && response.data.course) {
                    courseData = response.data.course;
                } else if (response.data.status === 'success' && response.data.data) {
                    courseData = response.data.data;
                } else {
                    courseData = response.data;
                }

                // Xử lý grading_schema
                const gradingSchema = courseData.grading_schema || {};
                const gradingScale = gradingSchema.grading_scale || courseData.grading_scale || [];

                // Chuẩn hóa trạng thái
                const status = courseData.status || 'active';

                // Xử lý schedule
                const scheduleData = courseData.schedule || [];
                const locationData = courseData.location ||
                    (scheduleData.length > 0 && scheduleData[0].location ? scheduleData[0].location : '');

                // Tạo đối tượng dữ liệu đã xử lý
                return {
                    _id: courseData._id,
                    course_name: courseData.course_name || 'N/A',
                    course_code: courseData.course_code || 'N/A',
                    class_code: courseData.class_code || 'N/A',
                    credits: courseData.credits || null,
                    description: courseData.description || '',
                    department: courseData.department || 'Khoa Công nghệ Thông tin',
                    semester: courseData.semester || 'HK1',
                    academic_year: courseData.academic_year || '2023-2024',
                    start_date: courseData.start_date || new Date().toISOString(),
                    end_date: courseData.end_date || new Date().toISOString(),
                    schedule: scheduleData,
                    location: locationData,
                    max_enrollment: courseData.max_enrollment || 50,
                    students: courseData.students || [],  // Lưu trữ danh sách sinh viên
                    students_count: courseData.students?.length || 0,
                    status: status,
                    course_info: {
                        name: courseData.course_name || 'N/A',
                        code: courseData.course_code || 'N/A',
                        class_code: courseData.class_code || 'N/A',
                        credits: courseData.credits || null,
                        description: courseData.description || '',
                        department: courseData.department || 'Khoa Công nghệ Thông tin'
                    },
                    semester_info: {
                        semester: courseData.semester || 'HK1',
                        academic_year: courseData.academic_year || '2023-2024',
                        start_date: courseData.start_date || new Date().toISOString(),
                        end_date: courseData.end_date || new Date().toISOString()
                    },
                    schedule: scheduleData.length > 0 ? {
                        day_of_week: scheduleData[0]?.day || scheduleData[0]?.day_of_week || 'N/A',
                        start_time: scheduleData[0]?.start_time || '',
                        end_time: scheduleData[0]?.end_time || '',
                        room: locationData || ''
                    } : null,
                    enrollment: {
                        max_students: courseData.max_enrollment || 50,
                        current_students: courseData.students?.length || 0,
                        status: status
                    },
                    grading_policy: {
                        midterm_weight: gradingSchema.midterm_weight || 0.3,
                        final_weight: gradingSchema.final_weight || 0.5,
                        assignments_weight: gradingSchema.assignments_weight || 0.2,
                        attendance_weight: gradingSchema.attendance_weight || 0,
                        grading_scale: gradingScale
                    }
                };
            } catch (error) {
                console.error('Lỗi khi lấy thông tin khóa học:', error);
                throw error;
            }
        },
        enabled: !!classId,
        staleTime: 1000 * 60 * 5, // 5 phút
    });

    // Không cần fetch students riêng vì đã có trong dữ liệu khóa học

    // Lấy dữ liệu từ queries
    const classDetails = classDetailsQuery.data;
    const classLoading = classDetailsQuery.isLoading;
    const classError = classDetailsQuery.error;

    // Lấy danh sách sinh viên trực tiếp từ dữ liệu khóa học
    const students = React.useMemo(() => {
        try {
            // Kiểm tra dữ liệu khóa học tồn tại
            if (!classDetails) {
                console.log('Không có dữ liệu khóa học');
                return [];
            }

            // Kiểm tra và xử lý dữ liệu sinh viên an toàn
            let studentsData = [];

            // Kiểm tra nhiều cấu trúc dữ liệu có thể có
            if (Array.isArray(classDetails.students)) {
                studentsData = classDetails.students;
            } else if (classDetails.data && Array.isArray(classDetails.data.students)) {
                studentsData = classDetails.data.students;
            } else if (classDetails.course && Array.isArray(classDetails.course.students)) {
                studentsData = classDetails.course.students;
            }

            console.log('Dữ liệu sinh viên thô:', studentsData);

            // Nếu không có sinh viên, trả về mảng rỗng
            if (!Array.isArray(studentsData) || studentsData.length === 0) {
                console.log('Danh sách sinh viên rỗng hoặc không phải mảng');
                return [];
            }

            // Xử lý dữ liệu sinh viên với kiểm tra null/undefined
            const processedStudents = studentsData
                .filter(student => student) // Lọc bỏ các giá trị null/undefined
                .map(student => {
                    try {
                        // Xử lý ID sinh viên từ MongoDB an toàn hơn
                        let studentId = '';

                        if (student.student_id) {
                            if (student.student_id.$oid) {
                                studentId = student.student_id.$oid;
                            } else if (typeof student.student_id === 'object' && student.student_id.toString) {
                                studentId = student.student_id.toString();
                            } else {
                                studentId = student.student_id;
                            }
                        } else if (student._id) {
                            studentId = typeof student._id === 'object' ? student._id.toString() : student._id;
                        } else {
                            studentId = 'unknown';
                        }

                        // Xử lý điểm số an toàn
                        const grades = student.grades || {};

                        // Tạo đối tượng sinh viên đã xử lý
                        return {
                            _id: student._id?.$oid ||
                                (typeof student._id === 'object' && student._id.toString) ?
                                student._id.toString() : student._id || 'unknown',
                            student_id: studentId,
                            full_name: student.full_name || student.name || 'N/A',
                            mssv: student.mssv || 'N/A',
                            email: student.email || 'N/A',
                            class: student.class || 'N/A',
                            status: student.status || 'active',
                            grades: {
                                midterm: grades.midterm !== undefined ? parseFloat(grades.midterm) : null,
                                final: grades.final !== undefined ? parseFloat(grades.final) : null,
                                assignments: grades.assignments !== undefined ? parseFloat(grades.assignments) : null,
                                attendance: grades.attendance !== undefined ? parseFloat(grades.attendance) : null,
                                total: grades.total !== undefined ? parseFloat(grades.total) : null
                            }
                        };
                    } catch (err) {
                        console.error('Lỗi khi xử lý sinh viên:', err, student);
                        // Trả về null để lọc bỏ sau này
                        return null;
                    }
                })
                .filter(Boolean); // Lọc bỏ các giá trị null từ lỗi xử lý

            console.log('Danh sách sinh viên đã xử lý:', processedStudents);
            return processedStudents;
        } catch (error) {
            console.error('Lỗi trong quá trình xử lý danh sách sinh viên:', error);
            // Trả về mảng rỗng trong trường hợp lỗi
            return [];
        }
    }, [classDetails]);


    const studentsLoading = classLoading;
    const studentsError = classError;

    // Tính toán thống kê điểm số
    const gradeStats = React.useMemo(() => {
        if (!students || students.length === 0) {
            return {
                averageGrade: 0,
                highestGrade: { value: 0, student: null },
                lowestGrade: { value: 10, student: null },
                belowAverageCount: 0,
                gradeDistribution: {
                    excellent: 0, // 9.0-10
                    good: 0,      // 8.0-8.9
                    average: 0,   // 6.5-7.9
                    belowAverage: 0, // 5.0-6.49
                    poor: 0       // 0-4.99
                }
            };
        }

        let sum = 0;
        let highest = { value: -1, student: null };
        let lowest = { value: 11, student: null };
        let belowAverageCount = 0;
        let gradeDistribution = {
            excellent: 0, // 9.0-10
            good: 0,      // 8.0-8.9
            average: 0,   // 6.5-7.9
            belowAverage: 0, // 5.0-6.49
            poor: 0       // 0-4.99
        };

        // Tính toán các giá trị thống kê
        students.forEach(student => {
            const totalGrade = student.grades.total !== null ? student.grades.total : 0;

            // Tổng điểm để tính trung bình
            sum += totalGrade;

            // Tìm điểm cao nhất
            if (totalGrade > highest.value) {
                highest = { value: totalGrade, student: student };
            }

            // Tìm điểm thấp nhất (chỉ xét những sinh viên có điểm)
            if (totalGrade < lowest.value && totalGrade > 0) {
                lowest = { value: totalGrade, student: student };
            }

            // Phân loại điểm
            if (totalGrade >= 9.0) {
                gradeDistribution.excellent++;
            } else if (totalGrade >= 8.0) {
                gradeDistribution.good++;
            } else if (totalGrade >= 6.5) {
                gradeDistribution.average++;
            } else if (totalGrade >= 5.0) {
                gradeDistribution.belowAverage++;
            } else {
                gradeDistribution.poor++;
            }

            // Đếm số sinh viên dưới trung bình
            if (totalGrade < 5.0) {
                belowAverageCount++;
            }
        });

        // Tính điểm trung bình
        const averageGrade = students.length > 0 ? (sum / students.length).toFixed(2) : 0;

        return {
            averageGrade,
            highestGrade: highest,
            lowestGrade: lowest.value === 11 ? { value: 0, student: null } : lowest,
            belowAverageCount,
            gradeDistribution
        };
    }, [students]);

    // Update grades mutation
    const updateGradesMutation = useMutation({
        mutationFn: async ({ studentId, gradesData }) => {
            // Chuyển đổi dữ liệu điểm số sang định dạng phù hợp
            const formattedGrades = {
                midterm: gradesData.midterm !== null ? gradesData.midterm.toString() : null,
                final: gradesData.final !== null ? gradesData.final.toString() : null,
                assignments: gradesData.assignments !== null ? gradesData.assignments.toString() : null,
                attendance: gradesData.attendance !== null ? gradesData.attendance.toString() : null,
                total: gradesData.total !== null ? gradesData.total.toString() : null
            };

            // Log dữ liệu gửi đi để debug
            console.log('Dữ liệu gửi đi:', {
                url: `/api/instructor/courses/${classId}/students/${studentId}/grades`,
                grades: formattedGrades
            });

            try {
                // Gọi API để cập nhật điểm số
                const response = await api.put(`/api/instructor/courses/${classId}/students/${studentId}/grades`, {
                    grades: formattedGrades
                });

                console.log('Kết quả cập nhật điểm:', response.data);
                return response.data;
            } catch (error) {
                console.error('Lỗi khi cập nhật điểm:', error.response?.data || error.message);
                throw error;
            }
        },
        onSuccess: () => {
            setMessage({ text: 'Cập nhật điểm số thành công', type: 'success' });
            setTimeout(() => setMessage({ text: '', type: '' }), 3000);
            setEditMode(false);
            setEditingStudentId(null);

            // Invalidate queries để refetch dữ liệu mới
            queryClient.invalidateQueries(['class-details', classId]);
        },
        onError: (error) => {
            setMessage({ text: `Lỗi: ${error.message}`, type: 'error' });
            setTimeout(() => setMessage({ text: '', type: '' }), 5000);
        }
    });

    // Xử lý khi click vào nút chỉnh sửa điểm
    const handleEditClick = (student) => {
        setEditingStudentId(student.student_id);
        setEditMode(true);
        setGrades({
            midterm: student.grades.midterm !== null ? student.grades.midterm : '',
            final: student.grades.final !== null ? student.grades.final : '',
            assignments: student.grades.assignments !== null ? student.grades.assignments : '',
            attendance: student.grades.attendance !== null ? student.grades.attendance : '',
            total: student.grades.total !== null ? student.grades.total : ''
        });
        setOriginalGrades({
            midterm: student.grades.midterm !== null ? student.grades.midterm : '',
            final: student.grades.final !== null ? student.grades.final : '',
            assignments: student.grades.assignments !== null ? student.grades.assignments : '',
            attendance: student.grades.attendance !== null ? student.grades.attendance : '',
            total: student.grades.total !== null ? student.grades.total : ''
        });
        setHasChanges(false);
    };

    // Xử lý khi thay đổi giá trị điểm
    const handleGradeChange = (e) => {
        const { name, value } = e.target;
        const numValue = value === '' ? '' : parseFloat(value);

        setGrades(prev => {
            const newGrades = { ...prev, [name]: numValue };

            // Tính điểm tổng nếu có đủ thông tin
            if (classDetails && newGrades.midterm !== '' && newGrades.final !== '') {
                // Sử dụng trọng số mặc định nếu không có trong classDetails
                const weights = {
                    midterm_weight: 0.3,
                    final_weight: 0.5,
                    assignments_weight: 0.15,
                    attendance_weight: 0.05
                };

                newGrades.total = calculateTotalGrade(
                    newGrades.midterm,
                    newGrades.final,
                    newGrades.assignments,
                    newGrades.attendance,
                    weights
                );
            }

            return newGrades;
        });

        setHasChanges(true);
    };

    // Xử lý khi lưu điểm
    const handleSaveGrades = () => {
        // Chuyển đổi giá trị điểm từ chuỗi sang số
        const numericGrades = {
            midterm: grades.midterm === '' ? null : parseFloat(grades.midterm),
            final: grades.final === '' ? null : parseFloat(grades.final),
            assignments: grades.assignments === '' ? null : parseFloat(grades.assignments),
            attendance: grades.attendance === '' ? null : parseFloat(grades.attendance),
            total: grades.total === '' ? null : parseFloat(grades.total)
        };

        // Gọi mutation để cập nhật điểm
        updateGradesMutation.mutate({
            studentId: editingStudentId,
            gradesData: numericGrades
        });
    };

    // Xử lý khi hủy chỉnh sửa
    const handleCancelEdit = () => {
        setEditMode(false);
        setEditingStudentId(null);
        setGrades(originalGrades);
        setHasChanges(false);
    };

    // Hiển thị loading
    if (classLoading) {
        return <div className="p-4 text-center">Đang tải thông tin khóa học...</div>;
    }

    // Hiển thị lỗi
    if (classError) {
        return (
            <div className="p-4 text-center text-red-600">
                Lỗi: {classError.message || 'Không thể tải thông tin khóa học'}
            </div>
        );
    }

    // Hiển thị khi không có dữ liệu
    if (!classDetails) {
        return <div className="p-4 text-center">Không tìm thấy thông tin khóa học</div>;
    };

    return (
        <div className="container mx-auto p-4">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center">
                    <div className="flex items-center">
                        <button
                            onClick={() => navigate(-1)}
                            className="mr-4 text-blue-600 hover:text-blue-800"
                        >
                            <FaArrowLeft className="inline mr-2" />
                            Quay lại
                        </button>


                    </div>
                    <h1 className="text-2xl font-bold">
                        {classDetails.course_info.code} - {classDetails.course_info.name}
                    </h1>
                </div>
                <div className="text-sm text-gray-600">
                    Mã lớp: <span className="font-semibold">{classDetails.class_code}</span>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 mb-6">
                <ul className="flex flex-wrap -mb-px">
                    <li className="mr-2">
                        <button
                            className={`inline-block p-4 ${activeTab === 'details'
                                ? 'text-blue-600 border-b-2 border-blue-600'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                            onClick={() => setActiveTab('details')}
                        >
                            <FaClipboardList className="inline mr-2" />
                            Thông tin lớp học
                        </button>
                    </li>
                    <li className="mr-2">
                        <button
                            className={`inline-block p-4 ${activeTab === 'students'
                                ? 'text-blue-600 border-b-2 border-blue-600'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                            onClick={() => setActiveTab('students')}
                        >
                            <FaUserGraduate className="inline mr-2" />
                            Danh sách sinh viên
                        </button>
                    </li>
                    <li className="mr-2">
                        <button
                            className={`inline-block p-4 ${activeTab === 'statistics'
                                ? 'text-blue-600 border-b-2 border-blue-600'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                            onClick={() => setActiveTab('statistics')}
                        >
                            <FaChartBar className="inline mr-2" />
                            Thống kê điểm số
                        </button>
                    </li>
                    <li>
                        <button
                            className={`inline-block p-4 ${activeTab === 'schedule'
                                ? 'text-blue-600 border-b-2 border-blue-600'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                            onClick={() => setActiveTab('schedule')}
                        >
                            <FaCalendarAlt className="inline mr-2" />
                            Lịch học
                        </button>
                    </li>
                </ul>
            </div>

            {/* Thông báo */}
            {message.text && (
                <div className={`p-4 mb-4 rounded ${message.type === 'success' ? 'bg-green-100 text-green-800' :
                    message.type === 'error' ? 'bg-red-100 text-red-800' :
                        message.type === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-blue-100 text-blue-800'
                    }`}>
                    {typeof message.text === 'object' ? JSON.stringify(message.text) : message.text}
                </div>
            )}



            {/* Tab Content */}
            <div className="bg-white rounded-lg shadow p-6">
                {/* Thống kê điểm số */}
                {activeTab === 'statistics' && (
                    <div>
                        <h2 className="text-xl font-semibold mb-6">Thống kê điểm số lớp học</h2>

                        {students.length === 0 ? (
                            <div className="text-center p-6 bg-gray-50 rounded-lg">
                                <p className="text-gray-500">Chưa có dữ liệu điểm số cho lớp học này</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Thống kê tổng quan */}
                                <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
                                    <h3 className="text-lg font-semibold mb-4 text-blue-700">Tổng quan điểm số</h3>

                                    <div className="grid grid-cols-1 gap-4">
                                        <div className="flex items-center p-4 bg-blue-50 rounded-lg">
                                            <div className="p-3 mr-4 bg-blue-100 rounded-full">
                                                <FaChartBar className="text-blue-500 text-xl" />
                                            </div>
                                            <div>
                                                <p className="text-sm text-blue-500">Điểm trung bình lớp</p>
                                                <p className="text-2xl font-bold text-blue-700">{gradeStats.averageGrade}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center p-4 bg-green-50 rounded-lg">
                                            <div className="p-3 mr-4 bg-green-100 rounded-full">
                                                <FaTrophy className="text-green-500 text-xl" />
                                            </div>
                                            <div>
                                                <p className="text-sm text-green-500">Điểm cao nhất</p>
                                                <p className="text-2xl font-bold text-green-700">{gradeStats.highestGrade.value}</p>
                                                {gradeStats.highestGrade.student && (
                                                    <p className="text-sm text-green-600">
                                                        {gradeStats.highestGrade.student.full_name} ({gradeStats.highestGrade.student.mssv})
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center p-4 bg-red-50 rounded-lg">
                                            <div className="p-3 mr-4 bg-red-100 rounded-full">
                                                <FaSadTear className="text-red-500 text-xl" />
                                            </div>
                                            <div>
                                                <p className="text-sm text-red-500">Điểm thấp nhất</p>
                                                <p className="text-2xl font-bold text-red-700">{gradeStats.lowestGrade.value}</p>
                                                {gradeStats.lowestGrade.student && (
                                                    <p className="text-sm text-red-600">
                                                        {gradeStats.lowestGrade.student.full_name} ({gradeStats.lowestGrade.student.mssv})
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center p-4 bg-yellow-50 rounded-lg">
                                            <div className="p-3 mr-4 bg-yellow-100 rounded-full">
                                                <FaExclamationTriangle className="text-yellow-500 text-xl" />
                                            </div>
                                            <div>
                                                <p className="text-sm text-yellow-500">Sinh viên dưới trung bình (&lt;5.0)</p>
                                                <p className="text-2xl font-bold text-yellow-700">{gradeStats.belowAverageCount}</p>
                                                <p className="text-sm text-yellow-600">
                                                    {Math.round((gradeStats.belowAverageCount / students.length) * 100)}% tổng số sinh viên
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Biểu đồ phân phối điểm */}
                                <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
                                    <h3 className="text-lg font-semibold mb-4 text-blue-700">Phân phối điểm số</h3>
                                    <div className="h-64">
                                        <Pie
                                            data={{
                                                labels: ['Xuất sắc (9.0-10)', 'Giỏi (8.0-8.9)', 'Khá (6.5-7.9)', 'Trung bình (5.0-6.49)', 'Yếu (0-4.99)'],
                                                datasets: [
                                                    {
                                                        data: [
                                                            gradeStats.gradeDistribution.excellent,
                                                            gradeStats.gradeDistribution.good,
                                                            gradeStats.gradeDistribution.average,
                                                            gradeStats.gradeDistribution.belowAverage,
                                                            gradeStats.gradeDistribution.poor
                                                        ],
                                                        backgroundColor: [
                                                            '#4CAF50', // Xanh lá - xuất sắc
                                                            '#2196F3', // Xanh dương - giỏi
                                                            '#FFC107', // Vàng - khá
                                                            '#FF9800', // Cam - trung bình
                                                            '#F44336'  // Đỏ - yếu
                                                        ],
                                                        borderWidth: 1
                                                    }
                                                ]
                                            }}
                                            options={{
                                                responsive: true,
                                                maintainAspectRatio: false,
                                                plugins: {
                                                    legend: {
                                                        position: 'bottom'
                                                    },
                                                    tooltip: {
                                                        callbacks: {
                                                            label: function (context) {
                                                                const label = context.label || '';
                                                                const value = context.raw || 0;
                                                                const percentage = Math.round((value / students.length) * 100);
                                                                return `${label}: ${value} sinh viên (${percentage}%)`;
                                                            }
                                                        }
                                                    }
                                                }
                                            }}
                                        />
                                    </div>
                                </div>

                                {/* Biểu đồ cột điểm số */}
                                <div className="bg-white rounded-lg shadow p-6 border border-gray-200 md:col-span-2">
                                    <h3 className="text-lg font-semibold mb-4 text-blue-700">Phân bố điểm số</h3>
                                    <div className="h-80">
                                        <Bar
                                            data={{
                                                labels: ['0-1', '1-2', '2-3', '3-4', '4-5', '5-6', '6-7', '7-8', '8-9', '9-10'],
                                                datasets: [
                                                    {
                                                        label: 'Số sinh viên',
                                                        data: [
                                                            students.filter(s => s.grades.total >= 0 && s.grades.total < 1).length,
                                                            students.filter(s => s.grades.total >= 1 && s.grades.total < 2).length,
                                                            students.filter(s => s.grades.total >= 2 && s.grades.total < 3).length,
                                                            students.filter(s => s.grades.total >= 3 && s.grades.total < 4).length,
                                                            students.filter(s => s.grades.total >= 4 && s.grades.total < 5).length,
                                                            students.filter(s => s.grades.total >= 5 && s.grades.total < 6).length,
                                                            students.filter(s => s.grades.total >= 6 && s.grades.total < 7).length,
                                                            students.filter(s => s.grades.total >= 7 && s.grades.total < 8).length,
                                                            students.filter(s => s.grades.total >= 8 && s.grades.total < 9).length,
                                                            students.filter(s => s.grades.total >= 9 && s.grades.total <= 10).length
                                                        ],
                                                        backgroundColor: 'rgba(54, 162, 235, 0.5)',
                                                        borderColor: 'rgba(54, 162, 235, 1)',
                                                        borderWidth: 1
                                                    }
                                                ]
                                            }}
                                            options={{
                                                responsive: true,
                                                maintainAspectRatio: false,
                                                scales: {
                                                    y: {
                                                        beginAtZero: true,
                                                        title: {
                                                            display: true,
                                                            text: 'Số sinh viên'
                                                        },
                                                        ticks: {
                                                            stepSize: 1
                                                        }
                                                    },
                                                    x: {
                                                        title: {
                                                            display: true,
                                                            text: 'Khoảng điểm'
                                                        }
                                                    }
                                                },
                                                plugins: {
                                                    legend: {
                                                        display: false
                                                    },
                                                    tooltip: {
                                                        callbacks: {
                                                            label: function (context) {
                                                                const value = context.raw || 0;
                                                                const percentage = Math.round((value / students.length) * 100);
                                                                return `${value} sinh viên (${percentage}%)`;
                                                            }
                                                        }
                                                    }
                                                }
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Thông tin lớp học */}
                {activeTab === 'details' && (
                    <div>
                        <h2 className="text-xl font-semibold mb-6 text-blue-800 border-b pb-2">Thông tin chi tiết lớp học</h2>

                        {/* Thông tin cơ bản */}
                        <div className="bg-blue-50 p-4 rounded-lg mb-6 border border-blue-100">
                            <div className="flex items-center mb-4">
                                <div className="p-3 mr-4 bg-blue-100 rounded-full">
                                    <FaClipboardList className="text-blue-600 text-xl" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-blue-800">{classDetails.course_info.name}</h3>
                                    <p className="text-sm text-blue-600">
                                        Mã khóa học: <span className="font-semibold">{classDetails.course_info.code}</span> |
                                        Mã lớp: <span className="font-semibold">{classDetails.class_code}</span> |
                                        Số tín chỉ: <span className="font-semibold">{formatCredits(classDetails.course_info.credits)}</span>
                                    </p>
                                </div>
                            </div>

                            <div className="ml-16">
                                <p className="mb-2 text-gray-700"><span className="font-medium text-blue-700">Khoa/Bộ môn:</span> {classDetails.course_info.department}</p>
                                <div className="bg-white p-3 rounded-md border border-gray-200 mt-2">
                                    <p className="font-medium text-blue-700 mb-1">Mô tả khóa học:</p>
                                    <p className="text-gray-700">{classDetails.course_info.description || 'Không có mô tả'}</p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            {/* Thông tin học kỳ */}
                            <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100">
                                <div className="flex items-center mb-4">
                                    <div className="p-3 mr-4 bg-indigo-100 rounded-full">
                                        <FaCalendarAlt className="text-indigo-600 text-xl" />
                                    </div>
                                    <h3 className="text-lg font-bold text-indigo-800">Thông tin học kỳ</h3>
                                </div>

                                <div className="ml-16 space-y-3">
                                    <div className="flex justify-between">
                                        <p className="text-gray-700"><span className="font-medium text-indigo-700">Học kỳ:</span></p>
                                        <p className="font-semibold">{classDetails.semester_info.semester}</p>
                                    </div>
                                    <div className="flex justify-between">
                                        <p className="text-gray-700"><span className="font-medium text-indigo-700">Năm học:</span></p>
                                        <p className="font-semibold">{classDetails.semester_info.academic_year}</p>
                                    </div>
                                    <div className="flex justify-between">
                                        <p className="text-gray-700"><span className="font-medium text-indigo-700">Ngày bắt đầu:</span></p>
                                        <p className="font-semibold">{new Date(classDetails.semester_info.start_date).toLocaleDateString('vi-VN')}</p>
                                    </div>
                                    <div className="flex justify-between">
                                        <p className="text-gray-700"><span className="font-medium text-indigo-700">Ngày kết thúc:</span></p>
                                        <p className="font-semibold">{new Date(classDetails.semester_info.end_date).toLocaleDateString('vi-VN')}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Thông tin sĩ số */}
                            <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                                <div className="flex items-center mb-4">
                                    <div className="p-3 mr-4 bg-green-100 rounded-full">
                                        <FaUserGraduate className="text-green-600 text-xl" />
                                    </div>
                                    <h3 className="text-lg font-bold text-green-800">Thông tin lớp học</h3>
                                </div>

                                <div className="ml-16 space-y-3">
                                    <div className="flex justify-between items-center">
                                        <p className="text-gray-700"><span className="font-medium text-green-700">Trạng thái:</span></p>
                                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${formatStatus(classDetails.enrollment.status).color === 'text-green-600'
                                            ? 'bg-green-100 text-green-800'
                                            : 'bg-gray-100 text-gray-800'
                                            }`}>
                                            {formatStatus(classDetails.enrollment.status).text}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <p className="text-gray-700"><span className="font-medium text-green-700">Sĩ số hiện tại:</span></p>
                                        <p className="font-semibold">{classDetails.enrollment.current_students} sinh viên</p>
                                    </div>
                                    <div className="flex justify-between">
                                        <p className="text-gray-700"><span className="font-medium text-green-700">Sĩ số tối đa:</span></p>
                                        <p className="font-semibold">{classDetails.enrollment.max_students} sinh viên</p>
                                    </div>
                                    <div className="mt-2">
                                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                                            <div
                                                className={`h-2.5 rounded-full ${classDetails.enrollment.current_students / classDetails.enrollment.max_students > 0.8
                                                    ? 'bg-red-600'
                                                    : classDetails.enrollment.current_students / classDetails.enrollment.max_students > 0.5
                                                        ? 'bg-yellow-400'
                                                        : 'bg-green-600'
                                                    }`}
                                                style={{ width: `${(classDetails.enrollment.current_students / classDetails.enrollment.max_students) * 100}%` }}
                                            ></div>
                                        </div>
                                        <p className="text-xs text-right mt-1 text-gray-500">
                                            {Math.round((classDetails.enrollment.current_students / classDetails.enrollment.max_students) * 100)}% đã đăng ký
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Thang điểm */}
                        <div className="bg-purple-50 p-4 rounded-lg border border-purple-100 mt-6">
                            <div className="flex items-center mb-4">
                                <div className="p-3 mr-4 bg-purple-100 rounded-full">
                                    <FaChartBar className="text-purple-600 text-xl" />
                                </div>
                                <h3 className="text-lg font-bold text-purple-800">Thang điểm đánh giá</h3>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                                <div className="bg-white p-4 rounded-lg border border-purple-200 shadow-sm transition-all hover:shadow-md">
                                    <p className="text-sm text-purple-600 mb-1">Điểm giữa kỳ</p>
                                    <p className="text-2xl font-bold text-purple-800">{classDetails.grading_policy.midterm_weight * 100}%</p>
                                </div>
                                <div className="bg-white p-4 rounded-lg border border-purple-200 shadow-sm transition-all hover:shadow-md">
                                    <p className="text-sm text-purple-600 mb-1">Điểm cuối kỳ</p>
                                    <p className="text-2xl font-bold text-purple-800">{classDetails.grading_policy.final_weight * 100}%</p>
                                </div>
                                <div className="bg-white p-4 rounded-lg border border-purple-200 shadow-sm transition-all hover:shadow-md">
                                    <p className="text-sm text-purple-600 mb-1">Điểm bài tập</p>
                                    <p className="text-2xl font-bold text-purple-800">{classDetails.grading_policy.assignments_weight * 100}%</p>
                                </div>
                                <div className="bg-white p-4 rounded-lg border border-purple-200 shadow-sm transition-all hover:shadow-md">
                                    <p className="text-sm text-purple-600 mb-1">Điểm chuyên cần</p>
                                    <p className="text-2xl font-bold text-purple-800">{classDetails.grading_policy.attendance_weight * 100}%</p>
                                </div>
                            </div>

                            <div className="mt-4 p-3 bg-white rounded-lg border border-purple-200">
                                <p className="text-sm text-purple-700 mb-2 font-medium">Công thức tính điểm tổng kết:</p>
                                <p className="text-gray-700">
                                    Điểm tổng kết = (Giữa kỳ × {classDetails.grading_policy.midterm_weight * 100}%) +
                                    (Cuối kỳ × {classDetails.grading_policy.final_weight * 100}%) +
                                    (Bài tập × {classDetails.grading_policy.assignments_weight * 100}%) +
                                    (Chuyên cần × {classDetails.grading_policy.attendance_weight * 100}%)
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Danh sách sinh viên */}
                {activeTab === 'students' && (
                    <div>
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-semibold text-blue-800 border-b pb-2">Danh sách sinh viên</h2>
                            <div className="text-sm bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                                <span className="font-medium text-blue-700">Tổng số: </span>
                                <span className="font-bold text-blue-800">{students.length} sinh viên</span>
                            </div>
                        </div>

                        {studentsLoading ? (
                            <div className="flex justify-center items-center py-12">
                                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                                <span className="ml-3 text-blue-500">Đang tải danh sách sinh viên...</span>
                            </div>
                        ) : studentsError ? (
                            <div className="text-center py-8 bg-red-50 rounded-lg border border-red-200">
                                <div className="text-red-500 text-4xl mb-3">
                                    <FaTimes className="inline" />
                                </div>
                                <p className="text-red-600 font-medium">
                                    Lỗi: {studentsError.message || 'Không thể tải danh sách sinh viên'}
                                </p>
                                <p className="text-red-500 mt-2 text-sm">Vui lòng thử lại sau hoặc liên hệ quản trị viên.</p>
                            </div>
                        ) : Array.isArray(students) && students.length > 0 ? (
                            <div>
                                <div className="bg-blue-50 p-3 rounded-lg mb-4 flex items-center">
                                    <div className="p-2 bg-blue-100 rounded-full mr-3">
                                        <FaUserGraduate className="text-blue-600" />
                                    </div>
                                    <p className="text-blue-700">
                                        Bảng điểm sinh viên lớp <span className="font-bold">{classDetails.class_code}</span> - Học kỳ <span className="font-bold">{classDetails.semester_info.semester} {classDetails.semester_info.academic_year}</span>
                                    </p>
                                </div>

                                <div className="overflow-x-auto bg-white rounded-lg shadow">
                                    <table className="min-w-full bg-white">
                                        <thead>
                                            <tr className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                                                <th className="py-3 px-4 text-left rounded-tl-lg">STT</th>
                                                <th className="py-3 px-4 text-left">MSSV</th>
                                                <th className="py-3 px-4 text-left">Họ và tên</th>
                                                <th className="py-3 px-4 text-left">Lớp</th>
                                                <th className="py-3 px-4 text-center">Giữa kỳ</th>
                                                <th className="py-3 px-4 text-center">Cuối kỳ</th>
                                                <th className="py-3 px-4 text-center">Bài tập</th>
                                                <th className="py-3 px-4 text-center">Chuyên cần</th>
                                                <th className="py-3 px-4 text-center font-bold">Tổng kết</th>
                                                <th className="py-3 px-4 text-center rounded-tr-lg">Thao tác</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {students.map((student, index) => (
                                                <tr
                                                    key={student._id}
                                                    className={`
                                                        ${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'} 
                                                        ${editingStudentId === student.student_id ? 'bg-blue-50' : ''}
                                                        hover:bg-blue-50 transition-colors
                                                    `}
                                                >
                                                    <td className="py-3 px-4 border-b">{index + 1}</td>
                                                    <td className="py-3 px-4 border-b font-medium">{student.mssv}</td>
                                                    <td className="py-3 px-4 border-b font-medium">{student.full_name}</td>
                                                    <td className="py-3 px-4 border-b">{student.class}</td>

                                                    {/* Điểm số */}
                                                    {editMode && editingStudentId === student.student_id ? (
                                                        <>
                                                            <td className="py-2 px-4 border-b">
                                                                <input
                                                                    type="number"
                                                                    name="midterm"
                                                                    value={grades.midterm}
                                                                    onChange={handleGradeChange}
                                                                    className="w-16 p-1 border rounded"
                                                                    min="0"
                                                                    max="10"
                                                                    step="0.1"
                                                                />
                                                            </td>
                                                            <td className="py-2 px-4 border-b">
                                                                <input
                                                                    type="number"
                                                                    name="final"
                                                                    value={grades.final}
                                                                    onChange={handleGradeChange}
                                                                    className="w-16 p-1 border rounded"
                                                                    min="0"
                                                                    max="10"
                                                                    step="0.1"
                                                                />
                                                            </td>
                                                            <td className="py-2 px-4 border-b">
                                                                <input
                                                                    type="number"
                                                                    name="assignments"
                                                                    value={grades.assignments}
                                                                    onChange={handleGradeChange}
                                                                    className="w-16 p-1 border rounded"
                                                                    min="0"
                                                                    max="10"
                                                                    step="0.1"
                                                                />
                                                            </td>
                                                            <td className="py-2 px-4 border-b">
                                                                <input
                                                                    type="number"
                                                                    name="attendance"
                                                                    value={grades.attendance}
                                                                    onChange={handleGradeChange}
                                                                    className="w-16 p-1 border rounded"
                                                                    min="0"
                                                                    max="10"
                                                                    step="0.1"
                                                                />
                                                            </td>
                                                            <td className="py-2 px-4 border-b font-semibold">
                                                                {grades.total !== '' ? grades.total.toFixed(1) : ''}
                                                            </td>
                                                            <td className="py-2 px-4 border-b">
                                                                <div className="flex space-x-2">
                                                                    <button
                                                                        onClick={handleSaveGrades}
                                                                        disabled={!hasChanges || updateGradesMutation.isLoading}
                                                                        className={`p-1 rounded ${hasChanges
                                                                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                                                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                                            }`}
                                                                        title="Lưu"
                                                                    >
                                                                        <FaSave />
                                                                    </button>
                                                                    <button
                                                                        onClick={handleCancelEdit}
                                                                        className="p-1 rounded bg-red-100 text-red-700 hover:bg-red-200"
                                                                        title="Hủy"
                                                                    >
                                                                        <FaUndo />
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <td className="py-2 px-4 border-b">
                                                                {student.grades.midterm !== null ? student.grades.midterm : '-'}
                                                            </td>
                                                            <td className="py-2 px-4 border-b">
                                                                {student.grades.final !== null ? student.grades.final : '-'}
                                                            </td>
                                                            <td className="py-2 px-4 border-b">
                                                                {student.grades.assignments !== null ? student.grades.assignments : '-'}
                                                            </td>
                                                            <td className="py-2 px-4 border-b">
                                                                {student.grades.attendance !== null ? student.grades.attendance : '-'}
                                                            </td>
                                                            <td className="py-2 px-4 border-b font-semibold">
                                                                {student.grades.total !== null ? student.grades.total : '-'}
                                                            </td>
                                                            <td className="py-2 px-4 border-b">
                                                                <button
                                                                    onClick={() => handleEditClick(student)}
                                                                    disabled={editMode}
                                                                    className={`p-1 rounded ${editMode
                                                                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                                        : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                                                        }`}
                                                                    title="Chỉnh sửa điểm"
                                                                >
                                                                    <FaEdit />
                                                                </button>
                                                            </td>
                                                        </>
                                                    )}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="text-center py-4 text-gray-600">
                                    Chưa có sinh viên nào đăng ký lớp học này.
                                </div>

                            </div>
                        ) : (
                            <div className="text-center py-4 text-gray-600">
                                Chưa có sinh viên nào đăng ký lớp học này.
                            </div>
                        )}
                    </div>
                )}

                {/* Lịch học */}
                {activeTab === 'schedule' && (
                    <div>
                        <h2 className="text-xl font-semibold mb-4">Lịch học</h2>
                        {classDetails.schedule ? (
                            <div className="bg-gray-50 p-4 rounded">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <p><span className="font-medium">Thứ:</span> {classDetails.schedule.day_of_week || 'N/A'}</p>
                                        <p><span className="font-medium">Thời gian:</span> {classDetails.schedule.start_time} - {classDetails.schedule.end_time}</p>
                                    </div>
                                    <div>
                                        <p><span className="font-medium">Phòng học:</span> {classDetails.schedule.room || 'Chưa cập nhật'}</p>
                                        <p><span className="font-medium">Học kỳ:</span> {classDetails.semester_info.semester} - {classDetails.semester_info.academic_year}</p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-4 text-gray-600">
                                Chưa có thông tin lịch học cho lớp này.
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div >
    );
}

export default ClassDetail;