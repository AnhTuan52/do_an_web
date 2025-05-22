from admin.routes import admin_bp

def init_admin(app):
    """
    Khởi tạo và đăng ký blueprint admin với ứng dụng Flask
    
    Args:
        app: Ứng dụng Flask
    """
    app.register_blueprint(admin_bp)
    
    print("Admin module initialized successfully")