import React, { useState, useEffect } from "react";
import {
    Info, Search, Plus, Save, RefreshCw,
    Settings, History, Package, Calendar as CalendarIcon,
    ArrowRight, Download, Edit2, Play, Loader2
} from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs) {
    return twMerge(clsx(inputs));
}

// --- SUB-COMPONENTS ---
const SectionCard = ({ title, children, actions }) => (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden flex flex-col h-full">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
            <h3 className="font-semibold text-sm text-slate-700 dark:text-slate-200">{title}</h3>
            <div className="flex items-center gap-2">{actions}</div>
        </div>
        <div className="flex-1 overflow-auto p-0">{children}</div>
    </div>
);

const MaintenanceTable = () => {
    // State management for API data
    const [dashboardData, setDashboardData] = useState({
        aircraft: [],
        utilisation: [],
        status: [],
        rotables: []
    });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Fetch data on component mount
    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                setIsLoading(true);
                // Retrieve your JWT token (adjust according to your auth setup)
                const token = localStorage.getItem("token");

                // Ensure the URL matches your backend route exactly
                const response = await fetch("/api/user/maintenance-dashboard", {
                    method: "GET",
                    headers: {
                        "Authorization": `Bearer ${token}`,
                        "Content-Type": "application/json"
                    }
                });

                if (!response.ok) throw new Error("Failed to fetch maintenance data");

                const result = await response.json();

                if (result.success) {
                    setDashboardData(result.data);
                } else {
                    throw new Error(result.message);
                }
            } catch (err) {
                console.error(err);
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full min-h-[400px]">
                <Loader2 className="animate-spin text-indigo-600" size={32} />
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 bg-red-50 text-red-600 rounded-lg m-4">
                <p className="font-bold">Error loading dashboard:</p>
                <p>{error}</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950">
            {/* Top Controls Bar */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-orange-600 to-red-600 dark:from-orange-400 dark:to-red-400">
                        Maintenance Dashboard
                    </h2>
                    <button className="flex items-center gap-2 px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-bold shadow-lg shadow-green-500/20 transition-all active:scale-95 uppercase tracking-wider">
                        <Play size={16} fill="currentColor" /> Compute
                    </button>
                </div>

                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-3 py-1.5 text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-md transition-colors border border-indigo-200 dark:border-indigo-800">
                        Set/Reset Status
                    </button>
                    <button className="flex items-center gap-2 px-3 py-1.5 text-xs text-orange-600 dark:text-orange-400 font-semibold hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-md transition-colors border border-orange-200 dark:border-orange-800">
                        Set/Reset Targets
                    </button>
                    <button className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors border border-slate-200 dark:border-slate-700">
                        Major Rotables
                    </button>
                    <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 mx-2" />
                    <button className="p-2 text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                        <Download size={20} />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-auto p-4 space-y-6">

                {/* Row 1: Aircraft Owning & Current Status Overview */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <div className="lg:col-span-4 flex flex-col gap-6">
                        <SectionCard title="Aircraft Owning">
                            <table className="w-full text-xs">
                                <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-800">
                                    <tr>
                                        <th className="p-2 text-left text-slate-500 uppercase">MSN</th>
                                        <th className="p-2 text-left text-slate-500 uppercase">Pos 1 ESN</th>
                                        <th className="p-2 text-left text-slate-500 uppercase">Pos 2 ESN</th>
                                        <th className="p-2 text-left text-slate-500 uppercase">APUN</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {dashboardData.aircraft.map((ac, idx) => (
                                        <tr key={ac._id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                            <td className="p-2 font-medium text-slate-700 dark:text-slate-200">{ac.msn}</td>
                                            {/* Mapping array of engines to pos1 and pos2. If your populated schema returns actual string IDs, this handles it */}
                                            <td className="p-2 text-slate-600 dark:text-slate-400">{ac.engines?.[0] || 'N/A'}</td>
                                            <td className="p-2 text-slate-600 dark:text-slate-400">{ac.engines?.[1] || 'N/A'}</td>
                                            <td className="p-2 text-slate-600 dark:text-slate-400">{ac.apu || 'N/A'}</td>
                                        </tr>
                                    ))}
                                    {dashboardData.aircraft.length === 0 && (
                                        <tr><td colSpan="4" className="p-4 text-center text-slate-400">No aircraft found</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </SectionCard>

                        {/* Utilisation Assumptions Card remains largely static UI for inputs */}
                        <SectionCard title="Utilisation Assumptions (/day)">
                            {/* Form inputs omitted for brevity, keep your exact layout here */}
                            <div className="p-4 flex flex-col gap-4">
                                <div className="text-xs text-slate-500">Form inputs here...</div>
                            </div>
                        </SectionCard>
                    </div>

                    <div className="lg:col-span-8">
                        <SectionCard title="Current Maintenance Status Overview">
                            <table className="w-full text-xs">
                                <thead className="bg-[#fae6da] dark:bg-orange-900/30 border-b border-slate-200 dark:border-slate-800">
                                    <tr>
                                        <th className="p-2 text-left text-slate-700 dark:text-slate-200">Target ID (MSN/SN)</th>
                                        <th className="p-2 text-left text-slate-700 dark:text-slate-200">Date</th>
                                        <th className="p-2 text-right text-slate-700 dark:text-slate-200">TSN</th>
                                        <th className="p-2 text-right text-slate-700 dark:text-slate-200">CSN</th>
                                        <th className="p-2 text-right text-slate-700 dark:text-slate-200">DSN</th>
                                        <th className="p-2 text-right text-slate-700 dark:text-slate-200">Daily Hrs/Cyc</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {dashboardData.utilisation.map((row, idx) => (
                                        <tr key={row._id || idx} className="hover:bg-orange-50 dark:hover:bg-orange-900/10">
                                            <td className="p-2 font-medium">{row.targetId}</td>
                                            <td className="p-2">{new Date(row.date).toLocaleDateString()}</td>
                                            <td className="p-2 text-right">{row.tsn?.toFixed(2) || '---'}</td>
                                            <td className="p-2 text-right">{row.csn || '---'}</td>
                                            <td className="p-2 text-right">{row.dsn || '---'}</td>
                                            <td className="p-2 text-right text-slate-500">{row.hours}h / {row.cycles}c</td>
                                        </tr>
                                    ))}
                                    {dashboardData.utilisation.length === 0 && (
                                        <tr><td colSpan="6" className="p-4 text-center text-slate-400">No utilisation data found</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </SectionCard>
                    </div>
                </div>

                {/* Row 2: Target Maintenance Status */}
                <SectionCard title="Target Maintenance Status (Forecast)">
                    <table className="w-full text-xs text-left border-collapse">
                        <thead className="bg-slate-100/90 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-800 uppercase tracking-widest text-[10px] font-black">
                            {/* Keep your complex header layout */}
                            <tr>
                                <th className="p-2 border-r border-slate-200 dark:border-slate-800">Label</th>
                                <th className="p-2 border-r border-slate-200 dark:border-slate-800">Asset</th>
                                <th className="p-2 border-r border-slate-200 dark:border-slate-800">Category</th>
                                <th className="p-2 border-r border-slate-200 dark:border-slate-800">Target Date</th>
                                <th className="p-2 border-r border-slate-200 dark:border-slate-800 text-center" colSpan="3">Forecasted Status</th>
                                <th className="p-2 text-center" colSpan="4">Targets</th>
                            </tr>
                            <tr className="bg-slate-50/50 dark:bg-slate-900 shadow-inner">
                                <th className="p-2 border-r border-slate-200 dark:border-slate-800"></th>
                                <th className="p-2 border-r border-slate-200 dark:border-slate-800"></th>
                                <th className="p-2 border-r border-slate-200 dark:border-slate-800"></th>
                                <th className="p-2 border-r border-slate-200 dark:border-slate-800"></th>
                                <th className="p-2 text-right border-r border-slate-200 dark:border-slate-800 text-blue-600 dark:text-blue-400">TSN</th>
                                <th className="p-2 text-right border-r border-slate-200 dark:border-slate-800 text-blue-600 dark:text-blue-400">CSN</th>
                                <th className="p-2 text-right border-r border-slate-200 dark:border-slate-800 text-blue-600 dark:text-blue-400">DSN</th>
                                <th className="p-2 text-right border-r border-slate-200 dark:border-slate-800 text-green-600 dark:text-green-400">TSRplmt</th>
                                <th className="p-2 text-right border-r border-slate-200 dark:border-slate-800 text-green-600 dark:text-green-400">CSRplmt</th>
                                <th className="p-2 text-right border-r border-slate-200 dark:border-slate-800 text-green-600 dark:text-green-400">DSRplmt</th>
                                <th className="p-2 text-right text-green-600 dark:text-green-400">SO/TSRtrt</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {dashboardData.status.map((row, idx) => (
                                <tr key={row._id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <td className="p-2 font-bold text-slate-800 dark:text-slate-100 border-r border-slate-100 dark:border-slate-800">{row.label || "---"}</td>
                                    <td className="p-2 border-r border-slate-100 dark:border-slate-800">
                                        <div className="flex flex-col">
                                            <span className="font-medium text-slate-700 dark:text-slate-200">{row.targetId}</span>
                                        </div>
                                    </td>
                                    <td className="p-2 border-r border-slate-100 dark:border-slate-800">
                                        <span className={cn(
                                            "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                                            row.category === "Run-down" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                        )}>
                                            {row.category || "Normal"}
                                        </span>
                                    </td>
                                    <td className="p-2 border-r border-slate-100 dark:border-slate-800 text-slate-500 whitespace-nowrap">
                                        {row.date ? new Date(row.date).toLocaleDateString() : '---'}
                                    </td>
                                    <td className="p-2 text-right border-r border-slate-100 dark:border-slate-800 font-mono text-blue-600 dark:text-blue-400">{row.tsn || '---'}</td>
                                    <td className="p-2 text-right border-r border-slate-100 dark:border-slate-800 font-mono text-blue-600 dark:text-blue-400">{row.csn || '---'}</td>
                                    <td className="p-2 text-right border-r border-slate-100 dark:border-slate-800 font-mono text-blue-600 dark:text-blue-400">{row.dsn || '---'}</td>
                                    <td className="p-2 text-right border-r border-slate-100 dark:border-slate-800 font-mono text-green-600 dark:text-green-400">{row.tsrPlmt || '---'}</td>
                                    <td className="p-2 text-right border-r border-slate-100 dark:border-slate-800 font-mono text-green-600 dark:text-green-400">{row.csrPlmt || '---'}</td>
                                    <td className="p-2 text-right border-r border-slate-100 dark:border-slate-800 font-mono text-green-600 dark:text-green-400">{row.dsrPlmt || '---'}</td>
                                    <td className="p-2 text-right font-mono bg-orange-50 dark:bg-orange-900/10 text-orange-600 dark:text-orange-400 font-bold">{row.soTsrtrt || '---'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </SectionCard>

                {/* Row 3: Major Rotables Movements */}
                <SectionCard title="Major Rotables Movements" actions={
                    <>
                        <button className="p-1 px-2 text-[10px] font-bold uppercase bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">Edit</button>
                        <button className="p-1 px-2 text-[10px] font-bold uppercase bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors">Update</button>
                    </>
                }>
                    <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase font-bold text-slate-500">
                            <tr>
                                <th className="p-2">Date (EoD)</th>
                                <th className="p-2">PN</th>
                                <th className="p-2">MSN</th>
                                <th className="p-2">ACFT Reg</th>
                                <th className="p-2">Position</th>
                                <th className="p-2 text-red-600">Removed SN</th>
                                <th className="p-2 text-green-600">Installed SN</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {dashboardData.rotables.map((row, idx) => (
                                <tr key={row._id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                    <td className="p-2 text-slate-500">{new Date(row.date).toLocaleDateString()}</td>
                                    <td className="p-2">{row.pn}</td>
                                    <td className="p-2 font-medium">{row.msn}</td>
                                    <td className="p-2">{row.acftReg}</td>
                                    <td className="p-2 text-indigo-600 font-bold">{row.position}</td>
                                    <td className="p-2 text-red-600 bg-red-50/50 dark:bg-red-900/10 font-mono">{row.removedSN || '---'}</td>
                                    <td className="p-2 text-green-600 bg-green-50/50 dark:bg-green-900/10 font-mono">{row.installedSN || '---'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </SectionCard>

            </div>
        </div>
    );
};

export default MaintenanceTable;