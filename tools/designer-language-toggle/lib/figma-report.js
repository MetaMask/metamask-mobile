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

function lookupKeys(source, row, index) {
  const candidates = [];
  if (row && row.copyText) candidates.push(row.copyText);
  candidates.push(source);
  if (row && row.example && row.example !== source) candidates.push(row.example);
  if (row && row.template) candidates.push(row.template);
  for (let i = 0; i < candidates.length; i += 1) {
    const usable = shipMatchKey(candidates[i]);
    if (!usable) continue;
    const keys = index.get(usable) || [];
    if (keys.length > 0) return { matched: candidates[i], keys };
  }
  return { matched: null, keys: [] };
}

function hintsFor(row, options) {
  const hints = new Set();
  const extra = Array.isArray(options.context)
    ? options.context
    : String(options.context || '').split(',');
  extra.forEach((hint) => {
    const token = String(hint || '').trim().toLowerCase();
    if (token) hints.add(token);
  });
  const blob = `${row.framePath || ''} ${(row.screens || []).join(' ')} ${row.feature || ''}`.toLowerCase();
  const map = options.contextHints || {};
  Object.keys(map).forEach((feature) => {
    const words = Array.isArray(map[feature]) ? map[feature] : [map[feature]];
    if (words.some((word) => word && blob.includes(String(word).toLowerCase()))) {
      hints.add(String(feature).toLowerCase());
    }
  });
  return [...hints];
}

function keyMatchesHint(key, hints) {
  const lower = String(key || '').toLowerCase();
  return hints.some((hint) => {
    const token = String(hint).toLowerCase();
    return lower === token || lower.startsWith(`${token}.`) || lower.includes(`.${token}.`) || lower.endsWith(`.${token}`);
  });
}

function composedCharacters(copyValue, row) {
  if (!row || !row.copyText) return checker.characterCount(copyValue);
  return checker.characterCount(copyValue) + (row.dataCharacters || 0) + (row.gapCharacters || 0);
}

function composedUnits(copyValue, row) {
  if (!row || !row.copyText) return checker.displayWidth(copyValue);
  return checker.displayWidth(copyValue) + (row.dataCharacters || 0) + (row.gapCharacters || 0);
}

function estimateSize(row, ratio) {
  const growth = ratio || 1.4;
  if (row && row.copyText) {
    const copy = checker.characterCount(row.copyText);
    const extra = (row.dataCharacters || 0) + (row.gapCharacters || 0);
    const grownUnits = Math.round(copy * growth * 10) / 10;
    return { characters: Math.ceil(copy * growth) + extra, units: grownUnits + extra };
  }
  const exact = (row.characters || 0) * growth;
  return { characters: Math.ceil(exact), units: Math.round(exact * 10) / 10 };
}

function valueOver(characters, units, row) {
  if (typeof row.maxUnits === 'number') return units > row.maxUnits;
  const limit = row.maxCharacters || 10;
  return characters > limit;
}

function realTranslations(source, index, sharedFlats, langs, row, options) {
  const found = lookupKeys(source, row, index);
  if (found.keys.length === 0) return null;
  const hints = hintsFor(row || {}, options || {});
  const preferred = found.keys.filter((key) => keyMatchesHint(key, hints));
  const pool = preferred.length > 0 ? preferred : found.keys;
  const ratio = options && options.ratio;
  const perLang = {};
  langs.forEach((lang) => {
    const hits = [];
    pool.forEach((key) => {
      const value = sharedFlats[lang] && sharedFlats[lang][key];
      if (typeof value !== 'string' || value.trim() === '') return;
      hits.push({
        key,
        text: value,
        characters: composedCharacters(value, row),
        units: composedUnits(value, row),
      });
    });
    if (hits.length === 0) {
      const estimate = estimateSize(row || { characters: checker.characterCount(source) }, ratio);
      perLang[lang] = {
        text: null,
        characters: estimate.characters,
        units: estimate.units,
        over10: estimate.characters > 10,
        key: pool.length === 1 ? pool[0] : null,
        keys: pool,
        keyCount: pool.length,
        basis: 'estimate',
        missing: true,
      };
      return;
    }
    const distinct = [...new Set(hits.map((item) => item.text))];
    if (distinct.length === 1) {
      const chosen = hits[0];
      perLang[lang] = {
        text: chosen.text,
        characters: chosen.characters,
        units: chosen.units,
        over10: chosen.characters > 10,
        key: chosen.key,
        keys: hits.map((item) => item.key),
        keyCount: hits.length,
        basis: 'real',
        missing: false,
      };
      return;
    }
    const best = hits.reduce((min, item) => (item.units < min.units ? item : min));
    const worst = hits.reduce((max, item) => (item.units > max.units ? item : max));
    perLang[lang] = {
      text: null,
      characters: best.characters,
      units: best.units,
      minCharacters: best.characters,
      maxCharacters: worst.characters,
      minText: best.text,
      maxText: worst.text,
      over10: worst.characters > 10,
      key: null,
      keys: hits.map((item) => item.key),
      keyCount: hits.length,
      basis: 'range',
      missing: false,
      shortestOver: valueOver(best.characters, best.units, row || {}),
      someOver: hits.some((item) => valueOver(item.characters, item.units, row || {})),
    };
  });
  const chosenKey = pool.length === 1 ? pool[0] : null;
  return {
    keyCount: pool.length,
    matchedKeys: pool,
    chosenKey,
    matchedOn: found.matched,
    perLang,
  };
}

