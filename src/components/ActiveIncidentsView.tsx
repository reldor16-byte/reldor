import React, { useState } from 'react';
import { 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  MapPin, 
  Users, 
  Zap, 
  Wrench, 
  Activity, 
  ArrowRight,
  ShieldAlert,
  Flame,
  Radio
} from 'lucide-react';
import { InterruptionRecord } from '../types/interruption';
import { useRecords } from '../context/RecordsContext';
import { useAuth } from '../context/AuthContext';
import { formatNumber, formatDurationHuman } from '../utils/dateUtils';

interface ActiveIncidentsViewProps {
  onRestoreRecord: (record: InterruptionRecord) => void;
  onViewRecord: (record: InterruptionRecord) => void;
  onEditRecord: (record: InterruptionRecord) => void;
}

export const ActiveIncidentsView: React.FC<ActiveIncidentsViewProps> = ({
  onRestoreRecord,
  onViewRecord,
  onEditRecord
}) => {
  const { records, getActiveRecordDuration, translateCause, translateSubstation, translateEquipment } = useRecords();
  const { isAdmin } = useAuth();
  const [substationFilter, setSubstationFilter] = useState<string>('');

  // Active records
  const activeRecords = records.filter(r => r.status === 'Active');
  const filteredActive = substationFilter 
    ? activeRecords.filter(r => r.substation.toUpperCase() === substationFilter.toUpperCase())
    : activeRecords;

  const totalActiveConsumers = activeRecords.reduce((sum, r) => sum + (r.affectedConsumers || 0), 0);

  return (
    <div className="space-y-6">
      {/* Console Alert Banner */}
      <div className="bg-gradient-to-r from-rose-950/60 via-slate-900 to-slate-900 border border-rose-500/30 rounded-xl p-5 shadow-lg">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-rose-500/20 text-rose-400 rounded-xl border border-rose-500/30 animate-pulse">
              <Radio className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-white">Live Outage Dispatch Console</h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                  {activeRecords.length} Active Incidents
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Restoration timers run continuously in real-time until linemen confirm and mark incidents as restored.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4 bg-slate-950/80 px-4 py-2.5 rounded-lg border border-slate-800 text-xs">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Affected Consumers</span>
              <span className="text-base font-bold text-white font-mono">{formatNumber(totalActiveConsumers)}</span>
            </div>
            <div className="h-7 w-px bg-slate-800" />
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Dispatch State</span>
              <span className="text-rose-400 font-semibold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping inline-block"></span>
                Ongoing Response
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Quick Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold text-slate-300">Filter Substation:</span>
          <select
            value={substationFilter}
            onChange={(e) => setSubstationFilter(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500"
          >
            <option value="">All Active Substations ({activeRecords.length})</option>
            {Array.from(new Set(activeRecords.map(r => r.substation))).map(ss => (
              <option key={ss} value={ss}>
                {ss} ({activeRecords.filter(r => r.substation === ss).length})
              </option>
            ))}
          </select>
        </div>

        <div className="text-xs text-slate-400">
          Click <strong className="text-emerald-400">"Mark as Restored"</strong> on any incident when line re-energization is confirmed.
        </div>
      </div>

      {/* Active Incidents Cards List */}
      {filteredActive.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
          <div className="max-w-md mx-auto space-y-3">
            <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">All Circuits Energized</h3>
            <p className="text-xs text-slate-400">
              There are no active un-restored power interruptions currently registered in the system. The distribution grid is operating normally.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredActive.map((record) => {
            const liveDuration = getActiveRecordDuration(record);
            const causeText = translateCause(record.causeCode);
            const equipText = translateEquipment(record.equipmentFailedCode);
            const ssName = translateSubstation(record.substation);

            return (
              <div 
                key={record.id}
                className="bg-slate-900 border border-rose-500/30 hover:border-rose-500/60 rounded-xl p-5 shadow-sm transition flex flex-col justify-between relative group"
              >
                {/* Header */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-bold text-white text-sm">{record.id}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse">
                        Active Outage
                      </span>
                    </div>

                    {/* Running Outage Timer */}
                    <div className="flex items-center space-x-1.5 font-mono text-xs font-bold text-rose-300 bg-rose-950/60 px-2.5 py-1 rounded-md border border-rose-800/80">
                      <Clock className="w-3.5 h-3.5 text-rose-400 animate-spin" />
                      <span>{liveDuration !== null ? `${liveDuration.toFixed(1)} mins` : 'Counting...'}</span>
                    </div>
                  </div>

                  {/* Substation, Feeder, Pole */}
                  <div className="flex flex-wrap items-center gap-2 text-xs mb-3">
                    <span className="bg-slate-800 text-slate-200 px-2 py-0.5 rounded font-mono font-semibold" title={ssName}>
                      SS: {record.substation}
                    </span>
                    <span className="bg-slate-800 text-slate-200 px-2 py-0.5 rounded font-mono">
                      Feeder: {record.feeder}
                    </span>
                    <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
                      Pole: {record.poleId || 'N/A'}
                    </span>
                    <span className="bg-purple-950/50 text-purple-300 border border-purple-800/60 px-2 py-0.5 rounded text-[11px]">
                      {record.interruptionType}
                    </span>
                  </div>

                  {/* Affected Area */}
                  <div className="space-y-1 text-xs mb-3">
                    <div className="flex items-start space-x-1.5 text-slate-200 font-medium">
                      <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{record.affectedArea}</span>
                    </div>
                    <div className="flex items-center space-x-1.5 text-slate-400 pl-5 text-[11px]">
                      <span>Interrupted at:</span>
                      <span className="text-slate-300 font-mono">{record.dateOfInterruption} • {record.startTime}</span>
                    </div>
                  </div>

                  {/* Consumers & Cause */}
                  <div className="p-2.5 bg-slate-950/80 rounded-lg border border-slate-800/80 space-y-1.5 text-xs mb-3">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Users className="w-3 h-3 text-purple-400" />
                        Affected Consumers:
                      </span>
                      <strong className="text-white font-mono">{formatNumber(record.affectedConsumers)}</strong>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Root Cause:</span>
                      <span className="text-slate-300 truncate max-w-[160px]" title={causeText}>
                        {causeText}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Equipment Failed:</span>
                      <span className="text-slate-300 truncate max-w-[160px]" title={equipText}>
                        {equipText}
                      </span>
                    </div>

                    {record.remarks && (
                      <div className="pt-1 border-t border-slate-800/60 text-[11px] text-amber-300/90 italic truncate" title={record.remarks}>
                        Remarks: {record.remarks}
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                  <button
                    onClick={() => onViewRecord(record)}
                    className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded hover:bg-slate-800 transition cursor-pointer"
                  >
                    View Details
                  </button>

                  <div className="flex items-center space-x-2">
                    {isAdmin && (
                      <button
                        onClick={() => onEditRecord(record)}
                        className="text-xs text-slate-400 hover:text-amber-300 px-2 py-1 rounded hover:bg-slate-800 transition cursor-pointer"
                      >
                        Edit
                      </button>
                    )}

                    {isAdmin ? (
                      <button
                        onClick={() => onRestoreRecord(record)}
                        className="flex items-center space-x-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-sm transition cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Mark Restored</span>
                      </button>
                    ) : (
                      <span className="text-[11px] text-slate-500 italic">
                        Viewing Only
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
