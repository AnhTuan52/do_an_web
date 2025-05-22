from flask import Flask, request, session, jsonify
from flask_pymongo import PyMongo
from flask_cors import CORS
from dotenv import load_dotenv
import os
import smtplib
from email.mime.text import MIMEText
from datetime import datetime
import requests
import re
from bs4 import BeautifulSoup
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_wtf.csrf import CSRFProtect
from datetime import timedelta
import json
from bson import ObjectId

load_dotenv()

# Tạo lớp JSONEncoder tùy chỉnh để xử lý ObjectId và datetime
class MongoJSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, ObjectId):
            return str(obj)
        elif isinstance(obj, datetime):
            return obj.strftime("%Y-%m-%d %H:%M:%S")
        return super().default(obj)

app = Flask(__name__)
app.json_encoder = MongoJSONEncoder
app.config.update(
    SECRET_KEY=os.getenv("SECRET_KEY"),
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SECURE=True,
    SESSION_COOKIE_SAMESITE="Strict",
    PERMANENT_SESSION_LIFETIME=timedelta(minutes=30)
)

limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=["200 per day", "30 per hour"]
)

@limiter.request_filter
def exempt_localhost():
    return request.remote_addr == "127.0.0.1"

# Cấu hình CORS
CORS(app, 
     origins=["http://localhost:5173", "http://127.0.0.1:5173", "*"],
     supports_credentials=True,
     allow_headers=["Content-Type", "Authorization", "X-Requested-With", "Access-Control-Allow-Origin", "Access-Control-Allow-Methods", "Access-Control-Allow-Headers"],
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
     expose_headers=["Content-Type", "Authorization"]
)

# Xử lý OPTIONS request cho CORS preflight đã được chuyển vào instructor_module/auth.py

# Cấu hình kết nối MongoDB
# csrf = CSRFProtect(app)
app.config["MONGO_URI"] = os.getenv("MONGO_URI")
mongo = PyMongo(app)

# Truy cập các collection
users_collection = mongo.db.users
student_collection = mongo.db.student
subject_collection = mongo.db.subject
academic_records_collection = mongo.db.academic_records

# Thông tin tài khoản email admin
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD")

def parse_float(value):
    try:
        return float(value)
    except:
        return None

def parse_int(value):
    try:
        return int(value)
    except:
        return None

def determine_status(score):
    if isinstance(score, str):
        if score.strip().lower() == "miễn":
            return "Đã hoàn thành"
        try:
            numeric_score = parse_float(score)
            return "Qua môn" if isinstance(numeric_score, float) and numeric_score >= 4 else "Không hoàn thành"
        except ValueError:
            return "Chưa hoàn thành"
    return "Chưa hoàn thành"


def parse_registration_html(html_content):
    soup = BeautifulSoup(html_content, 'html.parser')
    title_text = soup.find('div', class_='title_thongtindangky')
    match = re.search(r"HỌC KỲ (\d+) NĂM (\d{4}) - (\d{4})", title_text.get_text(), re.IGNORECASE)

    if match:
        semester_number = match.group(1)
        year_start = match.group(2)
        year_end = match.group(3)
        formatted = f"Học kỳ {semester_number} - Năm học {year_start}-{year_end}"
    else:
        formatted = "Current Semester"

    semester_name = formatted

    table = soup.find('table')
    courses = []
    if table:
        rows = table.find_all('tr')[1:]
        for row in rows:
            cells = row.find_all('td')
            if len(cells) >= 5:
                course_code = cells[1].text.strip()
                course_name = cells[3].text.strip()
                credits = parse_int(cells[4].text.strip())
                if "(TH" in course_name:
                    for course in courses:
                        if course_code.startswith(course["course_code"]):
                            course["credits"] += credits
                            break
                    continue
                courses.append({
                    "course_code": course_code,
                    "course_name": course_name,
                    "credits": parse_int(credits),
                    "scores": {
                        "process": None,
                        "midterm": None,
                        "practice": None,
                        "final": None,
                    },
                    "total_score": None,
                    "complete": "Chưa hoàn thành",
                    "note": ""
                })
    return semester_name, courses

