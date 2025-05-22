import React, { useEffect } from "react";
import axios from "axios";
import { useQuery, useQueryClient } from "@tanstack/react-query";

function Curriculum() {
     
  const { data, isLoading, error } = useQuery({
    queryKey: ["curriculum"],
    queryFn: async () => {
      const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/curriculum`, { withCredentials: true });
      if (response.data.status !== "success") {
        throw new Error(response.data.message || "Không thể tải chương trình đào tạo");
      }
      return {
        curriculum: response.data.curriculum,
        studentFaculty: response.data.faculty,
      };
    },
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  if (isLoading) {
    return (
      <div className="w-full h-[600px] flex flex-col justify-center items-center p-4 bg-white dark:bg-gray-900 rounded-lg">
         <img src="/public/loading2.svg" alt="Đang tải..." className="h-20 w-20 mb-4" />
         <p className="text-blue-600 dark:text-blue-400 text-lg font-semibold">Đang tải chương trình đào tạo...</p>
      </div>
    );
  }

  if (error) {
    return <p className="m-4 text-red-600">{error.message || "Không thể tải chương trình đào tạo"}</p>;
  }

  const { curriculum = {}, studentFaculty = "" } = data || {};

  return (
    <div className="max-w-full max-h-full mx-auto my-5 mt-0 p-3.5 bg-white dark:bg-dark4 rounded-lg">
      <div className="flex flex-col">
        <h2 className="text-center text-4xl mb-2.5 text-gray-800 dark:text-gray-50">Chương trình đào tạo</h2>
        <h5 className="flex justify-center text-2xl dark:text-gray-50">Ngành: {studentFaculty}</h5>
      </div>

      {Object.keys(curriculum).length > 0 ? (
        Object.keys(curriculum).map((category) => (
          <div key={category} className="m-5 mx-2.5 p-5 px-7.5 shadow-md overflow-x-auto dark:shadow-lg">
            <h5 className="text-2xl text-blue-500">{category}</h5>
            <table className="w-full border-collapse mt-3.5 border-none rounded-t-md shadow-lg">
              <thead>
                <tr>
                  <th className="th-style">STT</th>
                  <th className="th-style">Mã môn học</th>
                  <th className="th-style">Tên môn học</th>
                  <th className="th-style">Số tín chỉ</th>
                  <th className="th-style">Lý thuyết</th>
                  <th className="th-style">Thực hành</th>
                  <th className="th-style">Môn tiên quyết</th>
                </tr>
              </thead>
              <tbody>
                {curriculum[category].map((course, index) => (
                  <tr
                    key={course._id}
                    className="tr-style"
                  >
                    <td className="td-style">{index + 1}</td>
                    <td className="td-style">{course.course_code}</td>
                    <td className="td-style">{course.course_name}</td>
                    <td className="td-style">{course.credits}</td>
                    <td className="td-style">{course.theory}</td>
                    <td className="td-style">{course.practice}</td>
                    <td className="td-style">
                      {(() => {
                        const prereq = course.prerequisite;

                        if (Array.isArray(prereq)) {
                          return prereq.length > 0 ? (
                            prereq.map((pre_course, index) => (
                              <span key={index}>
                                {pre_course}
                                {index < prereq.length - 1 && ' - '}
                              </span>
                            ))
                          ) : (
                            "-"
                          );
                        } else if (typeof prereq === "string" && prereq.trim().length > 0) {
                          return <span>{prereq}</span>;
                        }

                        return "-";
                      })()}
                    </td>


                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))
      ) : (
        <p className="m-4 text-gray-600">Không tìm thấy chương trình đào tạo.</p>
      )}
    </div>
  );
}

export default Curriculum;