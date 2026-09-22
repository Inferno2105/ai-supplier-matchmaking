export default function EmptyState({ icon: Icon, title, description }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 py-12 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
        <Icon className="h-5 w-5 text-slate-400" />
      </div>
      <p className="mt-3 text-sm font-medium text-slate-700">{title}</p>
      {description && <p className="mt-1 max-w-xs text-xs text-slate-400">{description}</p>}
    </div>
  );
}