function textOverLimit(text, row) {
  if (typeof row.maxUnits === 'number') return checker.displayWidth(text) > row.maxUnits;
  const limit = row.maxCharacters || 10;
  return checker.characterCount(text) > limit;
}

function labelIssue(units, row) {
  if (typeof row.maxUnits !== 'number' && row.maxCharacters == null) return null;
  const boxLines = Math.max(row.lineCount || row.maxLines || 1, 1);
  if (row.layout === 'wrap') {
    const perLine = Math.max(row.widthHint || 1, 1);
    let linesNeeded = Math.ceil(units / perLine);
    if (typeof row.maxUnits === 'number' && units <= row.maxUnits) {
      linesNeeded = Math.min(linesNeeded, 1);
    }
    if (linesNeeded > boxLines) {
      return {
        issue: 'wrap',
        detail: `wraps to ${linesNeeded} lines, box fits ${boxLines}`,
      };
    }
    return null;
  }
  if (valueOver(units, units, row)) return { issue: 'overflow', detail: null };
  return null;
}

function languageVerdict(entry, row) {
  if (!entry || entry.basis === 'estimate') return 'estimate';
  if (entry.basis === 'range') {
    if (entry.shortestOver) return 'break';
    if (entry.someOver) return 'might';
    return 'fit';
  }
  return valueOver(entry.characters, entry.units || entry.characters, row) ? 'break' : 'fit';
}

function buildBreakReport(lengths, options) {
  const langs = options.langs || [];
  const shared = options.sharedFlats || {};
  const index = indexEnglish(shared.en || {});
  const ratio = options.ratio || 1.4;
  const buttons = (lengths || []).filter(
    (row) => row.bucket === 'button' || row.bucket === 'tab',
  );
  const labels = [];
  const alreadyOver = [];
  const breaks = [];
  const mightBreak = [];
  const atRisk = [];
  const fits = [];

  function placeControl(row) {
    const limit = row.maxCharacters || 10;
    const real = realTranslations(row.source, index, shared, langs, row, options);
    const estimate = estimateSize(row, ratio);
    const expected = real
      ? Math.max(...langs.map((lang) => (real.perLang[lang] ? real.perLang[lang].characters : 0)))
      : estimate.characters;
    const item = {
      ...row,
      expected,
      basis: real ? 'real' : 'estimate',
      chosenKey: real ? real.chosenKey : null,
      real,
    };
    if (textOverLimit(row.source, row)) {
      alreadyOver.push(item);
      return;
    }
    const entries = real ? langs.map((lang) => real.perLang[lang]).filter(Boolean) : [];
    const verdicts = {};
    langs.forEach((lang) => {
      verdicts[lang] = languageVerdict(real && real.perLang[lang], row);
    });
    item.langVerdicts = verdicts;
    item.hardLangs = langs.filter((lang) => verdicts[lang] === 'break');
    item.mightLangs = langs.filter((lang) => verdicts[lang] === 'might');
    if (item.hardLangs.length > 0) {
      item.verdict = 'break';
      breaks.push(item);
      return;
    }
    if (item.mightLangs.length > 0) {
      item.verdict = 'might break';
      mightBreak.push(item);
      return;
    }
    const estimateOver = !real
      ? valueOver(estimate.characters, estimate.units, row)
      : entries.some((entry) => entry.basis === 'estimate' && valueOver(entry.characters, entry.units || entry.characters, row));
    if (estimateOver) {
      item.basis = real ? item.basis : 'estimate';
      item.verdict = 'estimate';
      atRisk.push(item);
      return;
    }
    fits.push(item);
  }

  buttons.forEach(placeControl);

  (lengths || []).filter((row) => row.bucket === 'text' || row.bucket === 'label').forEach((row) => {
    const real = realTranslations(row.source, index, shared, langs, row, options);
    const estimate = estimateSize(row, ratio);
    const problems = [];
    langs.forEach((lang) => {
      const entry = real && real.perLang[lang];
      const units = entry ? (entry.units || entry.characters) : estimate.units;
      const found = labelIssue(units, row);
      if (!found) return;
      problems.push({
        lang,
        issue: found.issue,
        detail: found.detail,
        basis: entry ? entry.basis : 'estimate',
        characters: entry ? entry.characters : estimate.characters,
        key: entry ? entry.key : null,
        text: entry ? entry.text : null,
        minCharacters: entry ? entry.minCharacters : null,
        maxCharacters: entry ? entry.maxCharacters : null,
        keyCount: entry ? entry.keyCount : 0,
      });
    });
    if (problems.length === 0 && !textOverLimit(row.source, row)) return;
    labels.push({
      ...row,
      issue: problems.some((item) => item.issue === 'overflow') ? 'overflow' : 'wrap',
      basis: real ? 'real' : 'estimate',
      chosenKey: real ? real.chosenKey : null,
      real,
      problems,
      verdict: 'label',
    });
  });

  const byExpected = (a, b) => b.expected - a.expected || b.characters - a.characters;
  alreadyOver.sort(byExpected);
  breaks.sort(byExpected);
  mightBreak.sort(byExpected);
  atRisk.sort(byExpected);
  return { alreadyOver, breaks, mightBreak, atRisk, fits, labels };
}

module.exports = {
  buildBreakReport,
  realTranslations,
  shipMatchKey,
};