# Support for parsing data for the new user
def get_new_userdata(cookies, mssv):
    url = f"https://student.uit.edu.vn/sinhvien/kqhoctap?sid={mssv}"
    registration_url = 'https://student.uit.edu.vn/sinhvien/dkhp/thongtindangky'
    profile_url = "https://student.uit.edu.vn/sinhvien/thongtin/hoso-online"

    response = requests.get(url, cookies=cookies)
    if "BẢNG ĐIỂM SINH VIÊN" not in response.text:
        raise Exception("Không thể truy xuất dữ liệu. Cookie có thể sai hoặc hết hạn.")
    
    registration_response = requests.get(registration_url, cookies=cookies)
    profile_response = requests.get(profile_url, cookies=cookies)

    profile_soup = BeautifulSoup(profile_response.text, 'html.parser')
    major = ""

    try:
        profile_table = profile_soup.find('table', class_='mytable')
        if profile_table:
            rows = profile_table.find_all('tr')
            for row in rows:
                cells = row.find_all('td')
                if len(cells) >= 2 and "Ngành học" in cells[0].text:
                    major = cells[1].text.strip().split(" - ")[0].strip()
                    break
    except Exception as e:
        print(f"Error parsing major info: {e}")
        major = ""

    soup = BeautifulSoup(response.text, 'html.parser')
    student_info_table = soup.find('table')
    student_info_rows = student_info_table.find_all('tr')

    academic_records = []
    rows = soup.find_all('tr')
    total_credits_taken = 0
    total_credits_accumulated = 0
    total_score_sum = 0
    total_credits_with_scores = 0

    semester_info = None
    courses = []
    semester_credits = 0
    semester_score_sum = 0

    for row in rows:
        cells = row.find_all('td') 
        if len(cells) == 1 and "Học kỳ" in cells[0].text:
            if semester_info and courses:
                semester_average = round(semester_score_sum / semester_credits, 2) if semester_credits > 0 else None
                academic_records.append({
                    "semester": semester_info,
                    "courses": courses,
                    "semester_average": str(semester_average),
                    "credits_taken": (semester_credits),
                    "status": "Đã hoàn thành",
                    "start_date": {"$date": "2024-09-01T00:00:00Z"},
                    "end_date": {"$date": "2025-01-15T00:00:00Z"},
                })
                total_credits_taken += semester_credits
                semester_credits = 0
                semester_score_sum = 0
                courses = []

            semester_info = cells[0].text.strip()
        elif len(cells) >= 10:
            credits = parse_int(cells[3].text.strip())
            total_score = cells[8].text.strip()

            if total_score == "Miễn":
                total_score = "Miễn"
            else:
                try:
                    total_score = parse_float(total_score)
                except ValueError:
                    total_score = None
            
            course = {
                "course_code": cells[1].text.strip(),
                "course_name": cells[2].text.strip(),
                "credits": credits,
                "scores": {
                    "process": parse_float(cells[4].text.strip()),
                    "midterm": parse_float(cells[5].text.strip()),
                    "practice": parse_float(cells[6].text.strip()),
                    "final": parse_float(cells[7].text.strip()),
                },
                "total_score": total_score,
                "complete": determine_status(cells[8].text.strip()),
                "note": cells[9].text.strip(),
            }
            courses.append(course)

            total_credits_accumulated += credits

            if total_score is not None and total_score != "Miễn":
                semester_score_sum += total_score * credits
                total_score_sum += total_score * credits
                total_credits_with_scores += credits
                semester_credits += credits

    if semester_info and courses:
        semester_average = round(semester_score_sum / semester_credits, 2) if semester_credits > 0 else None
        academic_records.append({
            "semester": semester_info,
            "courses": courses,
            "semester_average": str(semester_average),
            "credits_taken": str(semester_credits),
            "status": "Đã hoàn thành",
            "start_date": {"$date": "2024-09-01T00:00:00Z"},
            "end_date": {"$date": "2025-01-15T00:00:00Z"},
        })
        total_credits_taken += semester_credits

    overall_average = round(total_score_sum / total_credits_with_scores, 2) if total_credits_with_scores > 0 else None
    mssv = mssv or soup.find('strong').text.strip()

    current_semester, current_courses = parse_registration_html(registration_response.text)
    current_credits = sum(course['credits'] for course in current_courses)

    if current_courses:
        existing_semester = next((r for r in academic_records if r["semester"] == current_semester), None)

    if existing_semester:
        old_courses = existing_semester["courses"]
        old_course_map = {c["course_code"]: c for c in old_courses}

        for course in current_courses:
            code = course["course_code"]
            if code in old_course_map:
                old = old_course_map[code]
                course["scores"] = old.get("scores", course["scores"])
                course["total_score"] = old.get("total_score", course["total_score"])
                course["note"] = old.get("note", course["note"])
                course["complete"] = determine_status(course["total_score"])
            else:
                course["complete"] = "Chưa hoàn thành"
    else:
        for course in current_courses:
            course["complete"] = "Chưa hoàn thành"

    academic_records = [r for r in academic_records if r["semester"] != current_semester]
    academic_records.insert(0, {
        "semester": current_semester,
        "courses": current_courses,
        "semester_average": "0",
        "credits_taken": parse_int(sum(course['credits'] if course['total_score'] != "Miễn" else 0 for course in current_courses)),
        "status": "Đang học",
        "start_date": {"$date": "2024-09-01T00:00:00Z"},
        "end_date": {"$date": "2025-01-15T00:00:00Z"},
    })

    student_info = {
        "mssv": mssv,
        "role": "student", 
        "personal_info": {
            "full_name": student_info_rows[0].find_all('td')[1].text.strip() if student_info_rows[0].find_all('td')[1] else "",
            "gender": student_info_rows[0].find_all('td')[5].text.strip() if student_info_rows[0].find_all('td')[5] else "",
            "birth_date": student_info_rows[0].find_all('td')[3].text.strip() if student_info_rows[0].find_all('td')[3] else "",
            "class": student_info_rows[1].find_all('td')[3].text.strip() if student_info_rows[1].find_all('td')[3] else "",
            "faculty": student_info_rows[1].find_all('td')[5].text.strip() if student_info_rows[1].find_all('td')[5] else "",
            "major": major,
            "email": {
                "school": f"{mssv}@gm.uit.edu.vn",
            },
            "training_system": student_info_rows[2].find_all('td')[3].text.strip() if student_info_rows[2].find_all('td')[3] else "",
        },
        "chat_history": [], 
    }

    unique_records = {}
    for record in academic_records:
        sem_key = record["semester"]
        if sem_key not in unique_records:
            unique_records[sem_key] = record
        else:
            if record["status"] == "Đang học":
                unique_records[sem_key] = record
            elif record["status"] == "Đã hoàn thành" and unique_records[sem_key]["status"] != "Đang học":
                unique_records[sem_key] = record

    academic_records = list(unique_records.values())

    academic_data = {
        "mssv": mssv,
        "academic_records": academic_records,
        "summary": {
            "total_credits_taken": total_credits_taken,
            "total_credits_accumulated": total_credits_accumulated,
            "overall_average": overall_average,
        },
        "progress": {
            "total_credits_required": 150,
            "graduation_status": "Đang học",
            "warnings": [],
        }
    }

    return student_info, academic_data

