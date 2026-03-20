import { Outlet } from 'react-router-dom';
import SideBar from './SideBar';
import Header from './Header';

const Layout = () => {
    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden">
            <SideBar />
            <main className="flex-1 lg:ml-20 overflow-y-auto h-full">
                <Header />
                <div className="px-8 pb-8">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default Layout;
