const Loading = () => {
    return (
        <div className="flex flex-col items-center justify-center h-[calc(100vh-100px)]">
            <div className="relative">
                {/* Outer Ring */}
                <div className="w-24 h-24 rounded-full border-t-4 border-b-4 border-blue-500 animate-spin"></div>

                {/* Inner Ring */}
                <div className="absolute top-0 left-0 w-24 h-24 rounded-full border-r-4 border-l-4 border-purple-500 animate-spin animation-delay-500 opacity-70"></div>

                {/* Center Icon */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-2xl animate-pulse">
                    ⏳
                </div>
            </div>
            <h2 className="mt-8 text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500 animate-pulse">
                Loading Resources...
            </h2>
            <p className="mt-2 text-gray-400">Please wait while we prepare your data</p>
        </div>
    );
};

export default Loading;
