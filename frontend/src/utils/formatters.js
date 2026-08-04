/**
 * Utility functions for relative time formatting and color-coded status badges.
 */

export function formatRelativeTime(isoString) {
  if (!isoString) return 'No runs yet';
  
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return isoString;

  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 10) return 'Just now';
  if (diffInSeconds < 60) return `${diffInSeconds}s ago`;

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) return `${diffInDays}d ago`;

  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function formatAbsoluteDate(isoString) {
  if (!isoString) return 'N/A';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return isoString;
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
}

export function getStateBadgeConfig(state) {
  const normalized = (state || 'none').toLowerCase();

  switch (normalized) {
    case 'success':
      return {
        label: 'Success',
        bgClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
        dotClass: 'bg-emerald-500',
        pulse: false
      };
    case 'running':
      return {
        label: 'Running',
        bgClass: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
        dotClass: 'bg-sky-500 animate-pulse',
        pulse: true
      };
    case 'failed':
    case 'upstream_failed':
      return {
        label: 'Failed',
        bgClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
        dotClass: 'bg-rose-500',
        pulse: false
      };
    case 'queued':
    case 'scheduled':
      return {
        label: 'Queued',
        bgClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
        dotClass: 'bg-amber-500 animate-ping',
        pulse: false
      };
    default:
      return {
        label: 'No Runs',
        bgClass: 'bg-slate-500/10 text-slate-500 dark:text-slate-400 border-slate-500/20',
        dotClass: 'bg-slate-400',
        pulse: false
      };
  }
}
