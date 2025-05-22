from flask import Blueprint, request, jsonify, session
from bson import ObjectId
import datetime

# Tạo Blueprint cho admin
admin_bp = Blueprint('admin', __name__, url_prefix='/admin')

# Route đăng nhập admin
@admin_bp.route('/login', methods=['POST', 'OPTIONS'])
def admin_login():
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'success'})
        response.headers.add('Access-Control-Allow-Origin', 'http://localhost:5173')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With')
        response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response
        
    data = request.get_json()
    print(f"Received admin login data: {data}")
    username = data.get('username') or data.get('email')  # Hỗ trợ cả username và email
    password = data.get('password')
    
    print(f"Admin login attempt - Username/Email: {username}, Password: {password}")
    
    # Kiểm tra thông tin đăng nhập admin
    # Ở đây bạn có thể thay đổi thông tin đăng nhập admin theo ý muốn
    if (username == 'admin' or username == 'admin@uit.edu.vn') and password == 'admin':
        session['admin_id'] = 'admin'
        session['role'] = 'admin'
        response = jsonify({
            "status": "success", 
            "message": "Đăng nhập thành công",
            "admin": {
                "username": "admin",
                "role": "admin"
            }
        })
        response.headers.add('Access-Control-Allow-Origin', 'http://localhost:5173')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response
    else:
        response = jsonify({
            "status": "error", 
            "message": "Thông tin đăng nhập không chính xác"
        }), 401
        response[0].headers.add('Access-Control-Allow-Origin', 'http://localhost:5173')
        response[0].headers.add('Access-Control-Allow-Credentials', 'true')
        return response

# Route đăng xuất admin
@admin_bp.route('/logout', methods=['POST', 'OPTIONS'])
def admin_logout():
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'success'})
        response.headers.add('Access-Control-Allow-Origin', 'http://localhost:5173')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With')
        response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response
        
    # Xóa session
    session.pop('admin_id', None)
    session.pop('role', None)
    
    response = jsonify({
        "status": "success", 
        "message": "Đăng xuất thành công"
    })
    response.headers.add('Access-Control-Allow-Origin', 'http://localhost:5173')
    response.headers.add('Access-Control-Allow-Credentials', 'true')
    return response

# Route kiểm tra phiên đăng nhập admin
@admin_bp.route('/check-session', methods=['GET', 'OPTIONS'])
def admin_check_session():
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'success'})
        response.headers.add('Access-Control-Allow-Origin', 'http://localhost:5173')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With')
        response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response
        
    print(f"Admin check session: {dict(session)}")
    
    if 'admin_id' in session and session.get('role') == 'admin':
        response = jsonify({
            "status": "success",
            "admin": {
                "username": session["admin_id"],
                "role": "admin"
            }
        })
        response.headers.add('Access-Control-Allow-Origin', 'http://localhost:5173')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response
    else:
        response = jsonify({
            "status": "error",
            "message": "Không có phiên đăng nhập admin hợp lệ"
        }), 401
        response[0].headers.add('Access-Control-Allow-Origin', 'http://localhost:5173')
        response[0].headers.add('Access-Control-Allow-Credentials', 'true')
        return response

