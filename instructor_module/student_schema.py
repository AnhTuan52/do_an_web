# Định nghĩa schema cho sinh viên trong lớp học
# File này được sử dụng để đảm bảo tính nhất quán của dữ liệu

# Schema mặc định cho điểm số sinh viên
DEFAULT_GRADES_SCHEMA = {
    "midterm": None,
    "final": None,
    "total": None,
    "assignments": None,
    "attendance": None
}

# Hàm để đảm bảo dữ liệu sinh viên có đúng cấu trúc
def ensure_student_schema(student_data):
    """
    Đảm bảo dữ liệu sinh viên có đúng cấu trúc với các trường bắt buộc
    
    Args:
        student_data (dict): Dữ liệu sinh viên cần kiểm tra
        
    Returns:
        dict: Dữ liệu sinh viên đã được chuẩn hóa
    """
    if not student_data:
        return None
    
    # Đảm bảo các trường cơ bản
    if 'student_id' not in student_data:
        return None
    
    # Đảm bảo có trường grades
    if 'grades' not in student_data:
        student_data['grades'] = DEFAULT_GRADES_SCHEMA.copy()
    else:
        # Đảm bảo grades có đầy đủ các trường
        for field, default_value in DEFAULT_GRADES_SCHEMA.items():
            if field not in student_data['grades']:
                student_data['grades'][field] = default_value
    
    # Đảm bảo các trường thông tin cơ bản khác
    if 'status' not in student_data:
        student_data['status'] = 'active'
    
    return student_data

# Hàm để chuẩn hóa danh sách sinh viên
def normalize_students_list(students_list):
    """
    Chuẩn hóa danh sách sinh viên để đảm bảo mỗi sinh viên có đúng cấu trúc
    
    Args:
        students_list (list): Danh sách sinh viên cần chuẩn hóa
        
    Returns:
        list: Danh sách sinh viên đã được chuẩn hóa
    """
    if not students_list or not isinstance(students_list, list):
        return []
    
    normalized_list = []
    for student in students_list:
        normalized_student = ensure_student_schema(student)
        if normalized_student:
            normalized_list.append(normalized_student)
    
    return normalized_list