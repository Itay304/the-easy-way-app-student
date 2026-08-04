export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function buildChoices(words, index) {
  const correct = words[index];
  const distractorPool = words.filter((_, i) => i !== index).map((w) => w.hebrewTranslation);
  const distractors = shuffle(distractorPool).slice(0, 3);
  return shuffle([correct.hebrewTranslation, ...distractors]);
}
