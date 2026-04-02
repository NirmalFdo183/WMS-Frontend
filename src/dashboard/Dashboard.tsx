import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    const dashboardCards = [
        {
            title: "Overview",
            description: "Welcome to your dashboard. Select an option to get started.",
            icon: (
                <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
            ),
            link: "/dashboard"
        },
        {
            title: "Manage Suppliers",
            description: "View and manage all your product suppliers in one place.",
            icon: (
                <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
            ),
            link: "/suppliers",
            action: (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        navigate("/suppliers");
                    }}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm font-medium shadow-sm"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add a New Supplier
                </button>
            )
        }
    ];

    return (
        <div className="max-w-7xl mx-auto py-8">
            <header className="mb-8">
                <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                    Dashboard
                </h1>
                <p className="text-gray-500 mt-2 text-lg">
                    Welcome back, <span className="font-semibold text-blue-600">{user?.name || 'User'}</span>
                </p>
            </header>

            <main className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {dashboardCards.map((card, index) => (
                    <div
                        key={index}
                        onClick={() => navigate(card.link)}
                        className="p-8 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all duration-300 group cursor-pointer"
                    >
                        <div className="mb-6 bg-gray-50 w-14 h-14 rounded-xl flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                            {card.icon}
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors">{card.title}</h3>
                        <p className="text-gray-600 leading-relaxed mb-4">{card.description}</p>
                        {card.action}
                    </div>
                ))}
            </main>
        </div>
    );
};

export default Dashboard;
