import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { BAND_DEFINITIONS } from '../../lib/bands.js';
import { getWordListsMeta, getWordsForList } from '../../lib/api.js';
import { isMastered } from '../../lib/gamification.js';
import { predictCompletionDays } from '../../lib/completionPrediction.js';
import { Skeleton } from '../Skeleton.jsx';

function computeBandStats(band, allProgress, wordCountByList) {
  const total = band.listIds.reduce((sum, id) => sum + (wordCountByList.get(id) || 0), 0);
  const mastered = allProgress.filter(
    (p) => band.listIds.includes(p.sourceListId) && isMastered(p.correctAttempts || 0, p.totalAttempts || 0),
  ).length;
  return { total, mastered };
}

function BandRow({ band, allProgress, wordCountByList }) {
  const [expanded, setExpanded] = useState(false);
  const [remainingWords, setRemainingWords] = useState(null);

  const { total, mastered } = computeBandStats(band, allProgress, wordCountByList);
  const pct = total > 0 ? Math.round((mastered / total) * 100) : 0;
  const prediction = predictCompletionDays({ total, mastered, progressDocs: allProgress }, band.listIds);

  async function toggleExpand() {
    if (expanded) {
      setExpanded(false);
      return;
    }
    setExpanded(true);
    if (remainingWords !== null) return;
    const listsWords = await Promise.all(band.listIds.map((id) => getWordsForList(id)));
    const masteredKeys = new Set(
      allProgress
        .filter((p) => isMastered(p.correctAttempts || 0, p.totalAttempts || 0))
        .map((p) => `${p.sourceListId}::${p.englishWord}`),
    );
    const remaining = listsWords.flat().filter((w) => !masteredKeys.has(`${w.sourceListId}::${w.englishWord}`));
    setRemainingWords(remaining);
  }

  return (
    <div className="py-3 border-b border-black/5 last:border-0">
      <button onClick={toggleExpand} className="w-full flex items-center justify-between gap-3 text-right">
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="font-semibold text-brand-text">{band.label}</span>
            <span className="text-sm text-brand-grey-text">
              {mastered}/{total} ({pct}%)
            </span>
          </div>
          <div className="h-2 rounded-full bg-brand-grey-light overflow-hidden">
            <div className="h-full bg-brand-turquoise rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
          {prediction.remaining > 0 && prediction.daysEstimate !== null && (
            <p className="text-xs text-brand-grey-text mt-1">
              בקצב הנוכחי תסיים/י את {band.label} בעוד כ-{prediction.daysEstimate} ימים 🔮
            </p>
          )}
          {prediction.remaining > 0 && prediction.daysEstimate === null && (
            <p className="text-xs text-brand-grey-text mt-1">תרגל/י כל יום כדי לראות חיזוי 🔮</p>
          )}
        </div>
        {expanded ? (
          <ChevronUp size={18} className="text-brand-grey-text shrink-0" />
        ) : (
          <ChevronDown size={18} className="text-brand-grey-text shrink-0" />
        )}
      </button>

      {expanded && (
        <div className="mt-3 space-y-1.5 max-h-56 overflow-y-auto">
          {remainingWords === null && <Skeleton className="h-4 w-full" />}
          {remainingWords !== null && remainingWords.length === 0 && (
            <p className="text-sm text-brand-green font-semibold">כבשת את כל המילים בבאנד הזה! 🎉</p>
          )}
          {remainingWords !== null &&
            remainingWords.map((w) => (
              <div key={`${w.sourceListId}::${w.id}`} className="flex items-center justify-between text-sm">
                <span dir="ltr" className="text-brand-text font-medium">
                  {w.englishWord}
                </span>
                <span className="text-brand-grey-text">{w.hebrewTranslation}</span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

export default function BandProgress({ allProgress }) {
  const [wordCountByList, setWordCountByList] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const allListIds = BAND_DEFINITIONS.flatMap((b) => b.listIds);
    getWordListsMeta(allListIds).then((metas) => {
      if (cancelled) return;
      setWordCountByList(new Map(metas.map((m) => [m.id, m.wordCount || 0])));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="rounded-2xl bg-white shadow-md p-5">
      <h2 className="text-lg font-bold text-brand-text mb-1">התקדמות לפי באנד 📊</h2>
      {wordCountByList === null ? (
        <div className="space-y-3 pt-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : (
        <div>
          {BAND_DEFINITIONS.map((band) => (
            <BandRow key={band.id} band={band} allProgress={allProgress} wordCountByList={wordCountByList} />
          ))}
        </div>
      )}
    </div>
  );
}
