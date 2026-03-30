export const formatDate = (dateStr) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

export const formatDateTime = (dateStr) => {
  const d = new Date(dateStr);
  return d.toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export const formatTime = (dateStr) => {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
};

export const timeAgo = (dateStr) => {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return formatDate(dateStr);
};

export const getInitials = (name) => {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
};

export const statusColor = (status) => {
  const map = {
    pending: 'yellow', confirmed: 'green', completed: 'cyan', cancelled: 'red',
    open: 'yellow', in_progress: 'purple', resolved: 'green', closed: 'gray',
    submitted: 'yellow', under_review: 'purple', evaluated: 'green', returned: 'red',
    draft: 'gray', published: 'green', archived: 'gray',
    applied: 'yellow', shortlisted: 'cyan', rejected: 'red', hired: 'green',
    low: 'green', medium: 'yellow', high: 'red', urgent: 'pink',
    full_time: 'green', part_time: 'cyan', internship: 'purple', contract: 'yellow',
  };
  return map[status] || 'gray';
};
