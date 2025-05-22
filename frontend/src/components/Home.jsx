import React, { useState, useEffect } from "react";
import axios from "axios";
import { Bar, Pie, Doughnut } from "react-chartjs-2";
import ChartDataLabels from "chartjs-plugin-datalabels";
import { Chart as ChartJS, ArcElement, Tooltip, Legend, BarElement, CategoryScale, LinearScale, PointElement, LineElement } from "chart.js";
import { useQuery } from "@tanstack/react-query";
import { ThemeContext } from "/src/App.jsx";
import { Line } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, BarElement, CategoryScale, LinearScale, PointElement, LineElement, ChartDataLabels);

function Home() {
    const { isDarkMode } = React.useContext(ThemeContext);
    const [showOverallBarChart, setShowOverallBarChart] = React.useState(false);

    const { data: student, isLoading: studentLoading, error: studentError } = useQuery({
      queryKey: ["student"],
      queryFn: async () => {
        const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/user`, { withCredentials: true });
        if (response.data.status !== "success") {
          throw new Error(response.data.message || "Không thể tải thông tin sinh viên.");
        }
        return response.data.student;
      },
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5,
    });

    const { data: academicRecords = { academic_records: [] }, isLoading: recordsLoading, error: recordsError } = useQuery({
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
        onError: (error) => {
            console.error("Error fetching academic records:", error);
        }
    });

    const { data: performance = {}, isLoading: perfLoading, error: perfError } = useQuery({
      queryKey: ["performance"],
      queryFn: async () => {
        const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/performance_review`, { withCredentials: true });
        if (response.data.status !== "success") {
          console.log("Error fetching performance data:", perfError);
        }
        return response.data;
      },
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5,
      onError: (error) => {
        console.log("Error fetching performance data:", response.data.message);
      }
    });
    
    const { data: curriculum = {}} = useQuery({
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

    const { data: calendar = {}} = useQuery({
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

    const { data: scholarships = []} = useQuery({
        queryKey: ["scholarships"],
        queryFn: async () => {
        const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/scholarships`, { withCredentials: true });
        if (response.data.status !== "success") {
            throw new Error(response.data.message || "Không thể tải thông tin học bổng!");
        }
        return response.data.scholarships;
        },
    });

    if (studentLoading) {
    return (
        <div className="w-full h-[600px] flex justify-center items-center gap-2">
        <img src="/public/loading2.svg" alt="Loading..." className="flex justify-center items-center h-20 w-20" />
        </div>
    );
    }

    if (studentError) {
    return (
        <p className="m-4 text-red-600">
        Không thể tải thông tin sinh viên.
        </p>
    );
    }
    
    const calculatePercentage = () => {
        if (!academicRecords || !academicRecords.summary || !academicRecords.progress) return 0;
        return (academicRecords.summary.total_credits_taken / academicRecords.progress.total_credits_required) * 100;
    };
    const percentage = calculatePercentage().toFixed(2);

    const circumference = 2 * Math.PI * 45;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    const semesterChartData = {
        labels: performance.semester_performance?.map(data => data.semester) || [],
        datasets: [{
            label: "Số môn rớt",
            data: performance.semester_performance?.map(data => data.failed_courses) || [],
            backgroundColor: 'rgba(75, 192, 192, 0.5)',
            borderColor: "rgb(75, 192, 192)",
            borderWidth: 1,
        }],
    };

    const overallChartData = {
        labels: ["Tổng môn rớt", "Tổng môn đã học"],
        datasets: [{
            data: [
                performance.overall_performance?.total_failed_courses || 0,
                performance.overall_performance?.total_passed_courses || 0
            ],
            backgroundColor: ["hsl(3, 78%, 51%)", "hsl(209, 97%, 51%)"],
            borderColor: ["hsl(347, 100.00%, 79.40%)", "hsl(204, 81.90%, 66.70%)"],
            borderWidth: 1,
        }]
    };

    const overallBarChartData = {
        labels: ["Tổng môn rớt", "Tổng tín chỉ rớt", "Tổng môn đã học", "Tổng tín chỉ đã đăng ký"],
        datasets: [{
            label: "Số liệu",
            data: [
                performance.overall_performance?.total_failed_courses || 0,
                performance.overall_performance?.total_failed_credits || 0,
                performance.overall_performance?.total_passed_courses || 0,
                performance.overall_performance?.total_taken_credits || 0
            ],
            backgroundColor: "rgba(54, 162, 235, 0.6)",
            borderColor: "rgb(54, 162, 235)",
            borderWidth: 1,
        }]
    };

    const progressChartData = {
        labels: ["Đã hoàn thành", "Chưa hoàn thành"],
        datasets: [{
            data: [
                performance.progress?.percentage_completed || 0,
                100 - (performance.progress?.percentage_completed || 0)
            ],
            backgroundColor: ["#2AB066", "#FCF6F6"],
            borderColor: ["#2AB066", "#FCF6F6"],
            borderWidth: 1,
        }]
    };

    const progessChartOptions = {
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: "top",
                labels: {
                color: isDarkMode ? "#fff" : "#111"
                }
            },
            datalabels: {
                color: "#000000",
                formatter: (value, context) => {
                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                    const percentage = total ? ((value / total) * 100).toFixed(1) : 0;
                    return `${percentage}%`;
                },
                font: {
                    weight: "bold",
                    size: 12,
                },
            },
        },
    };

    const chartOptions = {
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: "top",
                labels: {
                    color: isDarkMode ? "#fff" : "#111",
                }
            },
            datalabels: {
                color: isDarkMode ? "#fff" : "#111",
                formatter: (value, context) => {
                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                    const percentage = total ? ((value / total) * 100).toFixed(1) : 0;
                    return `${percentage}%`;
                },
                font: {
                    weight: "bold",
                    size: 12,
                },
            },
        },
    };

    const barChartOptions = {
        maintainAspectRatio: false,
        plugins: {
            legend: {
            position: "top",
            labels: {
                color: isDarkMode ? "#fff" : "#111"
            }
            },
            datalabels: {
            display: false,
            },
        },
        indexAxis: "y",
        scales: {
            x: {
            ticks: {
                color: isDarkMode ? "#fff" : "#111"
            },
            grid: {
                color: isDarkMode ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)"
            }
            },
            y: {
            ticks: {
                color: isDarkMode ? "#fff" : "#111"
            },
            grid: {
                color: isDarkMode ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)"
            }
            }
        }
    };
    
    const reversedRecords = academicRecords.academic_records
    .filter(
        (record) =>
        record.semester_average !== null &&
        record.semester_average !== undefined &&
        record.semester_average !== "0"
    )
    .reverse();


    const semesterAverageChartData = {
        labels: reversedRecords.map(record => record.semester),
        datasets: [
            {
            label: "Điểm trung bình học kỳ",
            data: reversedRecords.map(record => record?.semester_average),
            borderColor: "#4bc0c0",
            backgroundColor: "#4bc0c0",
            fill: false,
            tension: 0.4,
            pointRadius: 5,
            pointHoverRadius: 7,
            pointBorderWidth: 2,
            pointBackgroundColor: "#ffffff",
            pointBorderColor: "#4bc0c0",
            }
        ]
    };

    const semesterChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                labels: {
                    color: isDarkMode ? "#fff" : "#000"
                }
            },
            datalabels: {
                color: isDarkMode ? "#E0FFFF" : "hsl(180,100%,30%)",
                anchor: 'end',
                align: 'top',
                offset: 3,
                font: {
                    weight: 'bold'
                },
                formatter: (value) => parseFloat(value).toFixed(2)
            }
        },
        scales: {
            x: {
            ticks: {
                color: isDarkMode ? "#fff" : "#000"
            },
            grid: {
                color: isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)"
            },
            offset: true,
            },
            y: {
            beginAtZero: true,
            suggestedMax: 10,
            ticks: {
                color: isDarkMode ? "#fff" : "#000",
                stepSize: 1
            },
            grid: {
                color: isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)"
            }
            }
        }
    };

    return (
    <div className="flex flex-col items-center w-full p-4 md:p-6 mb-10 lg:p-8 m-0 max-w-full max-h-full my-8 mx-auto bg-white dark:bg-gray-900 dark:text-white rounded-lg transition-colors duration-300">

      {student ? (
        <>
          <div className="welcome flex flex-col justify-center w-full max-w-[1200px] px-2 mb-8">
            <h2 className="text-3xl md:text-4xl font-bold mb-2 dark:text-white">Trang chủ</h2>
            <p className="text-lg md:text-xl ml-1 text-blue-600 dark:text-blue-400">Chào mừng, <span className="font-semibold">{student.personal_info.full_name}</span>!</p>
          </div>

          <div className="all-info flex flex-wrap justify-center gap-6 w-full max-w-[1200px] items-stretch">

            <div className="info-block1 flex flex-col w-full md:w-[calc(60%-12px)] lg:w-[calc(50%-12px)] p-6 shadow-md rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 flex-1 min-w-[300px] min-h-full">
              <div className="card-body w-full">
                <h4 className="text-lg md:text-xl font-bold mb-5 pb-2 border-b border-gray-300 dark:border-gray-600">
                  <svg className="w-6 h-6 inline-block mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0h4m-6 9f"></path></svg>
                  Thông tin sinh viên
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                  <div className="flex items-center">
                    <p className="w-28 font-semibold text-gray-700 dark:text-gray-300">MSSV:</p>
                    <p>{student.mssv}</p>
                  </div>
                  <div className="flex items-center">
                    <p className="w-28 font-semibold text-gray-700 dark:text-gray-300">Họ tên:</p>
                    <p className="font-medium">{student.personal_info.full_name}</p>
                  </div>
                  <div className="flex items-center">
                    <p className="w-28 font-semibold text-gray-700 dark:text-gray-300">Lớp:</p>
                    <p>{student.personal_info.class}</p>
                  </div>
                  <div className="flex items-center">
                    <p className="w-28 font-semibold text-gray-700 dark:text-gray-300">Khoa:</p>
                    <p>{student.personal_info.faculty}</p>
                  </div>
                  <div className="flex items-center">
                    <p className="w-28 font-semibold text-gray-700 dark:text-gray-300">Ngành:</p>
                    <p>{student.personal_info.major}</p>
                  </div>
                  <div className="flex items-center">
                    <p className="w-28 font-semibold text-gray-700 dark:text-gray-300">Hệ đào tạo:</p>
                    <p>{student.personal_info.training_system}</p>
                  </div>
                  <div className="flex items-center">
                    <p className="w-28 font-semibold text-gray-700 dark:text-gray-300">Email:</p>
                    <p><a href={`mailto:${student.personal_info.email.school}`} className="text-blue-600 hover:underline dark:text-blue-400">{student.personal_info.email.school}</a></p>
                  </div>
                </div>
              </div>
            </div>

            <div className="info-block2 flex flex-col items-center w-full md:w-[calc(40%-12px)] lg:w-[calc(50%-12px)] p-6 shadow-md rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 flex-1 min-w-[300px] min-h-full">
              <div className="card-body w-full flex flex-col items-center">
                <h4 className="text-lg md:text-xl font-bold mb-5 pb-2 border-b border-gray-300 dark:border-gray-600 text-center w-full">
                  <svg className="w-6 h-6 inline-block mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  Tiến độ học tập
                </h4>
                <div className="flex flex-col md:flex-row items-center justify-between w-full">

                   <div className="grid gap-y-0 w-full h-full items-start mr-4 mb-6 md:mb-0 md:w-[50%] lg:w-[40%]">
                      <div className="flex justify-between items-center">
                         <p className="font-semibold text-gray-700 dark:text-gray-300">Tổng tín chỉ cần:</p>
                         <p>{academicRecords.progress?.total_credits_required}</p>
                      </div>
                      <div className="flex justify-between items-center">
                         <p className="font-semibold text-gray-700 dark:text-gray-300">Tín chỉ tích lũy:</p>
                         <p className="font-bold text-blue-600 dark:text-blue-400">{academicRecords.summary?.total_credits_accumulated}</p>
                      </div>
                      <div className="flex justify-between items-center">
                         <p className="font-semibold text-gray-700 dark:text-gray-300">Điểm trung bình:</p>
                         <p className="font-bold text-green-600 dark:text-green-400">{academicRecords.summary?.overall_average}</p>
                      </div>
                   </div>

                   <div className="relative flex items-center justify-center w-[9rem] h-[9rem] md:w-[12rem] md:h-[12rem]">
                       <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                           <circle
                             cx="50"
                             cy="50"
                             r="45"
                             stroke="#e5e7eb"
                             strokeWidth="10"
                             fill="none"
                           />
                           <circle
                             cx="50"
                             cy="50"
                             r="45"
                             stroke="#16a34a"
                             strokeWidth="10"
                             strokeLinecap="round"
                             fill="none"
                             strokeDasharray={circumference}
                             strokeDashoffset={strokeDashoffset}
                             className="transition-all duration-700 ease-in-out"
                           />
                       </svg>
                       <div className="absolute inset-0 flex items-center justify-center">
                           <span className="text-green-600 dark:text-blue-400 text-3xl font-bold">{percentage}%</span>
                       </div>
                   </div>

                </div>

              </div>
            </div>

            {(perfLoading || recordsLoading) && (
              <div className="w-full flex flex-col items-center justify-center mt-10 gap-3 p-4 border border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-gray-700 rounded-md">
                <p className="text-blue-700 dark:text-blue-300 text-lg">Đang tải dữ liệu học tập...</p>
                 <img src="/public/loading2.svg" alt="Loading..." className="h-12 w-12" />
              </div>
            )}

            {(recordsError || perfError) && (
              <div className="w-full flex flex-col items-center justify-center mt-10 gap-3 p-4 border border-red-400 bg-red-50 dark:border-red-700 dark:bg-gray-700 rounded-md text-red-700 dark:text-red-300">
                <p className="text-center">
                  {(recordsError && 'Không thể tải kết quả học tập. Vui lòng thử lại sau.') ||
                   (perfError && 'Không thể tải hiệu suất học tập. Vui lòng thử lại sau.')}
                </p>
              </div>
            )}

            <div className="info-block3 flex flex-col w-full max-w-[1200px] p-6 shadow-md rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 min-h-full">
              <div className="card-body w-full">
                <h4 className="text-lg md:text-xl font-bold mb-5 pb-2 border-b border-gray-300 dark:border-gray-600 text-center">
                   <svg className="w-6 h-6 inline-block mr-2 text-[#4bc0c0]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
                  Đánh giá hiệu suất học tập
                </h4>

                <div className="semester-performance perf-subblock rounded-lg shadow-inner dark:shadow-none dark:bg-gray-700 p-5 mb-6">
                  <h5 className="text-base md:text-lg font-semibold mb-4" style={{ color: "rgba(75, 192, 192, 1)" }}>Hiệu suất từng học kỳ</h5>
                  {performance.semester_performance && performance.semester_performance.length > 0 ? (
                    <div style={{ height: "200px" }} className="max-h-[250px] w-full">
                      <Line data={semesterAverageChartData} options={semesterChartOptions} />
                    </div>
                  ) : (
                    <p className="my-2 text-center text-gray-500 dark:text-gray-400">Chưa có dữ liệu hiệu suất học kỳ.</p>
                  )}
                </div>

                <div className="overall-performance perf-subblock rounded-lg shadow-inner dark:shadow-none dark:bg-gray-700 p-5 mb-6">
                  <h5 className="text-base md:text-lg font-semibold mb-4 text-blue-500">Tổng quan hiệu suất</h5>
                  <div style={{ height: "200px" }} className="max-h-[250px] w-full flex justify-center">
                    <Pie data={overallChartData} options={chartOptions} />
                  </div>
                  <button
                    className="mt-4 py-2 px-5 bg-blue-600 text-white border-none rounded-lg cursor-pointer text-sm font-medium transition-colors duration-300 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 mx-auto block" // Centered button
                    onClick={() => setShowOverallBarChart(!showOverallBarChart)}
                  >
                    {showOverallBarChart ? "Ẩn chi tiết" : "Xem chi tiết"}
                  </button>
                  {showOverallBarChart && (
                    <div style={{ height: "200px", marginTop: "20px" }} className="max-h-[250px] w-full mt-6">
                      <Bar data={overallBarChartData} options={barChartOptions} />
                    </div>
                  )}
                </div>

                <div className="block4 flex flex-wrap md:flex-nowrap gap-6">
                  <div className="progress-section perf-subblock shadow-inner dark:shadow-none rounded-lg p-5 dark:bg-gray-700 flex flex-col gap-3 mb-0 w-full md:w-1/2">
                    <h5 className="text-base md:text-lg font-semibold mb-3" style={{ color: "#2AB066" }}>Tiến độ hoàn thành môn bắt buộc</h5>
                    <div style={{ height: "180px" }} className="max-h-[200px] w-full flex justify-center mb-4">
                      <Doughnut data={progressChartData} options={progessChartOptions} />
                    </div>
                    <ul className="list-none p-0 m-0 flex flex-col gap-2">
                       <li className="text-sm md:text-base"><strong className="text-gray-700 dark:text-gray-300">Tín chỉ bắt buộc đã hoàn thành:</strong> {performance.progress?.completed_required_credits || 0}</li>
                       <li className="text-sm md:text-base"><strong className="text-gray-700 dark:text-gray-300">Tổng tín chỉ bắt buộc:</strong> 148</li>
                       <li className="text-sm md:text-base">
                          <strong className="text-gray-700 dark:text-gray-300">Các môn còn lại cần học: </strong>
                           {performance.progress?.remaining_required_courses && performance.progress.remaining_required_courses.length > 0
                            ? performance.progress.remaining_required_courses.map((course, index) => (
                                <span key={course.course_code} title={`${course.course_code}: ${course.course_name}`} className="hover:underline cursor-help">
                                  {course.course_code}{index !== performance.progress.remaining_required_courses.length - 1 ? ", " : ""}
                                </span>
                              ))
                            : "Không có"}
                       </li>
                       <li className="text-sm md:text-base">
                          <strong className="text-gray-700 dark:text-gray-300">Mã môn đã hoàn thành: </strong>
                           {performance.progress?.completed_course_codes && performance.progress.completed_course_codes.length > 0
                             ? performance.progress.completed_course_codes.join(", ")
                             : "Không có"}
                       </li>
                    </ul>
                  </div>

                  <div className="block45 flex flex-col w-full md:w-1/2 gap-6">
                    <div className="graduation-outlook perf-subblock rounded-lg shadow-inner dark:shadow-none dark:bg-gray-700 p-5 flex flex-col gap-3 flex-1"> {/* Adjusted gap and added flex-1 to make it fill available space */}
                      <h5 className="text-base md:text-lg font-semibold mb-2" style={{ color: "hsl(20, 77%, 52%)" }}>Ước tính tốt nghiệp</h5> {/* Adjusted bottom margin */}
                       <ul className="list-none p-0 m-0 flex flex-col gap-2">
                          <li className="text-sm md:text-base"><strong className="text-gray-700 dark:text-gray-300">Đánh giá:</strong> <span className="font-medium">{performance.graduation_outlook?.assessment || "Chưa có đánh giá"}</span></li> {/* Highlight assessment */}
                          <li className="text-sm md:text-base"><strong className="text-gray-700 dark:text-gray-300">Học kỳ hiện tại:</strong> {performance.graduation_outlook?.current_semester || 0}</li>
                          <li className="text-sm md:text-base"><strong className="text-gray-700 dark:text-gray-300">Số học kỳ còn lại:</strong> {performance.graduation_outlook?.remaining_semesters || 0}</li>
                          <li className="text-sm md:text-base"><strong className="text-gray-700 dark:text-gray-300">Tín chỉ trung bình cần mỗi kỳ:</strong> {performance.graduation_outlook?.average_credits_per_semester_needed || 0}</li>
                       </ul>
                    </div>

                    <div className="retake-cost perf-subblock rounded-lg shadow-inner dark:shadow-none dark:bg-gray-700 p-5 flex flex-col gap-3 flex-1"> {/* Adjusted gap and added flex-1 */}
                      <h5 className="text-base md:text-lg font-semibold mb-2" style={{ color: "#B94247" }}>Chi phí học lại ước tính</h5> {/* Adjusted bottom margin and title */}
                       <ul className="list-none p-0 m-0 flex flex-col gap-2">
                          <li className="text-sm md:text-base"><strong className="text-gray-700 dark:text-gray-300">Tổng chi phí:</strong> <span className="font-bold text-red-600 dark:text-red-400">{performance.retake_cost?.total_cost ? performance.retake_cost.total_cost.toLocaleString('vi-VN') : 0} VND</span></li> {/* Highlight cost and format number */}
                       </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <p className="text-center text-gray-500 dark:text-gray-400 text-lg">Không có dữ liệu sinh viên.</p>
      )}
    </div>
  );
}

export default Home;