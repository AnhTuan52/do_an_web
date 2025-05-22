import React from "react";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";

function Calendar() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["calendar"],
    queryFn: async () => {
      const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/calendar`, {
        withCredentials: true,
      });
      if (response.data.status !== "success") {
        throw new Error(response.data.message || "Không thể tải lịch học.");
      }
      return response.data;
    },
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5,
  });

  if (isLoading) {
    return (
      <div className="w-full h-[600px] flex justify-center items-center gap-2">
        <img
          src="/public/loading2.svg"
          alt="Loading..."
          className="flex justify-center items-center h-20 w-20"
        />
      </div>
    );
  }

  if (error) {
    return (
      <p className="m-4 text-red-600">
        {error.message || "Không thể tải lịch học."}
      </p>
    );
  }

  return (
    <div className="max-w-full max-h-full bg-white dark:bg-dark4 rounded-lg mt-4 transition-ld">
      <h2 className="text-center text-4xl my-7.5 mx-5 text-gray-800 dark:text-gray-100 transition-ld">
        Đề xuất môn học
      </h2>

      {data.graduate_subjects ? (
        <div className="m-5 mx-2.5 p-5 px-7.5 shadow-md overflow-x-auto dark:shadow-lg">
          <h6 className="text-xl mb-5 transition-all  text-amber-500 dark:text-amber-300">
            <span className="font-semibold text-amber-600 dark:text-amber-400">Gợi ý: </span>
            {data.message}
          </h6>
          <table className="w-full border-collapse mt-3.5 mb-3.5 border-none rounded-t-md shadow-lg">
            <thead>
              <tr>
                <th className="th-style">Mã môn học</th>
                <th className="th-style">Tên môn học</th>
                <th className="th-style">Số tín chỉ</th>
              </tr>
            </thead>
            <tbody>
              {data.graduate_subjects.map((subject, index) => (
                <tr key={index} className="tr-style">
                  <td className="td-style">{subject.course_code}</td>
                  <td className="td-style">{subject.course_name}</td>
                  <td className="td-style">{subject.credits}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="m-5 mx-2.5 p-5 px-7.5 shadow-md overflow-x-auto dark:shadow-lg">
          <h6 className="text-xl mb-5 transition-all  text-amber-500 dark:text-amber-300">
            <span className="font-semibold text-amber-600 dark:text-amber-400">Gợi ý: </span>
            {data.message}
          </h6>

          {/* Môn đại cương */}
          {data.general_subjects?.length > 0 && (
            <>
              <h5 className="text-2xl mt-5 mb-2.5 text-blue-500">
                Môn đại cương
              </h5>
              <table className="w-full border-collapse mt-3.5 mb-3.5 border-none rounded-t-md shadow-lg">
                <thead>
                  <tr>
                    <th className="th-style">Mã môn học</th>
                    <th className="th-style">Tên môn học</th>
                    <th className="th-style">Số tín chỉ</th>
                  </tr>
                </thead>
                <tbody>
                  {data.general_subjects.map((subject, index) => (
                    <tr key={index} className="tr-style">
                      <td className="td-style">{subject.course_code}</td>
                      <td className="td-style">{subject.course_name}</td>
                      <td className="td-style">{subject.credits}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {/* Môn cơ sở ngành */}
          {data.basic_subjects?.length > 0 && (
            <>
              <h5 className="text-2xl mt-5 mb-2.5 text-blue-500">
                Môn cơ sở ngành
              </h5>
              <table className="w-full border-collapse mt-3.5 mb-3.5 border-none rounded-t-md shadow-lg">
                <thead>
                  <tr>
                    <th className="th-style">Mã môn học</th>
                    <th className="th-style">Tên môn học</th>
                    <th className="th-style">Số tín chỉ</th>
                  </tr>
                </thead>
                <tbody>
                  {data.basic_subjects.map((subject, index) => (
                    <tr key={index} className="tr-style">
                      <td className="td-style">{subject.course_code}</td>
                      <td className="td-style">{subject.course_name}</td>
                      <td className="td-style">{subject.credits}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {/* Môn chuyên ngành */}
          {data.specialized_subjects?.length > 0 && (
            <>
              <h5 className="text-2xl mt-5 mb-2.5 text-blue-500">
                Môn chuyên ngành
              </h5>
              <table className="w-full border-collapse mt-3.5 mb-3.5 border-none rounded-t-md shadow-lg">
                <thead>
                  <tr>
                    <th className="th-style">Mã môn học</th>
                    <th className="th-style">Tên môn học</th>
                    <th className="th-style">Số tín chỉ</th>
                  </tr>
                </thead>
                <tbody>
                  {data.specialized_subjects.map((subject, index) => (
                    <tr key={index} className="tr-style">
                      <td className="td-style">{subject.course_code}</td>
                      <td className="td-style">{subject.course_name}</td>
                      <td className="td-style">{subject.credits}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {data.general_subjects?.length === 0 &&
            data.basic_subjects?.length === 0 &&
            data.specialized_subjects?.length === 0 && (
              <p className="mt-5 text-gray-600 dark:text-gray-400">
                Không có môn học đề xuất.
              </p>
            )}
        </div>
      )}
    </div>
  );
}

export default Calendar;