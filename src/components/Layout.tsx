import { Outlet } from 'react-router-dom';
import SideBar from './SideBar';

const Layout = () => {
    return (
        <div className="flex min-h-screen bg-gray-950">
            <SideBar />
            <main className="flex-1 ml-64 p-8 overflow-y-auto">
                <Outlet />
            </main>
        </div>
    );
};

export default Layout;
