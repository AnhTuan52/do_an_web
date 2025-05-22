import { Outlet } from "react-router-dom";

function Dashboard(){
    return (
        <>
            <div className="dashboard-content w-full max-w-full overflow-x-hidden dark:scrollbar-track-gray-800 scrollbar-custom transition-ld p-0 max-md:p-2.5">
                <Outlet />
            </div>
        </>
    );
}

export default Dashboard;