# Route lấy danh sách sinh viên
@admin_bp.route('/students', methods=['GET', 'OPTIONS'])
def admin_get_students():
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'success'})
        response.headers.add('Access-Control-Allow-Origin', 'http://localhost:5173')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With')
        response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response
    
    # Kiểm tra quyền admin
    if 'admin_id' not in session or session.get('role') != 'admin':
        response = jsonify({
            "status": "error",
            "message": "Không có quyền truy cập"
        }), 403
        response[0].headers.add('Access-Control-Allow-Origin', 'http://localhost:5173')
        response[0].headers.add('Access-Control-Allow-Credentials', 'true')
        return response
    
    try:
        from main import mongo, student_collection
        
        # Lấy danh sách sinh viên từ collection với tất cả thông tin
        students = list(student_collection.find({}))
        
        # Chuyển đổi ObjectId thành string và tổ chức lại dữ liệu
        for student in students:
            if '_id' in student and isinstance(student['_id'], ObjectId):
                student['_id'] = str(student['_id'])
            
            # Thêm trường email, faculty và full_name ở cấp cao nhất để dễ truy cập
            if 'personal_info' in student:
                # Xử lý họ tên
                student['full_name'] = student['personal_info'].get('full_name', '')
                
                # Xử lý email
                if 'email' in student['personal_info']:
                    student['email'] = student['personal_info']['email'].get('school', '')
                
                # Xử lý khoa và ngành
                student['faculty'] = student['personal_info'].get('faculty', '')
                student['major'] = student['personal_info'].get('major', '')
        
        # Tạo danh sách sinh viên với thông tin đã được xử lý
        processed_students = []
        for student in students:
            student_data = {
                "id": student['_id'],
                "mssv": student.get('mssv', ''),
                "name": student.get('full_name', ''),  # Sử dụng full_name đã được xử lý ở trên
                "gender": student.get('personal_info', {}).get('gender', ''),
                "birth_date": student.get('personal_info', {}).get('birth_date', ''),
                "class": student.get('personal_info', {}).get('class', ''),
                "email": student.get('email', ''),  # Email đã được xử lý ở trên
                "faculty": student.get('faculty', ''),  # Khoa đã được xử lý ở trên
                "major": student.get('major', '')  # Ngành đã được xử lý ở trên
            }
            processed_students.append(student_data)
        
        response = jsonify({
            "status": "success",
            "data": processed_students,
            "students": processed_students,  # Thêm trường này để tương thích với frontend
            "count": len(processed_students)
        })
        response.headers.add('Access-Control-Allow-Origin', 'http://localhost:5173')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response
    
    except Exception as e:
        print(f"Lỗi khi lấy danh sách sinh viên: {e}")
        response = jsonify({
            "status": "error",
            "message": f"Lỗi khi lấy danh sách sinh viên: {str(e)}"
        }), 500
        response[0].headers.add('Access-Control-Allow-Origin', 'http://localhost:5173')
        response[0].headers.add('Access-Control-Allow-Credentials', 'true')
        return response

# Route lấy thông tin học tập của sinh viên theo ID
@admin_bp.route('/students/<student_id>/academic_records', methods=['GET', 'OPTIONS'])
def admin_get_student_academic_records(student_id):
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'success'})
        response.headers.add('Access-Control-Allow-Origin', 'http://localhost:5173')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With')
        response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response
    
    # Kiểm tra quyền admin
    if 'admin_id' not in session or session.get('role') != 'admin':
        response = jsonify({
            "status": "error",
            "message": "Không có quyền truy cập"
        }), 403
        response[0].headers.add('Access-Control-Allow-Origin', 'http://localhost:5173')
        response[0].headers.add('Access-Control-Allow-Credentials', 'true')
        return response
    
    try:
        from main import mongo
        
        # Tìm sinh viên theo ID
        student_collection = mongo.db.student
        student = student_collection.find_one({"_id": ObjectId(student_id)})
        
        if not student:
            response = jsonify({
                "status": "error",
                "message": "Không tìm thấy sinh viên"
            }), 404
            response[0].headers.add('Access-Control-Allow-Origin', 'http://localhost:5173')
            response[0].headers.add('Access-Control-Allow-Credentials', 'true')
            return response
        
        # Lấy MSSV của sinh viên
        mssv = student.get('mssv')
        
        if not mssv:
            response = jsonify({
                "status": "error",
                "message": "Sinh viên không có MSSV"
            }), 404
            response[0].headers.add('Access-Control-Allow-Origin', 'http://localhost:5173')
            response[0].headers.add('Access-Control-Allow-Credentials', 'true')
            return response
        
        # Tìm bản ghi học tập của sinh viên theo MSSV
        academic_records_collection = mongo.db.academic_records
        academic_record = academic_records_collection.find_one({"mssv": mssv})
        
        if academic_record:
            # Chuyển đổi ObjectId thành string
            if '_id' in academic_record and isinstance(academic_record['_id'], ObjectId):
                academic_record['_id'] = str(academic_record['_id'])
            
            # Sắp xếp semester_averages theo thứ tự thời gian
            if 'summary' in academic_record and 'semester_averages' in academic_record['summary']:
                # In ra các giá trị để debug
                print("Semester averages before sorting:", [item['semester'] for item in academic_record['summary']['semester_averages']])
                
                def semester_sort_key(item):
                    semester = item['semester']
                    # Trích xuất năm học và học kỳ
                    import re
                    match = re.search(r"Học kỳ (\d+) \((\d{4})-(\d{4})\)", semester)
                    if match:
                        semester_num = int(match.group(1))
                        year_start = int(match.group(2))
                        year_end = int(match.group(3))
                        # Tạo một giá trị số để sắp xếp: năm_bắt_đầu * 10 + học_kỳ
                        # Điều này đảm bảo năm học được ưu tiên trước, sau đó đến học kỳ
                        return year_start * 10 + semester_num
                    return 0  # Mặc định nếu không khớp mẫu
                
                # Sắp xếp tăng dần theo thời gian
                academic_record['summary']['semester_averages'].sort(key=semester_sort_key)
                
                # In ra các giá trị sau khi sắp xếp để debug
                print("Semester averages after sorting:", [item['semester'] for item in academic_record['summary']['semester_averages']])
            
            response = jsonify({
                "status": "success",
                "data": academic_record
            })
        
        if isinstance(response, tuple):
            response[0].headers.add('Access-Control-Allow-Origin', 'http://localhost:5173')
            response[0].headers.add('Access-Control-Allow-Credentials', 'true')
        else:
            response.headers.add('Access-Control-Allow-Origin', 'http://localhost:5173')
            response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response
    
    except Exception as e:
        print(f"Lỗi khi lấy thông tin học tập của sinh viên: {e}")
        response = jsonify({
            "status": "error",
            "message": f"Lỗi khi lấy thông tin học tập của sinh viên: {str(e)}"
        }), 500
        response[0].headers.add('Access-Control-Allow-Origin', 'http://localhost:5173')
        response[0].headers.add('Access-Control-Allow-Credentials', 'true')
        return response

