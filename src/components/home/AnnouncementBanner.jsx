import { Megaphone, X } from 'lucide-react';

export default function AnnouncementBanner({ announcement, onDismiss }) {
  if (!announcement) return null;

  const date = new Date(announcement.createdAtMs).toLocaleDateString('he-IL');

  return (
    <div className="rounded-2xl bg-brand-turquoise/10 border border-brand-turquoise/20 p-4 flex items-start gap-3">
      <Megaphone size={20} className="text-brand-turquoise shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-brand-text">{announcement.message}</p>
        <p className="text-xs text-brand-grey-text mt-1">
          {announcement.createdByName} · {date}
        </p>
      </div>
      <button onClick={onDismiss} className="text-brand-grey-text hover:text-brand-text shrink-0">
        <X size={18} />
      </button>
    </div>
  );
}
