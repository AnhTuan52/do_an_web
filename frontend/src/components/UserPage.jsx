import React from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import Cookies from "js-cookie";
import Sidebar from "/src/components/Sidebar.jsx";
import Dashboard from "/src/components/Dashboard.jsx";
import Home from "/src/components/Home.jsx";
import Chatbot from "/src/components/Chatbot.jsx";
import AcademicRecords from "/src/components/AcademicRecords";
import Curriculum from "/src/components/Curriculum";
import Notifications from "/src/components/Notifications";
import Settings from "/src/components/Settings";
import Calendar from "/src/components/Calendar";
import Scholarships from "/src/components/Scholarships";

function UserPage() {
  const navigate = useNavigate();

  // useEffect(() => {
  //   const sessionCookie = Cookies.get('session');

  //   if (!sessionCookie) {
  //     navigate('/');
  //   }
  //   navigate('/user/');
  // }, [navigate]);

  const handleNavigation = (component) => {
    navigate(`/user/${component}`);
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Sidebar */}
      <Sidebar setActiveComponent={handleNavigation} />

      {/* Dashboard */}
      <main className="main-content dark:bg-dark4 flex-grow flex md:w-[calc(100%-260px)] w-full max-w-[1400px] mt-[60px] p-2.5 pt-0 pl-0 pr-0 md:ml-[260px] ml-0 mr-0 mb-8 overflow-x-hidden transition-ld ">
        <Routes>
          <Route path="/" element={<Dashboard />}>
            <Route index element={<Home />} />
            <Route path="home" element={<Home />} />
            <Route path="chatbot" element={<Chatbot />} />
            <Route path="academic_records" element={<AcademicRecords />} />
            <Route path="curriculum" element={<Curriculum />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="calendar" element={<Calendar />}></Route>
            <Route path="scholarships" element={<Scholarships />}></Route>
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </main>
    </div>
  );
}

export default UserPage;