import React, { useState, useMemo } from 'react';
import { 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  Eye, 
  Edit2, 
  Trash2, 
  CheckCircle, 
  AlertCircle, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  FileSpreadsheet, 
  Download,
  MoreVertical
} from 'lucide-react';
import { InterruptionRecord } from '../types/interruption';
import { useRecords } from '../context/RecordsContext';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatKWh, formatNumber, formatDurationHuman } from '../utils/dateUtils';

interface RecordsTableViewProps {
  onViewRecord: (record: InterruptionRecord) => void;
  onEditRecord: (record: InterruptionRecord) => void;
  onDeleteRecord: (record: InterruptionRecord) => void;
  onRestoreRecord: (record: InterruptionRecord) => void;
}

type SortField = keyof InterruptionRecord | 'duration';
type SortOrder = 'asc' | 'desc';

export const RecordsTableView: React.FC<RecordsTableViewProps> = ({
  onViewRecord,
  onEditRecord,
  onDeleteRecord,
  onRestoreRecord
}) => {
  const { 
    filteredRecords, 
    getActiveRecordDuration, 
    translateCause, 
    translateEquipment, 
    translateSubstation,
    exportExcelFile,
    exportCsvFile
  } = useRecords();
  const { isAdmin } = useAuth();

  const [sortField, setSortField] = useState<SortField>('id');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);

  // Sorting
  const sortedRecords = useMemo(() => {
    return [...filteredRecords].sort((a, b) => {
      let valA: any = a[sortField as keyof InterruptionRecord];
      let valB: any = b[sortField as keyof InterruptionRecord];

      if (sortField === 'duration') {
        valA = getActiveRecordDuration(a) ?? -1;
        valB = getActiveRecordDuration(b) ?? -1;
      }

      if (valA === null || valA === undefined || valA === '') return sortOrder === 'asc' ? 1 : -1;
      if (valB === null || valB === undefined || valB === '') return sortOrder === 'asc' ? -1 : 1;

      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      }

      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();
      return sortOrder === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
    });
  }, [filteredRecords, sortField, sortOrder, getActiveRecordDuration]);

  // Pagination
  const totalPages = Math.ceil(sortedRecords.length / pageSize) || 1;
  const paginatedRecords = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedRecords.slice(start, start + pageSize);
  }, [sortedRecords, page, pageSize]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 text-slate-500 inline ml-1 opacity-40 hover:opacity-100" />;
    return sortOrder === 'asc'
      ? <ArrowUp className="w-3 h-3 text-blue-400 inline ml-1" />
      : <ArrowDown className="w-3 h-3 text-blue-400 inline ml-1" />;
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm flex flex-col">
      {/* Table Header Bar */}
      <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-900/60">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-semibold text-white">
            Incident Dataset Records
          </span>
          <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-mono">
            {filteredRecords.length} records
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {/* Export Buttons */}
          <button
            onClick={() => exportExcelFile(filteredRecords)}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 border border-emerald-800/80 rounded-md text-xs font-medium transition cursor-pointer"
            title="Export filtered records to formatted Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export Excel</span>
          </button>

          <button
            onClick={() => exportCsvFile(filteredRecords)}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-md text-xs font-medium transition cursor-pointer"
            title="Export filtered records to CSV (.csv)"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>CSV</span>
          </button>

          {/* Page size selector */}
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="bg-slate-950 border border-slate-700 text-slate-300 text-xs rounded-md px-2 py-1.5 focus:outline-none focus:border-blue-500"
          >
            <option value={20}>20 rows</option>
            <option value={25}>25 rows</option>
            <option value={50}>50 rows</option>
            <option value={100}>100 rows</option>
          </select>
        </div>
      </div>

      {/* Responsive Horizontal Scroll Container */}
      <div className="overflow-x-auto min-h-[480px]">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-950/80 text-slate-400 uppercase tracking-wider text-[11px] border-b border-slate-800 font-semibold select-none">
              <th className="py-3 px-3 cursor-pointer hover:text-white" onClick={() => handleSort('id')}>
                Incident ID {getSortIcon('id')}
              </th>
              <th className="py-3 px-2 cursor-pointer hover:text-white" onClick={() => handleSort('status')}>
                Status {getSortIcon('status')}
              </th>
              <th className="py-3 px-2 cursor-pointer hover:text-white" onClick={() => handleSort('substation')}>
                SS {getSortIcon('substation')}
              </th>
              <th className="py-3 px-2 cursor-pointer hover:text-white" onClick={() => handleSort('feeder')}>
                Feeder {getSortIcon('feeder')}
              </th>
              <th className="py-3 px-3 cursor-pointer hover:text-white" onClick={() => handleSort('dateOfInterruption')}>
                Date of Interruption {getSortIcon('dateOfInterruption')}
              </th>
              <th className="py-3 px-3 cursor-pointer hover:text-white" onClick={() => handleSort('affectedArea')}>
                Affected Area {getSortIcon('affectedArea')}
              </th>
              <th className="py-3 px-2 cursor-pointer hover:text-white" onClick={() => handleSort('poleId')}>
                POLE ID {getSortIcon('poleId')}
              </th>
              <th className="py-3 px-2 cursor-pointer hover:text-white" onClick={() => handleSort('startTime')}>
                Start Time {getSortIcon('startTime')}
              </th>
              <th className="py-3 px-2">Restored Time</th>
              <th className="py-3 px-3 cursor-pointer hover:text-white" onClick={() => handleSort('duration')}>
                Duration (Min) {getSortIcon('duration')}
              </th>
              <th className="py-3 px-2 text-right cursor-pointer hover:text-white" onClick={() => handleSort('affectedConsumers')}>
                Consumers {getSortIcon('affectedConsumers')}
              </th>
              <th className="py-3 px-3 cursor-pointer hover:text-white" onClick={() => handleSort('causeCode')}>
                Cause {getSortIcon('causeCode')}
              </th>
              <th className="py-3 px-3 cursor-pointer hover:text-white" onClick={() => handleSort('equipmentFailedCode')}>
                Equipment {getSortIcon('equipmentFailedCode')}
              </th>
              <th className="py-3 px-3 cursor-pointer hover:text-white" onClick={() => handleSort('interruptionType')}>
                Type {getSortIcon('interruptionType')}
              </th>
              <th className="py-3 px-2 text-right cursor-pointer hover:text-white" onClick={() => handleSort('estimatedKwHrLoss')}>
                KwHr Loss {getSortIcon('estimatedKwHrLoss')}
              </th>
              <th className="py-3 px-2 text-right cursor-pointer hover:text-white" onClick={() => handleSort('estimatedRevenueLoss')}>
                Revenue Loss {getSortIcon('estimatedRevenueLoss')}
              </th>
              <th className="py-3 px-3 text-center sticky right-0 bg-slate-950/90 backdrop-blur z-10 border-l border-slate-800">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-normal">
            {paginatedRecords.length === 0 ? (
              <tr>
                <td colSpan={17} className="py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <AlertCircle className="w-6 h-6 text-slate-500" />
                    <span>No interruption records matching the applied search or filters.</span>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedRecords.map((record) => {
                const isActive = record.status === 'Active';
                const isScheduled = record.status === 'Scheduled';
                const liveDuration = getActiveRecordDuration(record);
                const causeLabel = translateCause(record.causeCode);
                const equipLabel = translateEquipment(record.equipmentFailedCode);
                const ssName = translateSubstation(record.substation);

                return (
                  <tr 
                    key={record.id}
                    className={`hover:bg-slate-800/40 transition group ${
                      isActive ? 'bg-rose-950/10' : ''
                    }`}
                  >
                    {/* Incident ID */}
                    <td className="py-2.5 px-3 font-mono font-medium text-slate-200 whitespace-nowrap">
                      <button
                        onClick={() => onViewRecord(record)}
                        className="hover:text-blue-400 hover:underline cursor-pointer"
                        title="Click to view details"
                      >
                        {record.id}
                      </button>
                    </td>

                    {/* Status */}
                    <td className="py-2.5 px-2 whitespace-nowrap">
                      {isActive ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse">
                          Active
                        </span>
                      ) : isScheduled ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          Scheduled
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/20">
                          Resolve
                        </span>
                      )}
                    </td>

                    {/* Substation */}
                    <td className="py-2.5 px-2 font-mono font-semibold text-slate-200 whitespace-nowrap" title={ssName}>
                      {record.substation}
                    </td>

                    {/* Feeder */}
                    <td className="py-2.5 px-2 font-mono text-slate-300 whitespace-nowrap">
                      {record.feeder}
                    </td>

                    {/* Date */}
                    <td className="py-2.5 px-3 text-slate-300 whitespace-nowrap">
                      {record.dateOfInterruption}
                    </td>

                    {/* Affected Area */}
                    <td className="py-2.5 px-3 text-slate-200 max-w-[200px] truncate" title={record.affectedArea}>
                      {record.affectedArea}
                    </td>

                    {/* POLE ID */}
                    <td className="py-2.5 px-2 font-mono text-slate-400 whitespace-nowrap">
                      {record.poleId || '—'}
                    </td>

                    {/* Start Time */}
                    <td className="py-2.5 px-2 font-mono text-slate-300 whitespace-nowrap">
                      {record.startTime}
                    </td>

                    {/* Restored Time */}
                    <td className="py-2.5 px-2 font-mono text-slate-400 whitespace-nowrap">
                      {record.restoredTime ? (
                        <span>{record.restoredTime}</span>
                      ) : (
                        <span className="text-rose-400 italic font-sans text-[11px]">In progress</span>
                      )}
                    </td>

                    {/* Duration (Minutes) */}
                    <td className="py-2.5 px-3 whitespace-nowrap font-mono">
                      {isActive ? (
                        <span className="inline-flex items-center space-x-1 text-rose-300 bg-rose-950/40 px-2 py-0.5 rounded border border-rose-800 text-[11px]">
                          <Clock className="w-3 h-3 text-rose-400 animate-spin" />
                          <span>{liveDuration !== null ? `${liveDuration.toFixed(1)}m` : 'Running...'}</span>
                        </span>
                      ) : (
                        <span className="text-slate-300">
                          {record.durationMinutes !== null ? `${record.durationMinutes.toFixed(1)}m` : '—'}
                        </span>
                      )}
                    </td>

                    {/* Number of Affected Consumers */}
                    <td className="py-2.5 px-2 text-right font-mono text-slate-300 whitespace-nowrap">
                      {formatNumber(record.affectedConsumers)}
                    </td>

                    {/* Cause */}
                    <td className="py-2.5 px-3 max-w-[160px] truncate text-slate-300" title={causeLabel}>
                      <span className="font-mono text-slate-400 mr-1">{record.causeCode}</span>
                      <span>{causeLabel.replace(/^[0-9]+\s*-\s*/, '')}</span>
                    </td>

                    {/* Equipment Failed */}
                    <td className="py-2.5 px-3 max-w-[150px] truncate text-slate-300" title={equipLabel}>
                      <span className="font-mono text-slate-400 mr-1">{record.equipmentFailedCode}</span>
                      <span>{equipLabel.replace(/^[0-9]+\s*-\s*/, '')}</span>
                    </td>

                    {/* Type */}
                    <td className="py-2.5 px-3 text-slate-300 whitespace-nowrap">
                      {record.interruptionType || '—'}
                    </td>

                    {/* KwHr Loss */}
                    <td className="py-2.5 px-2 text-right font-mono text-slate-300 whitespace-nowrap">
                      {record.estimatedKwHrLoss !== null ? record.estimatedKwHrLoss.toFixed(2) : '—'}
                    </td>

                    {/* Revenue Loss */}
                    <td className="py-2.5 px-2 text-right font-mono text-amber-300 whitespace-nowrap">
                      {record.estimatedRevenueLoss !== null ? formatCurrency(record.estimatedRevenueLoss) : '—'}
                    </td>

                    {/* Actions Column */}
                    <td className="py-2.5 px-3 text-center whitespace-nowrap sticky right-0 bg-slate-900/90 backdrop-blur border-l border-slate-800">
                      <div className="flex items-center justify-center space-x-1">
                        {/* View Details */}
                        <button
                          onClick={() => onViewRecord(record)}
                          className="p-1 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded transition cursor-pointer"
                          title="View Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {/* Quick Mark Restored (if active) */}
                        {isAdmin && isActive && (
                          <button
                            onClick={() => onRestoreRecord(record)}
                            className="p-1 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/60 rounded transition cursor-pointer"
                            title="Mark as Restored"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Edit Record (Admin only) */}
                        {isAdmin && (
                          <button
                            onClick={() => onEditRecord(record)}
                            className="p-1 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded transition cursor-pointer"
                            title="Edit Record"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Delete Record (Admin only) */}
                        {isAdmin && (
                          <button
                            onClick={() => onDeleteRecord(record)}
                            className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition cursor-pointer"
                            title="Delete Record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-3 bg-slate-950/80 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
        <div>
          Showing page <strong className="text-white">{page}</strong> of{' '}
          <strong className="text-white">{totalPages}</strong> ({sortedRecords.length} filtered items)
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={() => setPage(1)}
            disabled={page <= 1}
            className="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800"
          >
            First
          </button>
          <button
            onClick={() => setPage(prev => Math.max(prev - 1, 1))}
            disabled={page <= 1}
            className="p-1 rounded bg-slate-900 border border-slate-800 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-3 py-1 font-mono text-white bg-slate-900 border border-slate-800 rounded">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
            disabled={page >= totalPages}
            className="p-1 rounded bg-slate-900 border border-slate-800 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => setPage(totalPages)}
            disabled={page >= totalPages}
            className="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800"
          >
            Last
          </button>
        </div>
      </div>
    </div>
  );
};
