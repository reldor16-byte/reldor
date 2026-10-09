import React from 'react';
import { 
  BarChart3, 
  Table, 
  Radio, 
  BookOpen, 
  FileSpreadsheet, 
  Users,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useRecords } from '../context/RecordsContext';

interface NavigationProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ activeTab, setActiveTab }) => {
  const { isAdmin } = useAuth();
  const { activeIncidentsCount, filteredRecords } = useRecords();

  const navItems = [
    {
      id: 'analytics',
      label: 'Analytics Dashboard',
      icon: BarChart3,
      badge: null
    },
    {
      id: 'records',
      label: 'Interruption Records',
      icon: Table,
      badge: filteredRecords.length
    },
    {
      id: 'active',
      label: 'Active Outages & Restoration',
      icon: Radio,
      badge: activeIncidentsCount > 0 ? activeIncidentsCount : null,
      badgeColor: 'bg-red-500 text-white'
    },
    {
      id: 'reference',
      label: 'Reference Tables (7)',
      icon: BookOpen,
      badge: null
    },
    {
      id: 'excel',
      label: 'Excel Sync & Reports',
      icon: FileSpreadsheet,
      badge: null
    },
    ...(isAdmin ? [{
      id: 'users',
      label: 'User Access Control',
      icon: Users,
      badge: null
    }] : [])
  ];

  return (
    <div className="bg-slate-900/90 border-b border-slate-800 backdrop-blur sticky top-16 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex space-x-1 sm:space-x-2 overflow-x-auto py-2.5 scrollbar-none" aria-label="Tabs">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
                {item.badge !== null && item.badge !== undefined && (
                  <span
                    className={`ml-1 px-1.5 py-0.5 text-[11px] font-bold rounded-full ${
                      item.badgeColor || (isActive ? 'bg-blue-500/30 text-blue-200' : 'bg-slate-800 text-slate-300')
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
};
