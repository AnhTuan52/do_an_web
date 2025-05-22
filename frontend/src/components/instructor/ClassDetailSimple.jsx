import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { FaArrowLeft, FaSave, FaEdit, FaTimes, FaCheck } from 'react-icons/fa';

function ClassDetailSimple() {
    const [classDetails, setClassDetails] = useState(null);
    const [students, setStudents] = useState([]);
    const [grades, setGrades] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [editMode, setEditMode] = useState(false);
    const [editingGrade, setEditingGrade] = useState(null);
    const [message, setMessage] = useState({ text: '', type: '' });

    // Get classId from URL
    const location = window.location.pathname;
    const pathParts = location.split('/');
    const classId = pathParts[pathParts.length - 1];

    // Function to get student grade (simplified)
    const getStudentGrade = (studentId, gradeType) => {
        if (!grades || !grades.length) return 'N/A';

        const studentGrade = grades.find(grade => {
            const gradeStudentId = grade.student?._id || grade.registration?.student_id || grade.student_id;
            return gradeStudentId === studentId;
        });

        if (!studentGrade) return 'N/A';

        // Kiểm tra nếu có đối tượng grades
        if (studentGrade.grades && studentGrade.grades[gradeType] !== undefined) {
            return studentGrade.grades[gradeType];
        }

        // Nếu không có đối tượng grades, kiểm tra trực tiếp
        return studentGrade[gradeType] !== undefined ? studentGrade[gradeType] : 'N/A';
    };

    // Hàm để tải dữ liệu điểm từ server
    const fetchGrades = async () => {
        try {
            setLoading(true);
            console.log('Fetching grades for class:', classId);

            // Sử dụng API mới để lấy dữ liệu từ offered_courses collection
            const response = await api.get(`/api/offered-courses/${classId}`);

            if (response.data.status === 'success' && response.data.course && response.data.course.students) {
                console.log('Students data:', response.data.course.students);

                // Lấy danh sách ID sinh viên
                const studentIds = response.data.course.students
                    .map(student => student.student_id)
                    .filter(Boolean);

                // Lấy thông tin sinh viên từ mảng students
                let studentsInfo = {};

                // Tạo thông tin sinh viên từ dữ liệu khóa học
                response.data.course.students.forEach(student => {
                    studentsInfo[student.student_id] = {
                        _id: student.student_id,
                        personal_info: {
                            full_name: student.full_name || `Sinh viên ${student.student_id.substring(0, 6)}`,
                            class: student.class || 'N/A'
                        },
                        mssv: student.mssv || 'N/A',
                        email: student.email || 'N/A'
                    };
                });

                console.log('Created student info from course students:', studentsInfo);

                // Chuyển đổi dữ liệu sang định dạng cần thiết
                const formattedGrades = response.data.course.students.map(student => {
                    const studentInfo = studentsInfo[student.student_id] || {};

                    // Lấy dữ liệu điểm từ trường grades
                    const gradesObj = student.grades || {};

                    // Tạo một bản ghi điểm mặc định nếu không có
                    const defaultGrades = {
                        midterm: null,
                        final: null,
                        assignments: null,
                        attendance: null,
                        total: null,
                        letter_grade: ''
                    };

                    // Kết hợp điểm mặc định với điểm thực tế (nếu có)
                    const combinedGrades = { ...defaultGrades, ...gradesObj };

                    return {
                        student: {
                            _id: student.student_id,
                            full_name: studentInfo.personal_info?.full_name || studentInfo.full_name || 'N/A',
                            mssv: studentInfo.mssv || 'N/A',
                            email: studentInfo.email || 'N/A',
                            class: studentInfo.personal_info?.class || studentInfo.class || 'N/A'
                        },
                        registration: {
                            student_id: student.student_id
                        },
                        grades: combinedGrades
                    };
                });

                console.log('Formatted grades data:', formattedGrades);
                setGrades(formattedGrades);
            } else {
                console.error('Failed to fetch registrations:', response.data.message);
                setError(response.data.message || 'Không thể tải dữ liệu đăng ký khóa học');
            }
        } catch (err) {
            console.error('Error fetching grades:', err);
            setError(err.message || 'Đã xảy ra lỗi khi tải dữ liệu điểm');
        } finally {
            setLoading(false);
        }
    };

    // Hàm bắt đầu chỉnh sửa điểm cho một sinh viên
    const handleStartEdit = (gradeData) => {
        console.log('Starting edit for grade data:', JSON.stringify(gradeData, null, 2));

        // Kiểm tra xem đã có sinh viên khác đang được chỉnh sửa không
        if (editMode) {
            console.log('Already in edit mode, canceling previous edit');
            // Hủy chỉnh sửa hiện tại trước khi bắt đầu chỉnh sửa mới
            setEditingGrade(null);
            setEditMode(false);
        }

        // Kiểm tra dữ liệu
        if (!gradeData) {
            console.error('Grade data is undefined or null');
            return;
        }

        // Lấy ID sinh viên từ cấu trúc dữ liệu mới
        const studentId = gradeData.student?._id || gradeData.registration?.student_id;

        if (!studentId) {
            console.error('Student ID not found in grade data');
            setMessage({ text: 'Không tìm thấy ID sinh viên', type: 'error' });
            return;
        }

        console.log('Found student ID:', studentId);

        // Lấy ID đăng ký từ cấu trúc dữ liệu mới
        const registrationId = gradeData.registration?._id;

        if (!registrationId) {
            console.log('Registration ID not found in grade data');
        } else {
            console.log('Found registration ID:', registrationId);
        }

        // Lấy thông tin sinh viên từ cấu trúc dữ liệu mới
        const studentName = gradeData.student?.full_name || 'N/A';
        const studentMssv = gradeData.student?.mssv || 'N/A';

        console.log('Student info for editing:', {
            id: studentId,
            name: studentName,
            mssv: studentMssv,
            registrationId: registrationId
        });

        // Lấy dữ liệu điểm từ cấu trúc dữ liệu mới
        let gradesData = {};

        if (gradeData.grades) {
            // Sử dụng đối tượng grades từ cấu trúc mới
            gradesData = { ...gradeData.grades };
        } else {
            // Fallback nếu không tìm thấy đối tượng grades
            gradesData = {
                midterm: null,
                final: null,
                assignments: null,
                attendance: null,
                total: null,
                letter_grade: ''
            };
        }

        // Chuyển đổi các giá trị null thành chuỗi rỗng để dễ chỉnh sửa
        Object.keys(gradesData).forEach(key => {
            if (gradesData[key] === null || gradesData[key] === undefined) {
                gradesData[key] = '';
            }
        });

        console.log('Grades data for editing:', gradesData);

        // Tạo bản sao của dữ liệu điểm để chỉnh sửa
        setEditingGrade({
            studentId: studentId,
            registrationId: registrationId,
            studentName: studentName,
            studentMssv: studentMssv,
            originalData: gradeData, // Lưu toàn bộ dữ liệu gốc để tham khảo sau này
            grades: gradesData
        });

        // Bật chế độ chỉnh sửa
        setEditMode(true);
        console.log('Edit mode enabled');
    };

    // Hàm hủy chỉnh sửa
    const handleCancelEdit = () => {
        console.log('Canceling edit');
        setEditingGrade(null);
        setEditMode(false);
    };

    // Hàm xử lý thay đổi giá trị điểm
    const handleGradeChange = (field, value) => {
        console.log(`Changing ${field} to ${value}`);

        // Đảm bảo giá trị hợp lệ
        let processedValue = value;
        if (value === '') {
            // Cho phép giá trị trống
            processedValue = '';
        } else if (!isNaN(parseFloat(value))) {
            // Chuyển đổi sang số nếu là số hợp lệ
            processedValue = parseFloat(value);

            // Kiểm tra giá trị hợp lệ (0-10)
            if (processedValue < 0) processedValue = 0;
            if (processedValue > 10) processedValue = 10;
        }

        setEditingGrade(prev => {
            if (!prev) return null;

            const updatedGrades = {
                ...prev.grades,
                [field]: processedValue
            };

            // Tự động tính điểm tổng kết nếu đã có đủ điểm thành phần
            if (field !== 'total' && field !== 'letter_grade') {
                const midterm = updatedGrades.midterm !== '' ? parseFloat(updatedGrades.midterm) || 0 : 0;
                const final = updatedGrades.final !== '' ? parseFloat(updatedGrades.final) || 0 : 0;
                const assignments = updatedGrades.assignments !== '' ? parseFloat(updatedGrades.assignments) || 0 : 0;
                const attendance = updatedGrades.attendance !== '' ? parseFloat(updatedGrades.attendance) || 0 : 0;

                // Tính điểm tổng kết với trọng số
                const total = (
                    midterm * 0.3 +
                    final * 0.5 +
                    assignments * 0.15 +
                    attendance * 0.05
                ).toFixed(2);

                updatedGrades.total = parseFloat(total);

                // Xác định letter_grade
                updatedGrades.letter_grade = updatedGrades.total >= 5.0 ? 'Đạt' : 'Rớt';

                console.log('Auto-calculated total:', updatedGrades.total);
                console.log('Auto-determined letter grade:', updatedGrades.letter_grade);
            }

            return {
                ...prev,
                grades: updatedGrades
            };
        });

        console.log(`Updated ${field} to ${processedValue}`);
    };

    // Hàm lưu điểm đã chỉnh sửa
    const handleSaveGrades = async () => {
        try {
            if (!editingGrade || !editingGrade.studentId) {
                setMessage({ text: 'Không tìm thấy thông tin sinh viên', type: 'error' });
                return;
            }

            // Kiểm tra và chuyển đổi dữ liệu điểm
            const validatedGrades = {};
            for (const [key, value] of Object.entries(editingGrade.grades)) {
                // Bỏ qua các trường không phải điểm số
                if (key === 'total' || key === 'letter_grade') continue;

                // Chuyển đổi sang số nếu có giá trị
                if (value !== '' && value !== null && value !== undefined) {
                    const numValue = parseFloat(value);
                    if (isNaN(numValue)) {
                        setMessage({ text: `Điểm ${key} không hợp lệ, phải là số`, type: 'error' });
                        return;
                    }
                    if (numValue < 0 || numValue > 10) {
                        setMessage({ text: `Điểm ${key} phải từ 0 đến 10`, type: 'error' });
                        return;
                    }
                    validatedGrades[key] = numValue;
                }
            }

            let registrationId = editingGrade.registrationId;

            // Nếu không có registration_id, thử lấy từ dữ liệu gốc
            if (!registrationId && editingGrade.originalData) {
                console.log('Trying to find registration_id from original data');

                // Kiểm tra tất cả các vị trí có thể chứa registration_id trong dữ liệu gốc
                if (editingGrade.originalData.registration && editingGrade.originalData.registration._id) {
                    registrationId = editingGrade.originalData.registration._id;
                    console.log('Found registration ID in originalData.registration._id:', registrationId);
                } else if (editingGrade.originalData.registration_id) {
                    registrationId = editingGrade.originalData.registration_id;
                    console.log('Found registration ID in originalData.registration_id:', registrationId);
                } else if (editingGrade.originalData._id) {
                    // Nếu không tìm thấy registration_id, thử dùng _id
                    registrationId = editingGrade.originalData._id;
                    console.log('Using originalData._id as registration ID:', registrationId);
                }
            }

            // Nếu vẫn không có registration_id, tìm trực tiếp từ registered_courses collection
            if (!registrationId) {
                console.log('Registration ID not found, fetching from registered_courses collection...');
                try {
                    // Gọi API để lấy thông tin đăng ký khóa học dựa trên ID sinh viên và ID khóa học
                    const registrationResponse = await api.get(`/api/registered-courses/find`, {
                        params: {
                            student_id: editingGrade.studentId,
                            course_id: classId
                        }
                    });

                    console.log('Registration response:', registrationResponse.data);

                    if (registrationResponse.data.status === 'success' && registrationResponse.data.registration) {
                        registrationId = registrationResponse.data.registration._id;
                        console.log('Found registration ID from registered_courses collection:', registrationId);
                    } else {
                        throw new Error('Không tìm thấy thông tin đăng ký khóa học');
                    }
                } catch (error) {
                    console.error('Error finding registration from registered_courses:', error);

                    // Nếu API trên không tồn tại, thử API khác
                    try {
                        console.log('Trying alternative API to find registration...');
                        // Thử lấy danh sách đăng ký khóa học của sinh viên
                        const studentRegistrationsResponse = await api.get(`/api/students/${editingGrade.studentId}/registrations`);

                        if (studentRegistrationsResponse.data.status === 'success' && studentRegistrationsResponse.data.registrations) {
                            // Tìm đăng ký khóa học phù hợp với ID khóa học
                            const registration = studentRegistrationsResponse.data.registrations.find(
                                reg => reg.course_id === classId || reg.course?._id === classId
                            );

                            if (registration) {
                                registrationId = registration._id;
                                console.log('Found registration ID from student registrations:', registrationId);
                            } else {
                                throw new Error('Không tìm thấy thông tin đăng ký khóa học phù hợp');
                            }
                        } else {
                            throw new Error('Không thể lấy danh sách đăng ký khóa học của sinh viên');
                        }
                    } catch (secondError) {
                        console.error('Error finding registration from student registrations:', secondError);

                        // Thử phương án cuối cùng: lấy từ grades API và truy cập trực tiếp vào registered_courses
                        try {
                            console.log('Trying to find registration from grades API...');
                            const gradesResponse = await api.get(`/api/instructor/course/${classId}/grades`);

                            if (gradesResponse.data.status !== 'success') {
                                throw new Error(gradesResponse.data.message || 'Không thể tải thông tin điểm số');
                            }

                            console.log('All grades data:', gradesResponse.data.grades);

                            // Tìm registration_id cho sinh viên này
                            const studentGradeItem = gradesResponse.data.grades.find(item => {
                                // Kiểm tra tất cả các vị trí có thể chứa ID sinh viên
                                const itemStudentId = item.student?._id || item.registration?.student_id || item.student_id;
                                const match = itemStudentId === editingGrade.studentId;

                                if (match) {
                                    console.log('Found matching student in grades data:', item);
                                }

                                return match;
                            });

                            if (!studentGradeItem) {
                                console.error('Could not find student in grades data. Student ID:', editingGrade.studentId);
                                console.log('All available student IDs:', gradesResponse.data.grades.map(item => ({
                                    student_id: item.student?._id,
                                    registration_student_id: item.registration?.student_id,
                                    direct_student_id: item.student_id
                                })));
                                throw new Error('Không tìm thấy thông tin điểm của sinh viên');
                            }

                            // Kiểm tra tất cả các vị trí có thể chứa registration_id
                            if (studentGradeItem.registration && studentGradeItem.registration._id) {
                                registrationId = studentGradeItem.registration._id;
                                console.log('Found registration ID in registration._id:', registrationId);
                            } else if (studentGradeItem.registration_id) {
                                registrationId = studentGradeItem.registration_id;
                                console.log('Found registration ID in registration_id property:', registrationId);
                            } else if (studentGradeItem._id) {
                                registrationId = studentGradeItem._id;
                                console.log('Using _id as registration ID:', registrationId);
                            } else {
                                throw new Error('Không tìm thấy thông tin đăng ký khóa học trong dữ liệu điểm số');
                            }
                        } catch (thirdError) {
                            console.error('All attempts to find registration ID failed:', thirdError);
                            setMessage({ text: 'Không thể tìm thấy thông tin đăng ký khóa học, không thể cập nhật điểm', type: 'error' });
                            return;
                        }
                    }
                }
            }

            if (!registrationId) {
                setMessage({ text: 'Không tìm thấy thông tin đăng ký khóa học, không thể cập nhật điểm', type: 'error' });
                return;
            }

            console.log('Sending data:', {
                registration_id: registrationId,
                grades: validatedGrades,
                student: {
                    id: editingGrade.studentId,
                    name: editingGrade.studentName,
                    mssv: editingGrade.studentMssv
                }
            });

            // Sử dụng API endpoint đúng
            console.log('Final data to send:', {
                registration_id: registrationId,
                grades: validatedGrades
            });

            // Tính điểm tổng kết nếu có đủ các điểm thành phần
            if (validatedGrades.midterm !== undefined &&
                validatedGrades.final !== undefined) {

                // Tính điểm tổng kết với trọng số tương ứng
                // Nếu không có điểm assignments hoặc attendance, giả định là 0
                const midtermWeight = 0.3;
                const finalWeight = 0.5;
                const assignmentsWeight = 0.15;
                const attendanceWeight = 0.05;

                const midtermScore = validatedGrades.midterm * midtermWeight;
                const finalScore = validatedGrades.final * finalWeight;
                const assignmentsScore = (validatedGrades.assignments || 0) * assignmentsWeight;
                const attendanceScore = (validatedGrades.attendance || 0) * attendanceWeight;

                const total = (
                    midtermScore +
                    finalScore +
                    assignmentsScore +
                    attendanceScore
                ).toFixed(2);

                validatedGrades.total = parseFloat(total);
                console.log('Calculated total grade:', validatedGrades.total);

                // Xác định letter_grade dựa trên điểm tổng kết
                if (validatedGrades.total >= 5.0) {
                    validatedGrades.letter_grade = 'Đạt';
                } else {
                    validatedGrades.letter_grade = 'Rớt';
                }

                console.log('Determined letter grade:', validatedGrades.letter_grade);
            }

            // Gọi API để cập nhật điểm trong database
            try {
                console.log('Updating grades for registration ID:', registrationId);

                // Chuẩn bị dữ liệu điểm để gửi đến API
                const gradesData = {
                    midterm: validatedGrades.midterm !== undefined ? Number(validatedGrades.midterm) : null,
                    final: validatedGrades.final !== undefined ? Number(validatedGrades.final) : null,
                    assignments: validatedGrades.assignments !== undefined ? Number(validatedGrades.assignments) : null,
                    attendance: validatedGrades.attendance !== undefined ? Number(validatedGrades.attendance) : null,
                    total: validatedGrades.total !== undefined ? Number(validatedGrades.total) : null,
                    letter_grade: validatedGrades.letter_grade || '',
                    last_updated: new Date().toISOString()
                };

                console.log('Prepared grades data for update:', gradesData);

                // Gọi API để cập nhật điểm trong registered_courses collection
                try {
                    // Sử dụng API mới để cập nhật điểm số
                    const response = await api.put(`/api/instructor/courses/${classId}/students/${editingGrade.studentId}/grades`, {
                        grades: gradesData
                    });

                    console.log('API response:', response.data);

                    if (response.data.status !== 'success') {
                        throw new Error(response.data.message || 'Không thể cập nhật điểm số');
                    }
                } catch (apiError) {
                    console.error('Error with primary API endpoint:', apiError);

                    // Thử endpoint thay thế nếu endpoint chính không hoạt động
                    console.log('Trying alternative API endpoint...');
                    const altResponse = await api.put(`/api/offered-courses/${classId}/students/${editingGrade.studentId}/grades`, {
                        grades: gradesData
                    });

                    console.log('Alternative API response:', altResponse.data);

                    if (altResponse.data.status !== 'success') {
                        throw new Error(altResponse.data.message || 'Không thể cập nhật điểm số');
                    }
                }

                // Cập nhật state sau khi API thành công
                const updatedGrades = grades.map(grade => {
                    // Kiểm tra xem đây có phải là sinh viên đang được chỉnh sửa không
                    const gradeStudentId = grade.student_id || grade._id || grade.student?._id;
                    const isMatchingStudent = gradeStudentId === editingGrade.studentId;

                    if (isMatchingStudent) {
                        console.log('Updating grade for student:', grade.student_name || grade.student?.full_name);

                        // Cập nhật điểm
                        const updatedGrade = {
                            ...grade,
                            midterm: validatedGrades.midterm,
                            final: validatedGrades.final,
                            assignments: validatedGrades.assignments,
                            attendance: validatedGrades.attendance,
                            total: validatedGrades.total,
                            letter_grade: validatedGrades.letter_grade,
                            // Cập nhật cả đối tượng grades nếu có
                            grades: {
                                ...grade.grades,
                                ...validatedGrades
                            }
                        };

                        console.log('Updated grade:', updatedGrade);
                        return updatedGrade;
                    }
                    return grade;
                });

                // Cập nhật state
                setGrades(updatedGrades);

                // Hiển thị thông báo thành công
                setMessage({ text: 'Cập nhật điểm thành công!', type: 'success' });
                console.log('Grades updated successfully');

                // Đóng form chỉnh sửa
                setEditingGrade(null);
                setEditMode(false);

                // Tự động ẩn thông báo sau 3 giây
                setTimeout(() => {
                    setMessage({ text: '', type: '' });
                }, 3000);

                // Tải lại dữ liệu từ server
                fetchGrades();

            } catch (error) {
                console.error('API call failed:', error);
                setMessage({ text: `Lỗi: ${error.message || 'Không thể cập nhật điểm'}`, type: 'error' });
            }

        } catch (err) {
            console.error('Error updating grades:', err);

            // Hiển thị thông tin lỗi chi tiết hơn
            let errorMessage = 'Đã xảy ra lỗi khi cập nhật điểm';

            if (err.response) {
                // Lỗi từ server với response
                console.error('Error response:', err.response.data);
                errorMessage = err.response.data.message || `Lỗi server: ${err.response.status}`;
            } else if (err.request) {
                // Lỗi không nhận được response
                console.error('Error request:', err.request);
                errorMessage = 'Không nhận được phản hồi từ server';
            } else {
                // Lỗi khác
                errorMessage = err.message;
            }

            setMessage({ text: `Lỗi: ${errorMessage}`, type: 'error' });
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);

                // Fetch course details
                console.log('Fetching course details for classId:', classId);

                // Thử lấy thông tin khóa học từ API /api/courses/:id trước
                let courseData = null;
                try {
                    const directResponse = await api.get(`/api/courses/${classId}`);
                    if (directResponse.data.status === 'success' && directResponse.data.course) {
                        console.log('Direct course response:', directResponse.data);
                        courseData = directResponse.data.course;
                    }
                } catch (directError) {
                    console.log('Could not fetch course directly, trying alternative method');
                }

                // Nếu không thành công, thử lấy từ danh sách khóa học
                if (!courseData) {
                    console.log('Fetching courses from API');
                    const coursesResponse = await api.get('/api/instructor/courses');

                    if (coursesResponse.data.status !== 'success') {
                        throw new Error(coursesResponse.data.message || 'Không thể tải danh sách lớp học');
                    }

                    // Find the specific course by ID
                    courseData = coursesResponse.data.courses.find(course => course._id === classId);

                    if (!courseData) {
                        throw new Error('Không tìm thấy thông tin lớp học');
                    }
                }

                // Chuyển đổi dữ liệu khóa học sang định dạng mới
                const formattedCourseData = {
                    _id: courseData._id,
                    course_name: courseData.course_name || courseData.course_info?.name || 'N/A',
                    course_code: courseData.course_code || courseData.course_info?.code || 'N/A',
                    semester: courseData.semester || courseData.semester_info?.semester || 'N/A',
                    academic_year: courseData.academic_year || courseData.semester_info?.academic_year || 'N/A',
                    credits: courseData.credits || courseData.course_info?.credits || 'N/A',
                    student_count: courseData.student_count || courseData.enrollment?.current_students || 0,
                    status: courseData.status || courseData.enrollment?.status || 'active',
                    class_code: courseData.class_code || `${courseData.course_code}-${courseData._id.substring(0, 4)}` || 'N/A'
                };

                console.log('Formatted course data:', formattedCourseData);
                setClassDetails(formattedCourseData);

                // Fetch registrations and grades
                console.log('Fetching registrations for class ID:', classId);
                await fetchGrades();

                // Extract students from grades data
                if (grades && grades.length > 0) {
                    const studentsFromGrades = grades.map(item => ({
                        _id: item.student?._id,
                        full_name: item.student?.full_name || 'N/A',
                        mssv: item.student?.mssv || 'N/A',
                        email: item.student?.email || 'N/A',
                        class: item.student?.class || 'N/A'
                    }));

                    console.log('Students extracted from grades:', studentsFromGrades);
                    setStudents(studentsFromGrades);
                } else {
                    console.warn('No students found in grades data');
                    setStudents([]);
                }

                // Log chi tiết cấu trúc dữ liệu grades
                console.log('Grades structure:', {
                    gradesType: typeof grades,
                    gradesIsArray: Array.isArray(grades),
                    gradesLength: grades ? grades.length : 0
                });

                // Log cấu trúc chi tiết của dữ liệu điểm số đầu tiên (nếu có)
                if (gradesData.length > 0) {
                    console.log('Chi tiết dữ liệu điểm số đầu tiên:', JSON.stringify(gradesData[0], null, 2));

                    // Tạo ID duy nhất cho mỗi sinh viên và đăng ký khóa học
                    const enhancedGradesData = gradesData.map((item, index) => {
                        // Tạo ID duy nhất cho sinh viên
                        const studentId = `student_${index}_${Date.now()}`;

                        // Tạo ID duy nhất cho đăng ký khóa học
                        const registrationId = `registration_${index}_${Date.now()}`;

                        // Tạo tên sinh viên từ mã khóa học hoặc index
                        const studentName = item.course_name || `Sinh viên ${index + 1}`;

                        // Tạo mã sinh viên từ mã khóa học hoặc index
                        const studentCode = item.course_code || `SV${index + 1}`;

                        // Thêm các ID vào dữ liệu
                        return {
                            ...item,
                            _id: studentId,
                            student: {
                                _id: studentId,
                                full_name: studentName,
                                mssv: studentCode
                            },
                            student_id: studentId,
                            student_name: studentName,
                            student_code: studentCode,
                            registration: {
                                _id: registrationId,
                                student_id: studentId
                            },
                            registration_id: registrationId,
                            // Chuyển đổi điểm từ cấu trúc API sang cấu trúc mong muốn
                            grades: {
                                midterm: item.midterm || 0,
                                final: item.final || 0,
                                assignments: item.assignments || 0,
                                attendance: item.attendance || 0,
                                total: item.total || 0,
                                letter_grade: item.letter_grade || 'N/A'
                            }
                        };
                    });

                    console.log('Enhanced grades data with IDs:', enhancedGradesData);

                    // Tạo danh sách sinh viên từ dữ liệu điểm số đã được tăng cường
                    const studentsFromGrades = enhancedGradesData.map(item => ({
                        _id: item._id,
                        full_name: item.student_name,
                        mssv: item.student_code,
                        email: 'N/A',
                        class: 'N/A'
                    }));

                    console.log('Students extracted from enhanced grades:', studentsFromGrades);

                    // Cập nhật state
                    setStudents(studentsFromGrades);
                    setGrades(enhancedGradesData);
                } else {
                    console.warn('No grades data found');
                    setGrades([]);
                }

            } catch (err) {
                console.error('Error fetching data:', err);
                setError(err.message || 'Đã xảy ra lỗi khi tải dữ liệu');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [classId]);

    // Loading state
    if (loading) {
        return (
            <div className="container mx-auto p-4 max-w-[1200px]">
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
            <div className="container mx-auto p-4 max-w-[1200px]">
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                    <p className="font-bold">Lỗi!</p>
                    <p>{error}</p>
                    <button
                        onClick={() => window.location.href = '/instructor/dashboard/courses'}
                        className="mt-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                    >
                        Quay lại danh sách lớp
                    </button>
                </div>
            </div>
        );
    }

    // No data state
    if (!classDetails) {
        return (
            <div className="container mx-auto p-4 max-w-[1200px]">
                <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
                    <p className="font-bold">Không có dữ liệu</p>
                    <p>Không thể tải thông tin lớp học.</p>
                    <button
                        onClick={() => window.location.href = '/instructor/dashboard/courses'}
                        className="mt-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                    >
                        Quay lại danh sách lớp
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4 max-w-[1200px]">
            {/* Thông báo */}
            {message.text && (
                <div className={`mb-4 p-3 rounded ${message.type === 'success' ? 'bg-green-100 text-green-700 border border-green-400' : 'bg-red-100 text-red-700 border border-red-400'}`}>
                    <p>{message.text}</p>
                </div>
            )}

            {/* Back button */}
            <button
                onClick={() => window.location.href = '/instructor/dashboard/courses'}
                className="flex items-center text-blue-600 hover:text-blue-800 mb-4"
            >
                <FaArrowLeft className="mr-2" /> Quay lại danh sách lớp
            </button>

            {/* Class header */}
            <div className="bg-white shadow-md rounded-lg p-6 mb-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">{classDetails.course_name || 'Không có tên'}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                        <p className="text-gray-600 font-semibold">Mã lớp:</p>
                        <p>{classDetails.class_code || 'N/A'}</p>
                    </div>
                    <div>
                        <p className="text-gray-600 font-semibold">Mã khóa học:</p>
                        <p>{classDetails.course_code || 'N/A'}</p>
                    </div>
                    <div>
                        <p className="text-gray-600 font-semibold">Học kỳ:</p>
                        <p>{classDetails.semester || 'N/A'}</p>
                    </div>
                    <div>
                        <p className="text-gray-600 font-semibold">Số tín chỉ:</p>
                        <p>{classDetails.credits || 'N/A'}</p>
                    </div>
                    <div>
                        <p className="text-gray-600 font-semibold">Số sinh viên:</p>
                        <p>{classDetails.student_count || 0}</p>
                    </div>
                    <div>
                        <p className="text-gray-600 font-semibold">Trạng thái:</p>
                        <p>{classDetails.status === 'active' ? 'Đang hoạt động' : 'Đã kết thúc'}</p>
                    </div>
                </div>
            </div>

            {/* Students list */}
            <div className="bg-white shadow-md rounded-lg p-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-gray-800">Danh sách sinh viên</h3>
                    <div className="flex gap-2">
                        <a
                            href={`/instructor/dashboard/courses/${classId}/students`}
                            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                        >
                            Quản lý học sinh
                        </a>
                        <a
                            href={`/instructor/dashboard/courses/${classId}/grades`}
                            className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
                        >
                            Quản lý điểm số
                        </a>
                    </div>
                </div>

                {grades.length === 0 ? (
                    <p className="text-gray-500">Không có sinh viên nào trong lớp này.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        MSSV
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Họ tên
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Điểm bài tập
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Điểm giữa kỳ
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Điểm danh
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Điểm cuối kỳ
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Tổng kết
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Thao tác
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {grades.map((grade, index) => {
                                    // Log để kiểm tra cấu trúc dữ liệu
                                    if (index === 0) {
                                        console.log('First grade object structure:', JSON.stringify(grade, null, 2));
                                    }

                                    // Lấy thông tin sinh viên từ cấu trúc dữ liệu mới
                                    const studentId = grade.student?._id;
                                    const studentName = grade.student?.full_name || 'N/A';
                                    const studentMssv = grade.student?.mssv || 'N/A';
                                    const registrationId = grade.registration?._id;

                                    console.log(`Student info for index ${index}:`, {
                                        studentId,
                                        studentName,
                                        studentMssv,
                                        registrationId: registrationId || 'N/A'
                                    });

                                    // Lấy thông tin điểm số từ cấu trúc dữ liệu mới
                                    const gradeValues = {
                                        assignments: grade.grades?.assignments !== null ? grade.grades?.assignments : 'N/A',
                                        midterm: grade.grades?.midterm !== null ? grade.grades?.midterm : 'N/A',
                                        attendance: grade.grades?.attendance !== null ? grade.grades?.attendance : 'N/A',
                                        final: grade.grades?.final !== null ? grade.grades?.final : 'N/A',
                                        total: grade.grades?.total !== null ? grade.grades?.total : 'N/A',
                                        letter_grade: grade.grades?.letter_grade || ''
                                    };

                                    // Kiểm tra xem đang chỉnh sửa điểm của sinh viên này không
                                    const isEditing = editMode && editingGrade &&
                                        (editingGrade.studentId === studentId ||
                                            editingGrade.registrationId === registrationId);

                                    // Log thông tin để debug
                                    if (editMode && editingGrade && (studentId === editingGrade.studentId)) {
                                        console.log(`Student ${studentName} (${studentId}) is being edited:`,
                                            isEditing,
                                            `editingGrade.studentId: ${editingGrade.studentId}`,
                                            `grade.registration._id: ${grade.registration?._id}`);
                                    }

                                    // Log để debug
                                    if (index === 0) {
                                        console.log('First student row:', {
                                            studentId,
                                            studentName,
                                            gradeData: grade,
                                            registration: grade.registration,
                                            student: grade.student,
                                            grades: grade.grades
                                        });
                                    }

                                    if (editMode && studentId === editingGrade?.studentId) {
                                        console.log('Editing row for student:', studentName);
                                        console.log('isEditing value:', isEditing);
                                        console.log('editMode:', editMode);
                                        console.log('editingGrade:', editingGrade);
                                        console.log('studentId match:', editingGrade?.studentId === studentId);
                                        console.log('registrationId match:', editingGrade?.registrationId === grade.registration?._id);
                                    }

                                    return (
                                        <tr key={index}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {studentMssv}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                {studentName}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {isEditing ? (
                                                    <input
                                                        type="text"
                                                        inputMode="decimal"
                                                        min="0"
                                                        max="10"
                                                        step="0.1"
                                                        value={editingGrade?.grades?.assignments ?? ''}
                                                        onChange={(e) => handleGradeChange('assignments', e.target.value)}
                                                        className="w-16 p-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                        autoFocus
                                                        placeholder="0-10"
                                                    />
                                                ) : (
                                                    gradeValues.assignments
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {isEditing ? (
                                                    <input
                                                        type="text"
                                                        inputMode="decimal"
                                                        min="0"
                                                        max="10"
                                                        step="0.1"
                                                        value={editingGrade?.grades?.midterm ?? ''}
                                                        onChange={(e) => handleGradeChange('midterm', e.target.value)}
                                                        className="w-16 p-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                        placeholder="0-10"
                                                    />
                                                ) : (
                                                    gradeValues.midterm
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {isEditing ? (
                                                    <input
                                                        type="text"
                                                        inputMode="decimal"
                                                        min="0"
                                                        max="10"
                                                        step="0.1"
                                                        value={editingGrade?.grades?.attendance ?? ''}
                                                        onChange={(e) => handleGradeChange('attendance', e.target.value)}
                                                        className="w-16 p-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                        placeholder="0-10"
                                                    />
                                                ) : (
                                                    gradeValues.attendance
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {isEditing ? (
                                                    <input
                                                        type="text"
                                                        inputMode="decimal"
                                                        min="0"
                                                        max="10"
                                                        step="0.1"
                                                        value={editingGrade?.grades?.final ?? ''}
                                                        onChange={(e) => handleGradeChange('final', e.target.value)}
                                                        className="w-16 p-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                        placeholder="0-10"
                                                    />
                                                ) : (
                                                    gradeValues.final
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-semibold">
                                                {gradeValues.total}
                                                {gradeValues.letter_grade ? ` (${gradeValues.letter_grade})` : ''}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {isEditing ? (
                                                    <div className="flex space-x-2">
                                                        <button
                                                            onClick={handleSaveGrades}
                                                            className="text-green-600 hover:text-green-900"
                                                            title="Lưu"
                                                        >
                                                            <FaSave />
                                                        </button>
                                                        <button
                                                            onClick={handleCancelEdit}
                                                            className="text-red-600 hover:text-red-900"
                                                            title="Hủy"
                                                        >
                                                            <FaTimes />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => {
                                                            console.log('Edit button clicked for student:', studentName, 'with ID:', studentId);

                                                            // Truyền trực tiếp dữ liệu grade
                                                            handleStartEdit(grade);
                                                        }}
                                                        className="text-blue-600 hover:text-blue-900"
                                                        title="Chỉnh sửa"
                                                    >
                                                        <FaEdit />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

export default ClassDetailSimple;