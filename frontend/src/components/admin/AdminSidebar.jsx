import React, { useState, useEffect, useContext } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { AuthContext } from "/src/components/AuthContext.jsx";
import { FaHome, FaUserGraduate, FaChalkboardTeacher, FaBook, FaBell, FaCog, FaBars } from "react-icons/fa";

function AdminSidebar({ setActiveComponent }) {
    const [isOpen, setIsOpen] = useState(true); // Mặc định mở sidebar trên desktop
    const location = useLocation();
    const { logout, message, isLoggingOut } = useContext(AuthContext);
    const navigate = useNavigate();

    // Kiểm tra kích thước màn hình khi component được mount
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth <= 768) {
                setIsOpen(false); // Đóng sidebar trên mobile
            } else {
                setIsOpen(true); // Mở sidebar trên desktop
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

    const toggleSidebar = () => {
        setIsOpen(!isOpen);
    };

    const closeSidebar = () => {
        if (window.innerWidth <= 768) {
            setIsOpen(false);
        }
    };

    // Menu items cho admin
    const adminMenuItems = [
        { name: "Trang chủ", path: "home", icon: <FaHome className="text-xl" /> },
        { name: "Quản lý sinh viên", path: "students", icon: <FaUserGraduate className="text-xl" /> },
        { name: "Quản lý giảng viên", path: "instructors", icon: <FaChalkboardTeacher className="text-xl" /> },
        { name: "Quản lý lớp học", path: "classes", icon: <FaBook className="text-xl" /> },
        { name: "Quản lý thông báo", path: "notifications", icon: <FaBell className="text-xl" /> },
        { name: "Cài đặt", path: "settings", icon: <FaCog className="text-xl" /> },
    ];

    return (
        <>
            <nav className="fixed top-0 left-0 w-full h-[60px] flex items-center bg-gray-100 dark:bg-[#212121] shadow-sm dark:shadow-lg z-[1000] transition-colors duration-300 ease-in-out">
                <div className="logo flex flex-row items-center justify-between flex-1 mx-6 md:mx-6 mr-1">
                    <div className="logo-container flex items-center">
                        <button
                            className="text-gray-700 dark:text-gray-200 text-2xl mr-2.5 cursor-pointer transition-colors duration-300 ease-in-out flex items-center justify-center"
                            onClick={toggleSidebar}
                            aria-label="Toggle sidebar"
                        >
                            <FaBars />
                        </button>
                        <span className="webName text-gray-800 dark:text-gray-200 text-[22px] font-medium transition-colors duration-300 ease-in-out">
                            Admin Portal
                        </span>
                    </div>
                    <div className="userSection flex items-center">
                        <button
                            type="button"
                            className="border border-purple-500 text-purple-500 dark:text-purple-300 dark:border-purple-300 hover:bg-purple-500 dark:hover:bg-purple-600 hover:text-white dark:hover:text-white font-medium rounded-lg px-4 py-1 transition-colors duration-300 ease-in-out"
                            onClick={logout}
                            disabled={isLoggingOut}
                        >
                            Sign out
                        </button>
                    </div>
                </div>
            </nav>

            {/* Sidebar */}
            <div className={`sidebar fixed top-0 bg-gray-50 dark:bg-[#181818] h-full w-[260px] py-5 shadow-lg transition-all duration-300 ease-in-out z-[900] ${isOpen ? "left-0" : "-left-[260px]"}`}>
                <div className="logo flex items-center mx-6 mt-[10px]">
                    <button
                        className="text-gray-900 dark:text-gray-200 text-2xl mr-2.5 cursor-pointer transition-colors duration-300 ease-in-out flex items-center justify-center"
                        onClick={toggleSidebar}
                        aria-label="Close sidebar"
                    >
                        <FaBars />
                    </button>
                    <span className="webName text-gray-800 dark:text-gray-200 text-[22px] transition-colors duration-300 ease-in-out font-medium">
                        Admin Portal
                    </span>
                </div>
                <div className="sidebar-content flex flex-col flex-1 h-full w-full p-8 px-4 mt-4">
                    <ul className="lists p-0 m-0">
                        {adminMenuItems.map((item) => (
                            <li key={item.path} className="list list-none mb-1">
                                <Link
                                    to={`/admin/${item.path}`}
                                    className={`group nav-link flex items-center p-3.5 px-3 rounded-lg no-underline transition-all duration-300 ${location.pathname === `/admin/${item.path}`
                                        ? "bg-purple-300 dark:bg-purple-500 shadow-md"
                                        : "bg-gray-50 dark:bg-[#181818] hover:bg-purple-500 dark:hover:bg-purple-600 hover:translate-x-1"
                                        }`}
                                    onClick={() => {
                                        if (setActiveComponent) {
                                            setActiveComponent(item.path);
                                        }
                                        closeSidebar();
                                    }}
                                >
                                    <span className={`icon mr-3.5 transition-transform duration-300 ${location.pathname === `/admin/${item.path}`
                                        ? "text-purple-600 dark:text-purple-900"
                                        : "text-gray-500 dark:text-gray-200 group-hover:text-white dark:group-hover:text-black"
                                        }`}>
                                        {item.icon}
                                    </span>
                                    <span className={`component text-base font-normal ${location.pathname === `/admin/${item.path}`
                                        ? "text-purple-600 dark:text-purple-900"
                                        : "text-gray-500 dark:text-gray-200 group-hover:text-white dark:group-hover:text-black"
                                        }`}>
                                        {item.name}
                                    </span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            {/* Overlay for mobile */}
            {isOpen && (
                <div
                    className="md:hidden block fixed inset-0 bg-black bg-opacity-50 z-[800]"
                    onClick={toggleSidebar}
                ></div>
            )}
        </>
    );
}

export default AdminSidebar;