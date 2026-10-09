import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, Clock, Calendar, Zap, AlertTriangle } from 'lucide-react';
import { InterruptionRecord } from '../../types/interruption';
import { useRecords } from '../../context/RecordsContext';
import { 
  calculateDurationMinutes, 
  getCurrentDateFormatted, 
  getCurrentTimeFormatted,
  formatDurationHuman
} from '../../utils/dateUtils';

interface MarkRestoredModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: InterruptionRecord | null;
}

export const MarkRestoredModal: React.FC<MarkRestoredModalProps> = ({
  isOpen,
  onClose,
  record
}) => {
  const { markAsRestored } = useRecords();

  const [restoredDate, setRestoredDate] = useState<string>('');
  const [restoredTime, setRestoredTime] = useState<string>('');
  const [actionTaken, setActionTaken] = useState<string>('');
  const [durationMinutes, setDurationMinutes] = useState<number | null>(null);
  const [estimatedKwHrLoss, setEstimatedKwHrLoss] = useState<string>('');
  const [estimatedRevenueLoss, setEstimatedRevenueLoss] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (record) {
      const curDate = record.dateOfInterruption || getCurrentDateFormatted();
      const curTime = getCurrentTimeFormatted();
      setRestoredDate(curDate);
      setRestoredTime(curTime);
      setActionTaken(record.actionTaken || 'LINE INSPECTED, FAULT CLEARED, AND RE-ENERGIZED');

      // Auto compute duration
      if (record.dateOfInterruption && record.startTime) {
        const computed = calculateDurationMinutes(
          record.dateOfInterruption,
          record.startTime,
          curDate,
          curTime
        );
        setDurationMinutes(computed);
      } else {
        setDurationMinutes(null);
      }

      setEstimatedKwHrLoss(record.estimatedKwHrLoss !== null && record.estimatedKwHrLoss !== undefined ? String(record.estimatedKwHrLoss) : '');
      setEstimatedRevenueLoss(record.estimatedRevenueLoss !== null && record.estimatedRevenueLoss !== undefined ? String(record.estimatedRevenueLoss) : '');
    }
  }, [record, isOpen]);

  if (!isOpen || !record) return null;

  const handleRecalculateDuration = () => {
    if (record.dateOfInterruption && record.startTime && restoredDate && restoredTime) {
      const computed = calculateDurationMinutes(
        record.dateOfInterruption,
        record.startTime,
        restoredDate,
        restoredTime
      );
      setDurationMinutes(computed);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restoredDate.trim() || !restoredTime.trim()) {
      setErrorMsg('Restoration date and time are required.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    const kwh = estimatedKwHrLoss.trim() !== '' && !isNaN(Number(estimatedKwHrLoss)) ? Number(estimatedKwHrLoss) : undefined;
    const rev = estimatedRevenueLoss.trim() !== '' && !isNaN(Number(estimatedRevenueLoss)) ? Number(estimatedRevenueLoss) : undefined;

    const res = await markAsRestored(record.id, {
      restoredDate: restoredDate.trim(),
      restoredTime: restoredTime.trim(),
      actionTaken: actionTaken.trim(),
      durationMinutes: durationMinutes !== null ? durationMinutes : undefined,
      estimatedKwHrLoss: kwh,
      estimatedRevenueLoss: rev
    });

    setSubmitting(false);

    if (res.success) {
      onClose();
    } else {
      setErrorMsg(res.error || 'Failed to mark incident as restored.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="text-sm font-bold text-white">Mark Incident as Restored</h3>
              <p className="text-[11px] text-slate-400">Incident: {record.id} • SS: {record.substation} ({record.feeder})</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 bg-rose-950/40 border border-rose-500/30 text-rose-300 rounded-lg flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Outage Summary Card */}
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between text-slate-300">
              <span>Affected Area:</span>
              <strong className="text-white text-right truncate max-w-[250px]">{record.affectedArea}</strong>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>Outage Started:</span>
              <span className="font-mono text-slate-200">{record.dateOfInterruption} @ {record.startTime}</span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>Affected Consumers:</span>
              <span className="font-mono text-purple-300 font-bold">{record.affectedConsumers}</span>
            </div>
          </div>

          {/* Restoration Date and Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Restored Date *</label>
              <input
                type="text"
                required
                value={restoredDate}
                onChange={(e) => setRestoredDate(e.target.value)}
                onBlur={handleRecalculateDuration}
                className="w-full bg-slate-950 border border-slate-700 rounded-md px-2.5 py-1.5 text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Restored Time *</label>
              <input
                type="text"
                required
                value={restoredTime}
                onChange={(e) => setRestoredTime(e.target.value)}
                onBlur={handleRecalculateDuration}
                className="w-full bg-slate-950 border border-slate-700 rounded-md px-2.5 py-1.5 text-white font-mono focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Calculated Duration Display */}
          <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-2 text-slate-300">
              <Clock className="w-4 h-4 text-cyan-400" />
              <span>Calculated Restoration Duration:</span>
            </div>
            <div className="text-right font-mono">
              <span className="text-sm font-bold text-cyan-300">
                {durationMinutes !== null ? `${durationMinutes.toFixed(1)} mins` : '—'}
              </span>
              <span className="text-[11px] text-slate-400 ml-1.5">
                ({formatDurationHuman(durationMinutes)})
              </span>
            </div>
          </div>

          {/* Action Taken */}
          <div>
            <label className="block text-slate-400 mb-1 font-semibold">Action Taken by Linemen / Dispatcher *</label>
            <textarea
              rows={2}
              required
              value={actionTaken}
              onChange={(e) => setActionTaken(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-md px-2.5 py-1.5 text-white focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Optional Loss Estimates */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-slate-400 mb-1 font-semibold">
                Est. KwHr Loss <span className="text-slate-500 font-normal">(optional)</span>
              </label>
              <input
                type="number"
                step="0.001"
                placeholder="Leave blank if uncalculated"
                value={estimatedKwHrLoss}
                onChange={(e) => setEstimatedKwHrLoss(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-md px-2.5 py-1.5 text-white font-mono focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1 font-semibold">
                Est. Revenue Loss <span className="text-slate-500 font-normal">(optional)</span>
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="Leave blank if uncalculated"
                value={estimatedRevenueLoss}
                onChange={(e) => setEstimatedRevenueLoss(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-md px-2.5 py-1.5 text-amber-300 font-mono focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Footer Controls */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold shadow-sm transition flex items-center space-x-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{submitting ? 'Updating...' : 'Confirm Restoration & Energize'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