# Route lấy danh sách giảng viên
@admin_bp.route('/instructors', methods=['GET', 'OPTIONS'])
def admin_get_instructors():
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'success'})
        response.headers.add('Access-Control-Allow-Origin', 'http://localhost:5173')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With')
        response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response
    
    # Kiểm tra quyền admin
    if 'admin_id' not in session or session.get('role') != 'admin':
        response = jsonify({
            "status": "error",
            "message": "Không có quyền truy cập"
        }), 403
        response[0].headers.add('Access-Control-Allow-Origin', 'http://localhost:5173')
        response[0].headers.add('Access-Control-Allow-Credentials', 'true')
        return response
    
    try:
        from main import mongo
        
        # Lấy danh sách giảng viên từ collection
        instructor_collection = mongo.db.instructors
        instructors = list(instructor_collection.find({}))
        
        # Lấy thông tin khoa từ collection
        faculty_collection = mongo.db.faculties
        faculties = {str(faculty['_id']): faculty['name'] for faculty in faculty_collection.find({})}
        
        # Xử lý và định dạng dữ liệu giảng viên
        processed_instructors = []
        for instructor in instructors:
            # Chuyển đổi ObjectId thành string
            if '_id' in instructor and isinstance(instructor['_id'], ObjectId):
                instructor['_id'] = str(instructor['_id'])
            if 'user_id' in instructor and isinstance(instructor['user_id'], ObjectId):
                instructor['user_id'] = str(instructor['user_id'])
            if 'faculty_id' in instructor and isinstance(instructor['faculty_id'], ObjectId):
                instructor['faculty_id'] = str(instructor['faculty_id'])
            
            # Lấy thông tin cá nhân
            full_name = instructor.get('personal_info', {}).get('full_name', 'Chưa cập nhật')
            
            # Lấy thông tin liên hệ
            email = instructor.get('contact', {}).get('email', 'Chưa cập nhật')
            phone = instructor.get('contact', {}).get('phone', 'Chưa cập nhật')
            
            # Lấy thông tin học thuật
            degree = instructor.get('academic_info', {}).get('degree', '')
            specialization = instructor.get('academic_info', {}).get('specialization', '')
            
            # Xác định chức vụ dựa trên học vị
            position = 'Giảng viên'
            if degree:
                if 'giáo sư' in degree.lower():
                    position = degree  # Giữ nguyên nếu là Giáo sư hoặc Phó giáo sư
                elif 'tiến sĩ' in degree.lower():
                    position = 'Giảng viên chính'
            
            # Lấy tên khoa từ faculty_id
            faculty_name = faculties.get(instructor.get('faculty_id', ''), 'Chưa xác định')
            
            # Tạo đối tượng giảng viên đã xử lý
            processed_instructor = {
                "_id": instructor['_id'],
                "instructor_id": instructor.get('instructor_id', 'N/A'),
                "name": full_name,
                "email": email,
                "phone": phone,
                "department": faculty_name,
                "position": position,
                "degree": degree,
                "specialization": specialization,
                # Lưu trữ dữ liệu gốc để sử dụng khi cần
                "raw_data": instructor
            }
            
            processed_instructors.append(processed_instructor)
        
        response = jsonify({
            "status": "success",
            "data": processed_instructors,
            "instructors": processed_instructors,  # Thêm trường này để tương thích với frontend
            "count": len(processed_instructors)
        })
        response.headers.add('Access-Control-Allow-Origin', 'http://localhost:5173')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response
    
    except Exception as e:
        print(f"Lỗi khi lấy danh sách giảng viên: {e}")
        response = jsonify({
            "status": "error",
            "message": f"Lỗi khi lấy danh sách giảng viên: {str(e)}"
        }), 500
        response[0].headers.add('Access-Control-Allow-Origin', 'http://localhost:5173')
        response[0].headers.add('Access-Control-Allow-Credentials', 'true')
        return response

