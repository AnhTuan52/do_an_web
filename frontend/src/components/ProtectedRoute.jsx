import { Navigate } from "react-router-dom";
import Cookies from "js-cookie";

const ProtectedRoute = ({ children }) => {
  const session = Cookies.get("session");
  if (!session) {
    return <Navigate to="/" />;
  }
  return children;
};

export default ProtectedRoute;