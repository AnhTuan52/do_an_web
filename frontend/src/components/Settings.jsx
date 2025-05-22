import React, { useState, useEffect } from "react";
import { useContext } from "react";
import { ThemeContext } from "/src/App.jsx";
import axios from "axios";
import { MoonIcon, SunIcon } from '@heroicons/react/24/solid';
import { useMutation } from "@tanstack/react-query";
import { Accordion } from "/src/components/Accordion.jsx";

function Settings() {
    const [oldPassword, setOldPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [cookieName, setCookieName] = useState("");
    const [cookieValue, setCookieValue] = useState("");
    const [message, setMessage] = useState("");
    const [syncMessage, setSyncMessage] = useState("");
    const [success, setSuccess] = useState(false);
    const [syncSuccess, setSyncSuccess] = useState(false);
    const [openAccordion, setOpenAccordion] = useState(() => localStorage.getItem("openAccordion") || null);
    const { isDarkMode, toggleDarkMode } = useContext(ThemeContext);

    useEffect(() => {
        console.log("openAccordion:", openAccordion);
        localStorage.setItem("openAccordion", openAccordion || "");
    }, [openAccordion]);

    const toggleAccordion = (id) => {
        setOpenAccordion(openAccordion === id ? null : id);
    };

    const syncTitle = (
        <div className="flex items-center gap-2 text-gray-800 dark:text-gray-100 transition-colors duration-300 ease-in-out">
            <img
                src="/public/sync-svgrepo-com.svg"
                alt="Sync icon"
                className="w-6 h-6 object-contain dark:invert"
            />
            <span>Đồng bộ dữ liệu</span>
        </div>
    );

    const passwordTitle = (
        <div className="flex items-center gap-2 text-gray-800 dark:text-gray-100 transition-colors duration-300 ease-in-out">
            <img
                src="/public/lock-alt-svgrepo-com.svg"
                alt="Lock icon"
                className="w-6 h-6 object-contain dark:invert"
            />
            <span>Đổi mật khẩu</span>
        </div>
    );

    const clearMessage = (setFn) => {
        const timer = setTimeout(() => setFn(""), 5000);
        return () => clearTimeout(timer);
    };

    const changePasswordMutation = useMutation({
        mutationFn: async ({ old_password, new_password }) => {
            const response = await axios.post(
                `${import.meta.env.VITE_API_BASE_URL}/change_password`,
                { old_password, new_password },
                { withCredentials: true }
            );
            if (response.data?.status !== "success") {
                throw new Error(response.data.message);
            }
            return response.data;
        },
        retry: 0,
        onSuccess: (data) => {
            setMessage(data?.message);
            setOldPassword("");
            setNewPassword("");
            setConfirmPassword("");
            setSuccess(true);
        },
        onError: (error) => {
            setMessage(error.response?.data?.message || error.message || "Lỗi máy chủ, vui lòng thử lại!");
            setSuccess(false);
        },
    });

    const handleSubmitChangePassword = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            setMessage("Mật khẩu mới không khớp!");
            setSuccess(false);
            return;
        }
        changePasswordMutation.mutate({ old_password: oldPassword, new_password: newPassword });
    };

    const syncDataMutation = useMutation({
        mutationFn: async ({ cookie_value }) => {
            const response = await axios.post(
                `${import.meta.env.VITE_API_BASE_URL}/sync_data`,
                { cookie_value },
                { withCredentials: true }
            );
            if (response.data?.status !== "success") {
                throw new Error(response.data.message);
            }
            return response.data;
        },
        retry: 0,
        onSuccess: (data) => {
            setSyncMessage(data?.message);
            setCookieName("");
            setCookieValue("");
            setSyncSuccess(true);
        },
        onError: (error) => {
            setSyncMessage(error.response?.data?.message || error.message || "Lỗi đồng bộ dữ liệu, vui lòng thử lại!");
            setSyncSuccess(false);
        },
    });

    const handleSubmitSyncData = async (e) => {
        e.preventDefault();
        await syncDataMutation.mutateAsync({ cookie_value: cookieValue });
    };

    useEffect(() => {
        if (message) return clearMessage(setMessage);
    }, [message]);

    useEffect(() => {
        if (syncMessage) return clearMessage(setSyncMessage);
    }, [syncMessage]);

    return (
        <>
            <div className="settings-container max-w-full m-5 bg-gray-200 dark:bg-gray-700 pl-3 pr-0 pb-0 rounded-lg shadow-md transition-ld">
                <button
                    className="w-full h-[8vh] flex justify-between items-center text-xl font-semibold text-gray-800 py-3 rounded-lg focus:outline-none p-0 m-0"
                    onClick={toggleDarkMode}
                >
                    <div className="flex flex-row justify-between w-full items-center py-1 m-0">
                        <div className="flex items-center gap-2 text-gray-800 dark:text-gray-100 transition-colors duration-300 ease-in-out">
                            <img
                            src="/public/l_d.svg"
                            alt="Dark mode icon"
                            className="w-7 h-7 object-contain dark:invert"
                            />
                            <span>Dark Mode</span>
                        </div>
                        <span className="text-gray-200 px-3 text-3xl transition-colors transition-ld duration-300 ease-in-out">
                            <label className="relative inline-block w-[60px] h-[34px]">
                                <input
                                    type="checkbox"
                                    checked={isDarkMode}
                                    onChange={toggleDarkMode}
                                    className="opacity-0 w-0 h-0"
                                />
                                <span
                                    className={`absolute cursor-pointer inset-0 rounded-full transition-colors duration-300 ease-in-out ${
                                        isDarkMode ? "bg-white" : "bg-black"
                                    } before:absolute before:content-[''] before:h-[26px] before:w-[26px] before:left-[4px] before:bottom-[4px] before:bg-white dark:before:bg-black before:transition-transform before:duration-300 before:rounded-full before:flex before:items-center before:justify-center ${
                                        isDarkMode ? "before:translate-x-[26px]" : ""
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
                        </span>
                    </div>
                </button>
            </div>

            <div className="settings-container max-w-full m-5 bg-gray-200 dark:bg-gray-700 pl-0 pr-0 pb-0 rounded-lg shadow-md transition-ld">
                <Accordion
                    title={syncTitle}
                    isOpen={openAccordion === "sync"}
                    onToggle={() => toggleAccordion("sync")}
                >
                    <div className="sync-data-container flex flex-col justify-center items-start w-full">
                        <form onSubmit={handleSubmitSyncData} className="p-2.5 px-5 w-full max-w-[500px]">
                            <div className="block mb-3.5">
                                <label className="block font-bold text-[15px] dark:text-gray-100 mb-1.5">Cookie Value:</label>
                                <input
                                    type="text"
                                    className="w-full p-1.5 border border-gray-300 rounded text-base"
                                    value={cookieValue}
                                    onChange={(e) => setCookieValue(e.target.value)}
                                    required
                                    aria-label="Cookie Value"
                                />
                            </div>
                            {syncMessage && (
                                <p
                                    className={`message flex justify-center items-center mt-2.5 mb-2.5 text-sm p-2.5 w-full bg-${
                                        syncSuccess ? "green" : "red"
                                    }-100 text-${syncSuccess ? "green" : "red"}-800 border border-${
                                        syncSuccess ? "green" : "red"
                                    }-400 rounded`}
                                >
                                    {syncMessage}
                                </p>
                            )}
                            <button
                                type="submit"
                                className={`submit-button ${syncDataMutation.isLoading ? "loading" : ""}`}
                                disabled={syncDataMutation.isLoading}
                                aria-label="Đồng bộ dữ liệu"
                                >
                                {syncDataMutation.isLoading ? "Đang đồng bộ..." : "Đồng bộ"}
                            </button>
                            {syncDataMutation.isLoading && (
    <div className="error-message">
        <p>Bummmmmmmm</p>
    </div>
)}

{syncDataMutation.isSuccess && (
    <div className="success-message">
        {syncDataMutation.data?.message || 'Đồng bộ dữ liệu thành công!'}
    </div>
)}
                        </form>
                    </div>
                </Accordion>
            </div>

            <div className="settings-container max-w-full m-5 bg-gray-200 dark:bg-gray-700 pl-0 pr-0 pb-0 rounded-lg shadow-md transition-ld">
                <Accordion
                    title={passwordTitle}
                    isOpen={openAccordion === "password"}
                    onToggle={() => toggleAccordion("password")}
                >
                    <div className="change-password-container flex flex-col justify-center items-start w-full">
                        <form onSubmit={handleSubmitChangePassword} className="p-2.5 px-5 w-full max-w-[500px]">
                            <div className="block mb-3.5">
                                <label className="block font-bold text-[15px] dark:text-gray-100 mb-1.5">Mật khẩu cũ:</label>
                                <input
                                    type="password"
                                    className="w-full p-1.5 border border-gray-300 rounded text-base"
                                    value={oldPassword}
                                    onChange={(e) => setOldPassword(e.target.value)}
                                    required
                                    aria-label="Mật khẩu cũ"
                                />
                            </div>
                            <div className="block mb-3.5">
                                <label className="block font-bold text-[15px] dark:text-gray-100 mb-1.5">Mật khẩu mới:</label>
                                <input
                                    type="password"
                                    className="w-full p-1.5 border border-gray-300 rounded text-base"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    required
                                    aria-label="Mật khẩu mới"
                                />
                            </div>
                            <div className="block mb-3.5">
                                <label className="block font-bold text-[15px] dark:text-gray-100 mb-1.5">Xác nhận mật khẩu mới:</label>
                                <input
                                    type="password"
                                    className="w-full p-1.5 border border-gray-300 rounded text-base"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    aria-label="Xác nhận mật khẩu mới"
                                />
                            </div>
                            {message && (
                                <p
                                    className={`message flex justify-center items-center mt-2.5 mb-2.5 text-sm p-2.5 w-full bg-${
                                        success ? "green" : "red"
                                    }-100 text-${success ? "green" : "red"}-800 border border-${
                                        success ? "green" : "red"
                                    }-400 rounded`}
                                >
                                    {message}
                                </p>
                            )}
                            <button
                                type="submit"
                                className={`submit-button ${changePasswordMutation.isLoading ? "loading" : ""}`}
                                disabled={changePasswordMutation.isLoading}
                                aria-label="Đổi mật khẩu"
                                >
                                {changePasswordMutation.isLoading ? "Đang xử lý..." : "Đổi mật khẩu"}
                            </button>
                        </form>
                    </div>
                </Accordion>
            </div>
        </>
    );
}

export default Settings;