const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');
const { getDb } = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Middleware xác thực admin
const authenticateAdmin = async (req, res, next) => {
    try {
        // Kiểm tra token từ cookie
        const token = req.cookies.adminToken;
        if (!token) {
            return res.status(401).json({ status: 'error', message: 'Không có quyền truy cập' });
        }

        // Xác thực token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (!decoded || !decoded.adminId) {
            return res.status(401).json({ status: 'error', message: 'Token không hợp lệ' });
        }

        // Lấy thông tin admin từ database
        const db = getDb();
        const admin = await db.collection('admins').findOne({ _id: new ObjectId(decoded.adminId) });
        if (!admin) {
            return res.status(401).json({ status: 'error', message: 'Admin không tồn tại' });
        }

        // Lưu thông tin admin vào request để sử dụng ở các route khác
        req.admin = admin;
        next();
    } catch (error) {
        console.error('Lỗi xác thực admin:', error);
        return res.status(401).json({ status: 'error', message: 'Không có quyền truy cập' });
    }
};

// Route đăng nhập admin
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ status: 'error', message: 'Vui lòng nhập đầy đủ thông tin' });
        }

        // Tìm admin trong database
        const db = getDb();
        const admin = await db.collection('admins').findOne({ email });
        if (!admin) {
            return res.status(401).json({ status: 'error', message: 'Email hoặc mật khẩu không đúng' });
        }

        // Kiểm tra mật khẩu
        const isPasswordValid = await bcrypt.compare(password, admin.password);
        if (!isPasswordValid) {
            return res.status(401).json({ status: 'error', message: 'Email hoặc mật khẩu không đúng' });
        }

        // Tạo token
        const token = jwt.sign(
            { adminId: admin._id.toString(), role: 'admin' },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Lưu token vào cookie
        res.cookie('adminToken', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 24 * 60 * 60 * 1000 // 24 giờ
        });

        // Trả về thông tin admin (không bao gồm mật khẩu)
        const { password: _, ...adminInfo } = admin;
        return res.status(200).json({
            status: 'success',
            message: 'Đăng nhập thành công',
            admin: adminInfo,
            role: 'admin'
        });
    } catch (error) {
        console.error('Lỗi đăng nhập admin:', error);
        return res.status(500).json({ status: 'error', message: 'Lỗi server' });
    }
});

// Route kiểm tra phiên đăng nhập
router.get('/check-session', authenticateAdmin, (req, res) => {
    const { password, ...adminInfo } = req.admin;
    return res.status(200).json({
        status: 'success',
        admin: adminInfo,
        role: 'admin'
    });
});

// Route đăng xuất
router.post('/logout', (req, res) => {
    res.clearCookie('adminToken');
    return res.status(200).json({ status: 'success', message: 'Đăng xuất thành công' });
});

// Route lấy danh sách sinh viên
router.get('/students', authenticateAdmin, async (req, res) => {
    try {
        const db = getDb();
        const students = await db.collection('students').find({}).toArray();
        return res.status(200).json({ status: 'success', students });
    } catch (error) {
        console.error('Lỗi lấy danh sách sinh viên:', error);
        return res.status(500).json({ status: 'error', message: 'Lỗi server' });
    }
});

// Route lấy thông tin chi tiết sinh viên
router.get('/students/:studentId', authenticateAdmin, async (req, res) => {
    try {
        const { studentId } = req.params;
        const db = getDb();

        // Lấy thông tin sinh viên
        const student = await db.collection('students').findOne({ _id: new ObjectId(studentId) });
        if (!student) {
            return res.status(404).json({ status: 'error', message: 'Không tìm thấy sinh viên' });
        }

        // Lấy kết quả học tập của sinh viên
        const academicRecords = await db.collection('academic_records')
            .find({ student_id: studentId })
            .toArray();

        return res.status(200).json({
            status: 'success',
            student,
            academicRecords
        });
    } catch (error) {
        console.error('Lỗi lấy thông tin sinh viên:', error);
        return res.status(500).json({ status: 'error', message: 'Lỗi server' });
    }
});

// Route lấy danh sách lớp học
router.get('/classes', authenticateAdmin, async (req, res) => {
    try {
        const db = getDb();
        const classes = await db.collection('classes').find({}).toArray();
        return res.status(200).json({ status: 'success', classes });
    } catch (error) {
        console.error('Lỗi lấy danh sách lớp học:', error);
        return res.status(500).json({ status: 'error', message: 'Lỗi server' });
    }
});

// Route lấy thông tin chi tiết lớp học
router.get('/classes/:classId', authenticateAdmin, async (req, res) => {
    try {
        const { classId } = req.params;
        const db = getDb();

        // Lấy thông tin lớp học
        const classInfo = await db.collection('classes').findOne({ _id: new ObjectId(classId) });
        if (!classInfo) {
            return res.status(404).json({ status: 'error', message: 'Không tìm thấy lớp học' });
        }

        // Lấy danh sách sinh viên trong lớp
        const enrollments = await db.collection('enrollments')
            .find({ class_id: classId })
            .toArray();

        // Lấy thông tin chi tiết của từng sinh viên
        const studentIds = enrollments.map(e => e.student_id);
        const students = await db.collection('students')
            .find({ _id: { $in: studentIds.map(id => new ObjectId(id)) } })
            .toArray();

        // Lấy thông tin giảng viên
        const instructor = await db.collection('instructors')
            .findOne({ _id: new ObjectId(classInfo.instructor_id) });

        return res.status(200).json({
            status: 'success',
            class: classInfo,
            students,
            instructor
        });
    } catch (error) {
        console.error('Lỗi lấy thông tin lớp học:', error);
        return res.status(500).json({ status: 'error', message: 'Lỗi server' });
    }
});

