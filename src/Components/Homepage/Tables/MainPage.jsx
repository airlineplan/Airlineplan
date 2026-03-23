import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../apiConfig";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  LogOut, Plane, Network, Map,
  RotateCw, LayoutDashboard, Link2,
  RadioTower, TrendingUp, List, Eye, Plus, ClipboardList, Navigation
} from "lucide-react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Child Components
import NetworkTable from "./NetworkTable";
import SectorsTable from "./SectorsTable";
import FlgtsTable from "./FlgtsTable";
import DashboardTable from "./DashboardTable";
import ConnectionTable from "./ConnectionTable";
import StationsTable from "./StationsTable";
import Rotations from "./Rotations";
import ListTable from "./ListTable";
import ThemeToggle from "../ThemeToggle";
import ViewPage from "./ViewPage";
import AssignmentTable from "./AssignmentTable";
import FleetTable from "./FleetTable";
import MaintenanceTable from "./MaintenanceTable";


import AircraftRoute from "../../../Pages/AircraftRoute";

// --- UTILITIES ---
function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// --- CONSTANTS ---
const TABS = [
  { id: 0, label: "Network", icon: Network, component: NetworkTable },
  { id: 1, label: "Sectors", icon: Map, component: SectorsTable },
  { id: 2, label: "Stations", icon: RadioTower, component: StationsTable },
  { id: 3, label: "Rotations", icon: RotateCw, component: Rotations },
  { id: 4, label: "FLGTs", icon: Plane, component: FlgtsTable },
  { id: 5, label: "View", icon: Eye, component: ViewPage },
  { id: 6, label: "Dashboard", icon: LayoutDashboard, component: DashboardTable },
  { id: 7, label: "List", icon: List, component: ListTable },
  { id: 8, label: "Connections", icon: Link2, component: ConnectionTable },
  { id: 9, label: "Assignment", icon: ClipboardList, component: AssignmentTable },
  { id: 10, label: "Fleet", icon: Navigation, component: FleetTable },
  { id: 11, label: "Maintenance", icon: RadioTower, component: MaintenanceTable },
  { id: 12, label: "Route Economics", icon: TrendingUp, component: AircraftRoute },
];

// --- COMPONENTS ---

// NavItem removed since we are using a dropdown list now

const LogoutButton = ({ onClick }) => (
  <button
    onClick={onClick}
    className="group flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/10 border border-transparent hover:border-red-200 dark:hover:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/20 transition-all duration-200"
  >
    <LogOut size={16} className="group-hover:-translate-x-0.5 transition-transform" />
    <span>Logout</span>
  </button>
);

// --- MAIN PAGE ---

const MainPage = () => {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [flightsData, setFlightsData] = useState(null);
  const [totalFlights, setTotalFlights] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);


  useEffect(() => {
    const accessToken = localStorage.getItem("accessToken");
    if (!accessToken) {
      navigate("/");
    } else if (window.location.pathname !== "/homepage") {
      navigate("/homepage", { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    const handleSoftReload = () => setRefreshKey((prev) => prev + 1);
    window.addEventListener("refreshData", handleSoftReload);
    return () => window.removeEventListener("refreshData", handleSoftReload);
  }, []);

  const fetchFlightsData = async (page = 1, limit = 10) => {
    try {
      const response = await api.get(`/flight?page=${page}&limit=${limit}`);
      setFlightsData(response.data.data);
      setTotalFlights(response.data.total);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to fetch flight data");
    }
  };

  useEffect(() => {
    if (activeStep === 4) {
      fetchFlightsData();
    }
  }, [activeStep, refreshKey]);

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    toast.success("Logout successful!");
    setTimeout(() => navigate("/"), 1500);
  };

  const ActiveComponent = TABS[activeStep].component;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-300 relative overflow-x-hidden">

      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] pointer-events-none"></div>
      <div className="absolute top-0 left-0 -z-10 w-full h-96 bg-gradient-to-b from-indigo-50/80 to-transparent dark:from-slate-900/80 dark:to-transparent pointer-events-none" />

      {/* Main Container */}
      <div className="max-w-[1920px] mx-auto p-4 md:p-6 lg:p-8 flex flex-col gap-6 h-screen">

        {/* Header & Navigation */}
        <header className="flex flex-col xl:flex-row items-center justify-between gap-4 xl:gap-6 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm relative z-50">

          {/* Top Mobile Row / Left Desktop Area */}
          <div className="flex items-center justify-between w-full xl:w-auto">
            <div className="flex items-center gap-4">
              {/* Navigation Menu (Hover + Icon) */}
              <div className="group relative z-[100]">
                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shadow-sm border border-slate-200 dark:border-slate-700">
                  <Plus className="text-slate-700 dark:text-slate-300 transition-transform duration-300 group-hover:rotate-90" size={24} />
                </div>

                {/* Dropdown Menu */}
                <div className="absolute top-full left-0 mt-2 w-56 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl opacity-0 invisible min-h-0 scale-95 group-hover:scale-100 group-hover:opacity-100 group-hover:visible transition-all duration-300 origin-top-left flex flex-col p-2 gap-1 z-50">
                  {TABS.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveStep(tab.id)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200 w-full text-left",
                        activeStep === tab.id
                          ? "bg-gradient-to-r from-indigo-500/10 to-cyan-500/10 text-indigo-600 dark:text-indigo-400"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                      )}
                    >
                      <tab.icon size={18} className={cn(activeStep === tab.id ? "text-indigo-600 dark:text-indigo-400" : "opacity-70")} />
                      <span>{tab.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Logo / Title */}
              <div className="flex items-center gap-3 min-w-fit shrink-0">
                <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center shadow-lg shadow-indigo-500/10 shrink-0 border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <img src="/favicon-32x32.png" alt="Airlineplan Logo" className="w-7 h-7 object-contain" />
                </div>
                <div>
                  <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-cyan-600 dark:from-indigo-400 dark:to-cyan-400">
                    Airlineplan
                  </h1>
                  <p className="hidden md:block text-xs text-slate-500 dark:text-slate-400 font-medium">Planning, Operations & Analysis</p>
                </div>
              </div>
            </div>

            {/* Mobile Controls (Visible only < xl) */}
            <div className="flex items-center gap-3 xl:hidden shrink-0">
              <ThemeToggle />
              <LogoutButton onClick={handleLogout} />
            </div>
          </div>

          {/* Desktop Controls (Visible only >= xl) */}
          <div className="hidden xl:flex flex-1 items-center justify-end gap-4 min-w-fit shrink-0">
            <ThemeToggle />
            <div className="text-right hidden 2xl:block">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Admin User</p>
              <p className="text-xs text-slate-500">admin@airlineplan.com</p>
            </div>
            <LogoutButton onClick={handleLogout} />
          </div>

        </header>

        {/* Content Area */}
        <main className="flex-1 relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${activeStep}-${refreshKey}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="h-full"
            >
              <div className="bg-white/50 dark:bg-slate-900/40 backdrop-blur-sm border border-slate-200/60 dark:border-slate-800/60 rounded-2xl shadow-xl overflow-hidden min-h-[calc(100vh-180px)]">
                <ActiveComponent
                  {...(activeStep === 4 ? { flightsData, isMaster: true } : {})}
                />
              </div>
            </motion.div>
          </AnimatePresence>
        </main>

      </div>

      <ToastContainer position="bottom-right" theme="colored" />
    </div>
  );
};

export default MainPage;