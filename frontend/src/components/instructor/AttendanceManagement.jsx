import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../utils/api';
import { FaArrowLeft, FaSave, FaCalendarPlus, FaTrash } from 'react-icons/fa';

function AttendanceManagement() {
    const { classId } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const [selectedDate, setSelectedDate] = useState('');
    const [newSessionDate, setNewSessionDate] = useState('');
    const [attendanceData, setAttendanceData] = useState({});
    const [message, setMessage] = useState({ text: '', type: '' });
    const [showAddSession, setShowAddSession] = useState(false);

    // Format date for display
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        });
    };

    // Format date for input value
    const formatDateForInput = (dateString) => {
        const date = new Date(dateString);
        return date.toISOString().split('T')[0];
    };

    // Fetch class details
    const { data: classDetails, isLoading: classLoading } = useQuery({
        queryKey: ['class-details', classId],
        queryFn: async () => {
            // Sử dụng API mới để lấy thông tin khóa học
            const response = await api.get(`/api/instructor/courses/${classId}`);
            console.log('Course details response:', response.data);

            if (response.data.status !== 'success' || !response.data.course) {
                // Fallback to old API
                const fallbackResponse = await api.get(`/api/instructor/courses`);
                const course = fallbackResponse.data.courses.find(c => c._id === classId);
                if (!course) {
                    throw new Error('Không tìm thấy thông tin lớp học');
                }
                return course;
            }

            return response.data.course;
        },
    });

    // Fetch students in class
    const { data: students = [], isLoading: studentsLoading } = useQuery({
        queryKey: ['class-students', classId],
        queryFn: async () => {
            try {
                // Lấy thông tin khóa học từ API
                const courseResponse = await api.get(`/api/instructor/courses/${classId}`);

                if (courseResponse.data.status !== 'success') {
                    throw new Error(courseResponse.data.message || 'Không thể tải thông tin khóa học');
                }

                // Lấy dữ liệu khóa học trực tiếp
                const courseData = courseResponse.data;
                console.log('Course data for students:', courseData);

                // Kiểm tra nếu không có danh sách sinh viên
                if (!courseData.students || !Array.isArray(courseData.students) || courseData.students.length === 0) {
                    console.warn('No students found in course data');
                    return [];
                }

                // Xử lý danh sách sinh viên
                const studentsData = [];

                for (const student of courseData.students) {
                    // Xử lý ID sinh viên từ đối tượng MongoDB
                    const studentId = student.student_id?.$oid || student.student_id;

                    if (!studentId) {
                        console.warn('Student without ID found, skipping');
                        continue;
                    }

                    // Tạo đối tượng sinh viên với thông tin có sẵn
                    studentsData.push({
                        _id: student._id?.$oid || student._id || studentId,
                        student_id: studentId,
                        full_name: student.full_name || 'N/A',
                        mssv: student.mssv || 'N/A',
                        email: student.email || 'N/A',
                        class: student.class || 'N/A',
                        status: student.status || 'active'
                    });
                }

                console.log('Students data processed for attendance:', studentsData);
                return studentsData;
            } catch (error) {
                console.error('Error getting students:', error);
                console.error('Error details:', error.response?.data || error.message);
                return []; // Return empty array instead of throwing to prevent UI errors
            }
        },
        refetchOnWindowFocus: true,
        refetchOnMount: true,
    });

    // Fetch attendance sessions
    const { data: sessions = [], isLoading: sessionsLoading, refetch: refetchSessions } = useQuery({
        queryKey: ['attendance-sessions', classId],
        queryFn: async () => {
            try {
                const response = await api.get(`/api/instructor/courses/${classId}/attendance`);
                console.log('Attendance sessions response:', response.data);

                if (response.data.status !== 'success') {
                    throw new Error(response.data.message || 'Không thể tải dữ liệu buổi học');
                }

                return response.data.sessions || [];
            } catch (error) {
                console.error('Error fetching attendance sessions:', error);
                console.error('Error details:', error.response?.data || error.message);
                return [];
            }
        },
        refetchOnWindowFocus: true,
        refetchOnMount: true,
    });

    // Fetch attendance data for selected date
    const { data: attendance = [], isLoading: attendanceLoading, refetch: refetchAttendance } = useQuery({
        queryKey: ['attendance-data', classId, selectedDate],
        queryFn: async () => {
            if (!selectedDate) return [];
            try {
                const response = await api.get(`/api/instructor/courses/${classId}/attendance/${selectedDate}`);
                console.log('Attendance data response:', response.data);

                if (response.data.status !== 'success') {
                    throw new Error(response.data.message || 'Không thể tải dữ liệu điểm danh');
                }

                return response.data.attendance || [];
            } catch (error) {
                console.error('Error fetching attendance data:', error);
                console.error('Error details:', error.response?.data || error.message);
                return [];
            }
        },
        enabled: !!selectedDate,
        refetchOnWindowFocus: true,
        refetchOnMount: true,
    });

    // Create new session mutation
    const createSessionMutation = useMutation({
        mutationFn: async (date) => {
            // Sử dụng API mới để tạo buổi điểm danh
            const response = await api.post(`/api/instructor/courses/${classId}/attendance`, { date });
            if (response.data.status !== 'success') {
                throw new Error(response.data.message || 'Không thể tạo buổi học mới');
            }
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['attendance-sessions', classId]);
            setNewSessionDate('');
            setShowAddSession(false);
            setMessage({ text: 'Tạo buổi học mới thành công!', type: 'success' });

            // Set timeout to clear message
            setTimeout(() => {
                setMessage({ text: '', type: '' });
            }, 3000);

            refetchSessions();
        },
        onError: (error) => {
            setMessage({ text: `Lỗi: ${error.message}`, type: 'error' });
        },
    });

    // Delete session mutation
    const deleteSessionMutation = useMutation({
        mutationFn: async (date) => {
            // Sử dụng API mới để xóa buổi điểm danh
            const response = await api.delete(`/api/instructor/courses/${classId}/attendance?date=${date}`);
            if (response.data.status !== 'success') {
                throw new Error(response.data.message || 'Không thể xóa buổi học');
            }
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['attendance-sessions', classId]);
            setSelectedDate('');
            setMessage({ text: 'Xóa buổi học thành công!', type: 'success' });

            // Set timeout to clear message
            setTimeout(() => {
                setMessage({ text: '', type: '' });
            }, 3000);

            refetchSessions();
        },
        onError: (error) => {
            setMessage({ text: `Lỗi: ${error.message}`, type: 'error' });
        },
    });

    // Update attendance mutation
    const updateAttendanceMutation = useMutation({
        mutationFn: async (data) => {
            console.log('Updating attendance with data:', data);
            const response = await api.put(`/api/instructor/courses/${classId}/attendance/${selectedDate}`, data);

            if (response.data.status !== 'success') {
                throw new Error(response.data.message || 'Không thể cập nhật điểm danh');
            }

            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['attendance-data', classId, selectedDate]);
            setMessage({ text: 'Cập nhật điểm danh thành công!', type: 'success' });

            // Set timeout to clear message
            setTimeout(() => {
                setMessage({ text: '', type: '' });
            }, 3000);

            refetchAttendance();
        },
        onError: (error) => {
            console.error('Error updating attendance:', error);
            console.error('Error details:', error.response?.data || error.message);
            setMessage({ text: `Lỗi: ${error.message}`, type: 'error' });
        },
    });

    // Initialize attendance data when attendance or students change
    useEffect(() => {
        if (attendance.length > 0 && students.length > 0) {
            const newAttendanceData = {};

            // Initialize with existing attendance data
            attendance.forEach(record => {
                newAttendanceData[record.student_id] = record.present;
            });

            // Add missing students with default value (false)
            students.forEach(student => {
                if (newAttendanceData[student._id] === undefined) {
                    newAttendanceData[student._id] = false;
                }
            });

            setAttendanceData(newAttendanceData);
        } else if (students.length > 0 && selectedDate) {
            // Initialize all students as absent if no attendance data
            const newAttendanceData = {};
            students.forEach(student => {
                newAttendanceData[student._id] = false;
            });
            setAttendanceData(newAttendanceData);
        }
    }, [attendance, students, selectedDate]);

    // Handle attendance toggle
    const handleAttendanceToggle = (studentId) => {
        // Xử lý trường hợp studentId có thể là đối tượng MongoDB
        const normalizedStudentId = typeof studentId === 'object' ?
            (studentId.$oid || JSON.stringify(studentId)) : studentId;

        setAttendanceData(prev => ({
            ...prev,
            [normalizedStudentId]: !prev[normalizedStudentId]
        }));

        console.log('Toggled attendance for student:', normalizedStudentId, 'New value:', !attendanceData[normalizedStudentId]);
    };

    // Handle save attendance
    const handleSaveAttendance = () => {
        if (!selectedDate) {
            setMessage({ text: 'Vui lòng chọn ngày điểm danh', type: 'error' });
            return;
        }

        // Chuyển đổi dữ liệu điểm danh sang định dạng mong muốn
        const attendanceRecords = Object.entries(attendanceData).map(([student_id, present]) => {
            // Xử lý trường hợp student_id có thể là đối tượng MongoDB
            const normalizedStudentId = typeof student_id === 'object' ?
                (student_id.$oid || JSON.stringify(student_id)) : student_id;

            return {
                student_id: normalizedStudentId,
                present,
            };
        });

        console.log('Saving attendance records:', attendanceRecords);

        updateAttendanceMutation.mutate({
            attendance: attendanceRecords,
        });
    };

    // Handle create new session
    const handleCreateSession = () => {
        if (!newSessionDate) {
            setMessage({ text: 'Vui lòng chọn ngày cho buổi học mới', type: 'error' });
            return;
        }

        createSessionMutation.mutate(newSessionDate);
    };

    // Handle delete session
    const handleDeleteSession = () => {
        if (!selectedDate) {
            setMessage({ text: 'Vui lòng chọn buổi học để xóa', type: 'error' });
            return;
        }

        if (window.confirm(`Bạn có chắc chắn muốn xóa buổi học ngày ${formatDate(selectedDate)}?`)) {
            deleteSessionMutation.mutate(selectedDate);
        }
    };

    // Loading state
    if (classLoading || studentsLoading || sessionsLoading || (selectedDate && attendanceLoading)) {
        return <p className="m-4 text-gray-600">Đang tải dữ liệu...</p>;
    }

    return (
        <div className="container mx-auto p-4 max-w-[1200px]">
            {/* Back button */}
            <button
                onClick={() => {
                    // Lưu trạng thái hiện tại vào localStorage trước khi chuyển trang
                    localStorage.setItem('lastClassId', classId);

                    // Kiểm tra URL hiện tại để xác định đường dẫn quay lại
                    const currentPath = window.location.pathname;
                    if (currentPath.includes('/dashboard/')) {
                        navigate(`/instructor/dashboard/courses/${classId}`);
                    } else {
                        navigate(`/instructor/courses/${classId}`);
                    }
                }}
                className="flex items-center text-blue-600 hover:text-blue-800 mb-4"
            >
                <FaArrowLeft className="mr-2" /> Quay lại chi tiết lớp
            </button>

            {/* Header */}
            <div className="bg-white shadow-md rounded-lg p-6 mb-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Quản lý điểm danh</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <p className="text-gray-600 font-semibold">Lớp học:</p>
                        <p>{classDetails?.course_name} ({classDetails?.class_code})</p>
                    </div>
                    <div>
                        <p className="text-gray-600 font-semibold">Học kỳ:</p>
                        <p>{classDetails?.semester}</p>
                    </div>
                    <div>
                        <p className="text-gray-600 font-semibold">Số sinh viên:</p>
                        <p>{students.length}</p>
                    </div>
                    <div>
                        <p className="text-gray-600 font-semibold">Số buổi học:</p>
                        <p>{sessions.length}</p>
                    </div>
                </div>
            </div>

            {/* Status message */}
            {message.text && (
                <div className={`p-4 mb-6 rounded-md ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                    {message.text}
                </div>
            )}

            {/* Session management */}
            <div className="bg-white shadow-md rounded-lg p-6 mb-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
                    <h3 className="text-lg font-semibold mb-4 md:mb-0">Buổi học</h3>
                    <button
                        onClick={() => setShowAddSession(!showAddSession)}
                        className="flex items-center px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
                    >
                        <FaCalendarPlus className="mr-2" /> {showAddSession ? 'Hủy' : 'Thêm buổi học mới'}
                    </button>
                </div>

                {showAddSession && (
                    <div className="bg-gray-50 p-4 rounded-md mb-6">
                        <h4 className="text-md font-medium mb-3">Thêm buổi học mới</h4>
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="flex-grow">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Ngày
                                </label>
                                <input
                                    type="date"
                                    value={newSessionDate}
                                    onChange={(e) => setNewSessionDate(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            <div className="flex items-end">
                                <button
                                    onClick={handleCreateSession}
                                    disabled={!newSessionDate || createSessionMutation.isLoading}
                                    className={`px-4 py-2 rounded-md transition-colors ${!newSessionDate || createSessionMutation.isLoading
                                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                        : 'bg-blue-500 text-white hover:bg-blue-600'
                                        }`}
                                >
                                    {createSessionMutation.isLoading ? 'Đang tạo...' : 'Tạo buổi học'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {sessions.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        {sessions.map((session) => (
                            <button
                                key={session.date}
                                onClick={() => setSelectedDate(session.date)}
                                className={`p-3 rounded-md text-center transition-colors ${selectedDate === session.date
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                                    }`}
                            >
                                {formatDate(session.date)}
                            </button>
                        ))}
                    </div>
                ) : (
                    <p className="text-gray-500">Chưa có buổi học nào. Hãy thêm buổi học mới.</p>
                )}
            </div>

            {/* Attendance management */}
            {selectedDate && (
                <div className="bg-white shadow-md rounded-lg overflow-hidden mb-6">
                    <div className="p-6 border-b">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-semibold">Điểm danh ngày {formatDate(selectedDate)}</h3>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleSaveAttendance}
                                    disabled={updateAttendanceMutation.isLoading}
                                    className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                                >
                                    <FaSave className="mr-2" /> Lưu điểm danh
                                </button>
                                <button
                                    onClick={handleDeleteSession}
                                    disabled={deleteSessionMutation.isLoading}
                                    className="flex items-center px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
                                >
                                    <FaTrash className="mr-2" /> Xóa buổi học
                                </button>
                            </div>
                        </div>
                    </div>

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
                                        Lớp
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Điểm danh
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {students.length > 0 ? (
                                    students.map((student) => (
                                        <tr key={student._id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                {student.mssv}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {student.personal_info?.full_name || student.full_name || 'N/A'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {student.personal_info?.class || student.class || 'N/A'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                                                <label className="inline-flex items-center cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={attendanceData[student._id] || false}
                                                        onChange={() => handleAttendanceToggle(student._id)}
                                                        className="form-checkbox h-5 w-5 text-blue-600 transition duration-150 ease-in-out"
                                                    />
                                                    <span className="ml-2">
                                                        {attendanceData[student._id] ? 'Có mặt' : 'Vắng mặt'}
                                                    </span>
                                                </label>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="4" className="px-6 py-4 text-center text-gray-500">
                                            Không có sinh viên nào trong lớp này.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AttendanceManagement;
//het