# Support for parsing data for route /sync_data
def get_latest_data(cookies, mssv):
    url = f"https://student.uit.edu.vn/sinhvien/kqhoctap?sid={mssv}"
    registration_url = 'https://student.uit.edu.vn/sinhvien/dkhp/thongtindangky'

    response = requests.get(url, cookies=cookies)
    if "BẢNG ĐIỂM SINH VIÊN" not in response.text:
        raise Exception("Không thể truy xuất dữ liệu. Cookie có thể sai hoặc hết hạn.")
    
    registration_response = requests.get(registration_url, cookies=cookies)

    soup = BeautifulSoup(response.text, 'html.parser')

    academic_records = []
    rows = soup.find_all('tr')
    total_credits_taken = 0
    total_credits_accumulated = 0
    total_score_sum = 0
    total_credits_with_scores = 0

    semester_info = None
    courses = []
    semester_credits = 0
    semester_score_sum = 0

    for row in rows:
        cells = row.find_all('td') 
        if len(cells) == 1 and "Học kỳ" in cells[0].text:
            if semester_info and courses:
                semester_average = round(semester_score_sum / semester_credits, 2) if semester_credits > 0 else None
                academic_records.append({
                    "semester": semester_info,
                    "courses": courses,
                    "semester_average": str(semester_average),
                    "credits_taken": (semester_credits),
                    "status": "Đã hoàn thành",
                    "start_date": {"$date": "2024-09-01T00:00:00Z"},
                    "end_date": {"$date": "2025-01-15T00:00:00Z"},
                })
                total_credits_taken += semester_credits
                semester_credits = 0
                semester_score_sum = 0
                courses = []

            semester_info = cells[0].text.strip()
        elif len(cells) >= 10:
            credits = parse_int(cells[3].text.strip())
            total_score = cells[8].text.strip()

            if total_score == "Miễn":
                total_score = "Miễn"
            else:
                try:
                    total_score = parse_float(total_score)
                except ValueError:
                    total_score = None
            
            course = {
                "course_code": cells[1].text.strip(),
                "course_name": cells[2].text.strip(),
                "credits": credits,
                "scores": {
                    "process": parse_float(cells[4].text.strip()),
                    "midterm": parse_float(cells[5].text.strip()),
                    "practice": parse_float(cells[6].text.strip()),
                    "final": parse_float(cells[7].text.strip()),
                },
                "total_score": total_score,
                "complete": determine_status(cells[8].text.strip()),
                "note": cells[9].text.strip(),
            }
            courses.append(course)

            total_credits_accumulated += credits

            if total_score is not None and total_score != "Miễn":
                semester_score_sum += total_score * credits
                total_score_sum += total_score * credits
                total_credits_with_scores += credits
                semester_credits += credits

    if semester_info and courses:
        semester_average = round(semester_score_sum / semester_credits, 2) if semester_credits > 0 else None
        academic_records.append({
            "semester": semester_info,
            "courses": courses,
            "semester_average": str(semester_average),
            "credits_taken": str(semester_credits),
            "status": "Đã hoàn thành",
            "start_date": {"$date": "2024-09-01T00:00:00Z"},
            "end_date": {"$date": "2025-01-15T00:00:00Z"},
        })
        total_credits_taken += semester_credits

    overall_average = round(total_score_sum / total_credits_with_scores, 2) if total_credits_with_scores > 0 else None
    mssv = mssv or soup.find('strong').text.strip()

    current_semester, current_courses = parse_registration_html(registration_response.text)

    if current_courses:
        existing_semester = next((r for r in academic_records if r["semester"] == current_semester), None)

    if existing_semester:
        old_courses = existing_semester["courses"]
        old_course_map = {c["course_code"]: c for c in old_courses}

        for course in current_courses:
            code = course["course_code"]
            if code in old_course_map:
                old = old_course_map[code]
                course["scores"] = old.get("scores", course["scores"])
                course["total_score"] = old.get("total_score", course["total_score"])
                course["note"] = old.get("note", course["note"])
                course["complete"] = determine_status(course["total_score"])
            else:
                course["complete"] = "Chưa hoàn thành"
    else:
        for course in current_courses:
            course["complete"] = "Chưa hoàn thành"

    academic_records = [r for r in academic_records if r["semester"] != current_semester]
    academic_records.insert(0, {
        "semester": current_semester,
        "courses": current_courses,
        "semester_average": "0",
        "credits_taken": parse_int(sum(course['credits'] if course['total_score'] != "Miễn" else 0 for course in current_courses)),
        "status": "Đang học",
        "start_date": {"$date": "2024-09-01T00:00:00Z"},
        "end_date": {"$date": "2025-01-15T00:00:00Z"},
    })

    # Gộp học kỳ trùng tên: Ưu tiên bản "Đang học", bỏ bản "Đã hoàn thành" nếu trùng
    unique_records = {}
    for record in academic_records:
        sem_key = record["semester"]
        if sem_key not in unique_records:
            unique_records[sem_key] = record
        else:
            if record["status"] == "Đang học":
                # Nếu đã có bản cũ, mà bản mới là "Đang học" → ghi đè
                unique_records[sem_key] = record
            elif record["status"] == "Đã hoàn thành" and unique_records[sem_key]["status"] != "Đang học":
                # Nếu chưa có "Đang học", và đây là "Đã hoàn thành", thì giữ
                unique_records[sem_key] = record

    academic_records = list(unique_records.values())

    academic_data = {
        "mssv": mssv,
        "academic_records": academic_records,
        "summary": {
            "total_credits_taken": total_credits_taken,
            "total_credits_accumulated": total_credits_accumulated,
            "overall_average": overall_average,
        },
        "progress": {
            "total_credits_required": 150,
            "graduation_status": "Đang học",
            "warnings": [],
        }
    }

    return academic_data

