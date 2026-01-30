import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
    const { user } = useAuth();

    return (
        <div className="max-w-7xl mx-auto">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">
                    Dashboard
                </h1>
                <p className="text-gray-500 mt-2">Welcome back, {user?.name || 'User'}</p>
            </header>

            <main className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="p-6 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Overview</h3>
                    <p className="text-gray-600">Welcome to your dashboard. Select an option to get started.</p>
                </div>
                {/* Add more dashboard cards here */}
            </main>
        </div>
    );
};

export default Dashboard;
