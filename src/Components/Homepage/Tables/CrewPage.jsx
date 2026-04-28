import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { ChevronDown, Check, UploadCloud, FileText, Settings, X, Calendar, Activity, DollarSign, Clock, Users } from "lucide-react";
import useEscapeKey from "../../../hooks/useEscapeKey";

// --- UTILITIES ---
function cn(...inputs) {
    return twMerge(clsx(inputs));
}

// --- REUSABLE COMPONENTS ---
const InputTime = ({ label, placeholder = "HH:MM", value, onChange, className }) => (
    <div className={cn("flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-1.5", className)}>
        <label className="text-base text-slate-700 dark:text-slate-300 font-medium flex-1 pr-4">{label}</label>
        <input
            type="text"
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            className="w-24 px-3 py-1.5 text-base rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm"
        />
    </div>
);

const CheckboxSetting = ({ label, checked, onChange, timeValue, onTimeChange, timePlaceholder = "HH:MM", timeSuffix }) => (
    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 py-2 border-b border-slate-100 dark:border-slate-800/60 last:border-0">
        <div className="flex items-start gap-3 flex-1">
            <div className="relative flex items-start pt-0.5">
                <input
                    type="checkbox"
                    checked={checked}
                    onChange={onChange}
                    className="w-4 h-4 cursor-pointer mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:focus:ring-offset-slate-900"
                />
            </div>
            <label className="text-base text-slate-700 dark:text-slate-300 leading-relaxed cursor-pointer" onClick={() => onChange({ target: { checked: !checked } })}>
                {label}
            </label>
        </div>
        {(timeValue !== undefined || timeSuffix) && (
            <div className="flex items-center gap-2 pl-7 sm:pl-0 mt-2 sm:mt-0">
                {timeSuffix && <span className="text-sm text-slate-500 whitespace-nowrap">{timeSuffix}</span>}
                {timeValue !== undefined && (
                    <input
                        type="text"
                        placeholder={timePlaceholder}
                        value={timeValue}
                        onChange={onTimeChange}
                        className="w-20 px-2 py-1 text-base rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    />
                )}
            </div>
        )}
    </div>
);

const SectionCard = ({ title, icon: Icon, children, className }) => (
    <div className={cn("bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden flex flex-col", className)}>
        <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex items-center gap-2">
            {Icon && <Icon size={18} className="text-indigo-500" />}
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
        </div>
        <div className="p-5 flex-1 flex flex-col gap-1">
            {children}
        </div>
    </div>
);

const UploadLink = ({ label }) => (
    <button className="group flex items-center justify-between w-full p-3 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-500/10 transition-all text-left">
        <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/30 flex items-center justify-center transition-colors">
                <UploadCloud size={16} className="text-slate-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400" />
            </div>
            <span className="text-base font-medium text-slate-700 dark:text-slate-300 group-hover:text-indigo-700 dark:group-hover:text-indigo-300 transition-colors">
                {label}
            </span>
        </div>
        <span className="text-sm font-semibold text-slate-400 group-hover:text-indigo-500 uppercase tracking-wider">Upload</span>
    </button>
);

const ActionButton = ({ label, icon: Icon, onClick, variant = "primary" }) => {
    const baseStyles = "flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all shadow-sm hover:shadow-md w-full";
    const variants = {
        primary: "bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-500/20",
        secondary: "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400",
        emerald: "bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-500/20"
    };
    return (
        <button onClick={onClick} className={cn(baseStyles, variants[variant])}>
            {Icon && <Icon size={18} />}
            {label}
        </button>
    );
};

