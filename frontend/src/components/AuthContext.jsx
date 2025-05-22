import React, { createContext, useState, useEffect, useContext, useCallback } from "react";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";
import { useQuery, useMutation, QueryClient, QueryClientProvider } from "@tanstack/react-query";

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }
});

// Thêm interceptor để log request và response
apiClient.interceptors.request.use(
  config => {
    console.log('Request:', config);
    return config;
  },
  error => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  response => {
    console.log('Response:', response);
    return response;
  },
  error => {
    console.error('Response error:', error);
    return Promise.reject(error);
  }
);

export const AuthContext = createContext();
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // Cache dữ liệu trong 5 phút
      cacheTime: 1000 * 60 * 10, // Giữ cache trong 10 phút
    },
  },
});

export const AuthProviderComponent = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    // Khôi phục trạng thái từ localStorage
    return localStorage.getItem("isAuthenticated") === "true";
  });
  const [user, setUser] = useState(() => {
    // Khôi phục user từ localStorage
    const storedUser = localStorage.getItem("user");
    return storedUser ? JSON.parse(storedUser) : null;
  });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  const handleAuthError = useCallback(() => {
    setIsAuthenticated(false);
    setUser(null);
    localStorage.removeItem("isAuthenticated");
    localStorage.removeItem("user");
    if (location.pathname !== "/") {
      navigate("/");
    }
  }, [location.pathname, navigate]);

  const checkSession = useCallback(async () => {
    const response = await apiClient.get("/check-session");
    return response.data;
  }, []);

  const loginMutation = useMutation({
    mutationFn: ({ mssv, password, email, isInstructor }) => {
      if (isInstructor) {
        console.log("Đang gửi request đăng nhập giảng viên:", { email, password });
        return apiClient.post("/instructor/login", { email, password })
          .then((res) => {
            console.log("Kết quả đăng nhập giảng viên:", res.data);
            return res.data;
          })
          .catch(error => {
            console.error("Lỗi đăng nhập giảng viên:", error.response?.data || error.message);
            throw error;
          });
      } else {
        return apiClient.post("/login", { mssv, password }).then((res) => res.data);
      }
    },
    onSuccess: (data) => {
      console.log("Login success, data:", data);
      setIsAuthenticated(true);

      // Xác định loại người dùng và lưu thông tin phù hợp
      if (data.role === 'instructor') {
        console.log("Đăng nhập thành công với vai trò giảng viên:", data);
        setUser({
          instructor_id: data.instructor_id,
          name: data.name,
          role: data.role
        });
        localStorage.setItem("isAuthenticated", "true");
        localStorage.setItem("user", JSON.stringify({
          instructor_id: data.instructor_id,
          name: data.name,
          role: data.role
        }));
        console.log("Chuyển hướng đến /instructor");
        navigate("/instructor");
      } else {
        setUser({ mssv: data.mssv });
        localStorage.setItem("isAuthenticated", "true");
        localStorage.setItem("user", JSON.stringify({ mssv: data.mssv }));
        navigate("/user");
      }
    },
    onError: (err) => {
      console.error("Login error:", err);
      console.error("Response data:", err.response?.data);
      setMessage(err.response?.data?.message || err.message);
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ["session"],
    queryFn: checkSession,
    enabled: isAuthenticated, // Chỉ gọi khi isAuthenticated là true
    retry: false,
    onError: handleAuthError,
  });

  useEffect(() => {
    // Khôi phục trạng thái từ localStorage khi mount
    if (!isAuthenticated && localStorage.getItem("isAuthenticated") === "true") {
      setIsAuthenticated(true);
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    }

    if (data?.status === "success") {
      setIsAuthenticated(true);
      setUser(data.user || { mssv: data.mssv });
      localStorage.setItem("isAuthenticated", "true");
      localStorage.setItem("user", JSON.stringify(data.user || { mssv: data.mssv }));
      if (location.pathname === "/") {
        navigate("/user");
      }
    } else if (data?.status === "error") {
      handleAuthError();
    }
    setLoading(isLoading);
  }, [data, isLoading, handleAuthError, location.pathname, navigate]);

  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 3;

    apiClient.interceptors.response.use(
      (response) => {
        retryCount = 0; // Reset retry count on success
        return response;
      },
      async (error) => {
        if (error.response?.status === 429 && retryCount < maxRetries) {
          retryCount++;
          const retryAfter = error.response.headers["retry-after"]
            ? parseInt(error.response.headers["retry-after"]) * 1000
            : 30000;
          setMessage("Quá nhiều yêu cầu. Vui lòng chờ một chút...");
          await new Promise((resolve) => setTimeout(resolve, retryAfter));
          return apiClient.request(error.config);
        }
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
          handleAuthError();
        }
        return Promise.reject(error);
      }
    );

    // Cleanup interceptor khi component unmount
    return () => {
      apiClient.interceptors.response.eject(apiClient.interceptors.response);
    };
  }, [handleAuthError]);

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.post("/logout", {});
      if (response.data.status !== "success") {
        throw new Error(response.data.message || "Logout failed");
      }
      return response.data;
    },
    onSuccess: () => {
      setIsAuthenticated(false);
      setUser(null);
      localStorage.removeItem("isAuthenticated");
      localStorage.removeItem("user");
      navigate("/");
      setMessage("Đăng xuất thành công!");
      queryClient.clear();
    },
    onError: (error) => {
      setIsAuthenticated(false);
      setUser(null);
      localStorage.removeItem("isAuthenticated");
      localStorage.removeItem("user");
      navigate("/");
      setMessage(
        error.response?.data?.message ||
        error.message ||
        "Lỗi khi đăng xuất. Vui lòng thử lại!"
      );
    },
  });

  const logout = useCallback(() => {
    logoutMutation.mutate();
  }, [logoutMutation]);

  if (loading) {
    return (
      <div className="w-full h-[600px] flex justify-center items-center gap-2">
        <img
          src="/loading2.svg"
          alt="Loading..."
          className="flex justify-center items-center h-20 w-20"
        />
      </div>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        loginMutation,
        logout,
        setIsAuthenticated,
        setUser,
        message,
        setMessage,
        isLoading: loading || logoutMutation.isLoading,
        isLoggingOut: logoutMutation.isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const AuthProvider = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProviderComponent>{children}</AuthProviderComponent>
    </QueryClientProvider>
  );
};