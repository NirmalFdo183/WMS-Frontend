import { useState, useRef, useEffect } from "react";

interface Employee {
    id: number;
    name: string;
    nic: string;
    role: string;
    phoneno: string;
}

interface EmployeeSelectProps {
    label: string;
    role: string;
    employees: Employee[];
    value: string;
    onChange: (id: string) => void;
}

const EmployeeSelect = ({
    label,
    employees,
    value,
    onChange,
}: EmployeeSelectProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Initialize search text based on value
    useEffect(() => {
        if (value) {
            const emp = employees.find((e) => e.id.toString() === value);
            if (emp) setSearch(`${emp.name} (${emp.nic})`);
        } else {
            // Only clear search if valid search/selection is cleared from parent?
            // If user is typing, we don't want to clear it.
            // But this runs on `value` change.
            // If `value` becomes empty string, we clear search.
            if (value === "") setSearch("");
        }
    }, [value, employees]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                // Reset to last valid selection on blur
                if (value) {
                    const emp = employees.find((e) => e.id.toString() === value);
                    if (emp) setSearch(`${emp.name} (${emp.nic})`);
                } else {
                    setSearch("");
                }
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [value, employees]);

    const filtered = employees.filter((e) =>
        `${e.name} ${e.nic}`.toLowerCase().includes(search.toLowerCase()),
    );

    return (
        <div className="relative" ref={wrapperRef}>
            <label className="font-semibold text-gray-700 block mb-1.5 ml-0.5">
                {label}
            </label>
            <input
                type="text"
                className="w-full px-3 py-2.5 rounded-lg bg-white border border-gray-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                placeholder={`Search ${label}...`}
                value={search}
                onChange={(e) => {
                    setSearch(e.target.value);
                    setIsOpen(true);
                    if (e.target.value === "") onChange("");
                }}
                onFocus={() => setIsOpen(true)}
            />
            {isOpen && filtered.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                    {filtered.map((e) => (
                        <div
                            key={e.id}
                            className="px-4 py-2 hover:bg-blue-50 cursor-pointer text-sm text-gray-700"
                            onClick={() => {
                                onChange(e.id.toString());
                                setSearch(`${e.name} (${e.nic})`);
                                setIsOpen(false);
                            }}
                        >
                            <div className="font-bold">{e.name}</div>
                            <div className="text-xs text-gray-500">{e.nic}</div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default EmployeeSelect;
