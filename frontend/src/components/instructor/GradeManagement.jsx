import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../utils/api';
import { FaArrowLeft, FaSave, FaUndo, FaEraser, FaSpinner } from 'react-icons/fa';

function GradeManagement() {
    // Hỗ trợ cả hai tham số: classId (từ route cũ) và courseId (từ route mới)
    const { classId, studentId, courseId } = useParams();
    // Sử dụng courseId nếu có, nếu không thì dùng classId
    const actualClassId = courseId || classId;
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    console.log('GradeManagement component rendered with classId:', classId, 'studentId:', studentId);

    const [grades, setGrades] = useState({
        midterm: '',
        final: '',
        assignments: '',
        attendance: '',
        total: '',
        letter_grade: '',
    });

    const [originalGrades, setOriginalGrades] = useState({});
    const [hasChanges, setHasChanges] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });

    // Fetch class details
    const { data: classDetails, isLoading: classLoading, error: classError } = useQuery({
        queryKey: ['class-details', classId],
        queryFn: async () => {
            try {
                // First try to get course details from the grades endpoint
                console.log('Fetching course details for ID:', classId);
                console.log('API URL:', `/api/instructor/course/${classId}/grades`);

                // Thử gọi API endpoint chính
                try {
                    // Sử dụng API mới để lấy thông tin khóa học
                    const response = await api.get(`/api/instructor/courses/${classId}`);
                    console.log('Course details response:', response.data);
                    console.log('Response status:', response.status);

                    if (response.data.status === 'success' && response.data.course) {
                        console.log('Found course info in response:', response.data.course);
                        return response.data.course;
                    }
                } catch (error) {
                    console.error('Error fetching from primary endpoint:', error);
                    console.error('Error details:', error.response?.data || error.message);
                    // Tiếp tục với endpoint dự phòng
                }

                // Thử gọi API endpoint dự phòng
                try {
                    const fallbackResponse = await api.get(`/api/instructor/courses`);
                    console.log('Fallback courses response:', fallbackResponse.data);

                    if (fallbackResponse.data.status === 'success') {
                        const course = fallbackResponse.data.courses.find(c => c._id === classId);
                        if (course) {
                            console.log('Found course in courses list:', course);
                            return {
                                _id: course._id,
                                course_id: course.course_id,
                                semester: course.semester,
                                class_code: course.class_code
                            };
                        }
                    }
                } catch (error) {
                    console.error('Error fetching from fallback endpoint:', error);
                    console.error('Error details:', error.response?.data || error.message);
                }

                // Thử gọi API endpoint chi tiết khóa học
                try {
                    const courseDetailResponse = await api.get(`/api/instructor/courses/${classId}`);
                    console.log('Course detail response:', courseDetailResponse.data);

                    if (courseDetailResponse.data.status === 'success' && courseDetailResponse.data.class_details) {
                        console.log('Found course in course detail:', courseDetailResponse.data.class_details);
                        return courseDetailResponse.data.class_details;
                    }
                } catch (error) {
                    console.error('Error fetching from course detail endpoint:', error);
                    console.error('Error details:', error.response?.data || error.message);
                }

                // Nếu không có dữ liệu từ cả ba endpoint, tạo một đối tượng mặc định
                console.log('Creating default course object');
                return {
                    _id: classId,
                    class_code: 'N/A',
                    semester: 'N/A'
                };
            } catch (error) {
                console.error('Error fetching class details:', error);
                console.error('Error details:', error.response?.data || error.message);
                throw error;
            }
        },
        retry: 3,
        retryDelay: 1000,
    });

    // Fetch student details if studentId is provided
    const { data: student, isLoading: studentLoading, error: studentError } = useQuery({
        queryKey: ['student-details', studentId],
        queryFn: async () => {
            if (!studentId) return null;

            try {
                console.log('Fetching student details for ID:', studentId);
                const response = await api.get(`/api/instructor/students/${studentId}`);
                console.log('Student details response:', response.data);

                if (response.data.status === 'success' && response.data.student) {
                    return response.data.student;
                }

                // Nếu không tìm thấy sinh viên, tạo một đối tượng mặc định
                return {
                    _id: studentId,
                    personal_info: {
                        full_name: 'Sinh viên',
                    },
                    mssv: 'N/A',
                };
            } catch (error) {
                console.error('Error fetching student details:', error);
                // Trả về đối tượng mặc định nếu có lỗi
                return {
                    _id: studentId,
                    personal_info: {
                        full_name: 'Sinh viên',
                    },
                    mssv: 'N/A',
                };
            }
        },
        enabled: !!studentId,
    });

    // Fetch student grades for this class
    const { data: gradeData, isLoading: gradeLoading } = useQuery({
        queryKey: ['student-grades', actualClassId, studentId],
        queryFn: async () => {
            if (!studentId) return null;
            console.log('Fetching grades for student:', studentId, 'in course:', actualClassId);
            const response = await api.get(`/api/instructor/course/${actualClassId}/grades`);
            console.log('Student grades response:', response.data);

            if (response.data.status !== 'success') {
                throw new Error(response.data.message || 'Không thể tải điểm số');
            }

            // Find the grades for the specific student
            const studentGradeItem = response.data.grades.find(item => {
                console.log('Checking grade item:', item);
                const itemStudentId = item.student?._id ||
                    (item.registration && item.registration.student_id);
                console.log('Item student ID:', itemStudentId, 'Looking for:', studentId);
                return itemStudentId === studentId;
            });

            console.log('Found student grade item:', studentGradeItem);

            if (!studentGradeItem) {
                return null;
            }

            return studentGradeItem.grades || {};
        },
        enabled: !!studentId,
    });

    // Fetch all students in class if no studentId is provided
    const { data: students = [], isLoading: studentsLoading, error: studentsError } = useQuery({
        queryKey: ['class-students', actualClassId],
        queryFn: async () => {
            if (studentId) return [];
            console.log('Fetching students for course:', actualClassId);
            try {
                // Get students from grades API instead
                const gradesResponse = await api.get(`/api/instructor/course/${actualClassId}/grades`);
                console.log('Grades response for extracting students:', gradesResponse.data);

                if (gradesResponse.data.status !== 'success' || !gradesResponse.data.grades) {
                    throw new Error('Không thể tải danh sách sinh viên từ điểm số');
                }

                // Extract unique students from grades
                const studentsFromGrades = gradesResponse.data.grades.map(item => {
                    return {
                        _id: item.student?._id || item.registration?.student_id,
                        full_name: item.student?.personal_info?.full_name || item.student?.full_name || 'N/A',
                        mssv: item.student?.mssv || 'N/A',
                        email: item.student?.email || 'N/A',
                        class: item.student?.personal_info?.class || item.student?.class || 'N/A'
                    };
                });

                console.log('Extracted students from grades:', studentsFromGrades);
                return studentsFromGrades;
            } catch (error) {
                console.error('Error fetching students:', error);
                console.error('Error details:', error.response?.data || error.message);
                throw error;
            }
        },
        enabled: !studentId,
        retry: 3,
        retryDelay: 1000,
    });

    // Fetch all grades for the class if no studentId is provided
    const { data: allGrades = [], isLoading: allGradesLoading, error: allGradesError } = useQuery({
        queryKey: ['class-grades', actualClassId],
        queryFn: async () => {
            if (studentId) return [];
            console.log('Fetching all grades for course:', actualClassId);
            try {
                // Sử dụng API mới để lấy điểm số của lớp
                const response = await api.get(`/api/instructor/courses/${actualClassId}`);
                console.log('All grades response:', response.data);

                if (response.data.status !== 'success') {
                    throw new Error(response.data.message || 'Không thể tải điểm số của lớp');
                }

                if (!response.data.course || !response.data.course.students || !Array.isArray(response.data.course.students)) {
                    console.warn('Students data is not an array:', response.data.course?.students);
                    return [];
                }

                // Transform the data to match the expected format
                const transformedGrades = response.data.course.students.map(student => {
                    console.log('Transforming student data:', student);
                    return {
                        student_id: student.student_id || '',
                        student_name: student.full_name || 'N/A',
                        student_code: student.mssv || 'N/A',
                        student_class: student.class || 'N/A',
                        ...student.grades
                    };
                });

                console.log('Transformed grades:', transformedGrades);
                return transformedGrades;
            } catch (error) {
                console.error('Error fetching all grades:', error);
                console.error('Error details:', error.response?.data || error.message);
                throw error;
            }
        },
        enabled: !studentId,
        retry: 3,
        retryDelay: 1000,
    });

    // Update grades mutation
    const updateGradesMutation = useMutation({
        mutationFn: async (gradeData) => {
            // Sử dụng API mới để cập nhật điểm số trực tiếp
            console.log('Updating grades with data:', {
                student_id: studentId,
                grades: gradeData
            });

            // Gọi API mới để cập nhật điểm số
            const response = await api.put(`/api/instructor/courses/${actualClassId}/students/${studentId}/grades`, {
                grades: gradeData
            });

            console.log('Update grades response:', response.data);

            if (response.data.status !== 'success') {
                throw new Error(response.data.message || 'Không thể cập nhật điểm số');
            }
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['student-grades', actualClassId, studentId]);
            queryClient.invalidateQueries(['class-grades', actualClassId]);
            setMessage({ text: 'Cập nhật điểm thành công!', type: 'success' });
            setHasChanges(false);

            // Set timeout to clear message
            setTimeout(() => {
                setMessage({ text: '', type: '' });
            }, 3000);
        },
        onError: (error) => {
            setMessage({ text: `Lỗi: ${error.message}`, type: 'error' });
        },
    });

    // Set initial grades when data is loaded
    useEffect(() => {
        if (gradeData) {
            const initialGrades = {
                midterm: gradeData.midterm !== undefined ? gradeData.midterm.toString() : '',
                final: gradeData.final !== undefined ? gradeData.final.toString() : '',
                assignments: gradeData.assignments !== undefined ? gradeData.assignments.toString() : '',
                attendance: gradeData.attendance !== undefined ? gradeData.attendance.toString() : '',
                total: gradeData.total !== undefined ? gradeData.total.toString() : '',
                letter_grade: gradeData.letter_grade || '',
            };
            setGrades(initialGrades);
            setOriginalGrades(initialGrades);
        }
    }, [gradeData]);

    // Handle input change
    const handleInputChange = (e) => {
        const { name, value } = e.target;

        // Validate input (only numbers and decimal point)
        if (value === '' || /^(\d+)?(\.\d{0,2})?$/.test(value)) {
            const numValue = value === '' ? '' : parseFloat(value);

            // Check if value is within valid range (0-10)
            if (value === '' || (numValue >= 0 && numValue <= 10)) {
                setGrades(prev => ({ ...prev, [name]: value }));

                // Check if there are changes
                const hasChanged = value !== originalGrades[name];
                const otherFieldsChanged = Object.keys(grades).some(
                    key => key !== name && grades[key] !== originalGrades[key]
                );

                setHasChanges(hasChanged || otherFieldsChanged);
            }
        }
    };

    // Calculate total grade
    const calculateTotal = () => {
        const midterm = grades.midterm === '' ? 0 : parseFloat(grades.midterm);
        const final = grades.final === '' ? 0 : parseFloat(grades.final);
        const assignments = grades.assignments === '' ? 0 : parseFloat(grades.assignments);
        const attendance = grades.attendance === '' ? 0 : parseFloat(grades.attendance);

        // Example calculation (adjust weights as needed)
        const total = (midterm * 0.3) + (final * 0.5) + (assignments * 0.15) + (attendance * 0.05);

        // Determine letter grade based on total score
        let letterGrade = '';
        if (total >= 9.0) letterGrade = 'A+';
        else if (total >= 8.5) letterGrade = 'A';
        else if (total >= 8.0) letterGrade = 'B+';
        else if (total >= 7.0) letterGrade = 'B';
        else if (total >= 6.5) letterGrade = 'C+';
        else if (total >= 5.5) letterGrade = 'C';
        else if (total >= 5.0) letterGrade = 'D+';
        else if (total >= 4.0) letterGrade = 'D';
        else if (total > 0) letterGrade = 'F';

        setGrades(prev => ({
            ...prev,
            total: total.toFixed(2),
            letter_grade: letterGrade
        }));
    };

    // Handle save button click
    const handleSave = () => {
        // Calculate total before saving
        calculateTotal();

        // Convert string values to numbers
        const gradeData = {
            midterm: grades.midterm === '' ? null : parseFloat(grades.midterm),
            final: grades.final === '' ? null : parseFloat(grades.final),
            assignments: grades.assignments === '' ? null : parseFloat(grades.assignments),
            attendance: grades.attendance === '' ? null : parseFloat(grades.attendance),
            total: grades.total === '' ? null : parseFloat(grades.total),
            letter_grade: grades.letter_grade || null,
        };

        updateGradesMutation.mutate(gradeData);
    };

    // Handle reset button click
    const handleReset = () => {
        setGrades(originalGrades);
        setHasChanges(false);
    };

    // Handle clear grades button click
    const handleClearGrades = () => {
        setGrades({
            midterm: '',
            final: '',
            assignments: '',
            attendance: '',
            total: '',
            letter_grade: '',
        });
        setHasChanges(true);
    };

    // Handle reset all grades in database
    const handleResetAllGrades = async () => {
        if (window.confirm('Bạn có chắc chắn muốn xóa tất cả điểm của khóa học này? Hành động này không thể hoàn tác.')) {
            try {
                // Gọi API với tham số reset_grades=true
                await api.get(`/api/instructor/course/${actualClassId}/grades?reset_grades=true`);

                // Refresh dữ liệu
                queryClient.invalidateQueries(['student-grades', actualClassId, studentId]);
                queryClient.invalidateQueries(['class-grades', actualClassId]);

                // Hiển thị thông báo
                setMessage({ text: 'Đã xóa tất cả điểm của khóa học!', type: 'success' });

                // Reset form
                setGrades({
                    midterm: '',
                    final: '',
                    assignments: '',
                    attendance: '',
                    total: '',
                    letter_grade: '',
                });
                setOriginalGrades({});
                setHasChanges(false);

                // Xóa thông báo sau 3 giây
                setTimeout(() => {
                    setMessage({ text: '', type: '' });
                }, 3000);
            } catch (error) {
                setMessage({
                    text: `Lỗi khi xóa điểm: ${error.response?.data?.message || error.message}`,
                    type: 'error'
                });
            }
        }
    };

    // Loading state
    console.log('Rendering GradeManagement component with:', {
        classDetails,
        classLoading,
        classError,
        student,
        studentLoading,
        gradeData,
        gradeLoading,
        students,
        studentsLoading,
        allGrades,
        allGradesLoading
    });

    // Show loading state
    if (classLoading || (studentId && (studentLoading || gradeLoading)) || (!studentId && (studentsLoading || allGradesLoading))) {
        return (
            <div className="container mx-auto p-4 max-w-[1200px]">
                <div className="text-center py-10">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-4"></div>
                    <p className="text-gray-600">Đang tải dữ liệu...</p>
                </div>
            </div>
        );
    }

    // Show error state if no class details or there's an error
    if (!classDetails || classError) {
        return (
            <div className="container mx-auto p-4 max-w-[1200px]">
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                    <strong className="font-bold">Lỗi!</strong>
                    <span className="block sm:inline">
                        {classError ? `Lỗi: ${classError.message}` : 'Không thể tải thông tin lớp học. Vui lòng thử lại sau.'}
                    </span>
                    <div className="mt-2">
                        <p>ClassID: {classId}</p>
                        <p>API URL: {`/instructor/course/${classId}/grades`}</p>
                        {classError && classError.response && (
                            <div className="mt-2">
                                <p>Status: {classError.response.status}</p>
                                <p>Error: {JSON.stringify(classError.response.data)}</p>
                            </div>
                        )}
                    </div>
                </div>
                <div className="mt-4 bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative">
                    <strong className="font-bold">Thông tin!</strong>
                    <p className="mt-2">
                        Nếu bạn đang gặp vấn đề khi truy cập trang này, vui lòng kiểm tra:
                    </p>
                    <ul className="list-disc ml-5 mt-2">
                        <li>Bạn đã đăng nhập với tài khoản giảng viên</li>
                        <li>Bạn có quyền truy cập vào lớp học này</li>
                        <li>ID lớp học ({classId}) là chính xác</li>
                        <li>Máy chủ backend đang hoạt động</li>
                    </ul>
                </div>
                <button
                    onClick={() => navigate('/instructor/dashboard/courses')}
                    className="mt-4 flex items-center text-blue-600 hover:text-blue-800"
                >
                    <FaArrowLeft className="mr-2" /> Quay lại danh sách lớp học
                </button>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4 max-w-[1200px]">
            {/* Back button */}
            <button
                onClick={() => navigate(`/instructor/dashboard/courses/${classId}`)}
                className="flex items-center text-blue-600 hover:text-blue-800 mb-4"
            >
                <FaArrowLeft className="mr-2" /> Quay lại chi tiết lớp
            </button>

            {/* Header */}
            <div className="bg-white shadow-md rounded-lg p-6 mb-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">
                    {studentId ? 'Quản lý điểm sinh viên' : 'Quản lý điểm lớp học'}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <p className="text-gray-600 font-semibold">Lớp học:</p>
                        <p>{classDetails?.class_code || 'N/A'}</p>
                    </div>
                    <div>
                        <p className="text-gray-600 font-semibold">Học kỳ:</p>
                        <p>{classDetails?.semester || 'N/A'}</p>
                    </div>
                    {studentId && student && (
                        <>
                            <div>
                                <p className="text-gray-600 font-semibold">Sinh viên:</p>
                                <p>{student.personal_info?.full_name || student.full_name || 'N/A'}</p>
                            </div>
                            <div>
                                <p className="text-gray-600 font-semibold">MSSV:</p>
                                <p>{student.mssv}</p>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Status message */}
            {message.text && (
                <div className={`p-4 mb-6 rounded-md ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                    {message.text}
                </div>
            )}

            {/* Individual student grade form */}
            {studentId && (
                <div className="bg-white shadow-md rounded-lg overflow-hidden mb-6">
                    <div className="p-6">
                        <h3 className="text-lg font-semibold mb-4">Điểm số</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Điểm giữa kỳ (30%)
                                </label>
                                <input
                                    type="text"
                                    name="midterm"
                                    value={grades.midterm}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="0.0 - 10.0"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Điểm cuối kỳ (50%)
                                </label>
                                <input
                                    type="text"
                                    name="final"
                                    value={grades.final}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="0.0 - 10.0"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Điểm bài tập (15%)
                                </label>
                                <input
                                    type="text"
                                    name="assignments"
                                    value={grades.assignments}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="0.0 - 10.0"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Điểm chuyên cần (5%)
                                </label>
                                <input
                                    type="text"
                                    name="attendance"
                                    value={grades.attendance}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="0.0 - 10.0"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Tổng điểm
                                </label>
                                <input
                                    type="text"
                                    name="total"
                                    value={grades.total}
                                    readOnly
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                                />
                            </div>
                        </div>
                        <div className="mt-6 flex gap-4 flex-wrap">
                            <button
                                onClick={calculateTotal}
                                className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
                            >
                                Tính tổng điểm
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={!hasChanges || updateGradesMutation.isLoading}
                                className={`flex items-center px-4 py-2 rounded-md transition-colors ${hasChanges && !updateGradesMutation.isLoading
                                    ? 'bg-blue-500 text-white hover:bg-blue-600'
                                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    }`}
                            >
                                <FaSave className="mr-2" /> Lưu thay đổi
                            </button>
                            <button
                                onClick={handleReset}
                                disabled={!hasChanges}
                                className={`flex items-center px-4 py-2 rounded-md transition-colors ${hasChanges
                                    ? 'bg-red-500 text-white hover:bg-red-600'
                                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    }`}
                            >
                                <FaUndo className="mr-2" /> Hủy thay đổi
                            </button>
                            <button
                                onClick={handleClearGrades}
                                className="flex items-center px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition-colors"
                            >
                                <FaEraser className="mr-2" /> Xóa tất cả điểm
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Class grades table */}
            {!studentId && (
                <>
                    {studentsError || allGradesError ? (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6" role="alert">
                            <strong className="font-bold">Lỗi khi tải dữ liệu!</strong>
                            <span className="block sm:inline ml-2">
                                {studentsError ? `Lỗi danh sách sinh viên: ${studentsError.message}` : ''}
                                {allGradesError ? `Lỗi điểm số: ${allGradesError.message}` : ''}
                            </span>
                            <div className="mt-2">
                                {studentsError && studentsError.response && (
                                    <div className="mt-2">
                                        <p>Status: {studentsError.response.status}</p>
                                        <p>Error: {JSON.stringify(studentsError.response.data)}</p>
                                    </div>
                                )}
                                {allGradesError && allGradesError.response && (
                                    <div className="mt-2">
                                        <p>Status: {allGradesError.response.status}</p>
                                        <p>Error: {JSON.stringify(allGradesError.response.data)}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white shadow-md rounded-lg overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                MSSV
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Họ tên
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Giữa kỳ
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Cuối kỳ
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Bài tập
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Chuyên cần
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Tổng điểm
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Thao tác
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {students.length > 0 ? (
                                            students.map((student) => {
                                                // Find grades for this student
                                                const studentGrades = allGrades.find(g => g.student_id === student._id) || {};

                                                return (
                                                    <tr key={student._id} className="hover:bg-gray-50">
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                            {student.mssv}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            {student.personal_info?.full_name || student.full_name || 'N/A'}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            {studentGrades.midterm !== undefined && studentGrades.midterm !== null ? studentGrades.midterm.toFixed(2) : '-'}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            {studentGrades.final !== undefined && studentGrades.final !== null ? studentGrades.final.toFixed(2) : '-'}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            {studentGrades.assignments !== undefined && studentGrades.assignments !== null ? studentGrades.assignments.toFixed(2) : '-'}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            {studentGrades.attendance !== undefined && studentGrades.attendance !== null ? studentGrades.attendance.toFixed(2) : '-'}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            {studentGrades.total !== undefined && studentGrades.total !== null ? (
                                                                <span className={`font-semibold ${studentGrades.total >= 5 ? 'text-green-600' : 'text-red-600'
                                                                    }`}>
                                                                    {studentGrades.total.toFixed(2)}
                                                                </span>
                                                            ) : '-'}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                            <div className="flex space-x-2">
                                                                <button
                                                                    onClick={() => navigate(`/instructor/dashboard/courses/${classId}/grades/${student._id}`)}
                                                                    className="text-blue-600 hover:text-blue-900"
                                                                >
                                                                    Xem chi tiết
                                                                </button>
                                                                <button
                                                                    onClick={() => navigate(`/instructor/dashboard/courses/${classId}/grades/${student._id}/edit`)}
                                                                    className="text-green-600 hover:text-green-900"
                                                                >
                                                                    Cập nhật điểm
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        ) : (
                                            <tr>
                                                <td colSpan="8" className="px-6 py-4 text-center text-gray-500">
                                                    Không có sinh viên nào trong lớp này.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Debug info removed */}
                </>
            )}
        </div>
    );
}

export default GradeManagement;
//het