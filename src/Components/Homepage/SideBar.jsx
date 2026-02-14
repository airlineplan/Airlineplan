import React, { useState } from "react";
import { motion } from "framer-motion";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  LayoutDashboard,
  Network,
  LineChart,
  Bot,
  Settings,
  LogOut,
  Hexagon
} from "lucide-react";

// --- UTILITY ---
function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// --- MOCK DATA ---
const navItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "network", label: "Network Schedule", icon: Network },
  { id: "analytics", label: "Data Analytics", icon: LineChart },
  { id: "agents", label: "Agentic AI", icon: Bot },
];

export default function SideBar() {
  const [activeTab, setActiveTab] = useState("network");

  return (
    <aside className="relative flex flex-col h-screen w-64 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border-r border-slate-200 dark:border-slate-800 transition-colors duration-300 z-20">
      
      {/* --- LOGO SECTION --- */}
      <div className="flex items-center gap-3 px-6 py-8">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500 shadow-lg shadow-indigo-500/20">
          <Hexagon className="text-white fill-white/20" size={18} />
        </div>
        <span className="text-xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-cyan-600 dark:from-indigo-400 dark:to-cyan-400">
          NEXUS
        </span>
      </div>

      {/* --- NAVIGATION LINKS --- */}
      <nav className="flex-1 px-3 space-y-2 overflow-y-auto custom-scrollbar">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "relative flex items-center w-full gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group focus:outline-none",
                isActive
                  ? "text-indigo-700 dark:text-indigo-300"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/50 dark:hover:bg-slate-800/50"
              )}
            >
              {/* Active Tab Background Animation (Aceternity Style) */}
              {isActive && (
                <motion.div
                  layoutId="activeTabIndicator"
                  className="absolute inset-0 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 rounded-xl -z-10"
                  initial={false}
                  transition={{
                    type: "spring",
                    stiffness: 400,
                    damping: 30,
                  }}
                />
              )}

              <Icon
                size={18}
                className={cn(
                  " transition-transform duration-200",
                  isActive 
                    ? "text-indigo-600 dark:text-indigo-400" 
                    : "text-slate-400 dark:text-slate-500 group-hover:scale-110"
                )}
              />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* --- FOOTER SECTION --- */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800 mt-auto">
        <div className="space-y-1">
          <button className="flex items-center w-full gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-all duration-200 group">
            <Settings size={18} className="text-slate-400 dark:text-slate-500 group-hover:rotate-45 transition-transform duration-300" />
            Settings
          </button>
          
          <button className="flex items-center w-full gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all duration-200">
            <LogOut size={18} />
            Logout
          </button>
        </div>
        
        {/* User Profile Snippet */}
        <div className="flex items-center gap-3 mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-cyan-500 flex items-center justify-center text-white font-bold text-xs shadow-md">
            HS
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 leading-none">Himanshu</span>
            <span className="text-xs text-slate-500 mt-1">Admin</span>
          </div>
        </div>
      </div>

    </aside>
  );
}