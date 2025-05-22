import React from "react";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { ThemeContext } from "/src/App.jsx";

function AcademicRecords() {
  const { data: academicRecords = [], isLoading, error } = useQuery({
    queryKey: ["academicRecords"],
    queryFn: async () => {
      const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/academic_records`, { withCredentials: true });
      if (response.data.status !== "success") {
        throw new Error(response.data.message || "Không thể tải kết quả học tập.");
      }
      return response.data.academic_records;
    },
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5,
  });

  if (isLoading) {
    return (
      <div className="w-full h-[600px] flex flex-col justify-center items-center p-4 bg-white dark:bg-gray-900 rounded-lg">
         <img src="/public/loading2.svg" alt="Đang tải..." className="h-20 w-20 mb-4" />
         <p className="text-blue-600 dark:text-blue-400 text-lg font-semibold">Đang tải kết quả học tập...</p>
      </div>
    );
  }

  if (error) {
    return <p className="m-4 text-red-600">{error?.response?.data.message || error?.message || "Không thể tải kết quả học tập."}</p>;
  }

  return (
    <div className="max-w-full max-h-full bg-white dark:bg-dark4 rounded-lg mt-4 transition-ld" >
      <h2 className="text-center text-4xl my-7.5 mx-5 text-gray-800 dark:text-gray-100 transition-ld">Kết quả học tập</h2>

      {academicRecords["academic_records"].length > 0 ? (
        academicRecords["academic_records"].map((semesterData, index) => (
          <div
            key={index}
            className="m-5 mx-2.5 p-5 px-7.5 shadow-md overflow-x-auto dark:shadow-lg"
          >
            <h5 className="text-2xl mb-5 text-blue-500 dark:text-blue-400 transition-ld">{semesterData.semester}</h5>
            <div className="grid grid-rows-2 grid-cols-[auto,1fr] gap-x-4 dark:text-gray-100 transition-ld">
              <p><strong>Số tín chỉ đăng ký:</strong></p>
              <p>{semesterData.credits_taken}</p>
            
              <p><strong>Điểm trung bình học kỳ:</strong></p>
              <p>{semesterData.semester_average}</p>
            </div>

            <table className="w-full border-collapse mt-3.5 mb-3.5 border-none rounded-t-md shadow-lg">
              <thead>
                <tr>
                  <th className="th-style">STT</th>
                  <th className="th-style">Mã môn học</th>
                  <th className="th-style">Tên môn học</th>
                  <th className="th-style">Số tín chỉ</th>
                  <th className="th-style">Quá trình</th>
                  <th className="th-style">Giữa kỳ</th>
                  <th className="th-style">Thực hành</th>
                  <th className="th-style">Cuối kỳ</th>
                  <th className="th-style">Tổng điểm</th>
                  <th className="th-style">Tình trạng</th>
                  <th className="th-style">Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {semesterData.courses.map((course, idx) => (
                  <tr
                    key={course.course_code}
                    className="tr-style"
                  >
                    <td className="td-style">{idx + 1}</td>
                    <td className="td-style">{course.course_code}</td>
                    <td className="td-style">{course.course_name}</td>
                    <td className="td-style">{course.credits}</td>
                    <td className="td-style">{course.scores.process ?? "-"}</td>
                    <td className="td-style">{course.scores.midterm ?? "-"}</td>
                    <td className="td-style">{course.scores.practice ?? "-"}</td>
                    <td className="td-style">{course.scores.final ?? "-"}</td>
                    <td className="td-style">{course.total_score}</td>
                    <td className="td-style">{course.complete}</td>
                    <td className="td-style">{course.note || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))
      ) : (
        <p className="m-4 text-gray-600">Không có kết quả học tập.</p>
      )}
    </div>
  );
}

export default AcademicRecords;