@app.route('/sync_data', methods=['POST'])
def sync_data():
    if 'mssv' not in session:
        return jsonify({"status": "error", "message": "Vui lòng đăng nhập"}), 401

    mssv = session['mssv']
    data = request.get_json()
    cookie_name = "SSESSdf6f777d3f8a1d0fb2e4e5d1ec62f6e2"
    cookie_value = data.get('cookie_value')

    if not cookie_value:
        return jsonify({"status": "error", "message": "Thiếu thông tin cookie"}), 400

    cookies = {cookie_name: cookie_value}

    try:
        record = get_latest_data(cookies, mssv)
        academic_records_collection.replace_one({"mssv": mssv}, record, upsert=True)
        return jsonify({"status": "success", "message": "Đồng bộ dữ liệu thành công"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

# Hàm cập nhật tổng tín chỉ và điểm trung bình
def update_student_summary(mssv):
    academic_record = academic_records_collection.find_one({"mssv": mssv})
    if not academic_record or 'academic_records' not in academic_record:
        return
    
    total_credits = 0
    total_score_weighted = 0
    total_credits_for_gpa = 0
    
    for record in academic_record['academic_records']:
        for course in record['courses']:
            credits = course.get('credits', 0)
            total_score = course.get('total_score', "0")
            complete_status = course.get('complete', "")
            
            if complete_status == "Chưa hoàn thành":
                continue
            if complete_status != "Không hoàn thành":
                total_credits += credits
            if str(total_score).lower() != "miễn" and complete_status != "Không hoàn thành":
                try:
                    total_score_weighted += float(total_score) * credits
                except (TypeError, ValueError):
                    total_score_weighted += 0

                total_credits_for_gpa += credits
    
    accumulated_average = (total_score_weighted / total_credits_for_gpa) if total_credits_for_gpa > 0 else 0
    
    # Cập nhật vào student_collection
    student_collection.update_one(
        {"mssv": mssv},
        {"$set": {
            "summary.total_credits_taken": total_credits,
            "summary.accumulated_average": round(accumulated_average, 2)
        }}
    )

# Hàm cập nhật tổng tín chỉ và điểm trung bình từng học kỳ
def update_academic_records_summary(mssv):
    academic_record = academic_records_collection.find_one({"mssv": mssv})
    if not academic_record or 'academic_records' not in academic_record:
        return
    
    updated_academic_records = []
    for record in academic_record['academic_records']:
        total_credits = 0
        total_score_weighted = 0
        total_credits_for_gpa = 0
        total_credits_completed = 0

        for course in record['courses']:
            credits = course.get('credits', 0)
            total_score = course.get('total_score', "0")
            complete_status = course.get('complete', "")
            
            total_credits += credits
            if str(total_score).lower() != "miễn" and complete_status != "Không hoàn thành" and complete_status != "Chưa hoàn thành":
                try:
                    total_score_weighted += float(total_score) * credits
                except (TypeError, ValueError):
                    total_score_weighted += 0
                    
                total_credits_for_gpa += credits
        
        semester_average = (total_score_weighted / total_credits_for_gpa) if total_credits_for_gpa > 0 else 0
        updated_academic_records.append({
            "semester": record["semester"],
            "courses": record["courses"],
            "credits_taken": total_credits,
            "semester_average": round(semester_average, 2)
        })
    
    # Cập nhật vào academic_records_collection
    academic_records_collection.update_one(
        {"mssv": mssv},
        {"$set": {"academic_records": updated_academic_records}}
    )

# Các route cơ bản
@app.route("/check-session", methods=["GET", "OPTIONS"])
@limiter.limit("10 per minute")
# @csrf.exempt
def check_session():
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'success'})
        response.headers.add('Access-Control-Allow-Origin', 'http://localhost:5173')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With')
        response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response
        
    print(f"Kiểm tra session: {dict(session)}")
    
    if "mssv" in session:
        response = jsonify({
            "status": "success",
            "mssv": session["mssv"],
            "role": "student"
        })
        response.headers.add('Access-Control-Allow-Origin', 'http://localhost:5173')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response
    elif "instructor_id" in session and session.get("role") == "instructor":
        response = jsonify({
            "status": "success",
            "user": {
                "instructor_id": session["instructor_id"],
                "role": "instructor"
            }
        })
        response.headers.add('Access-Control-Allow-Origin', 'http://localhost:5173')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response
    elif "admin_id" in session and session.get("role") == "admin":
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
            "message": "Không có session hợp lệ."
        }), 401
        if isinstance(response, tuple):
            response[0].headers.add('Access-Control-Allow-Origin', 'http://localhost:5173')
            response[0].headers.add('Access-Control-Allow-Credentials', 'true')
        else:
            response.headers.add('Access-Control-Allow-Origin', 'http://localhost:5173')
            response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

@app.route('/user')
def home():
    if 'mssv' in session:
        # update_student_summary(session['mssv'])
        student = student_collection.find_one({"mssv": session['mssv']})
        if student:
            return jsonify({"status": "success", "student": student})
    return jsonify({"status": "error", "message": "Vui lòng đăng nhập"}), 401

@app.route('/login', methods=['POST'])
@limiter.limit("5 per minute")
def login():
    data = request.get_json()
    mssv = data.get('mssv')
    password = data.get('password')
    user = users_collection.find_one({"mssv": mssv, "password": password})
    if user:
        session['mssv'] = mssv
        return jsonify({"status": "success", "message": "Đăng nhập thành công", "mssv": mssv})
    else:
        return jsonify({"status": "error", "message": "Tên đăng nhập hoặc mật khẩu không đúng"}), 401

@app.route('/logout', methods=['POST'])
# @csrf.exempt
def logout():
    session.pop('mssv', None)
    session.clear()
    response = jsonify({"status": "success", "message": "Bạn đã đăng xuất thành công"})
    response.delete_cookie('session')
    return response, 200

