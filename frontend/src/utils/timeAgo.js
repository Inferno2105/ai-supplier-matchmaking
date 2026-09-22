const UNITS = [
  { limit: 60, divisor: 1, label: "s" },
  { limit: 3600, divisor: 60, label: "m" },
  { limit: 86400, divisor: 3600, label: "h" },
  { limit: 2592000, divisor: 86400, label: "d" },
];

export function timeAgo(isoTimestamp) {
  const seconds = Math.floor((Date.now() - new Date(isoTimestamp).getTime()) / 1000);
  if (seconds < 5) return "just now";
  for (const { limit, divisor, label } of UNITS) {
    if (seconds < limit) return `${Math.floor(seconds / divisor)}${label} ago`;
  }
  return new Date(isoTimestamp).toLocaleDateString();
}
