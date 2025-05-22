from flask import Blueprint, request, jsonify, session
from bson.objectid import ObjectId
from datetime import datetime
import logging
from .student_schema import DEFAULT_GRADES_SCHEMA

# Lấy logger
logger = logging.getLogger(__name__)

# Blueprint sẽ được đăng ký trong init_app
instructor_bp = Blueprint('instructor', __name__)

# Các biến toàn cục sẽ được gán giá trị khi đăng ký blueprint
mongo = None
instructors_collection = None
offered_courses_collection = None
courses_collection = None
registered_courses_collection = None
students_collection = None
curriculum_collection = None

# Hàm kiểm tra quyền giáo viên
def instructor_required(f):
    def decorated_function(*args, **kwargs):
        # Kiểm tra quyền giáo viên
        if 'role' not in session or session['role'] != 'instructor':
            logger.warning(f"Không có quyền giáo viên: {dict(session)}")
            return jsonify({"status": "error", "message": "Bạn không có quyền truy cập trang này"}), 403
            
        if 'instructor_id' not in session:
            logger.warning(f"Không tìm thấy instructor_id trong session: {dict(session)}")
            return jsonify({"status": "error", "message": "Vui lòng đăng nhập lại"}), 401
            
        return f(*args, **kwargs)
    decorated_function.__name__ = f.__name__
    return decorated_function

