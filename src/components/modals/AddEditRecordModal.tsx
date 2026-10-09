import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle, Clock, Calendar, Zap, Wrench, Shield } from 'lucide-react';
import { InterruptionRecord } from '../../types/interruption';
import { useRecords } from '../../context/RecordsContext';
import { calculateDurationMinutes, getCurrentDateFormatted, getCurrentTimeFormatted } from '../../utils/dateUtils';

interface AddEditRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  recordToEdit?: InterruptionRecord | null;
}

export const AddEditRecordModal: React.FC<AddEditRecordModalProps> = ({
  isOpen,
  onClose,
  recordToEdit
}) => {
  const { addRecord, updateRecord, referenceTables, records } = useRecords();

  const isEditing = Boolean(recordToEdit);

  // Form State
  const [formData, setFormData] = useState<Partial<InterruptionRecord>>({
    id: '',
    substation: 'TAL',
    feeder: 'F11',
    dateOfInterruption: getCurrentDateFormatted(),
    affectedArea: '',
    poleId: '',
    startTime: '08:00:00',
    restoredDate: null,
    restoredTime: null,
    actionTaken: '',
    durationMinutes: null,
    affectedConsumers: 0,
    causeCode: '011',
    weatherCode: '104',
    isolationDeviceCode: '203',
    equipmentFailedCode: '301',
    remarks: '',
    estimatedKwHrLoss: null,
    estimatedRevenueLoss: null,
    interruptionType: 'Lateral',
    status: 'Active'
  });

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (recordToEdit) {
      setFormData(recordToEdit);
    } else {
      // Auto-assign next incident ID
      let maxNum = 0;
      for (const r of records) {
        if (r.id && r.id.startsWith('2026-')) {
          const num = parseInt(r.id.replace('2026-', ''), 10);
          if (!isNaN(num) && num > maxNum) maxNum = num;
        }
      }
      const nextId = `2026-${String(maxNum + 1).padStart(6, '0')}`;

      setFormData({
        id: nextId,
        substation: 'TAL',
        feeder: 'F11',
        dateOfInterruption: getCurrentDateFormatted(),
        affectedArea: '',
        poleId: '',
        startTime: getCurrentTimeFormatted(),
        restoredDate: null,
        restoredTime: null,
        actionTaken: '',
        durationMinutes: null,
        affectedConsumers: 50,
        causeCode: '011',
        weatherCode: '104',
        isolationDeviceCode: '203',
        equipmentFailedCode: '301',
        remarks: '',
        estimatedKwHrLoss: null,
        estimatedRevenueLoss: null,
        interruptionType: 'Lateral',
        status: 'Active'
      });
    }
    setErrorMsg(null);
  }, [recordToEdit, isOpen, records]);

  if (!isOpen) return null;

  // Auto calculate duration if restored date and time are provided
  const handleAutoCalcDuration = () => {
    if (formData.dateOfInterruption && formData.startTime && formData.restoredDate && formData.restoredTime) {
      const dur = calculateDurationMinutes(
        formData.dateOfInterruption,
        formData.startTime,
        formData.restoredDate,
        formData.restoredTime
      );
      if (dur !== null) {
        setFormData(prev => ({ ...prev, durationMinutes: dur }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!formData.id?.trim()) {
      setErrorMsg('Incident ID is required');
      return;
    }
    if (!formData.affectedArea?.trim()) {
      setErrorMsg('Affected Area is required');
      return;
    }

    setSubmitting(true);
    let res;
    if (isEditing && recordToEdit) {
      res = await updateRecord(recordToEdit.id, formData);
    } else {
      res = await addRecord(formData);
    }
    setSubmitting(false);

    if (res.success) {
      onClose();
    } else {
      setErrorMsg(res.error || 'Failed to save record.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center space-x-2">
            <Zap className="w-5 h-5 text-blue-400" />
            <h3 className="text-base font-bold text-white">
              {isEditing ? `Edit Incident Record: ${recordToEdit?.id}` : 'Create New Interruption Record'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 bg-rose-950/40 border border-rose-500/30 text-rose-300 rounded-lg flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Row 1: Identification & Location */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Incident ID *</label>
              <input
                type="text"
                required
                value={formData.id || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, id: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-700 rounded-md px-2.5 py-1.5 text-white font-mono focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Substation (SS) *</label>
              <select
                value={formData.substation || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, substation: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-700 rounded-md px-2.5 py-1.5 text-white focus:border-blue-500 focus:outline-none"
              >
                {(referenceTables.substations || []).map(ss => (
                  <option key={ss.code} value={ss.code}>
                    {ss.code} - {ss.description}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Feeder *</label>
              <select
                value={formData.feeder || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, feeder: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-700 rounded-md px-2.5 py-1.5 text-white focus:border-blue-500 focus:outline-none"
              >
                {(referenceTables.feeders || []).map(f => (
                  <option key={f.code} value={f.code}>
                    {f.code} - {f.description}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-semibold">POLE ID</label>
              <input
                type="text"
                placeholder="e.g. TAL1596/L"
                value={formData.poleId || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, poleId: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-700 rounded-md px-2.5 py-1.5 text-white font-mono focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Row 2: Affected Area & Classification */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-slate-400 mb-1 font-semibold">Affected Area / Municipality *</label>
              <input
                type="text"
                required
                placeholder="e.g. Ilog Baliwag, Quezon"
                value={formData.affectedArea || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, affectedArea: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-700 rounded-md px-2.5 py-1.5 text-white focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Classification Type *</label>
              <select
                value={formData.interruptionType || 'Lateral'}
                onChange={(e) => setFormData(prev => ({ ...prev, interruptionType: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-700 rounded-md px-2.5 py-1.5 text-white focus:border-blue-500 focus:outline-none"
              >
                {(referenceTables.classifications || []).map(c => (
                  <option key={c.code} value={c.description}>
                    {c.description} ({c.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 3: Timestamps & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 p-3 bg-slate-950/70 rounded-lg border border-slate-800">
            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Date of Interruption *</label>
              <input
                type="text"
                placeholder="e.g. September 01, 2026"
                value={formData.dateOfInterruption || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, dateOfInterruption: e.target.value }))}
                className="w-full bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1.5 text-white focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Start Time *</label>
              <input
                type="text"
                placeholder="e.g. 1:15:00"
                value={formData.startTime || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                className="w-full bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1.5 text-white font-mono focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Status *</label>
              <select
                value={formData.status || 'Active'}
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                className="w-full bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1.5 text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="Active">🔴 Active (Running Outage)</option>
                <option value="Resolve">🟢 Resolve (Restored)</option>
                <option value="Scheduled">🟡 Scheduled Maintenance</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Restored Date (optional)</label>
              <input
                type="text"
                placeholder="e.g. September 01, 2026"
                value={formData.restoredDate || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, restoredDate: e.target.value || null }))}
                onBlur={handleAutoCalcDuration}
                className="w-full bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1.5 text-white focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Restored Time (optional)</label>
              <input
                type="text"
                placeholder="e.g. 2:30:00"
                value={formData.restoredTime || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, restoredTime: e.target.value || null }))}
                onBlur={handleAutoCalcDuration}
                className="w-full bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1.5 text-white font-mono focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Row 4: Technical Causes & Equipment Dropdowns */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Cause of Interruption *</label>
              <select
                value={formData.causeCode || '011'}
                onChange={(e) => setFormData(prev => ({ ...prev, causeCode: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-700 rounded-md px-2.5 py-1.5 text-white focus:border-blue-500 focus:outline-none"
              >
                {(referenceTables.causes || []).map(cause => (
                  <option key={cause.code} value={cause.code}>
                    {cause.code} - {cause.description}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Equipment Failed *</label>
              <select
                value={formData.equipmentFailedCode || '301'}
                onChange={(e) => setFormData(prev => ({ ...prev, equipmentFailedCode: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-700 rounded-md px-2.5 py-1.5 text-white focus:border-blue-500 focus:outline-none"
              >
                {(referenceTables.equipmentFailed || []).map(eq => (
                  <option key={eq.code} value={eq.code}>
                    {eq.code} - {eq.description}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Isolation Device *</label>
              <select
                value={formData.isolationDeviceCode || '203'}
                onChange={(e) => setFormData(prev => ({ ...prev, isolationDeviceCode: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-700 rounded-md px-2.5 py-1.5 text-white focus:border-blue-500 focus:outline-none"
              >
                {(referenceTables.isolationDevices || []).map(i => (
                  <option key={i.code} value={i.code}>
                    {i.code} - {i.description}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Weather *</label>
              <select
                value={formData.weatherCode || '104'}
                onChange={(e) => setFormData(prev => ({ ...prev, weatherCode: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-700 rounded-md px-2.5 py-1.5 text-white focus:border-blue-500 focus:outline-none"
              >
                {(referenceTables.weather || []).map(w => (
                  <option key={w.code} value={w.code}>
                    {w.code} - {w.description}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 5: Action Taken & Remarks */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Action Taken</label>
              <textarea
                rows={2}
                placeholder="e.g. INSPECTION AND REPLACED BUSTED FUSELINK"
                value={formData.actionTaken || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, actionTaken: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-700 rounded-md px-2.5 py-1.5 text-white focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Remarks</label>
              <textarea
                rows={2}
                placeholder="e.g. BUSTED FUSELINK (25AMPS)"
                value={formData.remarks || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, remarks: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-700 rounded-md px-2.5 py-1.5 text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Row 6: Impact & Quantities */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-3 bg-slate-950/70 rounded-lg border border-slate-800">
            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Affected Consumers</label>
              <input
                type="number"
                min="0"
                value={formData.affectedConsumers ?? 0}
                onChange={(e) => setFormData(prev => ({ ...prev, affectedConsumers: Number(e.target.value) }))}
                className="w-full bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1.5 text-white font-mono focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Duration (Minutes)</label>
              <input
                type="number"
                step="0.1"
                placeholder="Blank if active"
                value={formData.durationMinutes ?? ''}
                onChange={(e) => setFormData(prev => ({ ...prev, durationMinutes: e.target.value !== '' ? Number(e.target.value) : null }))}
                className="w-full bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1.5 text-white font-mono focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Est. KwHr Loss</label>
              <input
                type="number"
                step="0.001"
                placeholder="Blank if uncalculated"
                value={formData.estimatedKwHrLoss ?? ''}
                onChange={(e) => setFormData(prev => ({ ...prev, estimatedKwHrLoss: e.target.value !== '' ? Number(e.target.value) : null }))}
                className="w-full bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1.5 text-white font-mono focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Est. Revenue Loss (PHP)</label>
              <input
                type="number"
                step="0.01"
                placeholder="Blank if uncalculated"
                value={formData.estimatedRevenueLoss ?? ''}
                onChange={(e) => setFormData(prev => ({ ...prev, estimatedRevenueLoss: e.target.value !== '' ? Number(e.target.value) : null }))}
                className="w-full bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1.5 text-amber-300 font-mono focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Action Footer */}
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
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold shadow-sm transition flex items-center space-x-1.5 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{submitting ? 'Saving...' : (isEditing ? 'Update Record' : 'Save Record')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
