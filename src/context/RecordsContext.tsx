import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { InterruptionRecord, ReferenceTables, FilterState } from '../types/interruption';
import { INITIAL_RECORDS, INITIAL_REFERENCE_TABLES } from '../data/initialData';
import { useAuth } from './AuthContext';
import { calculateDurationMinutes, parseToYMD } from '../utils/dateUtils';

interface RecordsContextType {
  records: InterruptionRecord[];
  filteredRecords: InterruptionRecord[];
  referenceTables: ReferenceTables;
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  resetFilters: () => void;
  loading: boolean;
  error: string | null;
  activeIncidentsCount: number;
  resolvedIncidentsCount: number;
  scheduledIncidentsCount: number;
  totalConsumersAffected: number;
  totalKwHrLoss: number;
  totalRevenueLoss: number;
  avgDurationMinutes: number;
  // Live dynamic durations for active records
  getActiveRecordDuration: (record: InterruptionRecord) => number | null;
  // Code translations
  translateClassification: (codeOrName: string) => string;
  translateCause: (code: string) => string;
  translateWeather: (code: string) => string;
  translateIsolation: (code: string) => string;
  translateEquipment: (code: string) => string;
  translateSubstation: (code: string) => string;
  translateFeeder: (code: string) => string;
  // CRUD & actions
  addRecord: (record: Partial<InterruptionRecord>) => Promise<{ success: boolean; error?: string }>;
  updateRecord: (id: string, updates: Partial<InterruptionRecord>) => Promise<{ success: boolean; error?: string }>;
  deleteRecord: (id: string) => Promise<{ success: boolean; error?: string }>;
  markAsRestored: (id: string, data: { restoredDate: string; restoredTime: string; actionTaken: string; durationMinutes?: number; estimatedKwHrLoss?: number; estimatedRevenueLoss?: number }) => Promise<{ success: boolean; error?: string }>;
  importExcelFile: (file: File, mode: 'replace' | 'append') => Promise<{ success: boolean; error?: string; count?: number }>;
  exportExcelFile: (recordsToExport?: InterruptionRecord[], filename?: string) => void;
  exportCsvFile: (recordsToExport?: InterruptionRecord[], filename?: string) => void;
  resetToSampleData: () => Promise<void>;
  updateReferenceTables: (newTables: ReferenceTables) => Promise<{ success: boolean; error?: string }>;
  refreshRecords: () => Promise<void>;
}

const defaultFilters: FilterState = {
  searchQuery: '',
  dateStart: '',
  dateEnd: '',
  substation: '',
  feeder: '',
  causeCode: '',
  equipmentFailedCode: '',
  interruptionType: '',
  status: ''
};

const RecordsContext = createContext<RecordsContextType | undefined>(undefined);

