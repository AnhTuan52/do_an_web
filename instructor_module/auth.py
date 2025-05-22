from flask import Blueprint, request, jsonify, session
from bson.objectid import ObjectId
from datetime import datetime
import logging

# Lấy logger
logger = logging.getLogger(__name__)

# Blueprint cho phần xác thực giảng viên
instructor_auth_bp = Blueprint('instructor_auth', __name__)

# Các biến toàn cục sẽ được gán giá trị khi đăng ký blueprint
mongo = None
users_collection = None
instructors_collection = None
faculties_collection = None

# Hàm chuyển đổi ObjectId thành string
def convert_objectid_to_str(data):
    if isinstance(data, dict):
        for key, value in data.items():
            if isinstance(value, ObjectId):
                data[key] = str(value)
            elif isinstance(value, dict):
                data[key] = convert_objectid_to_str(value)
            elif isinstance(value, list):
                data[key] = [convert_objectid_to_str(item) if isinstance(item, dict) else 
                            str(item) if isinstance(item, ObjectId) else item 
                            for item in value]
    return data

# Đăng nhập giảng viên
@instructor_auth_bp.route('/login', methods=['POST', 'OPTIONS'])
def instructor_login():
    # Xử lý yêu cầu OPTIONS (CORS preflight)
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        origin = request.headers.get('Origin', 'http://localhost:5173')
        response.headers['Access-Control-Allow-Origin'] = origin
        response.headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With, Access-Control-Allow-Origin, Access-Control-Allow-Methods, Access-Control-Allow-Headers'
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        print(f"OPTIONS response headers: {response.headers}")
        return response
    
    # Debug: In ra thông tin request
    print("=== INSTRUCTOR LOGIN REQUEST ===")
    print(f"Method: {request.method}")
    print(f"Headers: {request.headers}")
    print(f"Data: {request.get_json()}")
    
    try:
        # Lấy dữ liệu đăng nhập từ request
        data = request.get_json()
        print(f"Dữ liệu đăng nhập: {data}")
        
        if not data or 'email' not in data or 'password' not in data:
            logger.warning("Thiếu thông tin đăng nhập")
            return jsonify({
                "status": "error", 
                "message": "Vui lòng cung cấp email và mật khẩu"
            }), 400
        
        email = data['email']
        password = data['password']
        
        if not email or not password:
            logger.warning("Email hoặc mật khẩu trống")
            return jsonify({
                "status": "error", 
                "message": "Email và mật khẩu không được để trống"
            }), 400
        
        logger.info(f"Đang xử lý đăng nhập cho giảng viên với email: {email}")
        
        # Tìm giảng viên trong collection users
        user = users_collection.find_one({"email": email, "password": password, "role": "instructor"})
        
        if user:
            logger.info(f"Tìm thấy user giảng viên với ID: {user.get('_id')}")
            
            # Tìm thông tin chi tiết của giảng viên - thử nhiều cách khác nhau
            instructor = None
            
            # Cách 1: Tìm theo user_id là ObjectId
            try:
                instructor = instructors_collection.find_one({"user_id": user.get('_id')})
                if instructor:
                    logger.info(f"Tìm thấy giảng viên theo user_id ObjectId: {instructor.get('_id')}")
            except Exception as e:
                logger.warning(f"Lỗi khi tìm giảng viên theo ObjectId: {e}")
            
            # Cách 2: Tìm theo user_id là string của ObjectId
            if not instructor:
                try:
                    instructor = instructors_collection.find_one({"user_id": str(user.get('_id'))})
                    if instructor:
                        logger.info(f"Tìm thấy giảng viên theo user_id string: {instructor.get('_id')}")
                except Exception as e:
                    logger.warning(f"Lỗi khi tìm giảng viên theo string ObjectId: {e}")
            
            # Cách 3: Tìm theo email
            if not instructor:
                try:
                    instructor = instructors_collection.find_one({"contact.email": email})
                    if instructor:
                        logger.info(f"Tìm thấy giảng viên theo contact.email: {instructor.get('_id')}")
                except Exception as e:
                    logger.warning(f"Lỗi khi tìm giảng viên theo email: {e}")
            
            # Nếu vẫn không tìm thấy, tạo một giảng viên mới
            if not instructor:
                logger.info("Không tìm thấy giảng viên, đang tạo mới giảng viên")
                instructor_count = instructors_collection.count_documents({})
                instructor_id = f"GV{instructor_count + 1:04d}"
                new_instructor = {
                    "instructor_id": instructor_id,
                    "user_id": str(user.get('_id')),
                    "personal_info": {
                        "full_name": "Giảng Viên",
                        "faculty": "Công nghệ Thông tin"
                    },
                    "contact": {
                        "email": email,
                        "phone": ""
                    },
                    "academic_info": {
                        "degree": "Thạc sĩ",
                        "specialization": "Công nghệ phần mềm",
                        "research_interests": []
                    },
                    "faculty_id": "60d5ec9af682fbd12a8952c1",
                    "courses_taught": [],
                    "created_at": datetime.now(),
                    "updated_at": datetime.now()
                }
                result = instructors_collection.insert_one(new_instructor)
                instructor = instructors_collection.find_one({"_id": result.inserted_id})
                logger.info(f"Đã tạo giảng viên mới với ID: {instructor.get('_id')}")
            
            if instructor:
                logger.info(f"Tìm thấy thông tin giảng viên với instructor_id: {instructor.get('instructor_id')}")
                
                # Đặt session thành permanent để kéo dài thời gian sống
                session.permanent = True
                
                session['user_id'] = str(user.get('_id'))
                session['instructor_id'] = str(instructor.get('_id'))
                session['role'] = 'instructor'
                session['email'] = email
                
                print(f"Session đã được thiết lập: {dict(session)}")
                
                logger.info(f"Session đã được thiết lập cho giảng viên: {email}")
                logger.debug(f"Session data: {dict(session)}")
                
                # Cập nhật thời gian đăng nhập
                try:
                    users_collection.update_one(
                        {"_id": user.get('_id')},
                        {"$set": {"last_login": datetime.now()}}
                    )
                except Exception as e:
                    logger.warning(f"Không thể cập nhật thời gian đăng nhập: {e}")
                    # Không ảnh hưởng đến việc đăng nhập, chỉ ghi log
                
                # Chuyển đổi ObjectId thành string trong dữ liệu instructor
                instructor = convert_objectid_to_str(instructor)
                
                response = jsonify({
                    "status": "success", 
                    "message": "Đăng nhập giảng viên thành công", 
                    "instructor_id": instructor.get('instructor_id'),
                    "name": instructor.get('personal_info', {}).get('full_name'),
                    "role": "instructor"
                })
                
                # Đảm bảo cookie session được gửi về client
                origin = request.headers.get('Origin', 'http://localhost:5173')
                response.headers['Access-Control-Allow-Origin'] = origin
                response.headers['Access-Control-Allow-Credentials'] = 'true'
                response.headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
                response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With'
                print(f"Đã thiết lập CORS headers cho response: {response.headers}")
                
                print(f"Đang trả về response thành công: {response.data}")
                return response
            else:
                logger.warning(f"Không tìm thấy thông tin giảng viên cho user: {user.get('_id')}")
                return jsonify({
                    "status": "error", 
                    "message": "Không tìm thấy thông tin giảng viên"
                }), 404
        else:
            logger.warning(f"Không tìm thấy user với email: {email}")
            return jsonify({
                "status": "error", 
                "message": "Email hoặc mật khẩu không chính xác"
            }), 401
    except Exception as e:
        logger.error(f"Lỗi khi xử lý đăng nhập giảng viên: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return jsonify({
            "status": "error", 
            "message": "Đã xảy ra lỗi khi xử lý đăng nhập"
        }), 500

