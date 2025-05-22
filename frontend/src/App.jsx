import React, { createContext, useState, useEffect, useContext, useMemo } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import Cookies from "js-cookie";
import Login from "/src/components/Login.jsx";
import UserPage from "/src/components/UserPage.jsx";
import InstructorLogin from "/src/components/instructor/InstructorLogin.jsx";
import InstructorPage from "/src/components/instructor/InstructorPage.jsx";
import TestPage from "/src/components/instructor/TestPage.jsx";
import AdminLogin from "/src/components/admin/AdminLogin.jsx";
import AdminPage from "/src/components/admin/AdminPage.jsx";
// import StudentListPage from "/src/components/instructor/StudentListPage.jsx"; // Removed
import { AuthProvider, AuthContext } from "/src/components/AuthContext";
import "./App.css";

export const ThemeContext = createContext();

function App() {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const cookieValue = Cookies.get("darkMode");
    return cookieValue ? cookieValue === "true" : false;
  });

  const toggleDarkMode = () => {
    setIsDarkMode((prevMode) => !prevMode);
  };

  const themeContextValue = useMemo(() => ({ isDarkMode, toggleDarkMode }), [isDarkMode]);

  const ProtectedRoute = ({ children }) => {
    const navigate = useNavigate();
    const { isAuthenticated } = useContext(AuthContext);

    useEffect(() => {
      if (!isAuthenticated) {
        navigate("/");
      }
      // navigate("/user");
    }, [isAuthenticated, navigate]);

    return isAuthenticated ? children : null;
  };

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    Cookies.set("darkMode", isDarkMode.toString(), { expires: 365 });
  }, [isDarkMode]);

  return (
    <ThemeContext.Provider value={themeContextValue}>
      <div className="min-h-screen bg-white-100 dark:bg-gray-900 transition-colors duration-300">
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/user/*" element={<ProtectedRoute><UserPage /></ProtectedRoute>} />
            <Route path="/instructor-login" element={<InstructorLogin />} />
            <Route path="/instructor/*" element={<ProtectedRoute><InstructorPage /></ProtectedRoute>} />
            <Route path="/admin-login" element={<AdminLogin />} />
            <Route path="/admin/*" element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />
          </Routes>
        </AuthProvider>
      </div>
    </ThemeContext.Provider>
  );
}

export default App;