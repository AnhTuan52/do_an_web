import api from './api';

// Hàm test API để kiểm tra endpoint courses
export const testCourseAPI = async (classId) => {
    try {
        console.log('Bắt đầu test API với classId:', classId);

        // Gọi API
        const response = await api.get(`/api/instructor/courses/${classId}`);

        // Log kết quả
        console.log('API Test - Status Code:', response.status);
        console.log('API Test - Headers:', response.headers);
        console.log('API Test - Data:', response.data);

        // Kiểm tra cấu trúc dữ liệu
        console.log('API Test - Cấu trúc dữ liệu:', {
            hasData: !!response.data,
            topLevelKeys: Object.keys(response.data || {}),
            hasStudents: response.data && response.data.students ? true : false,
            studentCount: response.data && response.data.students ? response.data.students.length : 0,
            studentFields: response.data && response.data.students && response.data.students.length > 0
                ? Object.keys(response.data.students[0])
                : []
        });

        return {
            success: true,
            data: response.data
        };
    } catch (error) {
        console.error('API Test - Lỗi:', error);
        return {
            success: false,
            error: error.message,
            response: error.response?.data
        };
    }
};

// Hàm để kiểm tra tất cả các trường có thể chứa sinh viên
export const findStudentsInResponse = (data) => {
    if (!data) return { found: false };

    const possibleFields = ['students', 'enrollments', 'registrations', 'enrolled_students', 'student_list', 'data'];
    const result = {
        found: false,
        location: null,
        count: 0,
        sample: null
    };

    // Kiểm tra các trường cấp 1
    for (const field of possibleFields) {
        if (data[field] && Array.isArray(data[field])) {
            result.found = true;
            result.location = field;
            result.count = data[field].length;
            result.sample = data[field].length > 0 ? data[field][0] : null;
            break;
        }
    }

    // Nếu không tìm thấy ở cấp 1, kiểm tra trong data hoặc course
    if (!result.found) {
        const nestedObjects = ['data', 'course', 'class', 'result'];
        for (const obj of nestedObjects) {
            if (data[obj] && typeof data[obj] === 'object') {
                for (const field of possibleFields) {
                    if (data[obj][field] && Array.isArray(data[obj][field])) {
                        result.found = true;
                        result.location = `${obj}.${field}`;
                        result.count = data[obj][field].length;
                        result.sample = data[obj][field].length > 0 ? data[obj][field][0] : null;
                        break;
                    }
                }
            }
            if (result.found) break;
        }
    }

    return result;
};