# Route lấy thông tin chi tiết giảng viên và khóa học
@admin_bp.route('/instructors/<instructor_id>', methods=['GET', 'OPTIONS'])
def admin_get_instructor_detail(instructor_id):
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'success'})
        response.headers.add('Access-Control-Allow-Origin', 'http://localhost:5173')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With')
        response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response
    
    # Kiểm tra quyền admin
    if 'admin_id' not in session or session.get('role') != 'admin':
        response = jsonify({
            "status": "error",
            "message": "Không có quyền truy cập"
        }), 403
        response[0].headers.add('Access-Control-Allow-Origin', 'http://localhost:5173')
        response[0].headers.add('Access-Control-Allow-Credentials', 'true')
        return response
    
    try:
        from main import mongo
        
        # Lấy thông tin giảng viên
        instructor_collection = mongo.db.instructors
        try:
            instructor = instructor_collection.find_one({"_id": ObjectId(instructor_id)})
        except Exception as e:
            print(f"Lỗi khi tìm giảng viên: {e}")
            response = jsonify({
                "status": "error",
                "message": f"ID giảng viên không hợp lệ: {str(e)}"
            }), 400
            response[0].headers.add('Access-Control-Allow-Origin', 'http://localhost:5173')
            response[0].headers.add('Access-Control-Allow-Credentials', 'true')
            return response
            
        if not instructor:
            response = jsonify({
                "status": "error",
                "message": "Không tìm thấy giảng viên"
            }), 404
            response[0].headers.add('Access-Control-Allow-Origin', 'http://localhost:5173')
            response[0].headers.add('Access-Control-Allow-Credentials', 'true')
            return response
        
        # Chuyển đổi ObjectId thành string
        if '_id' in instructor and isinstance(instructor['_id'], ObjectId):
            instructor['_id'] = str(instructor['_id'])
        if 'user_id' in instructor and isinstance(instructor['user_id'], ObjectId):
            instructor['user_id'] = str(instructor['user_id'])
        if 'faculty_id' in instructor and isinstance(instructor['faculty_id'], ObjectId):
            instructor['faculty_id'] = str(instructor['faculty_id'])
        
        # Lấy thông tin khoa
        faculty_collection = mongo.db.faculties
        faculty = None
        if 'faculty_id' in instructor:
            try:
                faculty = faculty_collection.find_one({"_id": ObjectId(instructor['faculty_id'])})
                if faculty and '_id' in faculty:
                    faculty['_id'] = str(faculty['_id'])
            except Exception as e:
                print(f"Lỗi khi tìm khoa: {e}")
        
        # Lấy danh sách khóa học của giảng viên
        offered_courses_collection = mongo.db.offered_courses
        try:
            courses = list(offered_courses_collection.find({"instructor_id": ObjectId(instructor_id)}))
            print(f"Tìm thấy {len(courses)} khóa học cho giảng viên {instructor_id}")
        except Exception as e:
            print(f"Lỗi khi tìm khóa học: {e}")
            courses = []
        
        # Xử lý thông tin khóa học
        processed_courses = []
        for course in courses:
            # Chuyển đổi ObjectId thành string
            if '_id' in course and isinstance(course['_id'], ObjectId):
                course['_id'] = str(course['_id'])
            if 'course_id' in course and isinstance(course['course_id'], ObjectId):
                course['course_id'] = str(course['course_id'])
            if 'instructor_id' in course and isinstance(course['instructor_id'], ObjectId):
                course['instructor_id'] = str(course['instructor_id'])
            
            # Đếm số sinh viên
            student_count = len(course.get('students', []))
            
            # Xử lý danh sách sinh viên
            students_data = []
            if 'students' in course:
                for student_info in course['students']:
                    student_id = student_info.get('student_id')
                    if isinstance(student_id, ObjectId):
                        student_id = str(student_id)
                    
                    # Lấy thông tin sinh viên từ collection
                    student = None
                    if student_id:
                        try:
                            student = mongo.db.student.find_one({"_id": ObjectId(student_id)})
                        except Exception as e:
                            print(f"Lỗi khi tìm sinh viên {student_id}: {e}")
                            pass
                    
                    # Tạo dữ liệu sinh viên
                    student_data = {
                        "student_id": student_id,
                        "mssv": student_info.get('mssv') or (student.get('mssv') if student else 'N/A'),
                        "full_name": student_info.get('full_name') or (student.get('personal_info', {}).get('full_name') if student else 'N/A'),
                        "email": student_info.get('email') or (student.get('personal_info', {}).get('email', {}).get('school') if student else 'N/A'),
                        "grades": student_info.get('grades', {})
                    }
                    students_data.append(student_data)
            
            # Tạo dữ liệu khóa học
            course_data = {
                "_id": course.get('_id'),
                "class_code": course.get('class_code', 'N/A'),
                "course_name": course.get('course_name', 'N/A'),
                "course_code": course.get('course_code', 'N/A'),
                "semester": course.get('semester', 'N/A'),
                "academic_year": course.get('academic_year', 'N/A'),
                "location": course.get('location', 'N/A'),
                "student_count": student_count,
                "students": students_data
            }
            processed_courses.append(course_data)
        
        # Tạo thông tin giảng viên đã xử lý
        instructor_data = {
            "_id": instructor.get('_id'),
            "instructor_id": instructor.get('instructor_id', 'N/A'),
            "name": instructor.get('personal_info', {}).get('full_name', 'N/A'),
            "email": instructor.get('contact', {}).get('email', 'N/A'),
            "phone": instructor.get('contact', {}).get('phone', 'N/A'),
            "department": faculty.get('name') if faculty else 'N/A',
            "position": instructor.get('position', 'Giảng viên'),
            "degree": instructor.get('academic_info', {}).get('degree', 'N/A'),
            "specialization": instructor.get('academic_info', {}).get('specialization', 'N/A')
        }
        
        response = jsonify({
            "status": "success",
            "instructor": instructor_data,
            "classes": processed_courses
        })
        response.headers.add('Access-Control-Allow-Origin', 'http://localhost:5173')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response
    
    except Exception as e:
        print(f"Lỗi khi lấy thông tin giảng viên: {e}")
        response = jsonify({
            "status": "error",
            "message": f"Lỗi khi lấy thông tin giảng viên: {str(e)}"
        }), 500
        response[0].headers.add('Access-Control-Allow-Origin', 'http://localhost:5173')
        response[0].headers.add('Access-Control-Allow-Credentials', 'true')
        return response

