import React from 'react';
import { 
  X, 
  MapPin, 
  Clock, 
  Zap, 
  Users, 
  Coins, 
  Wrench, 
  ShieldAlert, 
  CloudSun, 
  Flame, 
  Layers, 
  FileText,
  Activity,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { InterruptionRecord } from '../../types/interruption';
import { useRecords } from '../../context/RecordsContext';
import { formatCurrency, formatKWh, formatNumber, formatDurationHuman } from '../../utils/dateUtils';

interface RecordDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: InterruptionRecord | null;
  onEdit?: (record: InterruptionRecord) => void;
  onRestore?: (record: InterruptionRecord) => void;
  isAdmin?: boolean;
}

export const RecordDetailsModal: React.FC<RecordDetailsModalProps> = ({
  isOpen,
  onClose,
  record,
  onEdit,
  onRestore,
  isAdmin
}) => {
  const { 
    translateCause, 
    translateEquipment, 
    translateIsolation, 
    translateWeather, 
    translateSubstation, 
    translateFeeder,
    getActiveRecordDuration 
  } = useRecords();

  if (!isOpen || !record) return null;

  const isActive = record.status === 'Active';
  const isScheduled = record.status === 'Scheduled';
  const duration = getActiveRecordDuration(record);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center space-x-3">
            <span className="font-mono text-base font-bold text-white">{record.id}</span>
            {isActive ? (
              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse">
                <AlertTriangle className="w-3 h-3 text-rose-400" />
                <span>Active Outage</span>
              </span>
            ) : isScheduled ? (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Scheduled Interruption
              </span>
            ) : (
              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span>Restored & Resolved</span>
              </span>
            )}
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs">
          {/* Location & Circuit Grid */}
          <div className="p-4 bg-slate-950/70 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-start space-x-2">
              <MapPin className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Affected Area</span>
                <p className="text-sm font-semibold text-white">{record.affectedArea}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-800/80">
              <div>
                <span className="text-slate-400 text-[11px] block">Substation</span>
                <span className="font-bold text-white text-xs">{record.substation}</span>
                <span className="text-[10px] text-slate-400 block truncate" title={translateSubstation(record.substation)}>
                  {translateSubstation(record.substation)}
                </span>
              </div>

              <div>
                <span className="text-slate-400 text-[11px] block">Feeder Line</span>
                <span className="font-bold text-white text-xs font-mono">{record.feeder}</span>
                <span className="text-[10px] text-slate-400 block truncate" title={translateFeeder(record.feeder)}>
                  {translateFeeder(record.feeder)}
                </span>
              </div>

              <div>
                <span className="text-slate-400 text-[11px] block">POLE ID</span>
                <span className="font-mono text-slate-200 text-xs">{record.poleId || '—'}</span>
              </div>

              <div>
                <span className="text-slate-400 text-[11px] block">Type / Level</span>
                <span className="font-medium text-purple-300 text-xs">{record.interruptionType || '—'}</span>
              </div>
            </div>
          </div>

          {/* Timeline & Duration */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
              <span className="text-slate-400 text-[11px] block flex items-center gap-1">
                <Clock className="w-3 h-3 text-blue-400" />
                Interruption Started
              </span>
              <span className="font-semibold text-white text-xs mt-1 block">
                {record.dateOfInterruption}
              </span>
              <span className="font-mono text-slate-300 text-xs block">{record.startTime}</span>
            </div>

            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
              <span className="text-slate-400 text-[11px] block flex items-center gap-1">
                <Clock className="w-3 h-3 text-emerald-400" />
                Restoration Time
              </span>
              {record.restoredDate && record.restoredTime ? (
                <>
                  <span className="font-semibold text-emerald-300 text-xs mt-1 block">
                    {record.restoredDate}
                  </span>
                  <span className="font-mono text-emerald-400 text-xs block">{record.restoredTime}</span>
                </>
              ) : (
                <span className="text-rose-400 font-semibold text-xs mt-2 block animate-pulse">
                  Ongoing Outage
                </span>
              )}
            </div>

            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
              <span className="text-slate-400 text-[11px] block flex items-center gap-1">
                <Activity className="w-3 h-3 text-cyan-400" />
                Duration
              </span>
              <span className="font-bold text-cyan-300 text-sm mt-1 block font-mono">
                {duration !== null ? `${duration.toFixed(1)} mins` : '—'}
              </span>
              <span className="text-slate-400 text-[10px] block">{formatDurationHuman(duration)}</span>
            </div>
          </div>

          {/* Impact & Loss Metrics */}
          <div className="grid grid-cols-3 gap-3 p-3 bg-slate-950 rounded-lg border border-slate-800">
            <div>
              <span className="text-slate-400 text-[11px] block flex items-center gap-1">
                <Users className="w-3 h-3 text-purple-400" />
                Affected Consumers
              </span>
              <span className="text-base font-bold text-white font-mono mt-0.5 block">
                {formatNumber(record.affectedConsumers)}
              </span>
            </div>

            <div>
              <span className="text-slate-400 text-[11px] block flex items-center gap-1">
                <Zap className="w-3 h-3 text-yellow-400" />
                KwHr Energy Loss
              </span>
              <span className="text-xs font-bold text-slate-200 font-mono mt-1 block">
                {formatKWh(record.estimatedKwHrLoss)}
              </span>
            </div>

            <div>
              <span className="text-slate-400 text-[11px] block flex items-center gap-1">
                <Coins className="w-3 h-3 text-amber-400" />
                Est. Revenue Loss
              </span>
              <span className="text-xs font-bold text-amber-300 font-mono mt-1 block">
                {formatCurrency(record.estimatedRevenueLoss)}
              </span>
            </div>
          </div>

          {/* Technical Classification / Codes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
              <span className="text-slate-400 text-[11px] flex items-center gap-1">
                <Flame className="w-3 h-3 text-amber-400" />
                Interruption Cause ({record.causeCode})
              </span>
              <p className="text-white font-medium">{translateCause(record.causeCode)}</p>
            </div>

            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
              <span className="text-slate-400 text-[11px] flex items-center gap-1">
                <Wrench className="w-3 h-3 text-emerald-400" />
                Equipment Failed ({record.equipmentFailedCode})
              </span>
              <p className="text-white font-medium">{translateEquipment(record.equipmentFailedCode)}</p>
            </div>

            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
              <span className="text-slate-400 text-[11px] flex items-center gap-1">
                <ShieldAlert className="w-3 h-3 text-blue-400" />
                Isolation Device ({record.isolationDeviceCode})
              </span>
              <p className="text-white font-medium">{translateIsolation(record.isolationDeviceCode)}</p>
            </div>

            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
              <span className="text-slate-400 text-[11px] flex items-center gap-1">
                <CloudSun className="w-3 h-3 text-sky-400" />
                Weather Condition ({record.weatherCode})
              </span>
              <p className="text-white font-medium">{translateWeather(record.weatherCode)}</p>
            </div>
          </div>

          {/* Action Taken & Remarks */}
          <div className="space-y-3">
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
              <span className="text-slate-400 text-[11px] block font-semibold mb-1">Action Taken</span>
              <p className="text-slate-200 leading-relaxed font-mono text-[11px]">
                {record.actionTaken || 'No action taken recorded.'}
              </p>
            </div>

            {record.remarks && (
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-slate-400 text-[11px] block font-semibold mb-1">Remarks & Lineman Log</span>
                <p className="text-amber-300/90 leading-relaxed font-mono text-[11px]">
                  {record.remarks}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <span className="text-slate-500 text-[11px] font-mono">
            ID: {record.id}
          </span>

          <div className="flex items-center space-x-2">
            {isAdmin && isActive && onRestore && (
              <button
                onClick={() => {
                  onClose();
                  onRestore(record);
                }}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Mark as Restored</span>
              </button>
            )}

            {isAdmin && onEdit && (
              <button
                onClick={() => {
                  onClose();
                  onEdit(record);
                }}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition cursor-pointer"
              >
                Edit Record
              </button>
            )}

            <button
              onClick={onClose}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
