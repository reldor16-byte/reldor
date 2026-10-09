import React, { useState, useRef } from 'react';
import { 
  FileSpreadsheet, 
  Upload, 
  Download, 
  RotateCcw, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  Database,
  Layers,
  ArrowDown
} from 'lucide-react';
import { useRecords } from '../context/RecordsContext';
import { useAuth } from '../context/AuthContext';
import * as XLSX from 'xlsx';

export const ExcelSyncView: React.FC = () => {
  const { records, importExcelFile, exportExcelFile, exportCsvFile, resetToSampleData } = useRecords();
  const { isAdmin } = useAuth();

  const [importMode, setImportMode] = useState<'replace' | 'append'>('replace');
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleExecuteImport = async () => {
    if (!selectedFile) return;
    if (!isAdmin) {
      setStatusMessage({ type: 'error', text: 'Administrator login required to import workbooks into the database.' });
      return;
    }

    setLoading(true);
    setStatusMessage(null);
    try {
      const res = await importExcelFile(selectedFile, importMode);
      if (res.success) {
        setStatusMessage({
          type: 'success',
          text: `Successfully imported ${res.count ?? 'records'} from ${selectedFile.name} into the system!`
        });
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      } else {
        setStatusMessage({ type: 'error', text: res.error || 'Failed to import workbook.' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Error occurred during import.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadBlankTemplate = () => {
    const headers = [
      'Incident ID',
      'SS',
      'Feeder',
      'Date of Interuption',
      'Affected Area',
      'POLE ID',
      'StartTime of Interruption',
      'Restored Date',
      'Restored Time',
      'ActionTaken',
      'Duration  (Minutes)',
      'Number of Affected Consumers',
      'Cause of Interrution',
      'Weather',
      'Isolation Device',
      'Equipment Failed',
      'Remarks',
      'Estimated KwHr Loss',
      'Estimated Revenue Loss',
      'TYPE OF INTERRUPTION          (B/L/F/BB/)',
      'Status'
    ];

    const sampleRow = [
      '2026-000241',
      'TAL',
      'F11',
      'October 09, 2026',
      'Poblacion Sur, Talavera',
      'TAL1064/L',
      '08:30:00',
      'October 09, 2026',
      '09:45:00',
      'INSPECTION OF LINE & REPLACED BUSTED FUSE LINK',
      '75.0',
      '120',
      '010',
      '104',
      '203',
      '301',
      'BUSTED FUSE LINK DUE TO INTRUDED BIRD (15 AMPS)',
      '45.50',
      '91.75',
      'Lateral',
      'Resolve'
    ];

    const ws = XLSX.utils.aoa_to_sheet([headers, sampleRow]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, 'Interruption_Records_Template.xlsx');
  };

  const handleReset = async () => {
    if (!isAdmin) {
      setStatusMessage({ type: 'error', text: 'Administrator login required to reset dataset.' });
      return;
    }
    if (confirm('Are you sure you want to reset all records back to the original 240 sample records? Any newly added incidents will be replaced.')) {
      setLoading(true);
      await resetToSampleData();
      setLoading(false);
      setStatusMessage({ type: 'success', text: 'Successfully reset database to the original 240 sample.csv records.' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Intro Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-lg">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Excel Import & Export Center</h2>
              <p className="text-xs text-slate-400">
                Load your existing workbooks, export formatted reports, and download synchronized datasets.
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => exportExcelFile()}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-sm transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Full Workbook (.xlsx)</span>
            </button>
          </div>
        </div>
      </div>

      {statusMessage && (
        <div className={`p-4 rounded-xl border flex items-center space-x-3 text-xs ${
          statusMessage.type === 'success'
            ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
            : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
        }`}>
          {statusMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Main Grid: Import (Left) and Export/Sync (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Workbook Import */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <Upload className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-semibold text-white">Import Workbook (.xlsx or .csv)</h3>
            </div>
            <span className="text-[11px] text-slate-400">
              {isAdmin ? 'Admin Authorized' : 'Admin Required to Apply'}
            </span>
          </div>

          <p className="text-xs text-slate-400">
            Upload an updated Excel spreadsheet or CSV containing interruption records. The column structure matches your <strong className="text-slate-300">sample.csv</strong> template.
          </p>

          {/* Import Mode Selector */}
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-2">
            <span className="text-xs font-semibold text-slate-300 block">Import Mode:</span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <label className={`flex items-center space-x-2 p-2 rounded border cursor-pointer transition ${
                importMode === 'replace' ? 'bg-blue-600/20 border-blue-500/40 text-blue-300' : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}>
                <input
                  type="radio"
                  name="importMode"
                  value="replace"
                  checked={importMode === 'replace'}
                  onChange={() => setImportMode('replace')}
                  className="text-blue-500"
                />
                <div>
                  <span className="font-semibold block">Replace All Records</span>
                  <span className="text-[10px] text-slate-400 block">Clean swap with new file</span>
                </div>
              </label>

              <label className={`flex items-center space-x-2 p-2 rounded border cursor-pointer transition ${
                importMode === 'append' ? 'bg-blue-600/20 border-blue-500/40 text-blue-300' : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}>
                <input
                  type="radio"
                  name="importMode"
                  value="append"
                  checked={importMode === 'append'}
                  onChange={() => setImportMode('append')}
                  className="text-blue-500"
                />
                <div>
                  <span className="font-semibold block">Append & Merge</span>
                  <span className="text-[10px] text-slate-400 block">Upsert matching IDs</span>
                </div>
              </label>
            </div>
          </div>

          {/* Drag & Drop Zone */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-6 text-center transition cursor-pointer ${
              dragActive
                ? 'border-blue-500 bg-blue-500/10'
                : 'border-slate-700 bg-slate-950/60 hover:border-slate-600'
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="flex flex-col items-center justify-center space-y-2">
              <FileSpreadsheet className="w-8 h-8 text-blue-400" />
              <div className="text-xs text-slate-300 font-medium">
                {selectedFile ? (
                  <span className="text-emerald-400 font-semibold">{selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)</span>
                ) : (
                  <span>Click to browse or drag & drop Excel / CSV file here</span>
                )}
              </div>
              <p className="text-[11px] text-slate-500">Supports .xlsx, .xls, .csv</p>
            </div>
          </div>

          {/* Execute Button */}
          <button
            onClick={handleExecuteImport}
            disabled={!selectedFile || loading || !isAdmin}
            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg shadow-sm transition flex items-center justify-center space-x-2"
          >
            <Upload className="w-4 h-4" />
            <span>{loading ? 'Processing Workbook...' : 'Confirm & Process Import'}</span>
          </button>
        </div>

        {/* Right: Export & Template Tools */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Download className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-semibold text-white">Export & Download Options</h3>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                {records.length} Current Records
              </span>
            </div>

            <div className="space-y-3">
              {/* Option 1: Full Excel (.xlsx) */}
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-white flex items-center gap-1.5">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                    Complete Multi-Sheet Excel Workbook
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Includes Records sheet, KPI Summary sheet, and Reference Tables sheets.
                  </p>
                </div>
                <button
                  onClick={() => exportExcelFile()}
                  className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded text-xs font-medium transition cursor-pointer"
                >
                  Download .xlsx
                </button>
              </div>

              {/* Option 2: Flat CSV */}
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-white flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-blue-400" />
                    Plain CSV File (.csv)
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Original comma-delimited columns matching sample.csv for legacy systems.
                  </p>
                </div>
                <button
                  onClick={() => exportCsvFile()}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-xs font-medium transition cursor-pointer"
                >
                  Download .csv
                </button>
              </div>

              {/* Option 3: Blank Template */}
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-white flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-amber-400" />
                    Blank Entry Template
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Empty workbook with the exact 21 headers and sample row for field linemen.
                  </p>
                </div>
                <button
                  onClick={handleDownloadBlankTemplate}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-xs font-medium transition cursor-pointer"
                >
                  Download Template
                </button>
              </div>
            </div>
          </div>

          {/* Database Reset Button (Admin only) */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-slate-300 block">Restore Default Records</span>
              <span className="text-[11px] text-slate-500">Reset to initial 240 records from sample.csv</span>
            </div>
            {isAdmin ? (
              <button
                onClick={handleReset}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 rounded-md text-xs font-semibold transition cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset to Sample.csv</span>
              </button>
            ) : (
              <span className="text-[11px] text-slate-500 italic">Admin Only</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
