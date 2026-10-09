import React, { useMemo } from 'react';
import { 
  Zap, 
  AlertTriangle, 
  CheckCircle2, 
  CalendarClock, 
  Users, 
  Clock, 
  Coins, 
  TrendingUp, 
  Activity,
  Layers,
  Wrench,
  CloudSun,
  Flame
} from 'lucide-react';
import { useRecords } from '../context/RecordsContext';
import { formatCurrency, formatKWh, formatNumber, formatDurationHuman } from '../utils/dateUtils';

export const AnalyticsView: React.FC = () => {
  const { 
    filteredRecords, 
    activeIncidentsCount, 
    resolvedIncidentsCount, 
    scheduledIncidentsCount,
    totalConsumersAffected,
    totalKwHrLoss,
    totalRevenueLoss,
    avgDurationMinutes,
    referenceTables,
    translateCause,
    translateSubstation,
    translateEquipment
  } = useRecords();

  const totalCount = filteredRecords.length;

  // Causes breakdown
  const causeStats = useMemo(() => {
    const map = new Map<string, { code: string; count: number; consumers: number; kwh: number; rev: number }>();
    for (const r of filteredRecords) {
      const code = r.causeCode || 'Unknown';
      const existing = map.get(code) || { code, count: 0, consumers: 0, kwh: 0, rev: 0 };
      existing.count += 1;
      existing.consumers += r.affectedConsumers || 0;
      existing.kwh += r.estimatedKwHrLoss || 0;
      existing.rev += r.estimatedRevenueLoss || 0;
      map.set(code, existing);
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [filteredRecords]);

  // Substation breakdown
  const substationStats = useMemo(() => {
    const map = new Map<string, { code: string; count: number; consumers: number; active: number; rev: number }>();
    for (const r of filteredRecords) {
      const ss = r.substation || 'Unknown';
      const existing = map.get(ss) || { code: ss, count: 0, consumers: 0, active: 0, rev: 0 };
      existing.count += 1;
      existing.consumers += r.affectedConsumers || 0;
      if (r.status === 'Active') existing.active += 1;
      existing.rev += r.estimatedRevenueLoss || 0;
      map.set(ss, existing);
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [filteredRecords]);

  // Equipment failed breakdown
  const equipmentStats = useMemo(() => {
    const map = new Map<string, { code: string; count: number }>();
    for (const r of filteredRecords) {
      const eq = r.equipmentFailedCode || 'None';
      const existing = map.get(eq) || { code: eq, count: 0 };
      existing.count += 1;
      map.set(eq, existing);
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [filteredRecords]);

  // Interruption Type breakdown
  const typeStats = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of filteredRecords) {
      const t = r.interruptionType || 'Other';
      map.set(t, (map.get(t) || 0) + 1);
    }
    return Array.from(map.entries()).map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count);
  }, [filteredRecords]);

  // Daily Trends (chronological grouping by Date of Interruption)
  const dailyTrends = useMemo(() => {
    const map = new Map<string, { date: string; count: number; consumers: number; active: number }>();
    for (const r of filteredRecords) {
      const d = r.dateOfInterruption || 'Unknown';
      const existing = map.get(d) || { date: d, count: 0, consumers: 0, active: 0 };
      existing.count += 1;
      existing.consumers += r.affectedConsumers || 0;
      if (r.status === 'Active') existing.active += 1;
      map.set(d, existing);
    }

    // Sort by parsed date
    return Array.from(map.values()).sort((a, b) => {
      const tA = new Date(a.date).getTime();
      const tB = new Date(b.date).getTime();
      return (isNaN(tA) ? 0 : tA) - (isNaN(tB) ? 0 : tB);
    });
  }, [filteredRecords]);

  const maxDailyCount = useMemo(() => {
    return Math.max(...dailyTrends.map(d => d.count), 1);
  }, [dailyTrends]);

  return (
    <div className="space-y-6">
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Total Outages */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm hover:border-slate-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Incidents</span>
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-white tracking-tight">{formatNumber(totalCount)}</span>
            <span className="text-[11px] text-slate-400 font-medium">100%</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between border-t border-slate-800/80 pt-2">
            <span>Resolv: <strong className="text-emerald-400">{resolvedIncidentsCount}</strong></span>
            <span>Active: <strong className="text-rose-400">{activeIncidentsCount}</strong></span>
          </div>
        </div>

        {/* Active Outages */}
        <div className={`bg-slate-900 border rounded-xl p-4 shadow-sm transition ${
          activeIncidentsCount > 0 ? 'border-rose-500/40 bg-rose-950/10' : 'border-slate-800'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-rose-300">Active Outages</span>
            <div className="p-2 bg-rose-500/10 text-rose-400 rounded-lg">
              <AlertTriangle className={`w-4 h-4 ${activeIncidentsCount > 0 ? 'animate-pulse' : ''}`} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-rose-400 tracking-tight">{formatNumber(activeIncidentsCount)}</span>
            <span className="text-[11px] text-rose-300/80 font-medium">
              {totalCount > 0 ? ((activeIncidentsCount / totalCount) * 100).toFixed(1) + '%' : '0%'}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between border-t border-slate-800/80 pt-2">
            <span>Live Timers Ticking</span>
            <span className="text-rose-400 font-semibold">Unresolved</span>
          </div>
        </div>

        {/* Restored Outages */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm hover:border-slate-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Restored Incidents</span>
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-emerald-400 tracking-tight">{formatNumber(resolvedIncidentsCount)}</span>
            <span className="text-[11px] text-emerald-400/80 font-medium">
              {totalCount > 0 ? ((resolvedIncidentsCount / totalCount) * 100).toFixed(1) + '%' : '0%'}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between border-t border-slate-800/80 pt-2">
            <span>Sched: <strong className="text-amber-400">{scheduledIncidentsCount}</strong></span>
            <span className="text-emerald-400">Energized</span>
          </div>
        </div>

        {/* Affected Consumers */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm hover:border-slate-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Affected Consumers</span>
            <div className="p-2 bg-purple-500/10 text-purple-400 rounded-lg">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-white tracking-tight">{formatNumber(totalConsumersAffected)}</span>
            <span className="text-[11px] text-purple-300 font-medium">MCOs</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between border-t border-slate-800/80 pt-2">
            <span>Avg / Outage:</span>
            <strong className="text-slate-200">
              {totalCount > 0 ? Math.round(totalConsumersAffected / totalCount) : 0}
            </strong>
          </div>
        </div>

        {/* Restoration Duration */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm hover:border-slate-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Avg Duration</span>
            <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-lg">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-cyan-300 tracking-tight">{avgDurationMinutes.toFixed(1)}m</span>
            <span className="text-[11px] text-cyan-400/80 font-medium">{formatDurationHuman(avgDurationMinutes)}</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between border-t border-slate-800/80 pt-2">
            <span>MTTR Indicator</span>
            <span className="text-slate-300 font-mono">{(avgDurationMinutes / 60).toFixed(2)}h</span>
          </div>
        </div>

        {/* Estimated Losses */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm hover:border-slate-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Estimated Rev Loss</span>
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-lg font-bold text-amber-300 tracking-tight block truncate">
              {formatCurrency(totalRevenueLoss)}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between border-t border-slate-800/80 pt-2">
            <span>kWh Loss:</span>
            <strong className="text-slate-200">{formatNumber(Math.round(totalKwHrLoss))}</strong>
          </div>
        </div>
      </div>

      {/* Row 2: Causes Breakdown & Daily Interruption Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Cause Breakdown (7 columns) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-400" />
                Interruption Causes Breakdown
              </h3>
              <p className="text-xs text-slate-400">Distribution by primary root cause code & impact metrics</p>
            </div>
            <span className="text-xs font-medium bg-slate-800 text-slate-300 px-2 py-1 rounded">
              {causeStats.length} Unique Causes
            </span>
          </div>

          <div className="space-y-3.5">
            {causeStats.map((item) => {
              const pct = totalCount > 0 ? (item.count / totalCount) * 100 : 0;
              const causeText = translateCause(item.code);
              return (
                <div key={item.code} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-200 truncate max-w-[280px] sm:max-w-[380px]" title={causeText}>
                      {causeText}
                    </span>
                    <div className="flex items-center space-x-3 text-slate-400 text-[11px]">
                      <span><strong className="text-white">{item.count}</strong> incidents</span>
                      <span>({pct.toFixed(1)}%)</span>
                      <span className="hidden sm:inline font-mono text-amber-400/90">{formatCurrency(item.rev)}</span>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${
                        item.code === '011' ? 'bg-slate-400' :
                        item.code === '002' ? 'bg-yellow-400' :
                        item.code === '010' ? 'bg-orange-400' :
                        item.code === '009' ? 'bg-blue-400' :
                        item.code === '005' ? 'bg-emerald-400' :
                        item.code === '008' ? 'bg-red-500' :
                        item.code === '004' ? 'bg-indigo-400' : 'bg-cyan-400'
                      }`}
                      style={{ width: `${Math.max(pct, 2)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Daily Interruption Trend Timeline (5 columns) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-400" />
                  Monthly Incident Timeline
                </h3>
                <p className="text-xs text-slate-400">Incident frequency across September 2026</p>
              </div>
            </div>

            {/* Daily Bars */}
            <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
              {dailyTrends.map((d) => {
                const ratio = (d.count / maxDailyCount) * 100;
                // shorten date e.g. "September 01, 2026" -> "Sept 01"
                const shortDate = d.date.replace('September ', 'Sep ').replace(', 2026', '');
                return (
                  <div key={d.date} className="flex items-center text-xs space-x-2">
                    <span className="w-16 font-mono text-slate-400 text-[11px] shrink-0">{shortDate}</span>
                    <div className="flex-1 bg-slate-800 rounded h-4 overflow-hidden relative">
                      <div
                        className={`h-4 rounded transition-all duration-300 ${
                          d.active > 0 ? 'bg-rose-500/80' : 'bg-blue-600/80'
                        }`}
                        style={{ width: `${Math.max(ratio, 4)}%` }}
                      />
                    </div>
                    <span className="w-12 text-right font-medium text-slate-200 text-[11px] shrink-0">
                      {d.count} {d.active > 0 && <span className="text-rose-400 text-[10px]">({d.active} act)</span>}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-blue-600 inline-block"></span> Resolved
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-rose-500 inline-block"></span> Contains Active
            </span>
            <span className="text-slate-300 font-semibold">{dailyTrends.length} Reporting Days</span>
          </div>
        </div>
      </div>

      {/* Row 3: Substation Distribution, Equipment Failure, and Classification */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Substation Outage Statistics */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-400" />
              Substations (SS)
            </h3>
            <span className="text-xs text-slate-400">{substationStats.length} Substations</span>
          </div>
          <div className="space-y-3">
            {substationStats.map((ss) => {
              const ssName = translateSubstation(ss.code);
              return (
                <div key={ss.code} className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-800/80 flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-white text-xs">{ss.code}</span>
                      {ss.active > 0 && (
                        <span className="text-[10px] bg-rose-500/20 text-rose-300 font-semibold px-1.5 py-0.2 rounded border border-rose-500/30">
                          {ss.active} Active
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400 truncate block max-w-[170px]" title={ssName}>
                      {ssName}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-slate-200 block">{ss.count} outages</span>
                    <span className="text-[10px] text-slate-400">{formatNumber(ss.consumers)} consumers</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Equipment Failed Distribution */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Wrench className="w-4 h-4 text-emerald-400" />
              Equipment Failed
            </h3>
            <span className="text-xs text-slate-400">{equipmentStats.length} Types</span>
          </div>
          <div className="space-y-2.5">
            {equipmentStats.map((eq) => {
              const eqDesc = translateEquipment(eq.code);
              const pct = totalCount > 0 ? (eq.count / totalCount) * 100 : 0;
              return (
                <div key={eq.code} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 truncate max-w-[200px]" title={eqDesc}>
                      {eqDesc}
                    </span>
                    <span className="text-slate-400 font-medium text-[11px]">
                      {eq.count} <span className="text-slate-500">({pct.toFixed(1)}%)</span>
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-1.5 rounded-full bg-emerald-500"
                      style={{ width: `${Math.max(pct, 2)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Classification / Interruption Type */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-400" />
              Interruption Classification
            </h3>
            <span className="text-xs text-slate-400">Lateral / Block / Backbone</span>
          </div>
          <div className="space-y-3">
            {typeStats.map((t) => {
              const pct = totalCount > 0 ? (t.count / totalCount) * 100 : 0;
              return (
                <div key={t.type} className="p-3 bg-slate-950/60 rounded-lg border border-slate-800/80">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-semibold text-white">{t.type}</span>
                    <span className="text-purple-300 font-mono font-bold">
                      {t.count} ({pct.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-2 rounded-full bg-purple-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
