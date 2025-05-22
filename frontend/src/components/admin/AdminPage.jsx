import React, { useState } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import AdminHome from './AdminHome';
import StudentManagement from './StudentManagement';
import InstructorManagement from './InstructorManagement';
import ClassManagement from './ClassManagement';
import NotificationManagement from './NotificationManagement';
import AdminSettings from './AdminSettings';

function AdminPage() {
    const [activeComponent, setActiveComponent] = useState('home');
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const navigate = useNavigate();

    // Kiểm tra kích thước màn hình khi component được mount
    React.useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth <= 768) {
                setSidebarOpen(false); // Đóng sidebar trên mobile
            } else {
                setSidebarOpen(true); // Mở sidebar trên desktop
            }
        };

        // Gọi hàm khi component mount
        handleResize();

        // Thêm event listener
        window.addEventListener('resize', handleResize);

        // Cleanup
        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    return (
        <div className="flex flex-col min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors duration-300">
            <AdminSidebar
                setActiveComponent={setActiveComponent}
                isOpen={sidebarOpen}
                setIsOpen={setSidebarOpen}
            />

            <div className={`flex-1 transition-all duration-300 mt-[60px] p-6 ${sidebarOpen ? 'md:ml-[260px]' : 'ml-0'}`}>
                <Routes>
                    <Route path="/" element={<AdminHome />} />
                    <Route path="/home" element={<AdminHome />} />
                    <Route path="/students" element={<StudentManagement />} />
                    <Route path="/instructors" element={<InstructorManagement />} />
                    <Route path="/classes" element={<ClassManagement />} />
                    <Route path="/notifications" element={<NotificationManagement />} />
                    <Route path="/settings" element={<AdminSettings />} />
                </Routes>
            </div>
        </div>
    );
}

export default AdminPage;