# Route lấy danh sách lớp học
@admin_bp.route('/classes', methods=['GET', 'OPTIONS'])
def admin_get_classes():
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'success'})
        response.headers.add('Access-Control-Allow-Origin', 'http://localhost:5173')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With')
        response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response
    
    # Kiểm tra quyền admin
    if 'admin_id' not in session or session.get('role') != 'admin':
        response = jsonify({
            "status": "error",
            "message": "Không có quyền truy cập"
        }), 403
        response[0].headers.add('Access-Control-Allow-Origin', 'http://localhost:5173')
        response[0].headers.add('Access-Control-Allow-Credentials', 'true')
        return response
    
    try:
        from main import mongo
        
        # Lấy danh sách lớp học từ collection
        offered_courses_collection = mongo.db.offered_courses
        classes = list(offered_courses_collection.find({}))
        
        # Chuyển đổi ObjectId thành string
        for course in classes:
            if '_id' in course and isinstance(course['_id'], ObjectId):
                course['_id'] = str(course['_id'])
            if 'course_id' in course and isinstance(course['course_id'], ObjectId):
                course['course_id'] = str(course['course_id'])
            if 'instructor_id' in course and isinstance(course['instructor_id'], ObjectId):
                course['instructor_id'] = str(course['instructor_id'])
            
            # Xử lý danh sách sinh viên nếu có
            if 'students' in course:
                for student in course['students']:
                    if 'student_id' in student and isinstance(student['student_id'], ObjectId):
                        student['student_id'] = str(student['student_id'])
        
        response = jsonify({
            "status": "success",
            "data": classes,
            "classes": classes,  # Thêm trường này để tương thích với frontend
            "count": len(classes)
        })
        response.headers.add('Access-Control-Allow-Origin', 'http://localhost:5173')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response
    
    except Exception as e:
        print(f"Lỗi khi lấy danh sách lớp học: {e}")
        response = jsonify({
            "status": "error",
            "message": f"Lỗi khi lấy danh sách lớp học: {str(e)}"
        }), 500
        response[0].headers.add('Access-Control-Allow-Origin', 'http://localhost:5173')
        response[0].headers.add('Access-Control-Allow-Credentials', 'true')
        return response
