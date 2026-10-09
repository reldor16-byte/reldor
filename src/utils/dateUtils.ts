// Helper functions for date, time, and duration calculations

export function parseCustomDateTime(dateStr: string, timeStr: string): Date | null {
  if (!dateStr || !timeStr) return null;

  try {
    // Try standard Date parsing for "September 01, 2026"
    const cleanedDate = dateStr.trim();
    const cleanedTime = timeStr.trim();

    // Check if time is "HH:MM:SS" or "H:MM:SS" or "HH:MM"
    const timeParts = cleanedTime.split(':').map(p => parseInt(p, 10));
    const hours = timeParts[0] || 0;
    const minutes = timeParts[1] || 0;
    const seconds = timeParts[2] || 0;

    const baseDate = new Date(cleanedDate);
    if (isNaN(baseDate.getTime())) {
      // Try YYYY-MM-DD
      const isoDate = new Date(`${cleanedDate} ${cleanedTime}`);
      if (!isNaN(isoDate.getTime())) return isoDate;
      return null;
    }

    baseDate.setHours(hours, minutes, seconds, 0);
    return baseDate;
  } catch {
    return null;
  }
}

export function calculateDurationMinutes(
  startDateStr: string,
  startTimeStr: string,
  endDateStr: string | null,
  endTimeStr: string | null
): number | null {
  const start = parseCustomDateTime(startDateStr, startTimeStr);
  if (!start) return null;

  const end = (endDateStr && endTimeStr)
    ? parseCustomDateTime(endDateStr, endTimeStr)
    : new Date(); // If not ended, run up to now

  if (!end) return null;

  const diffMs = end.getTime() - start.getTime();
  if (diffMs < 0) return 0;
  return Math.round((diffMs / (1000 * 60)) * 100) / 100;
}

export function formatDurationHuman(minutes: number | null): string {
  if (minutes === null || minutes === undefined || isNaN(minutes)) return '—';
  if (minutes < 1) return `${Math.round(minutes * 60)}s`;
  if (minutes < 60) return `${minutes.toFixed(1)}m`;
  const hrs = Math.floor(minutes / 60);
  const remainingMins = Math.round(minutes % 60);
  if (hrs < 24) {
    return `${hrs}h ${remainingMins}m`;
  }
  const days = Math.floor(hrs / 24);
  const remHrs = hrs % 24;
  return `${days}d ${remHrs}h ${remainingMins}m`;
}

export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) return '—';
  return '₱' + Number(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

export function formatNumber(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return '—';
  return Number(val).toLocaleString('en-US');
}

export function formatKWh(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return '—';
  return Number(val).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }) + ' kWh';
}

export function parseToYMD(val: string | Date | null | undefined): string | null {
  if (!val) return null;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    // Check if it's already YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }
  }
  const d = new Date(val);
  if (isNaN(d.getTime())) return null;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDateDisplay(ymd: string | null | undefined): string {
  if (!ymd) return '';
  const parts = ymd.split('-');
  if (parts.length === 3) {
    const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  }
  return ymd;
}

export function getCurrentDateFormatted(): string {
  return new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: '2-digit',
    year: 'numeric'
  });
}

export function getCurrentTimeFormatted(): string {
  const now = new Date();
  const hrs = String(now.getHours()).padStart(2, '0');
  const mins = String(now.getMinutes()).padStart(2, '0');
  const secs = String(now.getSeconds()).padStart(2, '0');
  return `${hrs}:${mins}:${secs}`;
}
