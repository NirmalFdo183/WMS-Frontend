import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Header = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [currentDate, setCurrentDate] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentDate(new Date());
        }, 60000);
        return () => clearInterval(timer);
    }, []);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const formattedDate = currentDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    return (
        <header className="flex justify-between items-center bg-white border-b border-gray-200 px-8 pb-2 mb-8">
            <div className="flex items-center gap-6">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center text-blue-600 font-bold text-lg border border-gray-200">
                        {user?.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div className="flex flex-col">
                        <span className="text-gray-900 font-semibold">{user?.name || 'User'}</span>
                        <span className="text-xs text-gray-500 capitalize">{user?.role || 'Admin'}</span>
                    </div>
                </div>

                <div className="h-8 w-px bg-gray-200 mx-2"></div>

                <div className="flex flex-col">
                    <span className="text-xs text-gray-500">Current Value</span>
                    <span className="text-gray-900 font-bold">$24,500.00</span>
                </div>
            </div>

            <div className="flex items-center gap-6">
                <div className="flex items-center gap-2 text-gray-600 bg-gray-50 px-4 py-2 rounded-md border border-gray-200">
                    <span>📅</span>
                    <span className="text-sm font-medium">{formattedDate}</span>
                </div>

                <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-4 py-2 bg-white text-red-600 border border-red-200 rounded-md hover:bg-red-50 transition-all active:scale-95"
                    title="Logout"
                >
                    <span>🚪</span>
                    <span className="font-medium">Logout</span>
                </button>
            </div>
        </header>
    );
};

export default Header;
