import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  Shield, 
  User, 
  LogOut, 
  LogIn, 
  Download, 
  Plus, 
  AlertTriangle,
  Clock,
  FileSpreadsheet
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useRecords } from '../context/RecordsContext';
import { getCurrentDateFormatted, getCurrentTimeFormatted } from '../utils/dateUtils';

interface HeaderProps {
  onOpenAddModal: () => void;
  onOpenLoginModal: () => void;
  onNavigateTab: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenAddModal, onOpenLoginModal, onNavigateTab }) => {
  const { user, isAdmin, logout } = useAuth();
  const { activeIncidentsCount, exportExcelFile } = useRecords();
  const [currentTime, setCurrentTime] = useState<string>(getCurrentTimeFormatted());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(getCurrentTimeFormatted());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & System Brand */}
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
              <Zap className="h-6 w-6 fill-amber-400/30" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                  Interruption Cause Dashboard
                  <span className="hidden sm:inline-block text-xs font-semibold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    Grid Ops
                  </span>
                </h1>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Electric Power Reliability & Outage Incident System • NEECO II Area 1
              </p>
            </div>
          </div>

          {/* Center: Live Clock & Outage Alert */}
          <div className="hidden md:flex items-center space-x-4">
            <div className="flex items-center space-x-2 bg-slate-800/80 px-3 py-1.5 rounded-md border border-slate-700/60 text-xs text-slate-300 font-mono">
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              <span>{getCurrentDateFormatted()}</span>
              <span className="text-slate-500">|</span>
              <span className="text-blue-300 font-semibold">{currentTime}</span>
            </div>

            {activeIncidentsCount > 0 ? (
              <button
                onClick={() => onNavigateTab('active')}
                className="flex items-center space-x-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-300 px-3 py-1.5 rounded-md text-xs font-medium transition cursor-pointer animate-pulse"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                <span>{activeIncidentsCount} Active Outage{activeIncidentsCount > 1 ? 's' : ''} Running</span>
              </button>
            ) : (
              <div className="flex items-center space-x-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-md text-xs font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span>Grid Normal (0 Active)</span>
              </div>
            )}
          </div>

          {/* Right: Actions & User Info */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Quick Export Excel */}
            <button
              onClick={() => exportExcelFile()}
              title="Export Current View to Excel (.xlsx)"
              className="hidden lg:flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-md text-xs font-medium transition shadow-sm"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Export Excel</span>
            </button>

            {/* Quick Add Interruption (Admin only) */}
            {isAdmin && (
              <button
                onClick={onOpenAddModal}
                className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-md text-xs font-medium transition shadow-md hover:shadow-blue-600/20"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Incident</span>
              </button>
            )}

            {/* User Profile / Access Level Badge */}
            {user ? (
              <div className="flex items-center space-x-2 pl-2 border-l border-slate-800">
                <div className="text-right hidden sm:block">
                  <div className="text-xs font-semibold text-slate-200 leading-tight">
                    {user.name || user.username}
                  </div>
                  <div className="flex items-center justify-end space-x-1">
                    {user.role === 'admin' ? (
                      <span className="inline-flex items-center text-[10px] text-amber-300 font-bold bg-amber-950/60 border border-amber-800 px-1.5 py-0.2 rounded">
                        <Shield className="w-2.5 h-2.5 mr-0.5 text-amber-400" /> Admin
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-[10px] text-slate-300 font-medium bg-slate-800 border border-slate-700 px-1.5 py-0.2 rounded">
                        <User className="w-2.5 h-2.5 mr-0.5 text-slate-400" /> Viewer
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={logout}
                  title="Sign Out"
                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-md transition"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenLoginModal}
                className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-md text-xs font-medium border border-slate-700 transition"
              >
                <LogIn className="w-3.5 h-3.5 text-blue-400" />
                <span>Sign In</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