export const RecordsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token } = useAuth();
  const [records, setRecords] = useState<InterruptionRecord[]>(() => {
    try {
      const saved = localStorage.getItem('local_records_backup');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return INITIAL_RECORDS;
  });

  const [referenceTables, setReferenceTables] = useState<ReferenceTables>(INITIAL_REFERENCE_TABLES);
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Live timer tick for active incidents running duration
  const [nowTimestamp, setNowTimestamp] = useState<number>(Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setNowTimestamp(Date.now());
    }, 5000); // Ticks every 5 seconds for live duration counter
    return () => clearInterval(timer);
  }, []);

  const resetFilters = () => setFilters(defaultFilters);

  // Fetch from server on load
  const refreshRecords = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [recRes, tabRes] = await Promise.all([
        fetch('/api/records'),
        fetch('/api/reference-tables')
      ]);

      if (recRes.ok) {
        const recData = await recRes.json();
        if (Array.isArray(recData) && recData.length > 0) {
          setRecords(recData);
          localStorage.setItem('local_records_backup', JSON.stringify(recData));
        }
      }

      if (tabRes.ok) {
        const tabData = await tabRes.json();
        if (tabData && Object.keys(tabData).length > 0) {
          setReferenceTables(tabData);
        }
      }
    } catch (err: any) {
      console.warn('Backend fetch failed, using local/initial state:', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshRecords();
  }, [refreshRecords]);

  // Translation helpers
  const translateClassification = useCallback((codeOrName: string): string => {
    if (!codeOrName) return '—';
    const clean = codeOrName.trim();
    const item = referenceTables.classifications?.find(
      c => c.code.toLowerCase() === clean.toLowerCase() || c.description.toLowerCase() === clean.toLowerCase()
    );
    return item ? `${item.description} (${item.code})` : clean;
  }, [referenceTables]);

  const translateCause = useCallback((code: string): string => {
    if (!code) return '—';
    const item = referenceTables.causes?.find(c => c.code === code || c.code === String(code).padStart(3, '0'));
    return item ? `${code} - ${item.description}` : code;
  }, [referenceTables]);

  const translateWeather = useCallback((code: string): string => {
    if (!code) return '—';
    const item = referenceTables.weather?.find(w => w.code === code);
    return item ? `${code} - ${item.description}` : code;
  }, [referenceTables]);

  const translateIsolation = useCallback((code: string): string => {
    if (!code) return '—';
    const item = referenceTables.isolationDevices?.find(i => i.code === code);
    return item ? `${code} - ${item.description}` : code;
  }, [referenceTables]);

  const translateEquipment = useCallback((code: string): string => {
    if (!code) return '—';
    const item = referenceTables.equipmentFailed?.find(e => e.code === code);
    return item ? `${code} - ${item.description}` : code;
  }, [referenceTables]);

  const translateSubstation = useCallback((code: string): string => {
    if (!code) return '—';
    const item = referenceTables.substations?.find(s => s.code.toUpperCase() === code.toUpperCase());
    return item ? item.description : code;
  }, [referenceTables]);

  const translateFeeder = useCallback((code: string): string => {
    if (!code) return '—';
    const item = referenceTables.feeders?.find(f => f.code.toUpperCase() === code.toUpperCase());
    return item ? item.description : code;
  }, [referenceTables]);

  // Live dynamic duration calculation
  const getActiveRecordDuration = useCallback((record: InterruptionRecord): number | null => {
    if (record.status !== 'Active') {
      return record.durationMinutes;
    }
    // For active records, compute running duration from dateOfInterruption + startTime up to nowTimestamp
    const liveDuration = calculateDurationMinutes(
      record.dateOfInterruption,
      record.startTime,
      null,
      null
    );
    // If date is in future or could not be parsed, fallback to stored duration if any
    return liveDuration !== null ? liveDuration : record.durationMinutes;
  }, [nowTimestamp]);

  // Filtering
  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      // Search query
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        const match =
          r.id.toLowerCase().includes(query) ||
          r.substation.toLowerCase().includes(query) ||
          r.feeder.toLowerCase().includes(query) ||
          r.affectedArea.toLowerCase().includes(query) ||
          r.poleId.toLowerCase().includes(query) ||
          (r.remarks && r.remarks.toLowerCase().includes(query)) ||
          (r.actionTaken && r.actionTaken.toLowerCase().includes(query)) ||
          translateCause(r.causeCode).toLowerCase().includes(query) ||
          translateEquipment(r.equipmentFailedCode).toLowerCase().includes(query);
        if (!match) return false;
      }

      // Date Range (From & To)
      if (filters.dateStart || filters.dateEnd) {
        const rYMD = parseToYMD(r.dateOfInterruption);
        if (rYMD) {
          if (filters.dateStart) {
            const startYMD = parseToYMD(filters.dateStart);
            if (startYMD && rYMD < startYMD) {
              return false;
            }
          }
          if (filters.dateEnd) {
            const endYMD = parseToYMD(filters.dateEnd);
            if (endYMD && rYMD > endYMD) {
              return false;
            }
          }
        }
      }

      // Substation
      if (filters.substation && r.substation.toUpperCase() !== filters.substation.toUpperCase()) {
        return false;
      }

      // Feeder
      if (filters.feeder && r.feeder.toUpperCase() !== filters.feeder.toUpperCase()) {
        return false;
      }

      // Cause
      if (filters.causeCode) {
        const padCode = String(filters.causeCode).padStart(3, '0');
        if (r.causeCode !== filters.causeCode && r.causeCode !== padCode) {
          return false;
        }
      }

      // Equipment
      if (filters.equipmentFailedCode && r.equipmentFailedCode !== filters.equipmentFailedCode) {
        return false;
      }

      // Interruption Type
      if (filters.interruptionType) {
        const filterType = filters.interruptionType.toLowerCase();
        const rType = (r.interruptionType || '').toLowerCase();
        if (!rType.includes(filterType) && !filterType.includes(rType)) {
          return false;
        }
      }

      // Status
      if (filters.status && r.status.toLowerCase() !== filters.status.toLowerCase()) {
        return false;
      }

      return true;
    });
  }, [records, filters, translateCause, translateEquipment]);

  // Aggregate Metrics
  const activeIncidentsCount = useMemo(() => {
    return filteredRecords.filter(r => r.status === 'Active').length;
  }, [filteredRecords]);

  const resolvedIncidentsCount = useMemo(() => {
    return filteredRecords.filter(r => r.status === 'Resolve').length;
  }, [filteredRecords]);

  const scheduledIncidentsCount = useMemo(() => {
    return filteredRecords.filter(r => r.status === 'Scheduled').length;
  }, [filteredRecords]);

  const totalConsumersAffected = useMemo(() => {
    return filteredRecords.reduce((sum, r) => sum + (Number(r.affectedConsumers) || 0), 0);
  }, [filteredRecords]);

  const totalKwHrLoss = useMemo(() => {
    return filteredRecords.reduce((sum, r) => sum + (Number(r.estimatedKwHrLoss) || 0), 0);
  }, [filteredRecords]);

  const totalRevenueLoss = useMemo(() => {
    return filteredRecords.reduce((sum, r) => sum + (Number(r.estimatedRevenueLoss) || 0), 0);
  }, [filteredRecords]);

  const avgDurationMinutes = useMemo(() => {
    const list = filteredRecords
      .map(r => getActiveRecordDuration(r))
      .filter((d): d is number => d !== null && !isNaN(d) && d > 0);
    if (!list.length) return 0;
    return Math.round((list.reduce((a, b) => a + b, 0) / list.length) * 100) / 100;
  }, [filteredRecords, getActiveRecordDuration]);

  // CRUD Operations
  const addRecord = async (newRecordData: Partial<InterruptionRecord>): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/records', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(newRecordData)
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to add record' };
      }

      setRecords(prev => [data, ...prev]);
      localStorage.setItem('local_records_backup', JSON.stringify([data, ...records]));
      return { success: true };
    } catch (err: any) {
      // Local fallback
      let maxNum = 0;
      for (const r of records) {
        if (r.id && r.id.startsWith('2026-')) {
          const num = parseInt(r.id.replace('2026-', ''), 10);
          if (!isNaN(num) && num > maxNum) maxNum = num;
        }
      }
      const newId = newRecordData.id || `2026-${String(maxNum + 1).padStart(6, '0')}`;
      const rec: InterruptionRecord = {
        id: newId,
        substation: newRecordData.substation || 'TAL',
        feeder: newRecordData.feeder || 'F11',
        dateOfInterruption: newRecordData.dateOfInterruption || new Date().toLocaleDateString('en-US', { month: 'long', day: '2-digit', year: 'numeric' }),
        affectedArea: newRecordData.affectedArea || '',
        poleId: newRecordData.poleId || '',
        startTime: newRecordData.startTime || '08:00:00',
        restoredDate: newRecordData.restoredDate || null,
        restoredTime: newRecordData.restoredTime || null,
        actionTaken: newRecordData.actionTaken || '',
        durationMinutes: newRecordData.durationMinutes ?? null,
        affectedConsumers: Number(newRecordData.affectedConsumers) || 0,
        causeCode: newRecordData.causeCode || '011',
        weatherCode: newRecordData.weatherCode || '104',
        isolationDeviceCode: newRecordData.isolationDeviceCode || '203',
        equipmentFailedCode: newRecordData.equipmentFailedCode || '301',
        remarks: newRecordData.remarks || '',
        estimatedKwHrLoss: newRecordData.estimatedKwHrLoss ?? null,
        estimatedRevenueLoss: newRecordData.estimatedRevenueLoss ?? null,
        interruptionType: newRecordData.interruptionType || 'Lateral',
        status: newRecordData.status || (newRecordData.restoredDate ? 'Resolve' : 'Active')
      };
      setRecords(prev => [rec, ...prev]);
      return { success: true };
    }
  };

  const updateRecord = async (id: string, updates: Partial<InterruptionRecord>): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch(`/api/records/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(updates)
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to update record' };
      }

      setRecords(prev => prev.map(r => r.id === id ? data : r));
      return { success: true };
    } catch (err: any) {
      setRecords(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
      return { success: true };
    }
  };

  const deleteRecord = async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch(`/api/records/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to delete record' };
      }
      setRecords(prev => prev.filter(r => r.id !== id));
      return { success: true };
    } catch (err: any) {
      setRecords(prev => prev.filter(r => r.id !== id));
      return { success: true };
    }
  };

  const markAsRestored = async (
    id: string,
    data: {
      restoredDate: string;
      restoredTime: string;
      actionTaken: string;
      durationMinutes?: number;
      estimatedKwHrLoss?: number;
      estimatedRevenueLoss?: number;
    }
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch(`/api/records/restore/${id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });
      const resData = await res.json();
      if (!res.ok) {
        return { success: false, error: resData.error || 'Failed to mark as restored' };
      }
      setRecords(prev => prev.map(r => r.id === id ? resData : r));
      return { success: true };
    } catch {
      setRecords(prev =>
        prev.map(r => {
          if (r.id === id) {
            return {
              ...r,
              restoredDate: data.restoredDate,
              restoredTime: data.restoredTime,
              actionTaken: data.actionTaken,
              durationMinutes: data.durationMinutes !== undefined ? data.durationMinutes : r.durationMinutes,
              estimatedKwHrLoss: data.estimatedKwHrLoss !== undefined ? data.estimatedKwHrLoss : r.estimatedKwHrLoss,
              estimatedRevenueLoss: data.estimatedRevenueLoss !== undefined ? data.estimatedRevenueLoss : r.estimatedRevenueLoss,
              status: 'Resolve'
            };
          }
          return r;
        })
      );
      return { success: true };
    }
  };

  const updateReferenceTables = async (newTables: ReferenceTables): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/reference-tables', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(newTables)
      });
      if (res.ok) {
        setReferenceTables(newTables);
        return { success: true };
      }
      const data = await res.json();
      return { success: false, error: data.error || 'Failed to update reference tables' };
    } catch {
      setReferenceTables(newTables);
      return { success: true };
    }
  };

  const resetToSampleData = async () => {
    try {
      await fetch('/api/records/reset', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch {
      // ignore
    }
    setRecords(INITIAL_RECORDS);
    localStorage.removeItem('local_records_backup');
  };

  // Import workbook
  const importExcelFile = async (file: File, mode: 'replace' | 'append'): Promise<{ success: boolean; error?: string; count?: number }> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const buffer = e.target?.result as ArrayBuffer;
          const wb = XLSX.read(buffer, { type: 'array' });
          const firstSheet = wb.SheetNames[0];
          const rawRows = XLSX.utils.sheet_to_json<any>(wb.Sheets[firstSheet]);

          if (!rawRows || rawRows.length === 0) {
            resolve({ success: false, error: 'The uploaded file does not contain any record rows.' });
            return;
          }

          // Try server API first
          const base64Data = btoa(
            new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
          );

          try {
            const res = await fetch('/api/import/excel', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
              },
              body: JSON.stringify({ fileData: base64Data, mode })
            });

            if (res.ok) {
              const resData = await res.json();
              await refreshRecords();
              resolve({ success: true, count: resData.importedCount });
              return;
            }
          } catch {
            // fallback to client-side parse
          }

          // Client-side parser fallback
          function findCol(row: any, ...aliases: string[]): any {
            for (const alias of aliases) {
              if (row[alias] !== undefined) return row[alias];
              const clean = alias.toLowerCase().replace(/[^a-z0-9]/g, '');
              for (const key of Object.keys(row)) {
                if (key.toLowerCase().replace(/[^a-z0-9]/g, '') === clean) {
                  return row[key];
                }
              }
            }
            return undefined;
          }

          const parsed: InterruptionRecord[] = [];
          for (const r of rawRows) {
            const id = String(findCol(r, 'Incident ID', 'id') || '').trim();
            if (!id) continue;

            const dur = findCol(r, 'Duration  (Minutes)', 'Duration (Minutes)', 'Duration', 'durationMinutes');
            const con = findCol(r, 'Number of Affected Consumers', 'Affected Consumers', 'affectedConsumers');
            const kwh = findCol(r, 'Estimated KwHr Loss', 'KwHr Loss', 'estimatedKwHrLoss');
            const rev = findCol(r, 'Estimated Revenue Loss', 'Revenue Loss', 'estimatedRevenueLoss');
            const resDate = findCol(r, 'Restored Date', 'restoredDate');
            const resTime = findCol(r, 'Restored Time', 'restoredTime');
            const st = findCol(r, 'Status', 'status');

            parsed.push({
              id,
              substation: String(findCol(r, 'SS', 'Substation', 'substation') || '').trim(),
              feeder: String(findCol(r, 'Feeder', 'feeder') || '').trim(),
              dateOfInterruption: String(findCol(r, 'Date of Interuption', 'Date of Interruption', 'dateOfInterruption') || '').trim(),
              affectedArea: String(findCol(r, 'Affected Area', 'affectedArea') || '').trim(),
              poleId: String(findCol(r, 'POLE ID', 'Pole ID', 'poleId') || '').trim(),
              startTime: String(findCol(r, 'StartTime of Interruption', 'Start Time', 'startTime') || '').trim(),
              restoredDate: resDate ? String(resDate).trim() : null,
              restoredTime: resTime ? String(resTime).trim() : null,
              actionTaken: String(findCol(r, 'ActionTaken', 'Action Taken', 'actionTaken') || '').trim(),
              durationMinutes: dur !== undefined && dur !== '' && !isNaN(Number(dur)) ? Number(dur) : null,
              affectedConsumers: con !== undefined && con !== '' && !isNaN(Number(con)) ? Number(con) : 0,
              causeCode: String(findCol(r, 'Cause of Interrution', 'Cause of Interruption', 'causeCode') || '').trim(),
              weatherCode: String(findCol(r, 'Weather', 'weatherCode') || '').trim(),
              isolationDeviceCode: String(findCol(r, 'Isolation Device', 'isolationDeviceCode') || '').trim(),
              equipmentFailedCode: String(findCol(r, 'Equipment Failed', 'equipmentFailedCode') || '').trim(),
              remarks: String(findCol(r, 'Remarks', 'remarks') || '').trim(),
              estimatedKwHrLoss: kwh !== undefined && kwh !== '' && !isNaN(Number(kwh)) ? Number(kwh) : null,
              estimatedRevenueLoss: rev !== undefined && rev !== '' && !isNaN(Number(rev)) ? Number(rev) : null,
              interruptionType: String(findCol(r, 'TYPE OF INTERRUPTION          (B/L/F/BB/)', 'Type of Interruption', 'interruptionType') || 'Lateral').trim(),
              status: st ? String(st).trim() : (resDate ? 'Resolve' : 'Active')
            });
          }

          if (mode === 'append') {
            const map = new Map(records.map(r => [r.id, r]));
            for (const item of parsed) {
              map.set(item.id, item);
            }
            const combined = Array.from(map.values());
            setRecords(combined);
            localStorage.setItem('local_records_backup', JSON.stringify(combined));
          } else {
            setRecords(parsed);
            localStorage.setItem('local_records_backup', JSON.stringify(parsed));
          }

          resolve({ success: true, count: parsed.length });
        } catch (err: any) {
          resolve({ success: false, error: err.message || 'Failed to parse file' });
        }
      };
      reader.onerror = () => resolve({ success: false, error: 'Could not read file' });
      reader.readAsArrayBuffer(file);
    });
  };

  // Export workbook (.xlsx)
  const exportExcelFile = (recordsToExport?: InterruptionRecord[], filename?: string) => {
    const list = recordsToExport || filteredRecords;

    const exportRows = list.map(r => ({
      'Incident ID': r.id,
      'SS': r.substation,
      'Substation Description': translateSubstation(r.substation),
      'Feeder': r.feeder,
      'Date of Interuption': r.dateOfInterruption,
      'Affected Area': r.affectedArea,
      'POLE ID': r.poleId,
      'StartTime of Interruption': r.startTime,
      'Restored Date': r.restoredDate || '',
      'Restored Time': r.restoredTime || '',
      'ActionTaken': r.actionTaken,
      'Duration  (Minutes)': r.durationMinutes !== null ? r.durationMinutes : '',
      'Number of Affected Consumers': r.affectedConsumers,
      'Cause of Interrution': r.causeCode,
      'Cause Description': translateCause(r.causeCode),
      'Weather': r.weatherCode,
      'Weather Description': translateWeather(r.weatherCode),
      'Isolation Device': r.isolationDeviceCode,
      'Isolation Device Description': translateIsolation(r.isolationDeviceCode),
      'Equipment Failed': r.equipmentFailedCode,
      'Equipment Failed Description': translateEquipment(r.equipmentFailedCode),
      'Remarks': r.remarks,
      'Estimated KwHr Loss': r.estimatedKwHrLoss !== null ? r.estimatedKwHrLoss : '',
      'Estimated Revenue Loss': r.estimatedRevenueLoss !== null ? r.estimatedRevenueLoss : '',
      'TYPE OF INTERRUPTION          (B/L/F/BB/)': r.interruptionType,
      'Status': r.status
    }));

    const wb = XLSX.utils.book_new();

    // Sheet 1: Records
    const wsRecords = XLSX.utils.json_to_sheet(exportRows);
    XLSX.utils.book_append_sheet(wb, wsRecords, 'Interruption Records');

    // Sheet 2: KPI Metrics
    const total = list.length;
    const active = list.filter(r => r.status === 'Active').length;
    const resolved = list.filter(r => r.status === 'Resolve').length;
    const scheduled = list.filter(r => r.status === 'Scheduled').length;
    const consumers = list.reduce((a, b) => a + (b.affectedConsumers || 0), 0);
    const kwh = list.reduce((a, b) => a + (b.estimatedKwHrLoss || 0), 0);
    const rev = list.reduce((a, b) => a + (b.estimatedRevenueLoss || 0), 0);
    const durList = list.map(r => r.durationMinutes).filter((d): d is number => d !== null);
    const avgDur = durList.length ? (durList.reduce((a, b) => a + b, 0) / durList.length).toFixed(2) : '0';

    const kpiSummary = [
      { Metric: 'Total Incidents Exported', Value: total },
      { Metric: 'Active Outages', Value: active },
      { Metric: 'Resolved Outages', Value: resolved },
      { Metric: 'Scheduled Interruptions', Value: scheduled },
      { Metric: 'Total Affected Consumers', Value: consumers },
      { Metric: 'Average Restoration Duration (Mins)', Value: avgDur },
      { Metric: 'Total KwHr Loss', Value: kwh.toFixed(2) },
      { Metric: 'Total Revenue Loss (PHP)', Value: rev.toFixed(2) },
      { Metric: 'Generated At', Value: new Date().toLocaleString() }
    ];
    const wsKpi = XLSX.utils.json_to_sheet(kpiSummary);
    XLSX.utils.book_append_sheet(wb, wsKpi, 'KPI Summary');

    // Reference tables
    if (referenceTables.causes?.length) {
      const wsCauses = XLSX.utils.json_to_sheet(referenceTables.causes);
      XLSX.utils.book_append_sheet(wb, wsCauses, 'Ref - Causes');
    }
    if (referenceTables.equipmentFailed?.length) {
      const wsEquip = XLSX.utils.json_to_sheet(referenceTables.equipmentFailed);
      XLSX.utils.book_append_sheet(wb, wsEquip, 'Ref - Equipment');
    }
    if (referenceTables.substations?.length) {
      const wsSS = XLSX.utils.json_to_sheet(referenceTables.substations);
      XLSX.utils.book_append_sheet(wb, wsSS, 'Ref - Substations');
    }

    const outName = filename || `Interruption_Report_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, outName);
  };

  // Export CSV
  const exportCsvFile = (recordsToExport?: InterruptionRecord[], filename?: string) => {
    const list = recordsToExport || filteredRecords;
    const exportRows = list.map(r => ({
      'Incident ID': r.id,
      'SS': r.substation,
      'Feeder': r.feeder,
      'Date of Interuption': r.dateOfInterruption,
      'Affected Area': r.affectedArea,
      'POLE ID': r.poleId,
      'StartTime of Interruption': r.startTime,
      'Restored Date': r.restoredDate || '',
      'Restored Time': r.restoredTime || '',
      'ActionTaken': r.actionTaken,
      'Duration  (Minutes)': r.durationMinutes !== null ? r.durationMinutes : '',
      'Number of Affected Consumers': r.affectedConsumers,
      'Cause of Interrution': r.causeCode,
      'Weather': r.weatherCode,
      'Isolation Device': r.isolationDeviceCode,
      'Equipment Failed': r.equipmentFailedCode,
      'Remarks': r.remarks,
      'Estimated KwHr Loss': r.estimatedKwHrLoss !== null ? r.estimatedKwHrLoss : '',
      'Estimated Revenue Loss': r.estimatedRevenueLoss !== null ? r.estimatedRevenueLoss : '',
      'TYPE OF INTERRUPTION          (B/L/F/BB/)': r.interruptionType,
      'Status': r.status
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const csvContent = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename || `Power_Interruptions_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <RecordsContext.Provider
      value={{
        records,
        filteredRecords,
        referenceTables,
        filters,
        setFilters,
        resetFilters,
        loading,
        error,
        activeIncidentsCount,
        resolvedIncidentsCount,
        scheduledIncidentsCount,
        totalConsumersAffected,
        totalKwHrLoss,
        totalRevenueLoss,
        avgDurationMinutes,
        getActiveRecordDuration,
        translateClassification,
        translateCause,
        translateWeather,
        translateIsolation,
        translateEquipment,
        translateSubstation,
        translateFeeder,
        addRecord,
        updateRecord,
        deleteRecord,
        markAsRestored,
        importExcelFile,
        exportExcelFile,
        exportCsvFile,
        resetToSampleData,
        updateReferenceTables,
        refreshRecords
      }}
    >
      {children}
    </RecordsContext.Provider>
  );
};

export const useRecords = () => {
  const context = useContext(RecordsContext);
  if (!context) {
    throw new Error('useRecords must be used within a RecordsProvider');
  }
  return context;
};