// Route lấy danh sách giảng viên
router.get('/instructors', authenticateAdmin, async (req, res) => {
    try {
        const db = getDb();
        const instructors = await db.collection('instructors').find({}).toArray();
        return res.status(200).json({ status: 'success', instructors });
    } catch (error) {
        console.error('Lỗi lấy danh sách giảng viên:', error);
        return res.status(500).json({ status: 'error', message: 'Lỗi server' });
    }
});

// Route lấy thông tin chi tiết giảng viên
router.get('/instructors/:instructorId', authenticateAdmin, async (req, res) => {
    try {
        const { instructorId } = req.params;
        const db = getDb();

        // Lấy thông tin giảng viên
        const instructor = await db.collection('instructors').findOne({ _id: new ObjectId(instructorId) });
        if (!instructor) {
            return res.status(404).json({ status: 'error', message: 'Không tìm thấy giảng viên' });
        }

        // Lấy danh sách lớp học của giảng viên
        const classes = await db.collection('classes')
            .find({ instructor_id: instructorId })
            .toArray();

        return res.status(200).json({
            status: 'success',
            instructor,
            classes
        });
    } catch (error) {
        console.error('Lỗi lấy thông tin giảng viên:', error);
        return res.status(500).json({ status: 'error', message: 'Lỗi server' });
    }
});

// Route tạo thông báo mới
router.post('/notifications', authenticateAdmin, async (req, res) => {
    try {
        const { title, content, target_type, target_ids } = req.body;

        if (!title || !content || !target_type) {
            return res.status(400).json({
                status: 'error',
                message: 'Vui lòng nhập đầy đủ thông tin thông báo'
            });
        }

        const db = getDb();

        // Tạo thông báo mới
        const notification = {
            title,
            content,
            target_type, // 'all', 'students', 'instructors', 'specific'
            target_ids: target_ids || [], // Danh sách ID người nhận cụ thể (nếu target_type là 'specific')
            created_at: new Date(),
            created_by: req.admin._id.toString(),
            is_active: true
        };

        const result = await db.collection('notifications').insertOne(notification);

        return res.status(201).json({
            status: 'success',
            message: 'Tạo thông báo thành công',
            notification_id: result.insertedId
        });
    } catch (error) {
        console.error('Lỗi tạo thông báo:', error);
        return res.status(500).json({ status: 'error', message: 'Lỗi server' });
    }
});

// Route lấy danh sách thông báo
router.get('/notifications', authenticateAdmin, async (req, res) => {
    try {
        const db = getDb();
        const notifications = await db.collection('notifications')
            .find({})
            .sort({ created_at: -1 })
            .toArray();

        return res.status(200).json({
            status: 'success',
            notifications
        });
    } catch (error) {
        console.error('Lỗi lấy danh sách thông báo:', error);
        return res.status(500).json({ status: 'error', message: 'Lỗi server' });
    }
});

// Route cập nhật thông báo
router.put('/notifications/:notificationId', authenticateAdmin, async (req, res) => {
    try {
        const { notificationId } = req.params;
        const { title, content, is_active } = req.body;

        const db = getDb();

        // Kiểm tra thông báo tồn tại
        const notification = await db.collection('notifications').findOne({ _id: new ObjectId(notificationId) });
        if (!notification) {
            return res.status(404).json({ status: 'error', message: 'Không tìm thấy thông báo' });
        }

        // Cập nhật thông báo
        const updateData = {};
        if (title !== undefined) updateData.title = title;
        if (content !== undefined) updateData.content = content;
        if (is_active !== undefined) updateData.is_active = is_active;
        updateData.updated_at = new Date();

        await db.collection('notifications').updateOne(
            { _id: new ObjectId(notificationId) },
            { $set: updateData }
        );

        return res.status(200).json({
            status: 'success',
            message: 'Cập nhật thông báo thành công'
        });
    } catch (error) {
        console.error('Lỗi cập nhật thông báo:', error);
        return res.status(500).json({ status: 'error', message: 'Lỗi server' });
    }
});

// Route xóa thông báo
router.delete('/notifications/:notificationId', authenticateAdmin, async (req, res) => {
    try {
        const { notificationId } = req.params;

        const db = getDb();

        // Kiểm tra thông báo tồn tại
        const notification = await db.collection('notifications').findOne({ _id: new ObjectId(notificationId) });
        if (!notification) {
            return res.status(404).json({ status: 'error', message: 'Không tìm thấy thông báo' });
        }

        // Xóa thông báo
        await db.collection('notifications').deleteOne({ _id: new ObjectId(notificationId) });

        return res.status(200).json({
            status: 'success',
            message: 'Xóa thông báo thành công'
        });
    } catch (error) {
        console.error('Lỗi xóa thông báo:', error);
        return res.status(500).json({ status: 'error', message: 'Lỗi server' });
    }
});

module.exports = router;