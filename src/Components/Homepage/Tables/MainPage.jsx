import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { 
  LogOut, Plane, Network, Map, 
  RotateCw, LayoutDashboard, Link2, 
  RadioTower, Globe, TrendingUp
} from "lucide-react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Import your child components here
import NetworkTable from "./NetworkTable";
import SectorsTable from "./SectorsTable";
import FlgtsTable from "./FlgtsTable";
import DashboardTable from "./DashboardTable";
import ConnectionTable from "./ConnectionTable";
import StationsTable from "./StationsTable";
import Rotations from "./Rotations";

// TODO: Make sure this import matches your actual Route Economics component path/name
import AircraftRoute from "../../../Pages/AircraftRoute"; 

// --- UTILITIES ---
function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// --- CONSTANTS ---
// Added Route Economics as the last tab
const TABS = [
  { id: 0, label: "Network", icon: Network, component: NetworkTable },
  { id: 1, label: "Sectors", icon: Map, component: SectorsTable },
  { id: 2, label: "Stations", icon: RadioTower, component: StationsTable },
  { id: 3, label: "Rotations", icon: RotateCw, component: Rotations },
  { id: 4, label: "FLGTs", icon: Plane, component: FlgtsTable },
  { id: 5, label: "Dashboard", icon: LayoutDashboard, component: DashboardTable },
  { id: 6, label: "Connections", icon: Link2, component: ConnectionTable },
  { id: 7, label: "Route Economics", icon: TrendingUp, component: AircraftRoute },
];

// --- COMPONENTS ---

const NavItem = ({ tab, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={cn(
      "relative px-4 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center gap-2 z-10 whitespace-nowrap",
      isActive 
        ? "text-white" 
        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100/50 dark:hover:bg-slate-800/50"
    )}
  >
    {isActive && (
      <motion.div
        layoutId="activeTab"
        className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-cyan-600 rounded-lg shadow-lg shadow-indigo-500/30 -z-10"
        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
      />
    )}
    <tab.icon size={16} className={cn("relative z-10", isActive ? "text-white" : "opacity-70")} />
    <span className="relative z-10">{tab.label}</span>
  </button>
);

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

  // Auth Check
  useEffect(() => {
    const accessToken = localStorage.getItem("accessToken");
    if (!accessToken) {
      navigate("/");
    } else {
      // Optional: Clean URL if redirecting from somewhere
      navigate("/homepage"); 
    }
  }, [navigate]);

  // Fetch Data (Preserved Logic)
  const fetchFlightsData = async (page = 1, limit = 10) => {
    try {
      const accessToken = localStorage.getItem("accessToken");
      const response = await axios.get(`http://localhost:5001/flight?page=${page}&limit=${limit}`, {
        headers: { "x-access-token": accessToken },
      });
      setFlightsData(response.data.data);
      setTotalFlights(response.data.total);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to fetch flight data");
    }
  };

  // Initial Fetch for specific tabs if needed
  useEffect(() => {
    if (activeStep === 4) { // 4 is FLGTs tab
      fetchFlightsData();
    }
  }, [activeStep]);

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
        <header className="flex flex-col xl:flex-row items-center justify-between gap-6 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm relative z-50">
          
          {/* Logo / Title */}
          <div className="flex items-center gap-3 min-w-fit">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-cyan-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Globe className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-cyan-600 dark:from-indigo-400 dark:to-cyan-400">
                Airlineplan
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Operations Dashboard</p>
            </div>
          </div>

          {/* Tab Navigation */}
          <nav className="flex items-center gap-1 overflow-x-auto pb-2 xl:pb-0 w-full xl:w-auto px-2 custom-scrollbar">
            {TABS.map((tab) => (
              <NavItem 
                key={tab.id}
                tab={tab}
                isActive={activeStep === tab.id}
                onClick={() => setActiveStep(tab.id)}
              />
            ))}
          </nav>

          {/* User Controls */}
          <div className="flex items-center gap-4 min-w-fit pl-4 border-l border-slate-200 dark:border-slate-800 hidden xl:flex">
             <div className="text-right hidden 2xl:block">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Admin User</p>
                <p className="text-xs text-slate-500">admin@airlineplan.com</p>
             </div>
             <LogoutButton onClick={handleLogout} />
          </div>
          
          {/* Mobile Logout (Visible only on small screens) */}
          <div className="xl:hidden w-full flex justify-end">
            <LogoutButton onClick={handleLogout} />
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeStep}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="h-full"
            >
              <div className="bg-white/50 dark:bg-slate-900/40 backdrop-blur-sm border border-slate-200/60 dark:border-slate-800/60 rounded-2xl shadow-xl overflow-hidden min-h-[calc(100vh-180px)]">
                 {/* Passing props conditionally.
                    Note: Adjust props based on what your child components actually accept.
                 */}
                 <ActiveComponent 
                    // Pass specific data to FLGTs as per original code
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