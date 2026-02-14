import React, { useState } from "react";
import { motion } from "framer-motion";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { Search, Bell, Sun, Moon } from "lucide-react";

// --- UTILITY ---
function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// --- MOCK DATA ---
const headerTabs = [
  { id: "dashboard", label: "Dashboard" },
  { id: "flgts", label: "FLGTs" },
  { id: "analytics", label: "Analytics" }, // Added to show spacing
];

export default function Header() {
  const [activeTab, setActiveTab] = useState("flgts");
  const [isDarkMode, setIsDarkMode] = useState(true); // Mock state for theme

  return (
    <header className="h-[72px] w-full flex items-center justify-between px-6 lg:px-8 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 transition-colors duration-300">
      
      {/* --- LEFT: ANIMATED TABS --- */}
      <nav className="flex items-center gap-1 sm:gap-2">
        {headerTabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "relative px-4 py-2 text-sm font-semibold transition-colors duration-200 rounded-full focus:outline-none",
                isActive
                  ? "text-indigo-700 dark:text-indigo-300"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100/50 dark:hover:bg-slate-800/50"
              )}
            >
              {/* Aceternity-style active pill background */}
              {isActive && (
                <motion.div
                  layoutId="headerActiveTab"
                  className="absolute inset-0 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 rounded-full -z-10"
                  initial={false}
                  transition={{
                    type: "spring",
                    stiffness: 400,
                    damping: 30,
                  }}
                />
              )}
              <span className="relative z-10">{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* --- RIGHT: GLOBAL ACTIONS --- */}
      <div className="flex items-center gap-3 sm:gap-5">
        
        {/* Sleek Search Bar */}
        <div className="relative group hidden md:block">
          <Search 
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" 
            size={16} 
          />
          <input
            type="text"
            placeholder="Search network..."
            className="w-48 lg:w-64 h-9 pl-10 pr-4 bg-slate-100 dark:bg-slate-800/50 border border-transparent rounded-full text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all duration-300"
          />
          {/* Mac-style shortcut hint */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
             <kbd className="hidden lg:inline-block px-1.5 py-0.5 text-[10px] font-medium text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded">⌘K</kbd>
          </div>
        </div>

        <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block"></div>

        {/* Action Icons */}
        <div className="flex items-center gap-2">
          {/* Theme Toggle */}
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 rounded-full text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200"
          >
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {/* Notifications */}
          <button className="relative p-2 rounded-full text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200">
            <Bell size={18} />
            {/* Ping Indicator */}
            <span className="absolute top-1.5 right-2 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
          </button>
        </div>

      </div>
    </header>
  );
} 