# Lấy thông tin giáo viên
@instructor_bp.route('/profile', methods=['GET'])
@instructor_required
def get_instructor_profile():
    instructor_id = session.get('instructor_id')
    if not instructor_id:
        return jsonify({"status": "error", "message": "Không tìm thấy thông tin giáo viên"}), 404
    
    try:
        # Chuyển đổi instructor_id thành ObjectId
        instructor_id_obj = ObjectId(instructor_id)
        instructor = instructors_collection.find_one({"_id": instructor_id_obj})
            
        if not instructor:
            logger.error(f"Không tìm thấy giảng viên với ID: {instructor_id}")
            return jsonify({"status": "error", "message": "Không tìm thấy thông tin giáo viên"}), 404
        
        # Chuyển đổi ObjectId thành string
        instructor_data = {}
        for key, value in instructor.items():
            if key == '_id':
                instructor_data[key] = str(value)
            elif isinstance(value, datetime):
                instructor_data[key] = value.strftime("%Y-%m-%d %H:%M:%S")
            elif isinstance(value, ObjectId):
                instructor_data[key] = str(value)
            else:
                instructor_data[key] = value
        
        return jsonify({"status": "success", "data": instructor_data})
    except Exception as e:
        logger.error(f"Lỗi khi lấy thông tin giảng viên: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500

# Lấy danh sách các khóa học đã mở của giáo viên
@instructor_bp.route('/courses', methods=['GET'])
@instructor_required
def get_instructor_courses():
    logger.info("=== TRUY VẤN DANH SÁCH MÔN HỌC GIẢNG VIÊN ===")
    
    # Lấy instructor_id từ session
    instructor_id = session.get('instructor_id')
    if not instructor_id:
        return jsonify({"status": "error", "message": "Không tìm thấy thông tin giảng viên"}), 401
    
    try:
        # Chuyển đổi instructor_id thành ObjectId
        instructor_obj_id = ObjectId(instructor_id)
        
        # Lấy thông tin giảng viên
        instructor = instructors_collection.find_one({'_id': instructor_obj_id})
        if not instructor:
            return jsonify({"status": "error", "message": "Không tìm thấy thông tin giảng viên"}), 404
        
        # Lấy thông tin academic_info
        academic_info = instructor.get('academic_info', {})
        
        instructor_info = {
            "_id": str(instructor['_id']),
            "full_name": instructor.get('personal_info', {}).get('full_name', 'N/A'),
            "instructor_id": instructor.get('instructor_id', 'N/A'),
            "email": instructor.get('contact', {}).get('email', 'N/A'),
            "degree": academic_info.get('degree', 'N/A'),
            "specialization": academic_info.get('specialization', 'N/A'),
            "university": academic_info.get('university', 'N/A')
        }
        
        # Lấy danh sách khóa học đang dạy
        offered_courses = offered_courses_collection.find({
            'instructor_id': instructor_obj_id
        })
        
        courses_data = []
        for offered_course in offered_courses:
            # Lấy thông tin chi tiết khóa học
            course_info = None
            if 'course_id' in offered_course:
                course_id = offered_course['course_id']
                if isinstance(course_id, str):
                    course_id = ObjectId(course_id)
                course_info = courses_collection.find_one({'_id': course_id})
            
            # Tạo dữ liệu khóa học
            course_data = {
                "_id": str(offered_course['_id']),
                "course_id": str(offered_course.get('course_id')) if offered_course.get('course_id') else None,
                "course_name": offered_course.get('course_name') or (course_info.get('title') if course_info else 'N/A'),
                "course_code": offered_course.get('course_code') or (course_info.get('code') if course_info else 'N/A'),
                "class_code": offered_course.get('class_code', 'N/A'),
                "semester": offered_course.get('semester', 'N/A'),
                "academic_year": offered_course.get('academic_year', 'N/A'),
                "schedule": offered_course.get('schedule', []),
                "location": offered_course.get('location', 'N/A'),
                "status": offered_course.get('status', 'active'),
                "students_count": len(offered_course.get('students', [])),
                "max_enrollment": offered_course.get('max_enrollment', 0)
            }
            
            courses_data.append(course_data)
        
        # Chuyển đổi các đối tượng datetime trong courses_data
        for course in courses_data:
            if 'schedule' in course and isinstance(course['schedule'], list):
                for schedule_item in course['schedule']:
                    if isinstance(schedule_item, dict):
                        for key, value in schedule_item.items():
                            if isinstance(value, datetime):
                                schedule_item[key] = value.strftime("%H:%M:%S")
        
        return jsonify({
            "status": "success", 
            "instructor": instructor_info,
            "courses": courses_data
        })
    except Exception as e:
        logger.error(f"Lỗi khi lấy danh sách khóa học của giảng viên: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500

# API lấy chi tiết khóa học theo ID
@instructor_bp.route('/courses/<course_id>', methods=['GET'])
@instructor_bp.route('/classes/<course_id>', methods=['GET'])  # Hỗ trợ cả hai loại URL
@instructor_required
def get_course_by_id(course_id):
    logger.info(f"=== LẤY CHI TIẾT KHÓA HỌC: {course_id} ===")
    
    try:
        # Chuyển đổi ID thành ObjectId
        course_obj_id = ObjectId(course_id)
        
        # Lấy thông tin khóa học từ offered_courses
        offered_course = offered_courses_collection.find_one({'_id': course_obj_id})
        
        if not offered_course:
            return jsonify({
                "status": "error", 
                "message": "Không tìm thấy khóa học"
            }), 404
        
        # Lấy thông tin giảng viên
        instructor = None
        if 'instructor_id' in offered_course:
            instructor_id = offered_course['instructor_id']
            if isinstance(instructor_id, str):
                instructor_id = ObjectId(instructor_id)
            instructor = instructors_collection.find_one({'_id': instructor_id})
        
        # Xử lý dữ liệu sinh viên
        students_data = []
        if 'students' in offered_course and isinstance(offered_course['students'], list):
            for student_info in offered_course['students']:
                try:
                    student_id = student_info.get('student_id')
                    if isinstance(student_id, str):
                        student_id = ObjectId(student_id)
                    
                    # Lấy thêm thông tin từ collection students
                    student = students_collection.find_one({'_id': student_id})
                    
                    # Kết hợp thông tin từ cả hai nguồn
                    student_data = {
                        "student_id": str(student_id),
                        "mssv": student_info.get('mssv') or (student.get('mssv', 'N/A') if student else 'N/A'),
                        "full_name": student_info.get('full_name') or (student.get('personal_info', {}).get('full_name', 'N/A') if student else student_info.get('mssv', 'N/A')),
                        "email": student_info.get('email') or (student.get('personal_info', {}).get('email', {}).get('school', 'N/A') if student else 'N/A'),
                        "class": (student.get('personal_info', {}).get('class', 'N/A') if student else 'N/A'),
                        "grades": student_info.get('grades', DEFAULT_GRADES_SCHEMA.copy())
                    }
                    students_data.append(student_data)
                except Exception as e:
                    logger.error(f"Lỗi khi xử lý thông tin sinh viên: {str(e)}")
        
        # Tạo dữ liệu trả về
        course_data = {
            "_id": str(offered_course['_id']),
            "instructor_id": str(offered_course.get('instructor_id')) if offered_course.get('instructor_id') else None,
            "course_name": offered_course.get('course_name', 'N/A'),
            "course_code": offered_course.get('course_code', 'N/A'),
            "class_code": offered_course.get('class_code', 'N/A'),
            "semester": offered_course.get('semester', 'N/A'),
            "academic_year": offered_course.get('academic_year', 'N/A'),
            "schedule": offered_course.get('schedule', []),
            "location": offered_course.get('location', 'N/A'),
            "max_enrollment": offered_course.get('max_enrollment', 0),
            "status": offered_course.get('status', 'active'),
            "students": students_data,
            "instructor": {
                "_id": str(instructor['_id']) if instructor else None,
                "full_name": instructor.get('personal_info', {}).get('full_name', 'N/A') if instructor else 'N/A',
                "email": instructor.get('contact', {}).get('email', 'N/A') if instructor else 'N/A'
            },
            "grading_schema": offered_course.get('grading_schema', {}),
            "created_at": offered_course.get('created_at', datetime.now()).isoformat() if hasattr(offered_course.get('created_at', None), 'isoformat') else str(offered_course.get('created_at', '')),
            "updated_at": offered_course.get('updated_at', datetime.now()).isoformat() if hasattr(offered_course.get('updated_at', None), 'isoformat') else str(offered_course.get('updated_at', ''))
        }
        
        return jsonify({
            "status": "success",
            "course": course_data
        })
    except Exception as e:
        logger.error(f"Lỗi khi lấy chi tiết khóa học: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500

# API cập nhật điểm số của sinh viên
@instructor_bp.route('/courses/<course_id>/students/<student_id>/grades', methods=['PUT', 'OPTIONS'])
@instructor_required
def update_student_grades(course_id, student_id):
    # Xử lý yêu cầu OPTIONS (CORS preflight)
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        origin = request.headers.get('Origin', 'http://localhost:5173')
        response.headers['Access-Control-Allow-Origin'] = origin
        response.headers['Access-Control-Allow-Methods'] = 'PUT, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With, Access-Control-Allow-Origin, Access-Control-Allow-Methods, Access-Control-Allow-Headers'
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        return response
        
    logger.info(f"=== CẬP NHẬT ĐIỂM SỐ SINH VIÊN: Khóa học {course_id}, Sinh viên {student_id} ===")
    
    try:
        # Lấy dữ liệu từ request
        data = request.get_json()
        if not data:
            return jsonify({"status": "error", "message": "Dữ liệu không hợp lệ"}), 400
        
        grades = data.get('grades')
        if not grades:
            return jsonify({"status": "error", "message": "Thiếu thông tin điểm số"}), 400
            
        # Đảm bảo grades có đầy đủ các trường cần thiết
        for field, default_value in DEFAULT_GRADES_SCHEMA.items():
            if field not in grades:
                grades[field] = default_value
        
        # Chuyển đổi ID thành ObjectId
        try:
            course_obj_id = ObjectId(course_id)
            student_obj_id = ObjectId(student_id)
        except Exception as e:
            logger.warning(f"ID không hợp lệ: {e}")
            return jsonify({"status": "error", "message": "ID không hợp lệ"}), 400
        
        # Lấy thông tin khóa học
        offered_course = offered_courses_collection.find_one({'_id': course_obj_id})
        if not offered_course:
            logger.warning(f"Không tìm thấy khóa học với ID: {course_id}")
            return jsonify({"status": "error", "message": "Không tìm thấy khóa học"}), 404
        
        # Kiểm tra xem sinh viên có trong danh sách không
        student_found = False
        students = offered_course.get('students', [])
        
        for i, student in enumerate(students):
            if isinstance(student.get('student_id'), ObjectId) and student.get('student_id') == student_obj_id:
                student_found = True
                # Cập nhật điểm số
                students[i]['grades'] = grades
                break
            elif isinstance(student.get('student_id'), str) and student.get('student_id') == student_id:
                student_found = True
                # Cập nhật điểm số
                students[i]['grades'] = grades
                break
        
        if not student_found:
            logger.warning(f"Không tìm thấy sinh viên {student_id} trong khóa học {course_id}")
            return jsonify({"status": "error", "message": "Không tìm thấy sinh viên trong khóa học"}), 404
        
        # Cập nhật vào cơ sở dữ liệu
        result = offered_courses_collection.update_one(
            {'_id': course_obj_id},
            {'$set': {'students': students, 'updated_at': datetime.now()}}
        )
        
        if result.modified_count == 0:
            logger.warning("Không có thay đổi nào được cập nhật")
            return jsonify({
                "status": "warning", 
                "message": "Không có thay đổi nào được cập nhật"
            }), 200
        
        logger.info(f"Đã cập nhật điểm thành công cho sinh viên {student_id}")
        
        return jsonify({
            "status": "success", 
            "message": "Cập nhật điểm số thành công"
        })
    except Exception as e:
        logger.error(f"Lỗi khi cập nhật điểm: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500

# Hàm khởi tạo blueprint
def init_app(app, mongo_client):
    global mongo, instructors_collection, offered_courses_collection, courses_collection, registered_courses_collection, students_collection, curriculum_collection
    
    logger.info("Bắt đầu khởi tạo blueprint instructor_routes...")
    
    try:
        mongo = mongo_client
        instructors_collection = mongo.db.instructors
        offered_courses_collection = mongo.db.offered_courses
        courses_collection = mongo.db.courses
        registered_courses_collection = mongo.db.registered_courses
        students_collection = mongo.db.students
        curriculum_collection = mongo.db.curriculum
        
        logger.info("Đã khởi tạo các collection thành công")
        
        # Đăng ký blueprint với tiền tố '/api/instructor'
        app.register_blueprint(instructor_bp, url_prefix='/api/instructor')
        
        logger.info(f"Đã đăng ký blueprint instructor_bp với tiền tố '/api/instructor'")
        
        return True
    except Exception as e:
        logger.error(f"Lỗi khi khởi tạo blueprint instructor_routes: {e}")
        raise