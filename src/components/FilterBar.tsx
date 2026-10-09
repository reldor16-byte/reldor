import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  RotateCcw, 
  Calendar, 
  Layers, 
  Cpu, 
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  X,
  Clock
} from 'lucide-react';
import { useRecords } from '../context/RecordsContext';
import { DateRangePicker } from './DateRangePicker';
import { formatDateDisplay } from '../utils/dateUtils';

export const FilterBar: React.FC = () => {
  const { filters, setFilters, resetFilters, referenceTables, records, filteredRecords } = useRecords();
  const [expanded, setExpanded] = useState<boolean>(false);

  const hasActiveFilters = Boolean(
    filters.searchQuery ||
    filters.dateStart ||
    filters.dateEnd ||
    filters.substation ||
    filters.feeder ||
    filters.causeCode ||
    filters.equipmentFailedCode ||
    filters.interruptionType ||
    filters.status
  );

  const handleDateChange = (dateStart: string, dateEnd: string) => {
    setFilters(prev => ({
      ...prev,
      dateStart,
      dateEnd
    }));
  };

  // Available feeders based on selected substation
  const availableFeeders = React.useMemo(() => {
    if (!filters.substation) {
      return referenceTables.feeders || [];
    }
    // Filter feeders matching the substation prefix if possible, or all feeders that appeared with this substation in records
    const usedFeeders = new Set(
      records
        .filter(r => r.substation.toUpperCase() === filters.substation.toUpperCase())
        .map(r => r.feeder.toUpperCase())
    );
    const matched = (referenceTables.feeders || []).filter(f => usedFeeders.has(f.code.toUpperCase()));
    return matched.length ? matched : referenceTables.feeders || [];
  }, [filters.substation, referenceTables.feeders, records]);

  return (
    <div className="bg-slate-900/80 border-b border-slate-800 p-4">
      <div className="max-w-7xl mx-auto space-y-3">
        {/* Main Search and Quick Filter Row */}
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Incident ID, Pole ID, Area, Remarks, Action Taken..."
              value={filters.searchQuery}
              onChange={(e) => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-lg pl-9 pr-8 py-2 text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
            />
            {filters.searchQuery && (
              <button
                onClick={() => setFilters(prev => ({ ...prev, searchQuery: '' }))}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Quick Selectors */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Custom Date Range Picker */}
            <DateRangePicker
              dateStart={filters.dateStart}
              dateEnd={filters.dateEnd}
              onChange={handleDateChange}
              records={records}
            />

            {/* Status Filter */}
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="bg-slate-950 border border-slate-700/80 rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="Active">🔴 Active Outage</option>
              <option value="Resolve">🟢 Resolved / Restored</option>
              <option value="Scheduled">🟡 Scheduled Maintenance</option>
            </select>

            {/* Substation Filter */}
            <select
              value={filters.substation}
              onChange={(e) => setFilters(prev => ({ ...prev, substation: e.target.value, feeder: '' }))}
              className="bg-slate-950 border border-slate-700/80 rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            >
              <option value="">All Substations</option>
              {(referenceTables.substations || []).map(ss => (
                <option key={ss.code} value={ss.code}>
                  {ss.code} - {ss.description}
                </option>
              ))}
            </select>

            {/* Classification Filter */}
            <select
              value={filters.interruptionType}
              onChange={(e) => setFilters(prev => ({ ...prev, interruptionType: e.target.value }))}
              className="bg-slate-950 border border-slate-700/80 rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            >
              <option value="">All Types (B/L/F/BB)</option>
              {(referenceTables.classifications || []).map(c => (
                <option key={c.code} value={c.description}>
                  {c.description} ({c.code})
                </option>
              ))}
            </select>

            {/* Expand Advanced Filters Toggle */}
            <button
              onClick={() => setExpanded(!expanded)}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition cursor-pointer ${
                expanded || hasActiveFilters
                  ? 'bg-blue-600/20 text-blue-300 border-blue-500/40'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border-slate-700/80'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>More Filters</span>
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {/* Reset Filters */}
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="flex items-center space-x-1 px-2.5 py-2 rounded-lg text-xs font-medium bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition cursor-pointer"
                title="Reset All Filters"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Advanced Filter Drawer */}
        {expanded && (
          <div className="pt-3 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {/* Feeder */}
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Feeder Line</label>
              <select
                value={filters.feeder}
                onChange={(e) => setFilters(prev => ({ ...prev, feeder: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-md px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-blue-500"
              >
                <option value="">All Feeders</option>
                {availableFeeders.map(f => (
                  <option key={f.code} value={f.code}>
                    {f.code} - {f.description}
                  </option>
                ))}
              </select>
            </div>

            {/* Interruption Cause */}
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Interruption Cause</label>
              <select
                value={filters.causeCode}
                onChange={(e) => setFilters(prev => ({ ...prev, causeCode: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-md px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-blue-500"
              >
                <option value="">All Causes</option>
                {(referenceTables.causes || []).map(cause => (
                  <option key={cause.code} value={cause.code}>
                    {cause.code} - {cause.description}
                  </option>
                ))}
              </select>
            </div>

            {/* Equipment Failed */}
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Equipment Failed</label>
              <select
                value={filters.equipmentFailedCode}
                onChange={(e) => setFilters(prev => ({ ...prev, equipmentFailedCode: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-md px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-blue-500"
              >
                <option value="">All Equipment</option>
                {(referenceTables.equipmentFailed || []).map(eq => (
                  <option key={eq.code} value={eq.code}>
                    {eq.code} - {eq.description}
                  </option>
                ))}
              </select>
            </div>

            {/* Specific 'From' and 'To' Date Inputs */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-400 font-medium flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-blue-400" />
                  <span>Custom Date Range</span>
                </label>
                {(filters.dateStart || filters.dateEnd) && (
                  <button
                    type="button"
                    onClick={() => handleDateChange('', '')}
                    className="text-[10px] text-rose-400 hover:underline"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <div>
                  <span className="text-[10px] text-slate-500 block mb-0.5 font-semibold">From Date:</span>
                  <input
                    type="date"
                    value={filters.dateStart}
                    onChange={(e) => handleDateChange(e.target.value, filters.dateEnd)}
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-md px-2 py-1 text-slate-200 text-xs focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block mb-0.5 font-semibold">To Date:</span>
                  <input
                    type="date"
                    value={filters.dateEnd}
                    onChange={(e) => handleDateChange(filters.dateStart, e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-md px-2 py-1 text-slate-200 text-xs focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filter Summary & Active Chips */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            <span>
              Showing <strong className="text-white">{filteredRecords.length}</strong> of{' '}
              <strong className="text-white">{records.length}</strong> records
            </span>

            {/* Active Date Range Chip */}
            {(filters.dateStart || filters.dateEnd) && (
              <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full text-[11px] bg-blue-600/20 text-blue-300 font-medium border border-blue-500/40">
                <Calendar className="w-3 h-3 text-blue-400" />
                <span>
                  {filters.dateStart && filters.dateEnd
                    ? `${formatDateDisplay(filters.dateStart)} – ${formatDateDisplay(filters.dateEnd)}`
                    : filters.dateStart
                    ? `From ${formatDateDisplay(filters.dateStart)}`
                    : `Until ${formatDateDisplay(filters.dateEnd)}`}
                </span>
                <button
                  type="button"
                  onClick={() => handleDateChange('', '')}
                  className="hover:text-white p-0.5 text-blue-400 hover:bg-blue-500/30 rounded-full"
                  title="Remove date filter"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            )}

            {/* Active Substation Chip */}
            {filters.substation && (
              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] bg-slate-800 text-slate-300 border border-slate-700">
                <span>SS: {filters.substation}</span>
                <button
                  type="button"
                  onClick={() => setFilters(prev => ({ ...prev, substation: '' }))}
                  className="hover:text-white"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            )}

            {/* Active Status Chip */}
            {filters.status && (
              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] bg-slate-800 text-slate-300 border border-slate-700">
                <span>Status: {filters.status}</span>
                <button
                  type="button"
                  onClick={() => setFilters(prev => ({ ...prev, status: '' }))}
                  className="hover:text-white"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            )}
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="text-[11px] text-rose-400 hover:text-rose-300 underline font-medium cursor-pointer"
            >
              Clear all filters
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