@app.route('/register', methods=['POST'])
@limiter.limit("3 per minute")
def register():
    data = request.get_json()
    mssv = data.get('mssv')
    password = data.get('regPassword')
    cookie_name = "SSESSdf6f777d3f8a1d0fb2e4e5d1ec62f6e2"
    cookie_value = data.get('cookieValue')

    existing_user = users_collection.find_one({"mssv": mssv})

    if existing_user:
        return jsonify({"status": "error", "message": "Tài khoản đã tồn tại"}), 400

    try:
        info, record = get_new_userdata({cookie_name: cookie_value}, mssv)

        student_collection.insert_one(info)
        academic_records_collection.insert_one(record)

        users_collection.insert_one({
            "mssv": mssv,
            "password": password,
            "role": "student"
        })

        return jsonify({"status": "success", "message": "Đăng kí tài khoản thành công"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/academic_records')
def academic_records():
    if 'mssv' in session:
        # update_academic_records_summary(session['mssv'])
        academic_record = academic_records_collection.find_one({"mssv": session['mssv']})
        if academic_record and 'academic_records' in academic_record:
            return jsonify({"status": "success", "academic_records": academic_record})
        else:
            return jsonify({"status": "error", "message": "Không có dữ liệu kết quả học tập"}), 404
    return jsonify({"status": "error", "message": "Vui lòng đăng nhập"}), 401

@app.route('/curriculum')
def view_curriculum():
    if 'mssv' not in session:
        return jsonify({"status": "error", "message": "Vui lòng đăng nhập để xem chương trình đào tạo"}), 401
    student = student_collection.find_one({"mssv": session['mssv']})
    if not student or 'personal_info' not in student or 'faculty' not in student['personal_info']:
        return jsonify({"status": "error", "message": "Không tìm thấy thông tin khoa của sinh viên"}), 404
    student_major = student['personal_info']['major']
    program = subject_collection.find_one({"major": student_major})
    if not program or 'curriculum' not in program:
        return jsonify({"status": "error", "message": f"Không tìm thấy chương trình đào tạo cho khoa {student_major}"}), 404
    curriculum_by_category = {}
    for subject in program['curriculum']:
        category = subject['category']
        if category not in curriculum_by_category:
            curriculum_by_category[category] = []
        curriculum_by_category[category].append(subject)
    return jsonify({"status": "success", "faculty": student_major, "curriculum": curriculum_by_category})

@app.route('/scholarships')
def view_scholarships():
    if 'mssv' not in session:
        return jsonify({"status": "error", "message": "Vui lòng đăng nhập để xem thông báo"}), 401
    
    scholarships = list(mongo.db.scholarships_events.find().sort("created_at", -1))
    
    for schorlaship in scholarships:
        schorlaship['_id'] = str(schorlaship['_id'])
        if isinstance(schorlaship['created_at'], datetime):
            schorlaship['created_at'] = schorlaship['created_at'].isoformat()
        else:
            schorlaship['created_at'] = schorlaship['created_at']
    return jsonify({"status": "success", "scholarships": scholarships})
    

@app.route('/notifications')
def view_notifications():
    if 'mssv' not in session:
        return jsonify({"status": "error", "message": "Vui lòng đăng nhập để xem thông báo"}), 401
    notifications = list(mongo.db.notifications.find().sort("created_at", -1))
    for notification in notifications:
        notification['_id'] = str(notification['_id'])
        if isinstance(notification['created_at'], datetime):
            notification['created_at'] = notification['created_at'].isoformat()
    return jsonify({"status": "success", "notifications": notifications})

# Kiểm tra môn học đã hoàn thành hay chưa
def check_course_completion(course_code, mssv):
    academic_record = academic_records_collection.find_one({"mssv": mssv})
    if not academic_record or 'academic_records' not in academic_record:
        return False
    for record in academic_record['academic_records']:
        for course in record['courses']:
            if course.get('course_code') == course_code and course.get('complete') != 'Không hoàn thành':
                return True
    return False

# Gợi ý lịch học, gợi ý môn học
@app.route('/calendar')
def calendar():
    if 'mssv' not in session:
        return jsonify({
            "status": "error",
            "message": "Vui lòng đăng nhập để xem đánh giá hiệu suất học tập"
        }), 401

    mssv = session['mssv']
    
    # Lấy thông tin sinh viên từ student_collection (cho faculty)
    student = student_collection.find_one({"mssv": mssv})
    if not student:
        return jsonify({
            "status": "error",
            "message": "Không tìm thấy thông tin sinh viên"
        }), 404

    # Lấy academic records từ collection riêng
    academic_record = academic_records_collection.find_one({"mssv": mssv})
    if not academic_record or 'academic_records' not in academic_record:
        return jsonify({
            "status": "error",
            "message": "Không tìm thấy thông tin học tập của sinh viên"
        }), 404

    academic_records = academic_record['academic_records']

    personal_info = student.get('personal_info', {})
    major = personal_info.get('major')
    if not major:
        return jsonify({
            "status": "error",
            "message": "Không tìm thấy thông tin ngành của sinh viên"
        }), 404

    program = subject_collection.find_one({"major": major})
    if not program or 'curriculum' not in program:
        return jsonify({
            "status": "error",
            "message": f"Không tìm thấy chương trình đào tạo cho ngành {major}"
        }), 404
    mssv = session['mssv']
    student = student_collection.find_one({"mssv": mssv})
    if not student or 'personal_info' not in student or 'major' not in student['personal_info']:
        return jsonify({"status": "error", "message": "Không tìm thấy thông tin sinh viên"}), 404

    major = student['personal_info']['major']
    program = subject_collection.find_one({"major": major})
    if not program or 'curriculum' not in program:
        return jsonify({"status": "error", "message": f"Không tìm thấy chương trình đào tạo cho ngành {major}"}), 404

    curriculum = program['curriculum']

    # Lấy danh sách các môn học chưa hoàn thành
    # Môn đại cương
    general_subjects = []
    # Môn cơ sở ngành
    basic_subjects = []
    # Môn chuyên ngành
    specialized_subjects = []

    monGoiY = 0
    for subject in curriculum:
        course_code = subject.get('course_code')
        if course_code:
            is_completed = check_course_completion(course_code, mssv)
            if not is_completed:
                # Kiểm tra các môn tiên quyết đã hoàn thành hay chưa
                prerequisites = subject.get('prerequisites', [])
                prerequisites_completed = all(check_course_completion(prereq, mssv) for prereq in prerequisites)
                if prerequisites_completed:
                    if subject['category'] == 'Lý luận chính trị' or subject['category'] == 'Giáo dục thể chất' or subject['category'] == 'Ngoại ngữ' or subject['category'] == 'Toán - Tin học - Khoa học tự nhiên':
                        general_subjects.append(subject)
                        monGoiY += 1
                    elif subject['category'] == 'Cơ sở ngành':
                        basic_subjects.append(subject)
                        monGoiY += 1
                    elif subject['category'] == 'Chuyên ngành':
                        specialized_subjects.append(subject)
                        monGoiY += 1
    
    if monGoiY == 0:
        # Nếu không có môn nào để gợi ý học môn tốt nghiệp
        graduate_subjects = []
        for subject in curriculum:
            course_code = subject.get('course_code')
            if course_code:
                if course_code == 'NT522' or course_code == 'NT541' or course_code == 'NT533' or course_code == 'NT505':
                    graduate_subjects.append(subject)
        
        return jsonify({
            "status": "success",
            "message": "Kỳ sau sinh viên nên chọn môn học để tốt nghiệp",
            "graduate_subjects": graduate_subjects
        })
    
    # Nếu có môn để gợi ý học
    return jsonify({
        "status": "success",
        "message": "Kỳ sau sinh viên nên chọn hoàn thành các môn học sau",
        "general_subjects": general_subjects,
        "basic_subjects": basic_subjects,
        "specialized_subjects": specialized_subjects
    })

@app.route('/performance_review')
def performance_review():
    if 'mssv' not in session:
        return jsonify({
            "status": "error",
            "message": "Vui lòng đăng nhập để xem đánh giá hiệu suất học tập"
        }), 401

    mssv = session['mssv']
    
    # Lấy thông tin sinh viên từ student_collection (cho faculty)
    student = student_collection.find_one({"mssv": mssv})
    if not student:
        return jsonify({
            "status": "error",
            "message": "Không tìm thấy thông tin sinh viên"
        }), 404

    # Lấy academic records từ collection riêng
    academic_record = academic_records_collection.find_one({"mssv": mssv})
    if not academic_record or 'academic_records' not in academic_record:
        return jsonify({
            "status": "error",
            "message": "Không tìm thấy thông tin học tập của sinh viên"
        }), 404

    academic_records = academic_record['academic_records']

    personal_info = student.get('personal_info', {})
    major = personal_info.get('major')
    if not major:
        return jsonify({
            "status": "error",
            "message": "Không tìm thấy thông tin khoa của sinh viên"
        }), 404

    program = subject_collection.find_one({"major": major})
    if not program or 'curriculum' not in program:
        return jsonify({
            "status": "error",
            "message": f"Không tìm thấy chương trình đào tạo cho khoa {major}"
        }), 404

    semester_performance = []
    total_failed_courses = 0
    total_failed_credits = 0
    total_passed_courses = 0
    total_taken_credits = 0

    for record in academic_records:
        semester = record['semester']
        courses = record['courses']
        failed_courses_count = 0
        passed_courses_count = 0
        failed_credits_semester = 0
        taken_credits_semester = 0

        for course in courses:
            complete_status = course.get('complete', "")
            credits = course.get('credits', 0)
            total_score = course.get('total_score', "0")

            if complete_status == "Chưa hoàn thành":
                continue

            taken_credits_semester += credits
            if complete_status == "Không hoàn thành":
                failed_courses_count += 1
                failed_credits_semester += credits
            elif str(total_score).lower() != "miễn":
                passed_courses_count += 1

        semester_performance.append({
            "semester": semester,
            "failed_courses": failed_courses_count,
            "passed_courses": passed_courses_count,
            "failed_credits": failed_credits_semester,
            "taken_credits": taken_credits_semester
        })
        total_failed_courses += failed_courses_count
        total_failed_credits += failed_credits_semester
        total_passed_courses += passed_courses_count
        total_taken_credits += taken_credits_semester

    # Đánh giá tiến độ hoàn thành
    completed_required_credits = 0
    total_required_credits_in_program = 0
    remaining_required_courses = []
    completed_course_codes = set()

    if program and 'curriculum' in program:
        for subject in program['curriculum']:
            credits = subject.get('credits', 0) 
            if isinstance(credits, (int, float)):
                total_required_credits_in_program += credits
            course_code = subject.get('course_code')
            if course_code:
                is_completed = False
                for record in academic_records:
                    for course in record['courses']:
                        if (course.get('course_code') == course_code 
                            and course.get('complete') != 'Không hoàn thành' 
                            and course.get('complete') != 'Chưa hoàn thành'
                            and str(course.get('total_score', '0')).lower() != 'miễn'):
                            completed_required_credits += subject.get('credits', 0)
                            completed_course_codes.add(course_code)
                            is_completed = True
                            break
                    if is_completed:
                        break
                if not is_completed:
                    remaining_required_courses.append(subject)

    progress_percentage = (completed_required_credits / total_required_credits_in_program) * 100 if total_required_credits_in_program > 0 else 0
    # Ước tính khả năng tốt nghiệp đúng hạn
    standard_program_duration_semesters = 8  # Giả định
    current_semester = len(academic_records)
    remaining_semesters = standard_program_duration_semesters - current_semester
    remaining_required_credits = total_required_credits_in_program - completed_required_credits
    average_credits_per_semester_needed = remaining_required_credits / remaining_semesters if remaining_semesters > 0 else remaining_required_credits

    # Đánh giá dựa trên số môn Không hoàn thành, tiến độ và khối lượng công việc còn lại
    graduation_assessment_detail = "Đang tiến triển tốt"
    if total_failed_courses > 3:
        graduation_assessment_detail = "Cần chú ý đến các môn học bị Không hoàn thành và có kế hoạch học lại hợp lý."
    if progress_percentage < 50:
        graduation_assessment_detail = "Tiến độ đang chậm, cần tăng cường học tập để theo kịp chương trình."
    if remaining_semesters <= 1 and remaining_required_credits > 15:
        graduation_assessment_detail = "Có nguy cơ cao không tốt nghiệp đúng hạn do khối lượng môn học còn lại lớn."

    # Xem xét các môn Không hoàn thành có phải là môn học tiên quyết hay không
    failed_course_codes = set()
    for record in academic_records:
        for course in record['courses']:
            if course.get('complete') == 'Không hoàn thành':
                failed_course_codes.add(course.get('course_code'))

    # Tính toán chi phí học lại
    cost_per_credit = 980000
    total_retake_cost = total_failed_credits * cost_per_credit

    return jsonify({
        "status": "success",
        "semester_performance": semester_performance,
        "overall_performance": {
            "total_failed_courses": total_failed_courses,
            "total_failed_credits": total_failed_credits,
            "total_passed_courses": total_passed_courses,
            "total_taken_credits": total_taken_credits
        },
        "progress": {
            "percentage_completed": round(progress_percentage, 2),
            "completed_required_credits": completed_required_credits,
            "total_required_credits": total_required_credits_in_program,
            "remaining_required_courses": remaining_required_courses,
            "completed_course_codes": list(completed_course_codes)
        },
        "graduation_outlook": {
            "assessment": graduation_assessment_detail,
            "current_semester": current_semester,
            "remaining_semesters": remaining_semesters,
            "average_credits_per_semester_needed": round(average_credits_per_semester_needed, 2)
        },
        "retake_cost": {
            "total_cost": total_retake_cost,
            "cost_per_credit": cost_per_credit
        }
    })

# Thêm chức năng quên mật khẩu
@app.route('/forgot_password', methods=['POST'])
def forgot_password():
    data = request.get_json()
    mssv = data.get('fMssv')
    if not mssv:
        return jsonify({"status": "error", "message": "Vui lòng cung cấp mã số sinh viên"}), 400

    user = users_collection.find_one({"mssv": mssv})
    if user:
        try:
            # Tạo email message
            msg = MIMEText("Mật khẩu tạm thời của bạn là: ASDF1234@")
            msg['Subject'] = "Yêu cầu đặt lại mật khẩu"
            msg['From'] = ADMIN_EMAIL
            msg['To'] = f"{mssv}@gm.uit.edu.vn"

            # Kết nối đến SMTP server của Gmail
            with smtplib.SMTP_SSL('smtp.gmail.com', 465) as server:
                server.login(ADMIN_EMAIL, ADMIN_PASSWORD)
                server.sendmail(ADMIN_EMAIL, f"{mssv}@gm.uit.edu.vn", msg.as_string())

            print(f"Mật khẩu tạm thời đã được gửi đến email: {mssv}@gm.uit.edu.vn")
            return jsonify({"status": "success", "message": f"Mật khẩu tạm thời đã được gửi đến email: {mssv}@gm.uit.edu.vn"})

        except Exception as e:
            print(f"Lỗi khi gửi email: {e}")
            return jsonify({"status": "error", "message": "Có lỗi xảy ra khi gửi email. Vui lòng thử lại sau."}), 500
    else:
        return jsonify({"status": "error", "message": "Không tìm thấy người dùng với mã số sinh viên này"}), 404

# Thêm chức năng đổi mật khẩu
@app.route('/change_password', methods=['POST'])
def change_password():
    if 'mssv' not in session:
        return jsonify({"status": "error", "message": "Vui lòng đăng nhập"}), 401

    data = request.get_json()
    old_password = data.get('old_password')
    new_password = data.get('new_password')

    if not old_password or not new_password:
        return jsonify({"status": "error", "message": "Vui lòng nhập mật khẩu cũ và mật khẩu mới"}), 400

    mssv = session['mssv']
    user = users_collection.find_one({"mssv": mssv})

    if user and user.get('password') == old_password:
        users_collection.update_one({"mssv": mssv}, {"$set": {"password": new_password}})
        return jsonify({"status": "success", "message": "Đổi mật khẩu thành công"})
    else:
        return jsonify({"status": "error", "message": "Mật khẩu cũ không đúng"}), 401

# API lấy thông tin chi tiết về khóa học
@app.route('/api/course-info/<course_id>', methods=['GET'])
@app.route('/api/offered-courses/<course_id>', methods=['GET'])
@app.route('/api/course-students/<course_id>', methods=['GET'])
@app.route('/api/course-detail/<course_id>', methods=['GET'])
def get_course_detail(course_id):
    print(f"=== LẤY THÔNG TIN CHI TIẾT KHÓA HỌC: {course_id} ===")
    
    try:
        # Tìm khóa học từ collection offered_courses
        offered_courses_collection = mongo.db.offered_courses
        
        # Thử tìm với ObjectId
        try:
            course = offered_courses_collection.find_one({"_id": ObjectId(course_id)})
        except:
            # Thử tìm với string
            course = offered_courses_collection.find_one({"_id": course_id})
        
        # Chuyển ObjectId thành string để có thể serialize
        if isinstance(course['_id'], ObjectId):
            course['_id'] = str(course['_id'])
        
        # Chuyển các ObjectId khác thành string
        for field in ['course_id', 'instructor_id']:
            if field in course and isinstance(course[field], ObjectId):
                course[field] = str(course[field])
        
        # Xử lý danh sách sinh viên
        students = course.get('students', [])
        for student in students:
            if 'student_id' in student and isinstance(student['student_id'], ObjectId):
                student['student_id'] = str(student['student_id'])
        
        # Đếm số sinh viên đã đăng ký
        course['student_count'] = len(students)
        
        # Xử lý các trường số từ MongoDB
        for field in ['credits', 'max_enrollment']:
            if field in course and isinstance(course[field], dict):
                if '$numberInt' in course[field]:
                    course[field] = int(course[field]['$numberInt'])
                elif '$numberDouble' in course[field]:
                    course[field] = float(course[field]['$numberDouble'])
        
        # Xử lý các trường số trong danh sách sinh viên
        students = course.get('students', [])
        for student in students:
            if 'grades' in student and isinstance(student['grades'], dict):
                for grade_type, grade_value in student['grades'].items():
                    if isinstance(grade_value, dict):
                        if '$numberInt' in grade_value:
                            student['grades'][grade_type] = int(grade_value['$numberInt'])
                        elif '$numberDouble' in grade_value:
                            student['grades'][grade_type] = float(grade_value['$numberDouble'])
        
        # Xử lý grading_schema nếu có
        if 'grading_schema' in course and isinstance(course['grading_schema'], dict):
            for weight_field in ['assignments_weight', 'midterm_weight', 'final_weight', 'attendance_weight']:
                if weight_field in course['grading_schema'] and isinstance(course['grading_schema'][weight_field], dict):
                    if '$numberDouble' in course['grading_schema'][weight_field]:
                        course['grading_schema'][weight_field] = float(course['grading_schema'][weight_field]['$numberDouble'])
            
            # Xử lý grading_scale nếu có
            if 'grading_scale' in course['grading_schema'] and isinstance(course['grading_schema']['grading_scale'], list):
                for scale in course['grading_schema']['grading_scale']:
                    if 'min_score' in scale and isinstance(scale['min_score'], dict) and '$numberDouble' in scale['min_score']:
                        scale['min_score'] = float(scale['min_score']['$numberDouble'])
        
        # Tạo các response cho các endpoint khác nhau
        course_info = course.copy()
        offered_course = course.copy()
        
        return jsonify({
            "status": "success",
            "message": "Lấy thông tin khóa học thành công",
            "course": course_info,
            "offered_course": offered_course,
            "students": students,
            "student_count": len(students)
        })
    
    except Exception as e:
        print(f"Lỗi khi lấy thông tin khóa học: {e}")
        return jsonify({
            "status": "error",
            "message": f"Lỗi khi lấy thông tin khóa học: {str(e)}"
        }), 500

# API lấy danh sách khóa học của giảng viên
@app.route('/api/instructor/courses', methods=['GET'])
def get_instructor_courses():
    print("=== LẤY DANH SÁCH KHÓA HỌC CỦA GIẢNG VIÊN ===")
    
    try:
        # Kiểm tra xem người dùng đã đăng nhập chưa
        if 'user_id' not in session and 'instructor_id' not in session:
            print("Người dùng chưa đăng nhập")
            return jsonify({
                "status": "error",
                "message": "Vui lòng đăng nhập để xem danh sách khóa học"
            }), 401
        
        # Lấy ID người dùng từ session
        user_id = session.get('user_id') or session.get('instructor_id')
        print(f"User ID từ session: {user_id}")
        
        # Tìm thông tin giảng viên từ collection instructors dựa trên user_id
        instructor_collection = mongo.db.instructors
        
        # Thử tìm giảng viên bằng user_id (dưới dạng ObjectId)
        try:
            instructor = instructor_collection.find_one({"user_id": ObjectId(user_id)})
        except:
            instructor = instructor_collection.find_one({"user_id": user_id})
        
        if not instructor:
            # Nếu không tìm thấy, thử tìm trực tiếp bằng ID
            try:
                instructor = instructor_collection.find_one({"_id": ObjectId(user_id)})
            except:
                instructor = None
        
        
            instructor_id = user_id
        else:
            # Chuyển ObjectId thành string
            instructor_id = str(instructor['_id'])
            instructor['_id'] = instructor_id
            
            # Chuyển các ObjectId khác thành string
            if 'user_id' in instructor and isinstance(instructor['user_id'], ObjectId):
                instructor['user_id'] = str(instructor['user_id'])
            if 'faculty_id' in instructor and isinstance(instructor['faculty_id'], ObjectId):
                instructor['faculty_id'] = str(instructor['faculty_id'])
        
        print(f"Instructor ID: {instructor_id}")
        
        # Tìm các khóa học từ collection offered_courses
        offered_courses_collection = mongo.db.offered_courses
        
        # Thử tìm khóa học bằng instructor_id (cả dạng string và ObjectId)
        try:
            # Thử tìm với ObjectId
            courses = list(offered_courses_collection.find({"instructor_id": ObjectId(instructor_id)}))
        except:
            # Thử tìm với string
            courses = list(offered_courses_collection.find({"instructor_id": instructor_id}))
        
        # Xử lý dữ liệu khóa học
        for course in courses:
            # Chuyển ObjectId thành string để có thể serialize
            if isinstance(course['_id'], ObjectId):
                course['_id'] = str(course['_id'])
            
            # Chuyển các ObjectId khác thành string
            for field in ['course_id', 'instructor_id']:
                if field in course and isinstance(course[field], ObjectId):
                    course[field] = str(course[field])
            
            # Đếm số sinh viên đã đăng ký
            if 'students' in course:
                # Chuyển ObjectId trong danh sách sinh viên thành string
                for student in course['students']:
                    if 'student_id' in student and isinstance(student['student_id'], ObjectId):
                        student['student_id'] = str(student['student_id'])
                
                course['student_count'] = len(course['students'])
            elif 'enrolled_students' in course:
                course['student_count'] = len(course['enrolled_students'])
            else:
                course['student_count'] = course.get('student_count', 0)
            
            # Đảm bảo trường credits là số
            if 'credits' in course and isinstance(course['credits'], dict) and '$numberInt' in course['credits']:
                course['credits'] = int(course['credits']['$numberInt'])
            
            # Đảm bảo trường max_enrollment là số
            if 'max_enrollment' in course and isinstance(course['max_enrollment'], dict) and '$numberInt' in course['max_enrollment']:
                course['max_enrollment'] = int(course['max_enrollment']['$numberInt'])
        
        # Log dữ liệu khóa học để debug
        for i, course in enumerate(courses):
            print(f"Khóa học {i+1}: {course['course_name']}")
        
        # Chuẩn bị dữ liệu giảng viên cho frontend
        instructor_data = {
            "id": instructor['_id'],
            "instructor_id": instructor.get('instructor_id', ''),
            "name": instructor.get('personal_info', {}).get('full_name', ''),
            "full_name": instructor.get('personal_info', {}).get('full_name', ''),
            "email": instructor.get('contact', {}).get('email', ''),
            "phone": instructor.get('contact', {}).get('phone', ''),
            "department": instructor.get('academic_info', {}).get('specialization', ''),
            "position": instructor.get('academic_info', {}).get('degree', 'Giảng viên')
        }
        
        return jsonify({
            "status": "success",
            "message": "Lấy danh sách khóa học thành công",
            "instructor": instructor_data,
            "courses": courses,
            "data": courses,
            "count": len(courses)
        })
    
    except Exception as e:
        print(f"Lỗi khi lấy danh sách khóa học: {e}")
        return jsonify({
            "status": "error",
            "message": f"Lỗi khi lấy danh sách khóa học: {str(e)}"
        }), 500

# Đăng ký module instructor
try:
    from instructor_module import init_app as init_instructor_module
    init_instructor_module(app, mongo)
    print("Đã đăng ký module instructor thành công")
except ImportError as e:
    print(f"Lỗi khi import module instructor: {e}")
except Exception as e:
    print(f"Lỗi khi đăng ký module instructor: {e}")

# Admin routes đã được chuyển sang module admin

# Admin API endpoints đã được chuyển sang module admin

# Import và khởi tạo module admin
try:
    from admin import init_admin
    init_admin(app)
    print("Admin module loaded successfully")
except Exception as e:
    print(f"Error loading admin module: {e}")

if __name__ == '__main__':
    app.run(debug=True)
