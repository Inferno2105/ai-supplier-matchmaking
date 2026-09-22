const STATUS_STYLES = {
  proposed: "bg-amber-100 text-amber-800 border-amber-300",
  accepted: "bg-emerald-100 text-emerald-800 border-emerald-300",
  declined: "bg-rose-100 text-rose-800 border-rose-300",
};

export default function InterestStatusBadge({ status }) {
  const classes = STATUS_STYLES[status] ?? STATUS_STYLES.proposed;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium capitalize ${classes}`}
    >
      {status}
    </span>
  );
}
