/**
 * Group a design-file length report the way a designer reads it.
 * Real translations come from the repo flats. Estimates are labeled.
 */
const checker = require('./checker');

function indexEnglish(enFlat) {
  const index = new Map();
  Object.keys(enFlat || {}).forEach((key) => {
    const usable = shipMatchKey(enFlat[key]);
    if (!usable) return;
    if (!index.has(usable)) index.set(usable, []);
    index.get(usable).push(key);
  });
  return index;
}

function shipMatchKey(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return null;
  if (checker.characterCount(trimmed) < 3) return null;
  if (!/[\p{L}\p{N}]/u.test(trimmed)) return null;
  return trimmed;
}

function realTranslations(source, index, sharedFlats, langs) {
  const usable = shipMatchKey(source);
  if (!usable) return null;
  const keys = index.get(usable) || [];
  if (keys.length === 0) return null;
  const perLang = {};
  langs.forEach((lang) => {
    let best = null;
    keys.forEach((key) => {
      const value = sharedFlats[lang] && sharedFlats[lang][key];
      if (typeof value !== 'string') return;
      const characters = checker.characterCount(value);
      if (!best || characters >= best.characters) {
        best = { text: value, characters, over10: characters > 10, key };
      }
    });
    perLang[lang] = best;
  });
  return { keyCount: keys.length, perLang };
}

function textOverLimit(text, row) {
  if (typeof row.maxUnits === 'number') return checker.displayWidth(text) > row.maxUnits;
  const limit = row.maxCharacters || 10;
  return checker.characterCount(text) > limit;
}

function buildBreakReport(lengths, options) {
  const langs = options.langs || [];
  const shared = options.sharedFlats || {};
  const index = indexEnglish(shared.en || {});
  const buttons = (lengths || []).filter(
    (row) => row.bucket === 'button' || row.bucket === 'tab',
  );
  const alreadyOver = [];
  const breaks = [];
  const atRisk = [];
  const fits = [];

  buttons.forEach((row) => {
    const limit = row.maxCharacters || 10;
    const real = realTranslations(row.source, index, shared, langs);
    const expected = real
      ? Math.max(...langs.map((lang) => (real.perLang[lang] ? real.perLang[lang].characters : 0)))
      : Math.ceil(row.characters * 1.4);
    const item = {
      ...row,
      expected,
      basis: real ? 'real' : 'estimate',
      real,
    };
    if (textOverLimit(row.source, row)) {
      alreadyOver.push(item);
      return;
    }
    if (real && langs.some((lang) => real.perLang[lang] && textOverLimit(real.perLang[lang].text, row))) {
      breaks.push(item);
      return;
    }
    if (!real && expected > limit) {
      atRisk.push(item);
      return;
    }
    fits.push(item);
  });

  const byExpected = (a, b) => b.expected - a.expected || b.characters - a.characters;
  alreadyOver.sort(byExpected);
  breaks.sort(byExpected);
  atRisk.sort(byExpected);
  return { alreadyOver, breaks, atRisk, fits };
}

module.exports = {
  buildBreakReport,
  realTranslations,
  shipMatchKey,
};
