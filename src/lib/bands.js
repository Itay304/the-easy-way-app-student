// מיפוי "באנד" → רשימות word_lists שמרכיבות אותו. אין לכך מבנה נתונים
// ב-Firestore (כל word_lists doc הוא יחידה עצמאית, ר' admin-tool/server.js) —
// זהו מיפוי ידני קבוע, לא נגזר מהשם.
export const BAND_DEFINITIONS = [
  { id: 'pre_band_1', label: 'Pre-Band 1', listIds: ['Pre_Band_1'] },
  { id: 'band_1', label: 'Band 1', listIds: ['Band_1_Core_1', 'Band_1_Core_2'] },
  { id: 'band_2', label: 'Band 2', listIds: ['band_2_full_list'] },
  { id: 'band_3', label: 'Band 3', listIds: ['Band_3'] },
  { id: 'chunks', label: 'ביטויים', listIds: ['chunks'] },
];
