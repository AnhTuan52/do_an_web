# Instructor module
import logging
from flask import Flask

# Lấy logger
logger = logging.getLogger(__name__)

def init_app(app, mongo_client):
    """
    Khởi tạo module instructor và đăng ký blueprint
    
    Args:
        app: Flask application
        mongo_client: MongoDB client
    """
    try:
        logger.info("Bắt đầu khởi tạo module instructor...")
        
        # Import routes và auth từ module
        from instructor_module.routes import init_app as init_routes
        from instructor_module.auth import init_app as init_auth
        
        # Khởi tạo routes
        logger.info("Đang khởi tạo routes...")
        init_routes(app, mongo_client)
        
        # Khởi tạo auth
        logger.info("Đang khởi tạo auth...")
        init_auth(app, mongo_client)
        
        logger.info("Đã khởi tạo module instructor thành công")
        return True
    except ImportError as e:
        logger.error(f"Lỗi khi import module: {str(e)}")
        logger.error("Vui lòng kiểm tra lại các file routes.py và auth.py")
        raise
    except Exception as e:
        logger.error(f"Lỗi khi khởi tạo module instructor: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        raise