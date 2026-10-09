import React, { useState } from 'react';
import { 
  BookOpen, 
  Search, 
  Layers, 
  Flame, 
  CloudSun, 
  ShieldAlert, 
  Wrench, 
  Activity, 
  Zap,
  Plus,
  Trash2,
  Check,
  Edit2
} from 'lucide-react';
import { useRecords } from '../context/RecordsContext';
import { useAuth } from '../context/AuthContext';
import { ReferenceItem } from '../types/interruption';

export const ReferenceTablesView: React.FC = () => {
  const { referenceTables, updateReferenceTables, records } = useRecords();
  const { isAdmin } = useAuth();
  const [activeTableKey, setActiveTableKey] = useState<string>('causes');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Editing state
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editDesc, setEditDesc] = useState<string>('');
  const [newCode, setNewCode] = useState<string>('');
  const [newDesc, setNewDesc] = useState<string>('');
  const [showAddRow, setShowAddRow] = useState<boolean>(false);

  const tablesMeta = [
    { key: 'causes', label: '1. Interruption Causes', icon: Flame, desc: 'Root cause classification codes (001-011)' },
    { key: 'classifications', label: '2. Interruption Types', icon: Layers, desc: 'Lateral, Block, Feeder, Backbone, Substation, Supply' },
    { key: 'equipmentFailed', label: '3. Equipment Failed', icon: Wrench, desc: 'Hardware components and failure points (301-312)' },
    { key: 'substations', label: '4. Substations (SS)', icon: Activity, desc: 'Substation installations and coverage territories' },
    { key: 'feeders', label: '5. Feeders', icon: Zap, desc: 'Primary 13.2kV distribution feeder circuits' },
    { key: 'isolationDevices', label: '6. Isolation Devices', icon: ShieldAlert, desc: 'Circuit breakers, reclosers, cutouts (201-204)' },
    { key: 'weather', label: '7. Weather Conditions', icon: CloudSun, desc: 'Atmospheric conditions at time of incident (101-104)' },
  ];

  const currentItems: ReferenceItem[] = (referenceTables as any)[activeTableKey] || [];

  const filteredItems = currentItems.filter(item => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return item.code.toLowerCase().includes(q) || item.description.toLowerCase().includes(q);
  });

  // Calculate incident counts per code
  const getUsageCount = (code: string) => {
    switch (activeTableKey) {
      case 'causes':
        return records.filter(r => r.causeCode === code).length;
      case 'equipmentFailed':
        return records.filter(r => r.equipmentFailedCode === code).length;
      case 'isolationDevices':
        return records.filter(r => r.isolationDeviceCode === code).length;
      case 'weather':
        return records.filter(r => r.weatherCode === code).length;
      case 'substations':
        return records.filter(r => r.substation.toUpperCase() === code.toUpperCase()).length;
      case 'feeders':
        return records.filter(r => r.feeder.toUpperCase() === code.toUpperCase()).length;
      case 'classifications':
        return records.filter(r => (r.interruptionType || '').toLowerCase() === code.toLowerCase() || (r.interruptionType || '').toLowerCase().includes(code.toLowerCase())).length;
      default:
        return 0;
    }
  };

  const handleStartEdit = (index: number, desc: string) => {
    setEditingIndex(index);
    setEditDesc(desc);
  };

  const handleSaveEdit = async (index: number) => {
    if (!isAdmin) return;
    const updated = [...currentItems];
    updated[index] = { ...updated[index], description: editDesc.trim() };
    const newTables = { ...referenceTables, [activeTableKey]: updated };
    await updateReferenceTables(newTables);
    setEditingIndex(null);
  };

  const handleAddNewItem = async () => {
    if (!isAdmin || !newCode.trim() || !newDesc.trim()) return;
    const updated = [...currentItems, { code: newCode.trim(), description: newDesc.trim() }];
    const newTables = { ...referenceTables, [activeTableKey]: updated };
    await updateReferenceTables(newTables);
    setNewCode('');
    setNewDesc('');
    setShowAddRow(false);
  };

  const handleDeleteItem = async (code: string) => {
    if (!isAdmin) return;
    if (!confirm(`Are you sure you want to delete code "${code}" from the reference table?`)) return;
    const updated = currentItems.filter(i => i.code !== code);
    const newTables = { ...referenceTables, [activeTableKey]: updated };
    await updateReferenceTables(newTables);
  };

  return (
    <div className="space-y-6">
      {/* Intro Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-lg">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">The Seven Reference Tables</h2>
              <p className="text-xs text-slate-400">
                These standardized tables drive the dropdown selectors and translate stored utility codes into human-readable descriptions.
              </p>
            </div>
          </div>
          <div className="text-xs text-slate-400 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
            Source: <span className="text-slate-200 font-mono">tables.csv / reference_tables.json</span>
          </div>
        </div>
      </div>

      {/* Main Container: Sidebar + Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Table Selector */}
        <div className="lg:col-span-4 space-y-2">
          {tablesMeta.map((tab) => {
            const Icon = tab.icon;
            const isCurrent = activeTableKey === tab.key;
            const itemsCount = ((referenceTables as any)[tab.key] || []).length;
            return (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveTableKey(tab.key);
                  setEditingIndex(null);
                  setShowAddRow(false);
                }}
                className={`w-full text-left p-3.5 rounded-xl border transition flex items-start space-x-3 cursor-pointer ${
                  isCurrent
                    ? 'bg-blue-600/15 border-blue-500/40 text-white shadow-sm'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850 hover:border-slate-700'
                }`}
              >
                <div className={`p-2 rounded-lg mt-0.5 ${
                  isCurrent ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-800 text-slate-400'
                }`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs sm:text-sm">{tab.label}</span>
                    <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800">
                      {itemsCount}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{tab.desc}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Right Table Content */}
        <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm flex flex-col">
          {/* Table Header Controls */}
          <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-900/60">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search codes or descriptions in this table..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            {isAdmin && (
              <button
                onClick={() => setShowAddRow(!showAddRow)}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-xs font-medium transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Code</span>
              </button>
            )}
          </div>

          {/* New Item Form (Admin) */}
          {showAddRow && isAdmin && (
            <div className="p-3 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center gap-2 text-xs">
              <input
                type="text"
                placeholder="New Code (e.g. 012)"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value)}
                className="w-28 bg-slate-900 border border-slate-700 px-2.5 py-1.5 rounded text-slate-200 font-mono"
              />
              <input
                type="text"
                placeholder="Description"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                className="flex-1 min-w-[200px] bg-slate-900 border border-slate-700 px-2.5 py-1.5 rounded text-slate-200"
              />
              <button
                onClick={handleAddNewItem}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-medium cursor-pointer"
              >
                Save
              </button>
              <button
                onClick={() => setShowAddRow(false)}
                className="px-2.5 py-1.5 bg-slate-800 text-slate-400 hover:text-white rounded"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-950/80 text-slate-400 uppercase text-[11px] border-b border-slate-800 font-semibold">
                  <th className="py-2.5 px-4 w-28">Code</th>
                  <th className="py-2.5 px-4">Standard Description</th>
                  <th className="py-2.5 px-4 w-32 text-right">Matching Incidents</th>
                  {isAdmin && <th className="py-2.5 px-3 w-20 text-center">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400">
                      No codes found matching "{searchQuery}"
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item, idx) => {
                    const isEditing = editingIndex === idx;
                    const usage = getUsageCount(item.code);

                    return (
                      <tr key={item.code} className="hover:bg-slate-800/30 transition">
                        <td className="py-3 px-4 font-mono font-bold text-amber-300">
                          {item.code}
                        </td>
                        <td className="py-3 px-4 text-slate-200">
                          {isEditing ? (
                            <div className="flex items-center space-x-2">
                              <input
                                type="text"
                                value={editDesc}
                                onChange={(e) => setEditDesc(e.target.value)}
                                className="flex-1 bg-slate-950 border border-blue-500 px-2 py-1 rounded text-white text-xs"
                                autoFocus
                              />
                              <button
                                onClick={() => handleSaveEdit(idx)}
                                className="p-1 text-emerald-400 hover:bg-slate-800 rounded"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <span>{item.description}</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-mono">
                          <span className={`px-2 py-0.5 rounded text-[11px] ${
                            usage > 0 ? 'bg-slate-800 text-slate-200 font-semibold' : 'text-slate-500'
                          }`}>
                            {usage} records
                          </span>
                        </td>
                        {isAdmin && (
                          <td className="py-3 px-3 text-center">
                            <div className="flex items-center justify-center space-x-1">
                              <button
                                onClick={() => handleStartEdit(idx, item.description)}
                                className="p-1 text-slate-400 hover:text-blue-400 rounded transition cursor-pointer"
                                title="Edit Description"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteItem(item.code)}
                                className="p-1 text-slate-400 hover:text-rose-400 rounded transition cursor-pointer"
                                title="Delete Code"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
