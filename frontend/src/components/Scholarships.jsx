import React from "react";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { AcademicCapIcon, LinkIcon, ClockIcon, XCircleIcon, InformationCircleIcon } from '@heroicons/react/24/outline';

function Scholarships() {
  const { data: scholarships = [], isLoading, error } = useQuery({
    queryKey: ["scholarships"],
    queryFn: async () => {
      const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/scholarships`, { withCredentials: true });
      if (response.data.status !== "success") {
        throw new Error(response.data.message || "Không thể tải thông tin học bổng!");
      }
      return response.data.scholarships;
    },
  });

  if (isLoading) {
    return (
      <div className="w-full h-[600px] flex flex-col justify-center items-center p-4 bg-white dark:bg-gray-900 rounded-lg">
         <img src="/public/loading2.svg" alt="Đang tải..." className="h-20 w-20 mb-4" />
         <p className="text-blue-600 dark:text-blue-400 text-lg font-semibold">Đang tải thông tin học bổng...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="m-4 p-6 bg-red-100 border border-red-400 text-red-700 dark:bg-red-900 dark:border-red-700 dark:text-red-300 rounded-md flex items-center gap-4">
         <svg className="h-8 w-8 text-red-500 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2 2m2 2a9 9 0 110-18 9 9 0 010 18z"></path></svg>
         <p className="text-lg">{error.message || "Không thể tải thông tin học bổng!"}</p>
      </div>
    );
  }

  return (
    <div className="max-w-full mx-auto p-4 md:p-6 lg:p-8 bg-white dark:bg-gray-900 dark:scrollbar-track-gray-800 scrollbar-custom min-h-screen">

      <h2 className="text-center text-3xl md:text-4xl font-bold my-6 text-gray-800 dark:text-gray-100">
         Thông tin học bổng
      </h2>

      {scholarships.length > 0 ? (
        <div className="flex flex-col max-h-full overflow-y-auto px-0 md:px-3 max-w-3xl mx-auto"> 
          {scholarships.map((scholarship) => (
            <div
              key={scholarship._id}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-md p-5 mb-6 rounded-lg transition-all duration-300 hover:shadow-lg hover:-translate-y-1" // Subtle hover effect (lift and slight move up)
            > 
              <a 
                href={scholarship.link}
                target="_blank"
                rel="noopener noreferrer">
                  <h3 className="m-0 mb-3 text-lg md:text-xl font-semibold text-blue-600 dark:text-blue-400">
                    {scholarship.title}
                  </h3>
             </a>
              <ul className="list-none p-0 m-0 mb-4 text-sm text-gray-600 dark:text-gray-300">
                 <li className="flex items-center mb-1">
                    <ClockIcon className="h-4 w-4 mr-2 text-gray-500 dark:text-gray-400" />
                    <strong className="mr-1 text-gray-700 dark:text-gray-200">Thời gian đăng:</strong>
                    {scholarship.created_at}
                 </li>
              </ul>

              <div className="text-right">
                 <a
                   href={scholarship.link}
                   target="_blank"
                   rel="noopener noreferrer"
                   className="inline-block bg-blue-500 text-white font-medium py-2 px-4 rounded-md no-underline transition-colors duration-300 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-600"
                 >
                    <LinkIcon className="h-5 w-5 inline-block mr-2" />
                    Xem chi tiết
                 </a>
              </div>

            </div>
          ))}
        </div>
      ) : (
        <div className="w-full flex flex-col items-center justify-center p-6">
            <p className="text-center text-xl text-gray-500 dark:text-gray-400">Không có thông tin học bổng nào hiện tại.</p>
        </div>
      )}
    </div>
  );
}

export default Scholarships;