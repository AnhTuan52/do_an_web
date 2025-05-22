import React from "react";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";

function Notifications() {
  const { data: notifications = [], isLoading, error } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/notifications`, { withCredentials: true });
      if (response.data.status !== "success") {
        throw new Error(response.data.message || "Không thể tải thông báo!");
      }
      return response.data.notifications;
    },
  });

  if (isLoading) {
    return (
      <div className="w-full h-[600px] flex justify-center items-center gap-2">
          <img src="/public/loading2.svg" alt="Loading..." className="flex justify-center items-center h-20 w-20" />
      </div>
    );
  }

  if (error) {
    return <p className="m-4 text-red-600">{error.message || "Không thể tải thông báo!"}</p>;
  }

  return (
    <div className="max-w-full max-h-full overflow-x-hidden bg-white dark:bg-gray-900 dark:scrollbar-track-gray-800 scrollbar-custom">
    <h2 className="text-center text-4xl my-5 text-gray-800 dark:text-gray-100">Thông báo</h2>
    {notifications.length > 0 ? (
      <div className="flex flex-col max-h-full overflow-y-auto px-3">
        {notifications.map((notification) => (
          <div
            key={notification._id}
            className="bg-blue-500/5 dark:bg-blue-400/10 border-l-4 border-blue-500 p-3 m-3 rounded-md transition-all duration-300 hover:bg-blue-500/10 dark:hover:bg-blue-400/20 hover:scale-[1.01]"
          >
            <h3 className="m-0 mb-2 text-lg text-blue-500 dark:text-blue-400">{notification.title}</h3>
            <p className="m-0 mb-5 text-sm text-gray-600 dark:text-gray-100">
              <strong>Thời gian:</strong>{" "}
              {new Date(notification.created_at).toLocaleString("vi-VN")}
            </p>
            <a
              href={notification.link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-red-700 dark:text-red-400 font-bold no-underline hover:underline"
            >
              Xem chi tiết
            </a>
          </div>
        ))}
      </div>
    ) : (
      <p className="m-4 text-gray-600 dark:text-gray-300">Không có thông báo nào.</p>
    )}
  </div>

  );
}

export default Notifications;