# Lấy thông tin cá nhân giảng viên
@instructor_auth_bp.route('/profile', methods=['GET'])
def instructor_profile():
    """Lấy thông tin cá nhân của giảng viên"""
    # Kiểm tra quyền truy cập
    if 'role' not in session or session['role'] != 'instructor' or 'instructor_id' not in session:
        return jsonify({"status": "error", "message": "Bạn không có quyền truy cập"}), 403
    
    instructor_id = session['instructor_id']
    instructor = instructors_collection.find_one({"_id": ObjectId(instructor_id)})
    
    if not instructor:
        return jsonify({"status": "error", "message": "Không tìm thấy thông tin giảng viên"}), 404
    
    # Chuyển đổi ObjectId thành string
    instructor['_id'] = str(instructor['_id'])
    if 'user_id' in instructor:
        instructor['user_id'] = str(instructor['user_id'])
    if 'faculty_id' in instructor:
        instructor['faculty_id'] = str(instructor['faculty_id'])
    
    # Lấy thông tin khoa
    faculty = None
    if 'faculty_id' in instructor:
        faculty = faculties_collection.find_one({"_id": ObjectId(instructor['faculty_id'])})
        if faculty:
            faculty['_id'] = str(faculty['_id'])
    
    return jsonify({
        "status": "success",
        "instructor": instructor,
        "faculty": faculty
    })

