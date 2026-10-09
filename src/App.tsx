import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { RecordsProvider, useRecords } from './context/RecordsContext';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { FilterBar } from './components/FilterBar';
import { AnalyticsView } from './components/AnalyticsView';
import { RecordsTableView } from './components/RecordsTableView';
import { ActiveIncidentsView } from './components/ActiveIncidentsView';
import { ReferenceTablesView } from './components/ReferenceTablesView';
import { ExcelSyncView } from './components/ExcelSyncView';
import { UserManagementView } from './components/UserManagementView';

import { AddEditRecordModal } from './components/modals/AddEditRecordModal';
import { MarkRestoredModal } from './components/modals/MarkRestoredModal';
import { RecordDetailsModal } from './components/modals/RecordDetailsModal';
import { LoginModal } from './components/modals/LoginModal';
import { InterruptionRecord } from './types/interruption';
import { Shield, Zap, FileSpreadsheet } from 'lucide-react';

const MainDashboard: React.FC = () => {
  const { isAdmin } = useAuth();
  const { deleteRecord } = useRecords();

  const [activeTab, setActiveTab] = useState<string>('analytics');

  // Modal states
  const [isAddEditOpen, setIsAddEditOpen] = useState<boolean>(false);
  const [recordToEdit, setRecordToEdit] = useState<InterruptionRecord | null>(null);

  const [isRestoreOpen, setIsRestoreOpen] = useState<boolean>(false);
  const [recordToRestore, setRecordToRestore] = useState<InterruptionRecord | null>(null);

  const [isDetailsOpen, setIsDetailsOpen] = useState<boolean>(false);
  const [recordToView, setRecordToView] = useState<InterruptionRecord | null>(null);

  const [isLoginOpen, setIsLoginOpen] = useState<boolean>(false);

  // Modal handlers
  const handleOpenAdd = () => {
    setRecordToEdit(null);
    setIsAddEditOpen(true);
  };

  const handleOpenEdit = (rec: InterruptionRecord) => {
    setRecordToEdit(rec);
    setIsAddEditOpen(true);
  };

  const handleOpenRestore = (rec: InterruptionRecord) => {
    setRecordToRestore(rec);
    setIsRestoreOpen(true);
  };

  const handleOpenView = (rec: InterruptionRecord) => {
    setRecordToView(rec);
    setIsDetailsOpen(true);
  };

  const handleDeleteRecord = async (rec: InterruptionRecord) => {
    if (!isAdmin) return;
    if (confirm(`Are you sure you want to permanently delete incident record ${rec.id} (${rec.affectedArea})?`)) {
      await deleteRecord(rec.id);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-500 selection:text-white">
      {/* Top Application Bar */}
      <Header
        onOpenAddModal={handleOpenAdd}
        onOpenLoginModal={() => setIsLoginOpen(true)}
        onNavigateTab={(tab) => setActiveTab(tab)}
      />

      {/* Primary Sub-Navigation */}
      <Navigation
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Filter Bar (Active on Analytics and Records tabs) */}
      {(activeTab === 'analytics' || activeTab === 'records') && (
        <FilterBar />
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'analytics' && <AnalyticsView />}

        {activeTab === 'records' && (
          <RecordsTableView
            onViewRecord={handleOpenView}
            onEditRecord={handleOpenEdit}
            onDeleteRecord={handleDeleteRecord}
            onRestoreRecord={handleOpenRestore}
          />
        )}

        {activeTab === 'active' && (
          <ActiveIncidentsView
            onRestoreRecord={handleOpenRestore}
            onViewRecord={handleOpenView}
            onEditRecord={handleOpenEdit}
          />
        )}

        {activeTab === 'reference' && <ReferenceTablesView />}

        {activeTab === 'excel' && <ExcelSyncView />}

        {activeTab === 'users' && isAdmin && <UserManagementView />}
      </main>

      {/* Modals */}
      <AddEditRecordModal
        isOpen={isAddEditOpen}
        onClose={() => {
          setIsAddEditOpen(false);
          setRecordToEdit(null);
        }}
        recordToEdit={recordToEdit}
      />

      <MarkRestoredModal
        isOpen={isRestoreOpen}
        onClose={() => {
          setIsRestoreOpen(false);
          setRecordToRestore(null);
        }}
        record={recordToRestore}
      />

      <RecordDetailsModal
        isOpen={isDetailsOpen}
        onClose={() => {
          setIsDetailsOpen(false);
          setRecordToView(null);
        }}
        record={recordToView}
        onEdit={handleOpenEdit}
        onRestore={handleOpenRestore}
        isAdmin={isAdmin}
      />

      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
      />

      {/* System Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 py-6 px-4 text-xs mt-12">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <span className="font-semibold text-slate-200">Interruption Cause Dashboard</span>
            <span className="text-slate-600">•</span>
            <span>Electric Power Outage Management System</span>
          </div>

          <div className="flex items-center space-x-4 text-[11px] text-slate-500">
            <span>Synchronized with Excel Workbooks (.xlsx)</span>
            <span>•</span>
            <span>7 Standard Reference Tables Active</span>
            <span>•</span>
            <span className="font-mono">NEECO II Area 1</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <RecordsProvider>
        <MainDashboard />
      </RecordsProvider>
    </AuthProvider>
  );
}
