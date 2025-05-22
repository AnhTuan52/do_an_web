import React, { useState, useEffect, useContext } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useLocation, Link } from "react-router-dom";
import axios from "axios";
import { ThemeContext } from "/src/App.jsx";
import { AuthContext } from "/src/components/AuthContext.jsx";

function Sidebar({ setActiveComponent, role = "student" }) {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const { logout, message, isLoggingOut } = useContext(AuthContext);

  const { data: student } = useQuery({
    queryKey: ["student"],
    queryFn: async () => {
      // Chỉ gọi API nếu là sinh viên
      if (role === "student") {
        const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/user`, { withCredentials: true });
        if (response.data.status !== "success") {
          throw new Error(response.data.message || "Không thể tải thông tin sinh viên.");
        }
        return response.data.student;
      }
      return null;
    },
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5,
    enabled: role === "student", // Chỉ kích hoạt query nếu là sinh viên
  });

  const { data: academicRecords = { academic_records: [] } } = useQuery({
    queryKey: ["academicRecords"],
    queryFn: async () => {
      if (role === "student") {
        const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/academic_records`, { withCredentials: true });
        if (response.data.status !== "success") {
          throw new Error(response.data.message || "Không thể tải kết quả học tập.");
        }
        return response.data.academic_records;
      }
      return { academic_records: [] };
    },
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5,
    enabled: role === "student",
    onError: (error) => {
      console.error("Error fetching academic records:", error);
    }
  });

  const { data: performance = {} } = useQuery({
    queryKey: ["performance"],
    queryFn: async () => {
      if (role === "student") {
        const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/performance_review`, { withCredentials: true });
        if (response.data.status !== "success") {
          return {};
        }
        return response.data;
      }
      return {};
    },
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5,
    enabled: role === "student",
    onError: (error) => {
      console.log("Error fetching performance data:", error);
    }
  });

  const { data: curriculum = {} } = useQuery({
    queryKey: ["curriculum"],
    queryFn: async () => {
      if (role === "student") {
        const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/curriculum`, { withCredentials: true });
        if (response.data.status !== "success") {
          throw new Error(response.data.message || "Không thể tải chương trình đào tạo");
        }
        return {
          curriculum: response.data.curriculum,
          studentFaculty: response.data.faculty,
        };
      }
      return {};
    },
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    enabled: role === "student",
  });

  const { data: calendar = {} } = useQuery({
    queryKey: ["calendar"],
    queryFn: async () => {
      if (role === "student") {
        const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/calendar`, {
          withCredentials: true,
        });
        if (response.data.status !== "success") {
          throw new Error(response.data.message || "Không thể tải lịch học.");
        }
        return response.data;
      }
      return {};
    },
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5,
    enabled: role === "student",
  });

  const { data: scholarships = [] } = useQuery({
    queryKey: ["scholarships"],
    queryFn: async () => {
      if (role === "student") {
        const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/scholarships`, { withCredentials: true });
        if (response.data.status !== "success") {
          throw new Error(response.data.message || "Không thể tải thông tin học bổng!");
        }
        return response.data.scholarships;
      }
      return [];
    },
    enabled: role === "student",
  });

  const fullNName = student?.personal_info?.full_name || "";

  // const logoutMutation = useMutation({
  //   mutationFn: async () => {

  //     const response = await axios.post("http://localhost:5000/logout", {}, { withCredentials: true });
  //     if (response.data.status !== "success") {
  //       throw new Error(response.data.message || "Logout failed");
  //     }
  //     return response.data;
  //   },
  //   onSuccess: () => {
  //     localStorage.clear();
  //     sessionStorage.clear();
  //     navigate("/");
  //   },
  //   onError: (error) => {

  //     setMessage(error.response?.data?.message || error.message || "Lỗi máy chủ, vui lòng thử lại!");
  //   }
  // });

  useEffect(() => {
    const navBar = document.querySelector("nav");
    const menuBtns = document.querySelectorAll(".menu-icon");
    const overlay = document.querySelector(".overlay");

    menuBtns.forEach((menuBtn) => {
      menuBtn.addEventListener("click", () => {
        navBar.classList.toggle("open");
      });
    });

    overlay.addEventListener("click", () => {
      navBar.classList.remove("open");
    });

    return () => {
      menuBtns.forEach((menuBtn) => {
        menuBtn.removeEventListener("click", () => {
          navBar.classList.toggle("open");
        });
      });
      overlay.removeEventListener("click", () => {
        navBar.classList.remove("open");
      });
    };
  }, []);

  const closeSidebar = () => {
    if (window.innerWidth <= 768) {
      setIsOpen(!isOpen);
    }
  };

  // Menu items dựa trên role
  const studentMenuItems = [
    { name: "Trang chủ", path: "home", icon: "bxs-home" },
    { name: "Chatbot", path: "chatbot", icon: "bxs-message-dots" },
    // { name: "Thông báo", path: "notifications", icon: "bxs-notification" },
    { name: "Học bổng", path: "scholarships", icon: "bxs-award" },
    { name: "Kết quả học tập", path: "academic_records", icon: "bxs-graduation" },
    { name: "Chương trình đào tạo", path: "curriculum", icon: "bxs-book-content" },
    { name: "Gợi ý môn học", path: "calendar", icon: "bxs-bulb" },
    { name: "Cài đặt", path: "settings", icon: "bxs-cog" },
  ];

  // Menu items cho giảng viên
  const instructorMenuItems = [
    { name: "Trang chủ", path: "home", icon: "bxs-home" },
    { name: "Cài đặt", path: "settings", icon: "bxs-cog" },
  ];

  // Chọn menu items dựa trên role
  const menuItems = role === "instructor" ? instructorMenuItems : studentMenuItems;

  return (
    <>
      <nav className={`fixed top-0 left-0 w-full h-[60px] flex items-center bg-gray-100 dark:bg-[#212121] shadow-sm dark:shadow-lg z-[1000] transition-colors duration-300 ease-in-out ${isOpen ? "open" : ""}`}>
        <div className="logo flex flex-row items-center justify-between flex-1 mx-6 md:mx-6 mr-1">
          <div className="logo-container flex items-center">
            <i className="bx bx-menu menu-icon text-gray-700 dark:text-gray-200 text-2xl mr-2.5 cursor-pointer transition-colors duration-300 ease-in-out" onClick={() => setIsOpen(!isOpen)}></i>
            <span className="webName text-gray-800 dark:text-gray-200 text-[22px] font-medium transition-colors duration-300 ease-in-out">
              {role === "instructor" ? "Instructor Portal" : "Student Portal"}
            </span>
          </div>
          <div className="userSection flex items-center">
            <span className="userName md:mr-5 md:text-base text-sm text-gray-700 dark:text-gray-200 mr-2.5 transition-colors duration-300 ease-in-out">{fullNName}</span>
            <button
              type="button"
              className="border border-blue-500 text-blue-500 dark:text-blue-300 dark:border-blue-300 hover:bg-blue-500 dark:hover:bg-blue-600 hover:text-white dark:hover:text-white font-medium rounded-lg px-4 py-1 transition-colors duration-300 ease-in-out"
              onClick={logout}
              disabled={isLoggingOut}
            >
              Sign out
            </button>
          </div>
        </div>

        <div className={`sidebar fixed top-0 bg-gray-50 dark:bg-[#181818] h-full w-[260px] py-5 shadow-lg transition-all duration-300 ${isOpen ? "left-0" : "md:left-0 -left-full"}`}>
          <div className="logo flex items-center mx-6 ">
            <i className="bx bx-menu menu-icon text-gray-900 dark:text-gray-200  text-2xl mr-2.5 cursor-pointer transition-colors duration-300 ease-in-out" onClick={() => setIsOpen(!isOpen)}></i>
            <span className="webName text-gray-800 dark:text-gray-200 text-[22px] transition-colors duration-300 ease-in-out font-medium">
              {role === "instructor" ? "Instructor Portal" : "Student Portal"}
            </span>
          </div>
          <div className="sidebar-content flex flex-col flex-1 h-full w-full p-8 px-4">
            <ul className="lists p-0 m-0">
              {menuItems.map((item) => (
                <li key={item.path} className="list list-none mb-1">
                  <Link
                    to={`/${role === "instructor" ? "instructor" : "user"}/${item.path}`}
                    className={`group nav-link flex items-center p-3.5 px-3 rounded-lg no-underline transition-all duration-300 ${location.pathname === `/${role === "instructor" ? "instructor" : "user"}/${item.path}`
                      ? "bg-blue-300 dark:bg-blue-500 shadow-md"
                      : "bg-gray-50 dark:bg-dark1 hover:bg-blue-500 dark:hover:bg-blue-600 hover:translate-x-1"
                      }`}
                    onClick={() => {
                      if (setActiveComponent) {
                        setActiveComponent(item.path);
                      }
                      closeSidebar();
                    }}
                  >
                    <i className={`bx ${item.icon} icon mr-3.5 text-xl transition-transform duration-300 ${location.pathname === `/${role === "instructor" ? "instructor" : "user"}/${item.path}`
                      ? "text-blue-600 dark:text-blue-900"
                      : "text-gray-500 dark:text-gray-200 group-hover:text-white dark:group-hover:text-black"
                      }`}></i>
                    <span className={`component text-base font-normal ${location.pathname === `/${role === "instructor" ? "instructor" : "user"}/${item.path}`
                      ? "text-blue-600 dark:text-blue-900"
                      : "text-gray-500 dark:text-gray-200 group-hover:text-white dark:group-hover:text-black"
                      }`}>
                      {item.name}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            {/* <div className="p-5 flex flex-row justify-between mt-auto items-center gap-3">
              <div className="flex items-center gap-2 text-gray-700 dark:text-gray-200 transition-colors duration-300 ease-in-out">
                <img
                  src="/public/l_d.svg"
                  alt="Dark mode icon"
                  className="w-7 h-7 object-contain dark:invert"
                />
                <span>Dark Mode</span>
              </div>
              <label className="relative inline-block w-[60px] h-[34px]">
                <input
                  type="checkbox"
                  checked={isDarkMode}
                  onChange={toggleDarkMode}
                  className="opacity-2 w-0 h-0"
                />
                <span
                  className={`absolute cursor-pointer inset-0 transition-all duration-400 rounded-full 
                              before:absolute before:content-[''] before:h-[26px] before:w-[26px] 
                              before:left-[4px] before:bottom-[4px] before:bg-white dark:before:bg-black before:transition-all 
                              before:duration-400 before:rounded-full before:flex before:items-center before:justify-center
                              ${isDarkMode
                    ? "bg-white before:translate-x-[26px]"
                    : "bg-black"
                  }`}
                >
                  <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    {isDarkMode ? (
                      <SunIcon className="w-4 h-4 text-black -translate-x-[13px]" />
                    ) : (
                      <MoonIcon className="w-4 h-4 text-white translate-x-[13px]" />
                    )}
                  </span>
                </span>
              </label>
            </div> */}

          </div>
        </div>
      </nav>
      {/* {message && <p className="text-green-500">{message}</p>} */}
      <section className={`overlay md:hidden block h-[1000vh] w-[200%] fixed top-[60px] bg-black/30 pointer-events-auto z-[100] transition-all duration-400 ${isOpen ? "opacity-100 left-[260px]" : "opacity-0 -left-[200%]"}`} onClick={() => setIsOpen(!isOpen)}></section>
    </>
  );
}

export default Sidebar;