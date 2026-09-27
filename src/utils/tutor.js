export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const DAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DOW_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const initials = (name = '') =>
  name.trim().split(/\s+/).map(p => p[0]).join('').slice(0, 2).toUpperCase() || '?';

// Local YYYY-MM-DD (avoids the UTC shift of toISOString)
export const toISO = (d) => {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
};

export const fromISO = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const weekdayOf = (iso) => DOW_LONG[fromISO(iso).getDay()];

export const formatDate = (iso) => {
  if (!iso) return '';
  return fromISO(iso).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
};

export const isPast = (iso) => iso < toISO(new Date());

// "Class 9–10" for contiguous ranges, otherwise "Class 3, 5, 8"
export const classRange = (levels = []) => {
  const nums = levels.map(l => parseInt(String(l).replace(/\D/g, ''), 10)).filter(n => !isNaN(n)).sort((a, b) => a - b);
  if (nums.length === 0) return 'No classes listed';
  if (nums.length === 1) return `Class ${nums[0]}`;
  const contiguous = nums.every((n, i) => i === 0 || n === nums[i - 1] + 1);
  return contiguous ? `Class ${nums[0]}–${nums[nums.length - 1]}` : `Class ${nums.join(', ')}`;
};

const sortedSlots = (slots = []) => [...slots].sort((a, b) => a.start.localeCompare(b.start));

// Morning (<12:00) / Afternoon (<16:00) / Evening rows × Mon..Sun
export const availabilityGrid = (availability = {}) => {
  const rows = [
    { label: 'Morning', test: h => h < 12 },
    { label: 'Afternoon', test: h => h >= 12 && h < 16 },
    { label: 'Evening', test: h => h >= 16 }
  ];
  return rows.map(r => ({
    label: r.label,
    cells: DAYS.map(day => (availability[day] || []).some(s => r.test(parseInt(s.start, 10))))
  }));
};

export const availabilityTags = (availability = {}) => {
  const weekdayEvenings = DAYS.slice(0, 5).some(d => (availability[d] || []).some(s => parseInt(s.start, 10) >= 16));
  const weekends = ['Saturday', 'Sunday'].some(d => (availability[d] || []).length > 0);
  return { weekdayEvenings, weekends };
};

// Next N open slots from today (does not know about bookings)
export const nextOpenSlots = (availability = {}, count = 3, days = 14) => {
  const out = [];
  const now = new Date();
  for (let i = 0; i < days && out.length < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    const iso = toISO(d);
    const slots = sortedSlots(availability[DOW_LONG[d.getDay()]]);
    const nowHM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    for (const s of slots) {
      if (out.length >= count) break;
      if (i === 0 && s.start <= nowHM) continue;
      out.push({ iso, start: s.start, end: s.end, label: i === 0 ? 'Today' : d.toLocaleDateString('en-IN', { weekday: 'short' }) });
    }
  }
  return out;
};

export const slotsFor = (availability = {}, iso) => sortedSlots(availability[weekdayOf(iso)]);

export const overlaps = (slot, booked = []) => booked.some(b => slot.start < b.end && slot.end > b.start);