// --- MODAL COMPONENT ---
const Modal = ({ isOpen, onClose, title, children, maxWidth = "max-w-4xl" }) => {
    useEscapeKey(isOpen, onClose);

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 transition-opacity"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className={cn("fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden", maxWidth)}
                    >
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                            <h2 className="text-lg font-bold text-slate-800 dark:text-white">{title}</h2>
                            <button onClick={onClose} className="p-2 rounded-lg text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                            {children}
                        </div>
                        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-3">
                            <button onClick={onClose} className="px-4 py-2 text-base font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors">
                                Cancel
                            </button>
                            <button onClick={onClose} className="px-5 py-2 text-base font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm shadow-indigo-500/20 transition-colors">
                                Update
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

// --- MAIN CREW PAGE COMPONENT ---
const CrewPage = () => {
    const [modals, setModals] = useState({
        utilisation: false,
        layover: false,
        positioning: false,
        diary: false
    });

    const [crewSettings, setCrewSettings] = useState({
        returnToBase: true,
        cutoffLocalTimeChecked: false,
        cutoffLocalTimeValue: "",
        positioningDifferentStn: true,
        timeTakenPositioning: "",
        dtForTransferChecked: false,
        dtForTransferValue: ""
    });

    const toggleModal = (modalName) => setModals(prev => ({ ...prev, [modalName]: !prev[modalName] }));
    const updateSetting = (key, val) => setCrewSettings(prev => ({ ...prev, [key]: val }));

    return (
        <div className="w-full h-full p-4 md:p-6 space-y-6 flex flex-col min-h-[calc(100vh-100px)] bg-slate-50 dark:bg-slate-950/20 rounded-2xl">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 w-full">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Crew Settings</h2>
                    <p className="text-base text-slate-500 dark:text-slate-400 mt-1">Manage crew parameters, settings, and KPIs</p>
                </div>
                <div className="w-full sm:w-auto">
                    <ActionButton label="Update Plan" icon={Check} variant="emerald" />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* --- LEFT COLUMN (Crew Settings & Positioning) --- */}
                <div className="lg:col-span-7 flex flex-col gap-6">
                    {/* Crew Settings */}
                    <SectionCard title="Crew Requirements & Limits" icon={Clock}>
                        <InputTime label="Rest period if time period between consecutive duties exceeds" />
                        <InputTime label="Break period if time period between consecutive assigned duties exceed" />
                        <InputTime label="Preflight duty period on first flight in PDP with duty period commencing" />
                        <InputTime label="Preflight duty period on first flight in FDP with duty period already in effect" />
                        <InputTime label="Post flight duty period after last flight in FDP" />
                    </SectionCard>

                    {/* Positioning / Deadheading Settings */}
                    <SectionCard title="Positioning / Deadheading Settings" icon={Activity}>
                        <CheckboxSetting
                            label="Return to base immediately at end of FDP if Rest period follows and next DP starts at base"
                            checked={crewSettings.returnToBase}
                            onChange={(e) => updateSetting('returnToBase', e.target.checked)}
                        />
                        <CheckboxSetting
                            label="Cutoff Local time at end of FDP for Hotac if rest period follows and next DP starts at another (non-Base) station"
                            checked={crewSettings.cutoffLocalTimeChecked}
                            onChange={(e) => updateSetting('cutoffLocalTimeChecked', e.target.checked)}
                            timeValue={crewSettings.cutoffLocalTimeChecked ? crewSettings.cutoffLocalTimeValue : undefined}
                            onTimeChange={(e) => updateSetting('cutoffLocalTimeValue', e.target.value)}
                            timePlaceholder="HH:MM"
                        />
                        <CheckboxSetting
                            label="Positioning to (different) station with next assigned flight within current FDP"
                            checked={crewSettings.positioningDifferentStn}
                            onChange={(e) => updateSetting('positioningDifferentStn', e.target.checked)}
                        />
                        {/* Conditionally visible based on logic */}
                        {crewSettings.positioningDifferentStn && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                className="pl-7 pb-2 border-b border-slate-100 dark:border-slate-800/60 flex flex-col gap-2 overflow-hidden"
                            >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-2">
                                    <span className="text-base text-slate-600 dark:text-slate-400">Time taken for Positioning, if flight not available within schedule</span>
                                    <input
                                        type="text"
                                        value={crewSettings.timeTakenPositioning}
                                        onChange={(e) => updateSetting('timeTakenPositioning', e.target.value)}
                                        placeholder="HH:MM"
                                        className="w-20 px-2 py-1 text-base rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/50 outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium tabular-nums"
                                    />
                                </div>
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                    <span className="text-base text-slate-600 dark:text-slate-400">DT to be considered for Transfer from Hotac to Airport for flight to Position crew</span>
                                    <input
                                        type="text"
                                        value={crewSettings.dtForTransferValue}
                                        onChange={(e) => updateSetting('dtForTransferValue', e.target.value)}
                                        placeholder="HH:MM"
                                        className="w-20 px-2 py-1 text-base rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/50 outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium tabular-nums"
                                    />
                                </div>
                            </motion.div>
                        )}
                    </SectionCard>
                </div>

                {/* --- RIGHT COLUMN (Uploads & Modals) --- */}
                <div className="lg:col-span-5 flex flex-col gap-6">
                    {/* Upload Information */}
                    <SectionCard title="Upload Information" icon={UploadCloud}>
                        <div className="flex flex-col gap-3 py-2">
                            <UploadLink label="Crew Information" />
                            <UploadLink label="Crew Roster - Flight Duty" />
                            <UploadLink label="Crew Roster - Other Duty" />
                        </div>
                    </SectionCard>

                    {/* Quick Access Modals */}
                    <SectionCard title="Configuration Tables" icon={Settings}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
                            <ActionButton label="Utilisation Target" icon={Users} variant="secondary" onClick={() => toggleModal('utilisation')} />
                            <ActionButton label="Layover Settings" icon={Clock} variant="secondary" onClick={() => toggleModal('layover')} />
                            <ActionButton label="Positioning Cost" icon={DollarSign} variant="secondary" onClick={() => toggleModal('positioning')} />
                            <ActionButton label="Crew Diary" icon={Calendar} variant="secondary" onClick={() => toggleModal('diary')} />
                        </div>
                    </SectionCard>
                </div>

            </div>

            {/* --- CREW KPIs SECTION --- */}
            <SectionCard title="Crew KPIs" icon={Activity} className="mt-4">
                <div className="mb-4 grid grid-cols-2 lg:grid-cols-5 gap-3 bg-slate-50/50 w-full dark:bg-slate-800/30 p-3 rounded-xl border border-slate-200 dark:border-slate-700/50">
                    <select className="w-full text-base rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 focus:ring-2 focus:ring-indigo-500">
                        <option>Periodicity</option>
                    </select>
                    <select className="w-full text-base rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 focus:ring-2 focus:ring-indigo-500">
                        <option>Rate (Multi)</option>
                    </select>
                    <select className="w-full text-base rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 focus:ring-2 focus:ring-indigo-500">
                        <option>Base (Multi)</option>
                    </select>
                    <select className="w-full text-base rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 focus:ring-2 focus:ring-indigo-500">
                        <option>Category (Multi)</option>
                    </select>
                    <select className="w-full text-base rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 focus:ring-2 focus:ring-indigo-500">
                        <option>Subcategory (Multi)</option>
                    </select>
                </div>

                <div className="overflow-x-auto w-full custom-scrollbar rounded-xl border border-slate-200 dark:border-slate-700">
                    <table className="w-full text-base text-left whitespace-nowrap">
                        <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300">
                            <tr>
                                <th className="p-3 font-semibold w-[250px] sticky left-0 bg-slate-100 dark:bg-slate-800/90 z-10 border-r border-slate-200 dark:border-slate-700">Metric</th>
                                {[1, 2, 3, 4, 5, 6].map(i => (
                                    <th key={i} className="p-3 font-semibold text-center border-l border-slate-200 dark:border-slate-700">Period {i}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {[
                                "Total Flight Time", "Total Flight Duty Period", "Total Duty Period", "Total Landings",
                                "Positionings", "Layover occurrences", "Layover duration",
                                "Crew utilisation % (DP/Target)", "Crew utilisation % (FDP/Target)", "Crew utilisation % (PT/Target)",
                                "Position total cost", "Positioning cost avg",
                                "Positionings total cost", "Positionings avg cost",
                                "Layover total cost", "Convenience total cost", "Hotac+AP trfr total cost",
                                "Layover total cost (alt)", "Convenience avg cost", "Hotac+AP trfr avg cost"
                            ].map((metric, idx) => (
                                <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <td className="p-3 text-slate-700 dark:text-slate-300 font-medium sticky left-0 bg-white dark:bg-slate-900/40 border-r border-slate-200 dark:border-slate-700/50">
                                        {metric}
                                    </td>
                                    {[1, 2, 3, 4, 5, 6].map(i => (
                                        <td key={i} className="p-2 border-l border-slate-100 dark:border-slate-800">
                                            <input type="text" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 text-center focus:ring-1 focus:ring-indigo-500 outline-none" />
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </SectionCard>


            {/* --- MODALS --- */}

            {/* Utilisation Target Modal */}
            <Modal isOpen={modals.utilisation} onClose={() => toggleModal('utilisation')} title="Utilisation Target" maxWidth="max-w-3xl">
                <table className="w-full text-base text-left border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                    <thead className="bg-slate-50 dark:bg-slate-800">
                        <tr>
                            <th className="p-3 font-semibold border-b border-slate-200 dark:border-slate-700">Role</th>
                            <th className="p-3 font-semibold border-b border-slate-200 dark:border-slate-700 text-center">Avg. DP/day</th>
                            <th className="p-3 font-semibold border-b border-slate-200 dark:border-slate-700 text-center">Avg. FDP/day</th>
                            <th className="p-3 font-semibold border-b border-slate-200 dark:border-slate-700 text-center">Avg. FT/day</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        <tr className="bg-indigo-50/50 dark:bg-indigo-900/10">
                            <td className="p-3 text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-2">
                                Autopopulate <select className="ml-2 bg-white dark:bg-slate-900 border rounded px-2 py-1 text-sm"><option>All Roles</option></select>
                            </td>
                            <td className="p-2"><input type="text" placeholder="HH:MM" className="w-full px-2 py-1 border rounded text-center dark:bg-slate-900 dark:border-slate-700" /></td>
                            <td className="p-2"><input type="text" placeholder="HH:MM" className="w-full px-2 py-1 border rounded text-center dark:bg-slate-900 dark:border-slate-700" /></td>
                            <td className="p-2"><input type="text" placeholder="HH:MM" className="w-full px-2 py-1 border rounded text-center dark:bg-slate-900 dark:border-slate-700" /></td>
                        </tr>
                        {[1, 2, 3].map(i => (
                            <tr key={i}>
                                <td className="p-3 text-slate-700 dark:text-slate-300">Role {i}</td>
                                <td className="p-2 text-center text-slate-500">HH:MM</td>
                                <td className="p-2 text-center text-slate-500">HH:MM</td>
                                <td className="p-2 text-center text-slate-500">HH:MM</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </Modal>

            {/* Layover Settings Modal */}
            <Modal isOpen={modals.layover} onClose={() => toggleModal('layover')} title="Layover Settings" maxWidth="max-w-4xl">
                <div className="space-y-8">
                    <div>
                        <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-3 ml-1 text-base bg-slate-100 dark:bg-slate-800 inline-block px-3 py-1 rounded-md">Convenience accom/Lounges, etc. if layover exceeds</h4>
                        <table className="w-full text-base text-left border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                            <thead className="bg-slate-50 dark:bg-slate-800">
                                <tr>
                                    <th className="p-3 font-semibold border-b border-slate-200 dark:border-slate-700">Stn</th>
                                    <th className="p-3 font-semibold border-b border-slate-200 dark:border-slate-700">Role</th>
                                    <th className="p-3 font-semibold border-b border-slate-200 dark:border-slate-700">LO time</th>
                                    <th className="p-3 font-semibold border-b border-slate-200 dark:border-slate-700">Cost per person</th>
                                    <th className="p-3 font-semibold border-b border-slate-200 dark:border-slate-700">CCY</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="bg-indigo-50/50 dark:bg-indigo-900/10">
                                    <td className="p-3 whitespace-nowrap text-indigo-600 dark:text-indigo-400 font-semibold text-sm">
                                        Autopopulate <select className="ml-1 bg-white dark:bg-slate-900 border rounded px-1 py-1"><option>All Stns</option></select>
                                    </td>
                                    <td className="p-2"><select className="w-full bg-white dark:bg-slate-900 border rounded px-2 py-1"><option>All Roles</option></select></td>
                                    <td className="p-2"><input type="text" placeholder="HH:MM" className="w-full px-2 py-1 border rounded text-center dark:bg-slate-900 dark:border-slate-700" /></td>
                                    <td className="p-2"><input type="text" placeholder="Amount" className="w-full px-2 py-1 border rounded text-center dark:bg-slate-900 dark:border-slate-700" /></td>
                                    <td className="p-2"><select className="w-full bg-white dark:bg-slate-900 border rounded px-2 py-1"><option>USD</option></select></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <div>
                        <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-3 ml-1 text-base bg-slate-100 dark:bg-slate-800 inline-block px-3 py-1 rounded-md">HOTAC (+Airport transfer) if layover exceeds</h4>
                        <table className="w-full text-base text-left border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                            <thead className="bg-slate-50 dark:bg-slate-800">
                                <tr>
                                    <th className="p-3 font-semibold border-b border-slate-200 dark:border-slate-700">Stn</th>
                                    <th className="p-3 font-semibold border-b border-slate-200 dark:border-slate-700">Role</th>
                                    <th className="p-3 font-semibold border-b border-slate-200 dark:border-slate-700">LO time</th>
                                    <th className="p-3 font-semibold border-b border-slate-200 dark:border-slate-700">Cost per person</th>
                                    <th className="p-3 font-semibold border-b border-slate-200 dark:border-slate-700">CCY</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="bg-indigo-50/50 dark:bg-indigo-900/10">
                                    <td className="p-3 whitespace-nowrap text-indigo-600 dark:text-indigo-400 font-semibold text-sm">
                                        Autopopulate <select className="ml-1 bg-white dark:bg-slate-900 border rounded px-1 py-1"><option>All Stns</option></select>
                                    </td>
                                    <td className="p-2"><select className="w-full bg-white dark:bg-slate-900 border rounded px-2 py-1"><option>All Roles</option></select></td>
                                    <td className="p-2"><input type="text" placeholder="HH:MM" className="w-full px-2 py-1 border rounded text-center dark:bg-slate-900 dark:border-slate-700" /></td>
                                    <td className="p-2"><input type="text" placeholder="Amount" className="w-full px-2 py-1 border rounded text-center dark:bg-slate-900 dark:border-slate-700" /></td>
                                    <td className="p-2"><select className="w-full bg-white dark:bg-slate-900 border rounded px-2 py-1"><option>USD</option></select></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </Modal>

            {/* Positioning Cost Modal */}
            <Modal isOpen={modals.positioning} onClose={() => toggleModal('positioning')} title="Positioning Cost" maxWidth="max-w-3xl">
                <h4 className="font-medium text-slate-600 dark:text-slate-400 mb-3 text-base italic">Same as fare unless listed below</h4>
                <table className="w-full text-base text-left border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                    <thead className="bg-slate-50 dark:bg-slate-800">
                        <tr>
                            <th className="p-3 font-semibold border-b border-slate-200 dark:border-slate-700">Sector</th>
                            <th className="p-3 font-semibold border-b border-slate-200 dark:border-slate-700">Role</th>
                            <th className="p-3 font-semibold border-b border-slate-200 dark:border-slate-700">Cost</th>
                            <th className="p-3 font-semibold border-b border-slate-200 dark:border-slate-700">Cost CCY</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr className="bg-indigo-50/50 dark:bg-indigo-900/10">
                            <td className="p-3 whitespace-nowrap text-indigo-600 dark:text-indigo-400 font-semibold text-sm">
                                Autopopulate <select className="ml-1 bg-white dark:bg-slate-900 border rounded px-1 py-1"><option>All Sectors</option></select>
                            </td>
                            <td className="p-2"><select className="w-full bg-white dark:bg-slate-900 border rounded px-2 py-1"><option>All Roles</option></select></td>
                            <td className="p-2"><input type="text" placeholder="Amount" className="w-full px-2 py-1 border rounded text-center dark:bg-slate-900 dark:border-slate-700" /></td>
                            <td className="p-2"><select className="w-full bg-white dark:bg-slate-900 border rounded px-2 py-1"><option>USD</option></select></td>
                        </tr>
                    </tbody>
                </table>
            </Modal>

            {/* Crew Diary Modal */}
            <Modal isOpen={modals.diary} onClose={() => toggleModal('diary')} title="Crew Diary" maxWidth="max-w-5xl">
                <div className="flex items-center gap-4 mb-4">
                    <input type="text" placeholder="Sort+Filter Date..." className="flex-1 px-3 py-2 text-base border rounded-lg dark:bg-slate-900 dark:border-slate-700" />
                    <input type="text" placeholder="Sort+Filter Crew ID..." className="flex-1 px-3 py-2 text-base border rounded-lg dark:bg-slate-900 dark:border-slate-700" />
                    <input type="text" placeholder="Sort+Filter Crew Name..." className="flex-1 px-3 py-2 text-base border rounded-lg dark:bg-slate-900 dark:border-slate-700" />
                    <input type="text" placeholder="Sort+Filter Role..." className="flex-1 px-3 py-2 text-base border rounded-lg dark:bg-slate-900 dark:border-slate-700" />
                </div>
                <div className="overflow-x-auto w-full border border-slate-200 dark:border-slate-700 rounded-lg">
                    <table className="w-full text-base text-left min-w-[800px]">
                        <thead className="bg-slate-50 dark:bg-slate-800">
                            <tr>
                                <th className="p-3 font-semibold border-b border-slate-200 dark:border-slate-700 w-[120px]">Crew ID</th>
                                <th className="p-3 font-semibold border-b border-slate-200 dark:border-slate-700 w-[150px]">Crew Name</th>
                                <th className="p-3 font-semibold border-b border-slate-200 dark:border-slate-700 w-[120px]">Role</th>
                                <th className="p-3 font-semibold border-b border-slate-200 dark:border-slate-700" colSpan={6}>Time / Activity Progression</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {[1, 2, 3].map((row) => (
                                <tr key={row} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                    <td className="p-3 font-medium">CRW-{1000 + row}</td>
                                    <td className="p-3 text-slate-600 dark:text-slate-400">John Doe {row}</td>
                                    <td className="p-3 text-slate-600 dark:text-slate-400">Captain</td>
                                    {[1, 2, 3, 4, 5, 6].map(i => (
                                        <td key={i} className="p-2 border-l border-slate-100 dark:border-slate-800 text-center">
                                            <div className="text-sm text-slate-500 mb-1">0{i}:00</div>
                                            <div className="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 px-2 py-1 rounded text-sm">Activity</div>
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Modal>
        </div>
    );
};

export default CrewPage;
