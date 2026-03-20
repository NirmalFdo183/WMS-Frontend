import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8">
            <div className="max-w-7xl mx-auto">
                <header className="flex justify-between items-center mb-10 pb-6 border-b border-gray-800">
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
                        Dashboard
                    </h1>
                    <div className="flex items-center gap-4">
                        <span className="text-gray-400">Welcome, {user?.name || 'User'}</span>
                        <button
                            onClick={handleLogout}
                            className="px-4 py-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-colors"
                        >
                            Logout
                        </button>
                    </div>
                </header>

                <main className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="p-6 bg-gray-800 rounded-xl border border-gray-700">
                        <h3 className="text-xl font-semibold mb-2">Overview</h3>
                        <p className="text-gray-400">Welcome to your dashboard. Select an option to get started.</p>
                    </div>
                    {/* Add more dashboard cards here */}
                </main>
            </div>
        </div>
    );
};

export default Dashboard;
