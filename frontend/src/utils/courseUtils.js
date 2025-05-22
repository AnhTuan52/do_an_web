/**
 * Chuẩn hóa dữ liệu khóa học
 * @param {Object} courseData - Dữ liệu khóa học từ MongoDB
 * @returns {Object} - Dữ liệu khóa học đã chuẩn hóa
 */
export const normalizeCourseData = (courseData) => {
    if (!courseData) return null;

    // Xử lý trường hợp MongoDB ObjectId
    const getId = (id) => {
        if (id && typeof id === 'object' && id.$oid) {
            return id.$oid;
        }
        return id || '';
    };

    // Xử lý trường hợp MongoDB Date
    const getDate = (date) => {
        if (date && typeof date === 'object' && date.$date) {
            if (date.$date.$numberLong) {
                return new Date(parseInt(date.$date.$numberLong)).toISOString();
            }
            return date.$date;
        }
        return date || '';
    };

    // Xử lý trường hợp MongoDB Number
    const getNumber = (num) => {
        if (num && typeof num === 'object') {
            if (num.$numberInt) return parseInt(num.$numberInt);
            if (num.$numberDouble) return parseFloat(num.$numberDouble);
        }
        return num || 0;
    };

    return {
        id: getId(courseData._id),
        courseId: getId(courseData.course_id),
        instructorId: getId(courseData.instructor_id),
        courseName: courseData.course_name || 'Chưa có tên',
        courseCode: courseData.course_code || 'N/A',
        classCode: courseData.class_code || 'N/A',
        credits: getNumber(courseData.credits),
        semester: courseData.semester || 'N/A',
        academicYear: courseData.academic_year || 'N/A',
        schedule: courseData.schedule || [],
        location: courseData.location || 'N/A',
        maxEnrollment: getNumber(courseData.max_enrollment),
        status: courseData.status || 'active',
        students: (courseData.students || []).map(student => ({
            ...student,
            student_id: getId(student.student_id),
            grades: student.grades || {
                midterm: 0,
                final: 0,
                total: 0,
                assignments: 0,
                attendance: 0
            }
        })),
        gradingSchema: {
            midterm_weight: getNumber(courseData.grading_schema?.midterm_weight),
            final_weight: getNumber(courseData.grading_schema?.final_weight),
            assignments_weight: getNumber(courseData.grading_schema?.assignments_weight),
            attendance_weight: getNumber(courseData.grading_schema?.attendance_weight),
            grading_scale: courseData.grading_schema?.grading_scale || []
        },
        createdAt: getDate(courseData.created_at),
        updatedAt: getDate(courseData.updated_at)
    };
};

/**
 * Định dạng lịch học
 * @param {Array} schedule - Mảng lịch học từ MongoDB
 * @returns {String} - Chuỗi lịch học đã định dạng
 */
export const formatSchedule = (schedule) => {
    if (!schedule || !Array.isArray(schedule) || schedule.length === 0) {
        return 'Chưa có lịch';
    }

    return schedule.map(item => {
        // Hỗ trợ cả hai cấu trúc: day_of_week và day
        const day = item.day || item.day_of_week || '';
        // Hỗ trợ cả hai cấu trúc: time_slot và start_time/end_time
        const time = item.time_slot ||
            (item.start_time && item.end_time ?
                `${item.start_time} - ${item.end_time}` : '');

        return `${day} ${time}`;
    }).join(', ');
};

/**
 * Định dạng số tín chỉ
 * @param {Number} credits - Số tín chỉ
 * @returns {String} - Chuỗi số tín chỉ đã định dạng
 */
export const formatCredits = (credits) => {
    if (credits === undefined || credits === null) {
        return 'N/A';
    }
    return `${credits} tín chỉ`;
};

/**
 * Định dạng trạng thái khóa học
 * @param {String} status - Trạng thái khóa học
 * @returns {Object} - Đối tượng chứa văn bản và màu sắc
 */
export const formatStatus = (status) => {
    // Chuẩn hóa status thành lowercase nếu là string
    const normalizedStatus = typeof status === 'string' ? status.toLowerCase() : '';

    // Kiểm tra các trạng thái
    if (normalizedStatus === 'active' || normalizedStatus === 'đang mở') {
        return { text: 'Đang diễn ra', color: 'text-green-600' };
    } else if (normalizedStatus === 'upcoming' || normalizedStatus === 'sắp mở') {
        return { text: 'Sắp diễn ra', color: 'text-blue-600' };
    } else if (normalizedStatus === 'completed' || normalizedStatus === 'đã kết thúc') {
        return { text: 'Đã kết thúc', color: 'text-gray-600' };
    } else if (normalizedStatus === 'cancelled' || normalizedStatus === 'đã hủy') {
        return { text: 'Đã hủy', color: 'text-red-600' };
    } else {
        return { text: status || 'Không xác định', color: 'text-gray-500' };
    }
};

/**
 * Tính toán điểm tổng kết dựa trên điểm thành phần và trọng số
 * @param {Number} midterm - Điểm giữa kỳ
 * @param {Number} final - Điểm cuối kỳ
 * @param {Number} assignments - Điểm bài tập
 * @param {Number} attendance - Điểm chuyên cần
 * @param {Object} weights - Trọng số điểm
 * @returns {Number} - Điểm tổng kết
 */
export const calculateTotalGrade = (midterm, final, assignments, attendance, weights) => {
    // Kiểm tra nếu không có điểm giữa kỳ hoặc cuối kỳ thì không tính
    if (midterm === '' || midterm === null || final === '' || final === null) {
        return '';
    }

    // Lấy trọng số từ tham số weights
    const midtermWeight = weights?.midterm_weight || 0.3;
    const finalWeight = weights?.final_weight || 0.5;
    const assignmentsWeight = weights?.assignments_weight || 0.15;
    const attendanceWeight = weights?.attendance_weight || 0.05;

    // Chuyển đổi điểm thành số
    const midtermScore = parseFloat(midterm) || 0;
    const finalScore = parseFloat(final) || 0;
    const assignmentsScore = (assignments !== '' && assignments !== null) ? parseFloat(assignments) || 0 : 0;
    const attendanceScore = (attendance !== '' && attendance !== null) ? parseFloat(attendance) || 0 : 0;

    // Tính điểm tổng
    let total = 0;
    let weightSum = 0;

    // Cộng điểm giữa kỳ
    total += midtermScore * midtermWeight;
    weightSum += midtermWeight;

    // Cộng điểm cuối kỳ
    total += finalScore * finalWeight;
    weightSum += finalWeight;

    // Cộng điểm bài tập nếu có
    if (assignments !== '' && assignments !== null) {
        total += assignmentsScore * assignmentsWeight;
        weightSum += assignmentsWeight;
    }

    // Cộng điểm chuyên cần nếu có
    if (attendance !== '' && attendance !== null) {
        total += attendanceScore * attendanceWeight;
        weightSum += attendanceWeight;
    }

    // Tính điểm trung bình
    if (weightSum > 0) {
        return parseFloat((total / weightSum).toFixed(2));
    }

    return '';
};