# API quên mật khẩu
@instructor_auth_bp.route('/forgot_password', methods=['POST'])
def forgot_password():
    """Xử lý yêu cầu quên mật khẩu của giảng viên"""
    try:
        data = request.get_json()
        if not data or 'email' not in data:
            return jsonify({"status": "error", "message": "Vui lòng cung cấp email"}), 400
        
        email = data['email']
        
        # Tìm user với email và role là instructor
        user = users_collection.find_one({"email": email, "role": "instructor"})
        if not user:
            return jsonify({"status": "error", "message": "Không tìm thấy tài khoản giảng viên với email này"}), 404
        
        # Tạo mật khẩu mới ngẫu nhiên
        import random
        import string
        new_password = ''.join(random.choices(string.ascii_letters + string.digits, k=8))
        
        # Cập nhật mật khẩu mới
        users_collection.update_one(
            {"_id": user['_id']},
            {"$set": {"password": new_password}}
        )
        
        # Gửi email thông báo mật khẩu mới (giả lập)
        logger.info(f"Đã gửi mật khẩu mới '{new_password}' đến email {email}")
        
        return jsonify({
            "status": "success",
            "message": "Mật khẩu mới đã được gửi đến email của bạn"
        })
    except Exception as e:
        logger.error(f"Lỗi khi xử lý quên mật khẩu: {e}")
        return jsonify({"status": "error", "message": "Đã xảy ra lỗi khi xử lý yêu cầu"}), 500

# Cập nhật thông tin cá nhân giảng viên
@instructor_auth_bp.route('/profile/update', methods=['PUT'])
def update_instructor_profile():
    """Cập nhật thông tin cá nhân của giảng viên"""
    # Kiểm tra quyền truy cập
    if 'role' not in session or session['role'] != 'instructor' or 'instructor_id' not in session:
        return jsonify({"status": "error", "message": "Bạn không có quyền truy cập"}), 403
    
    instructor_id = session['instructor_id']
    data = request.get_json()
    
    # Lọc các trường được phép cập nhật
    allowed_fields = {
        "personal_info.full_name": data.get("full_name"),
        "contact.phone": data.get("phone"),
        "academic_info.degree": data.get("degree"),
        "academic_info.specialization": data.get("specialization"),
        "academic_info.research_interests": data.get("research_interests")
    }
    
    # Loại bỏ các trường None
    update_fields = {k: v for k, v in allowed_fields.items() if v is not None}
    
    # Thêm thời gian cập nhật
    update_fields["updated_at"] = datetime.now()
    
    # Cập nhật thông tin
    result = instructors_collection.update_one(
        {"_id": ObjectId(instructor_id)},
        {"$set": update_fields}
    )
    
    if result.modified_count == 0:
        return jsonify({"status": "error", "message": "Không có thông tin nào được cập nhật"}), 400
    
    return jsonify({
        "status": "success",
        "message": "Cập nhật thông tin thành công"
    })

# Hàm khởi tạo blueprint
def init_app(app, mongo_client):
    global mongo, users_collection, instructors_collection, faculties_collection
    
    logger.info("Bắt đầu khởi tạo blueprint instructor_auth...")
    
    try:
        mongo = mongo_client
        users_collection = mongo.db.users
        instructors_collection = mongo.db.instructors
        faculties_collection = mongo.db.faculties
        
        logger.info("Đã khởi tạo các collection thành công")
        
        # Đăng ký blueprint với tiền tố '/instructor'
        app.register_blueprint(instructor_auth_bp, url_prefix='/instructor')
        
        logger.info(f"Đã đăng ký blueprint instructor_auth_bp với tiền tố '/instructor'")
        logger.debug(f"Các route đã đăng ký: {[rule.rule for rule in app.url_map.iter_rules() if rule.rule.startswith('/instructor')]}")
        
        return True
    except Exception as e:
        logger.error(f"Lỗi khi khởi tạo blueprint instructor_auth: {e}")
        raise