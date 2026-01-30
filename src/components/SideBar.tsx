import { NavLink } from 'react-router-dom';

const SideBar = () => {
    const navItems = [
        { name: 'Dashboard', path: '/dashboard', icon: '🏠' },
        { name: 'New Supply', path: '/new-supply', icon: '📦' },
        { name: 'Loading', path: '/loading', icon: '⏳' },
        { name: 'Settings', path: '/settings', icon: '⚙️' },
    ];

    return (
        <div className="h-screen w-64 bg-white border-r border-gray-200 text-gray-900 flex flex-col fixed left-0 top-0 z-50">
            <div className="p-6 border-b border-gray-200">
                <h1 className="text-2xl font-bold text-blue-600">
                    Hemas Stock Manager
                </h1>
            </div>
            <nav className="flex-1 p-4 space-y-1">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-4 py-3 rounded-md transition-colors duration-200 ${isActive
                                ? 'bg-gray-100 text-blue-600 font-semibold border-l-4 border-blue-600'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                            }`
                        }
                    >
                        <span className="text-xl">{item.icon}</span>
                        <span className="font-medium">{item.name}</span>
                    </NavLink>
                ))}
            </nav>
        </div>
    );
};

export default SideBar;