# Route lấy danh sách thông báo
@admin_bp.route('/notifications', methods=['GET', 'OPTIONS'])
def admin_get_notifications():
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'success'})
        response.headers.add('Access-Control-Allow-Origin', 'http://localhost:5173')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With')
        response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response
    
    # Kiểm tra quyền admin
    if 'admin_id' not in session or session.get('role') != 'admin':
        response = jsonify({
            "status": "error",
            "message": "Không có quyền truy cập"
        }), 403
        response[0].headers.add('Access-Control-Allow-Origin', 'http://localhost:5173')
        response[0].headers.add('Access-Control-Allow-Credentials', 'true')
        return response
    
    try:
        # Tạo dữ liệu thông báo mẫu (vì có vẻ như chưa có collection notifications)
        notifications = [
            {
                "_id": "1",
                "title": "Thông báo về lịch thi cuối kỳ",
                "content": "Lịch thi cuối kỳ học kỳ 2 năm học 2024-2025 đã được cập nhật.",
                "created_at": "2025-05-15T08:00:00Z",
                "status": "active",
                "target": "all"
            },
            {
                "_id": "2",
                "title": "Thông báo về đăng ký học phần",
                "content": "Thời gian đăng ký học phần học kỳ 1 năm học 2025-2026 bắt đầu từ ngày 15/07/2025.",
                "created_at": "2025-05-10T10:30:00Z",
                "status": "active",
                "target": "student"
            },
            {
                "_id": "3",
                "title": "Thông báo về nộp điểm",
                "content": "Giảng viên vui lòng nộp điểm trước ngày 30/05/2025.",
                "created_at": "2025-05-05T14:15:00Z",
                "status": "active",
                "target": "instructor"
            }
        ]
        
        response = jsonify({
            "status": "success",
            "data": notifications,
            "notifications": notifications,  # Thêm trường này để tương thích với frontend
            "count": len(notifications)
        })
        response.headers.add('Access-Control-Allow-Origin', 'http://localhost:5173')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response
    
    except Exception as e:
        print(f"Lỗi khi lấy danh sách thông báo: {e}")
        response = jsonify({
            "status": "error",
            "message": f"Lỗi khi lấy danh sách thông báo: {str(e)}"
        }), 500
        response[0].headers.add('Access-Control-Allow-Origin', 'http://localhost:5173')
        response[0].headers.add('Access-Control-Allow-Credentials', 'true')
        return response