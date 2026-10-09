import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Check, 
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { formatDateDisplay, parseToYMD } from '../utils/dateUtils';
import { InterruptionRecord } from '../types/interruption';

interface DateRangePickerProps {
  dateStart: string; // YYYY-MM-DD
  dateEnd: string;   // YYYY-MM-DD
  onChange: (dateStart: string, dateEnd: string) => void;
  records?: InterruptionRecord[];
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  dateStart,
  dateEnd,
  onChange,
  records = []
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Local draft state while popover is open
  const [tempStart, setTempStart] = useState<string>(dateStart);
  const [tempEnd, setTempEnd] = useState<string>(dateEnd);

  // Calendar month navigation (Default to September 2026, dataset month)
  const [currentYear, setCurrentYear] = useState<number>(2026);
  const [currentMonth, setCurrentMonth] = useState<number>(8); // 8 is September (0-indexed)

  // Sync temp dates when props change or popover opens
  useEffect(() => {
    setTempStart(dateStart);
    setTempEnd(dateEnd);
    if (dateStart) {
      const parts = dateStart.split('-');
      if (parts.length === 3) {
        setCurrentYear(parseInt(parts[0], 10));
        setCurrentMonth(parseInt(parts[1], 10) - 1);
      }
    } else {
      // Default to September 2026 for this dataset
      setCurrentYear(2026);
      setCurrentMonth(8);
    }
  }, [dateStart, dateEnd, isOpen]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Map of date string (YYYY-MM-DD) -> outage count in dataset
  const outageCountByDate = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of records) {
      const ymd = parseToYMD(r.dateOfInterruption);
      if (ymd) {
        map.set(ymd, (map.get(ymd) || 0) + 1);
      }
    }
    return map;
  }, [records]);

  // Count how many records match current temp filter
  const matchingCount = useMemo(() => {
    if (!tempStart && !tempEnd) return records.length;
    return records.filter(r => {
      const ymd = parseToYMD(r.dateOfInterruption);
      if (!ymd) return false;
      if (tempStart && ymd < tempStart) return false;
      if (tempEnd && ymd > tempEnd) return false;
      return true;
    }).length;
  }, [records, tempStart, tempEnd]);

  // Calendar generation for currentMonth / currentYear
  const calendarDays = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Sunday
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    const days: Array<{
      dayNum: number;
      ymd: string;
      isCurrentMonth: boolean;
      outageCount: number;
    }> = [];

    // Empty slots before first day
    for (let i = 0; i < firstDay; i++) {
      days.push({ dayNum: 0, ymd: '', isCurrentMonth: false, outageCount: 0 });
    }

    // Days of current month
    for (let day = 1; day <= daysInMonth; day++) {
      const mStr = String(currentMonth + 1).padStart(2, '0');
      const dStr = String(day).padStart(2, '0');
      const ymd = `${currentYear}-${mStr}-${dStr}`;
      const count = outageCountByDate.get(ymd) || 0;
      days.push({ dayNum: day, ymd, isCurrentMonth: true, outageCount: count });
    }

    return days;
  }, [currentYear, currentMonth, outageCountByDate]);

  // Handle clicking a day in the calendar
  const handleDayClick = (ymd: string) => {
    if (!ymd) return;

    if (!tempStart || (tempStart && tempEnd)) {
      // First click: sets Start date
      setTempStart(ymd);
      setTempEnd('');
    } else if (tempStart && !tempEnd) {
      // Second click: sets End date
      if (ymd < tempStart) {
        setTempStart(ymd);
        setTempEnd(tempStart);
      } else {
        setTempEnd(ymd);
      }
    }
  };

  const handleApply = () => {
    // If only start date is picked, use it for both or leave end open
    let finalStart = tempStart;
    let finalEnd = tempEnd;
    if (finalStart && finalEnd && finalStart > finalEnd) {
      const swap = finalStart;
      finalStart = finalEnd;
      finalEnd = swap;
    }
    onChange(finalStart, finalEnd);
    setIsOpen(false);
  };

  const handleClear = () => {
    setTempStart('');
    setTempEnd('');
    onChange('', '');
    setIsOpen(false);
  };

  const handleQuickPreset = (start: string, end: string) => {
    setTempStart(start);
    setTempEnd(end);
    onChange(start, end);
    setIsOpen(false);
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  const hasSelectedRange = Boolean(dateStart || dateEnd);

  // Trigger button label
  const displayLabel = useMemo(() => {
    if (dateStart && dateEnd) {
      if (dateStart === dateEnd) {
        return formatDateDisplay(dateStart);
      }
      return `${formatDateDisplay(dateStart)} – ${formatDateDisplay(dateEnd)}`;
    }
    if (dateStart) {
      return `From ${formatDateDisplay(dateStart)}`;
    }
    if (dateEnd) {
      return `Until ${formatDateDisplay(dateEnd)}`;
    }
    return 'Filter by Date Range';
  }, [dateStart, dateEnd]);

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      {/* Trigger Button */}
      <div className="flex items-center">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-medium border transition cursor-pointer ${
            hasSelectedRange
              ? 'bg-blue-600/20 text-blue-300 border-blue-500/50 shadow-sm'
              : 'bg-slate-950 text-slate-300 hover:text-white border-slate-700/80 hover:border-slate-600'
          }`}
          title="Filter by specific 'From' and 'To' dates"
        >
          <CalendarIcon className={`w-3.5 h-3.5 ${hasSelectedRange ? 'text-blue-400' : 'text-slate-400'}`} />
          <span className="font-medium whitespace-nowrap">{displayLabel}</span>
          {hasSelectedRange && (
            <span className="ml-1 w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
          )}
        </button>

        {/* Quick Clear 'X' on the button */}
        {hasSelectedRange && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleClear();
            }}
            title="Clear date range filter"
            className="ml-1 p-1 text-slate-400 hover:text-rose-400 rounded-md hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Popover Card */}
      {isOpen && (
        <div className="absolute left-0 sm:left-auto sm:right-0 mt-2 z-50 w-[340px] sm:w-[480px] bg-slate-900 border border-slate-700/90 rounded-2xl shadow-2xl p-4 sm:p-5 text-xs text-slate-200 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-md">
          {/* Popover Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <CalendarIcon className="w-4 h-4 text-blue-400" />
              <h4 className="font-bold text-white text-sm">Select Date Range</h4>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 text-slate-400 hover:text-white rounded-md hover:bg-slate-800 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* From & To Inputs Row */}
          <div className="grid grid-cols-2 gap-3 pt-3 pb-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                From Date
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={tempStart}
                  onChange={(e) => setTempStart(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>
              <span className="text-[10px] text-slate-500 mt-0.5 block truncate">
                {tempStart ? formatDateDisplay(tempStart) : 'No start date'}
              </span>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                To Date
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={tempEnd}
                  onChange={(e) => setTempEnd(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>
              <span className="text-[10px] text-slate-500 mt-0.5 block truncate">
                {tempEnd ? formatDateDisplay(tempEnd) : 'No end date'}
              </span>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="py-2 border-t border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1.5">
              Quick Presets (Dataset: September 2026)
            </span>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => handleQuickPreset('2026-09-01', '2026-09-30')}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[11px] font-medium border border-slate-700/80 transition cursor-pointer"
              >
                All Sep 2026
              </button>
              <button
                type="button"
                onClick={() => handleQuickPreset('2026-09-01', '2026-09-07')}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[11px] font-medium border border-slate-700/80 transition cursor-pointer"
              >
                Week 1 (Sep 1–7)
              </button>
              <button
                type="button"
                onClick={() => handleQuickPreset('2026-09-08', '2026-09-14')}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[11px] font-medium border border-slate-700/80 transition cursor-pointer"
              >
                Week 2 (Sep 8–14)
              </button>
              <button
                type="button"
                onClick={() => handleQuickPreset('2026-09-15', '2026-09-21')}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[11px] font-medium border border-slate-700/80 transition cursor-pointer"
              >
                Week 3 (Sep 15–21)
              </button>
              <button
                type="button"
                onClick={() => handleQuickPreset('2026-09-22', '2026-09-30')}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[11px] font-medium border border-slate-700/80 transition cursor-pointer"
              >
                Week 4 (Sep 22–30)
              </button>
            </div>
          </div>

          {/* Interactive Calendar Grid */}
          <div className="pt-2 border-t border-slate-800">
            {/* Month Navigation */}
            <div className="flex items-center justify-between py-1 mb-2">
              <span className="font-bold text-white text-xs">
                {monthNames[currentMonth]} {currentYear}
              </span>
              <div className="flex items-center space-x-1">
                <button
                  type="button"
                  onClick={prevMonth}
                  className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={nextMonth}
                  className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Weekday Labels */}
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-500 mb-1">
              <span>Su</span>
              <span>Mo</span>
              <span>Tu</span>
              <span>We</span>
              <span>Th</span>
              <span>Fr</span>
              <span>Sa</span>
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1 text-center">
              {calendarDays.map((d, index) => {
                if (!d.isCurrentMonth) {
                  return <div key={`empty-${index}`} className="h-8" />;
                }

                const isStart = tempStart === d.ymd;
                const isEnd = tempEnd === d.ymd;
                const isInRange = tempStart && tempEnd && d.ymd >= tempStart && d.ymd <= tempEnd;
                const hasOutages = d.outageCount > 0;

                return (
                  <button
                    key={d.ymd}
                    type="button"
                    onClick={() => handleDayClick(d.ymd)}
                    className={`h-8 rounded-md text-xs font-mono relative flex flex-col items-center justify-center transition cursor-pointer ${
                      isStart || isEnd
                        ? 'bg-blue-600 text-white font-bold shadow-md z-10'
                        : isInRange
                        ? 'bg-blue-600/30 text-blue-200'
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span>{d.dayNum}</span>
                    {hasOutages && (
                      <span className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
                        isStart || isEnd ? 'bg-amber-300' : 'bg-rose-400'
                      }`} title={`${d.outageCount} outages reported`} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 mt-3 border-t border-slate-800 flex items-center justify-between">
            <button
              type="button"
              onClick={handleClear}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition cursor-pointer"
            >
              Clear
            </button>

            <div className="flex items-center space-x-2">
              <span className="text-[11px] text-slate-400">
                Matches <strong className="text-white">{matchingCount}</strong> records
              </span>
              <button
                type="button"
                onClick={handleApply}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-md transition flex items-center space-x-1 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Apply Filter</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
