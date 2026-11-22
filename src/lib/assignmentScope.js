// מילות משימה ממקורות מרובים (assignments-v2) — פונקציות טהורות (נבדקות ב-assignmentScope.test.js).

// המקורות של המשימה: assignment.sources, ובמשימה ישנה — listId/listSource בלבד
export function assignmentSources(assignment) {
  return Array.isArray(assignment.sources) && assignment.sources.length > 0
    ? assignment.sources
    : [{ listId: assignment.listId, listSource: assignment.listSource }];
}

// מילות המשימה מתוך כל המילים של המקורות שלה. עם wordListIds — לפי הזוג (רשימה, מזהה), כך שמזהה זהה
// בשתי רשימות לא נכנס פעמיים; משימה ישנה — לפי wordIds בלבד; בלי wordIds — הכל.
export function scopeToAssignment(allWords, assignment) {
  const ids = assignment.wordIds || [];
  if (ids.length === 0) return allWords;
  const lists = assignment.wordListIds;
  if (Array.isArray(lists) && lists.length === ids.length) {
    const wanted = new Set(ids.map((id, i) => `${lists[i]}/${id}`));
    return allWords.filter((w) => wanted.has(`${w.sourceListId}/${w.id}`));
  }
  const wanted = new Set(ids);
  return allWords.filter((w) => wanted.has(w.id));
}
