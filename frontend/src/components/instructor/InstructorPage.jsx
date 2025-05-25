import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import Sidebar from "../Sidebar.jsx";
import api from '../../utils/api';

// Import các component con
import InstructorDashboard from "./InstructorDashboard.jsx";
import InstructorHome from "./InstructorHome.jsx";
import ClassDetail from "./ClassDetail.jsx";
import GradeManagement from "./GradeManagement.jsx";


/**
 * Component chính cho trang giảng viên
 * Quản lý layout và routing cho toàn bộ phần giảng viên
 */
function InstructorPage() {
    const navigate = useNavigate();
    const [instructor, setInstructor] = useState(null);
    const [loading, setLoading] = useState(true);

    // Lấy thông tin giảng viên khi component được mount
    useEffect(() => {
        const fetchInstructorProfile = async () => {
            try {
                const response = await api.get('/api/instructor/profile');

                if (response.data.status === 'success') {
                    setInstructor(response.data.instructor || response.data.data || null);
                }
            } catch (error) {
                console.error('Lỗi khi lấy thông tin giảng viên:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchInstructorProfile();
    }, []);

    return (
        <div className="flex flex-col md:flex-row min-h-screen bg-gray-100">
            {/* Sidebar */}
            <Sidebar role="instructor" />

            {/* Dashboard */}
            <main className="main-content flex-grow flex md:w-[calc(100%-260px)] w-full max-w-[1400px] mt-[60px] p-2.5 pt-0 pl-0 pr-0 md:ml-[260px] ml-0 mr-0 mb-8 overflow-x-hidden transition-all duration-300 ease-in-out">
                {loading ? (
                    <div className="flex items-center justify-center h-screen">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                    </div>
                ) : (
                    <Routes>
                        <Route path="/*" element={<InstructorDashboard />}>
                            <Route index element={<InstructorHome />} />
                            <Route path="home" element={<InstructorHome />} />

                            {/* Classes routes */}
                            <Route path="classes/:classId" element={<ClassDetail />} />
                            <Route path="classes/:classId/grades" element={<GradeManagement />} />
                            <Route path="classes/:classId/grades/:studentId" element={<GradeManagement />} />

                            {/* Courses routes (aliases for classes) */}
                            <Route path="courses/:classId" element={<ClassDetail />} />
                            <Route path="courses/:classId/grades" element={<GradeManagement />} />
                            <Route path="courses/:classId/grades/:studentId" element={<GradeManagement />} />

                            {/* Dashboard routes (aliases for courses) */}
                            <Route path="dashboard/courses/:classId" element={<ClassDetail />} />
                            <Route path="dashboard/courses/:classId/grades" element={<GradeManagement />} />
                            <Route path="dashboard/courses/:classId/grades/:studentId" element={<GradeManagement />} />
                            <Route path="dashboard/courses/:classId/students" element={<ClassDetail />} />

                            {/* Students routes - removed */}
                            {/* <Route path="students" element={<ManageStudents />} /> */}

                            {/* Test route - removed */}
                        </Route>
                    </Routes>
                )}
            </main>
        </div>
    );
}

export default InstructorPage;
