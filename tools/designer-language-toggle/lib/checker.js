/**
 * Portable string checker. Callers pass a plain string set.
 * Repo locales, Figma exports, and other sources stay outside this file.
 */
const PLURAL_FORMS = ['zero', 'one', 'two', 'few', 'many', 'other'];

const GRAPHEME_SEGMENTER = new Intl.Segmenter(undefined, {
  granularity: 'grapheme',
});

function inScope(key, namespaces) {
  if (!namespaces) return true;
  return namespaces.some((name) => key === name || key.startsWith(`${name}.`));
}

function isWideCodePoint(code) {
  return (
    (code >= 0x1100 && code <= 0x115f) ||
    (code >= 0x2e80 && code <= 0xa4cf) ||
    (code >= 0xac00 && code <= 0xd7a3) ||
    (code >= 0xf900 && code <= 0xfaff) ||
    (code >= 0xfe10 && code <= 0xfe19) ||
    (code >= 0xfe30 && code <= 0xfe6f) ||
    (code >= 0xff00 && code <= 0xff60) ||
    (code >= 0xffe0 && code <= 0xffe6) ||
    (code >= 0x1f300 && code <= 0x1faff)
  );
}

function graphemes(value) {
  return [...GRAPHEME_SEGMENTER.segment(String(value))].map(
    (part) => part.segment,
  );
}

function graphemeWidth(grapheme) {
  let wide = false;
  for (const char of grapheme) {
    if (isWideCodePoint(char.codePointAt(0))) wide = true;
  }
  return wide ? 2 : 1;
}

function comparable(value) {
  return String(value).replace(/\{\{[^}]*\}\}/g, '');
}

function displayWidth(value) {
  return graphemes(comparable(value)).reduce(
    (sum, grapheme) => sum + graphemeWidth(grapheme),
    0,
  );
}

function characterCount(value) {
  return graphemes(String(value)).length;
}

function charCount(value) {
  return graphemes(comparable(value)).length;
}

function placeholderCounts(value) {
  const counts = {};
  const pattern = /\{\{\s*([^{}]+?)\s*\}\}/g;
  let match = pattern.exec(String(value));
  while (match) {
    const name = match[1];
    counts[name] = (counts[name] || 0) + 1;
    match = pattern.exec(String(value));
  }
  return counts;
}

function placeholderDiff(enValue, targetValue) {
  const enCounts = placeholderCounts(enValue);
  const targetCounts = placeholderCounts(targetValue);
  const names = new Set([
    ...Object.keys(enCounts),
    ...Object.keys(targetCounts),
  ]);
  const missing = [];
  const extra = [];
  names.forEach((name) => {
    const enCount = enCounts[name] || 0;
    const targetCount = targetCounts[name] || 0;
    if (targetCount < enCount) missing.push(name);
    if (targetCount > enCount) extra.push(name);
  });
  return { missing, extra };
}

function pluralStem(key) {
  const parts = String(key).split('.');
  const form = parts[parts.length - 1];
  if (!PLURAL_FORMS.includes(form) || parts.length < 2) return null;
  return { stem: parts.slice(0, -1).join('.'), form };
}

function hasLetter(value) {
  return /\p{L}/u.test(value);
}

function sharedAcrossLocales(key, enValue, sharedFlats) {
  let present = 0;
  let same = 0;
  Object.keys(sharedFlats).forEach((code) => {
    if (code === 'en') return;
    const value = sharedFlats[code][key];
    if (typeof value !== 'string') return;
    present += 1;
    if (value === enValue) same += 1;
  });
  return present >= 8 && same / present >= 0.8;
}

function skipStillEnglish(key, enValue, sharedFlats, strict) {
  const trimmed = enValue.trim();
  if (trimmed.length < 3) return 'shorter than 3 characters';
  if (!hasLetter(trimmed)) return 'no letters';
  const words = comparable(trimmed).replace(/[^\p{L}]+/gu, '');
  if (words.length < 3) return 'no words outside placeholders';
  if (/^https?:\/\//.test(trimmed)) return 'url';
  if (!strict && sharedFlats && sharedAcrossLocales(key, enValue, sharedFlats)) {
    return 'same English text in most shipped languages';
  }
  return null;
}

function lengthRow(key, enValue, targetValue) {
  const enWidth = displayWidth(enValue);
  const targetWidth = displayWidth(targetValue);
  return {
    key,
    en: enValue,
    target: targetValue,
    enWidth,
    targetWidth,
    enChars: charCount(enValue),
    targetChars: charCount(targetValue),
    ratio: enWidth === 0 ? 0 : targetWidth / enWidth,
  };
}

function pluralGaps(enFlat, targetFlat, namespaces) {
  const formsByStem = new Map();
  Object.keys(enFlat).forEach((key) => {
    if (!inScope(key, namespaces)) return;
    const info = pluralStem(key);
    if (!info) return;
    if (!formsByStem.has(info.stem)) formsByStem.set(info.stem, []);
    formsByStem.get(info.stem).push(info.form);
  });
  const gaps = [];
  formsByStem.forEach((forms, stem) => {
    const missingForms = forms.filter((form) => {
      const value = targetFlat[`${stem}.${form}`];
      return typeof value !== 'string' || value.trim() === '';
    });
    if (missingForms.length > 0 && missingForms.length < forms.length) {
      gaps.push({ stem, forms, missingForms });
    }
  });
  gaps.sort((a, b) => a.stem.localeCompare(b.stem));
  return gaps;
}

/**
 * Same report as v0.1 check-strings for one English flat and one target flat.
 * sharedFlats is only the still-English heuristic. It does not change length.
 */
function checkFlats(enFlat, targetFlat, options) {
  const namespaces = options.namespaces;
  const limits = options.limits || {
    shortStringMaxGraphemes: 25,
    ratio: options.ratio,
    minDelta: options.minDelta,
    minEnglishWidth: options.minEnWidth,
    keys: {},
  };
  const ratioLimit = options.ratio ?? limits.ratio;
  const minDelta = options.minDelta ?? limits.minDelta;
  const minEnWidth = options.minEnWidth ?? limits.minEnglishWidth;
  const cutoff = limits.shortStringMaxGraphemes;
  const missing = [];
  const stillEnglish = [];
  const tooLong = [];
  const checkWrapping = [];
  const placeholderMismatches = [];
  const skippedShared = [];
  let inScopeCount = 0;

  Object.keys(enFlat).forEach((key) => {
    if (!inScope(key, namespaces)) return;
    const enValue = enFlat[key];
    if (typeof enValue !== 'string') return;
    inScopeCount += 1;
    const targetValue = targetFlat[key];
    if (typeof targetValue !== 'string' || targetValue.trim() === '') {
      missing.push({ key, en: enValue });
      return;
    }
    const diff = placeholderDiff(enValue, targetValue);
    if (diff.missing.length > 0 || diff.extra.length > 0) {
      placeholderMismatches.push({
        key,
        en: enValue,
        target: targetValue,
        missing: diff.missing,
        extra: diff.extra,
      });
    }
    if (targetValue === enValue) {
      const reason = skipStillEnglish(
        key,
        enValue,
        options.sharedFlats,
        options.strict,
      );
      if (reason) {
        skippedShared.push({ key, en: enValue, reason });
        return;
      }
      stillEnglish.push({ key, value: enValue });
      return;
    }
    const row = lengthRow(key, enValue, targetValue);
    const delta = row.targetWidth - row.enWidth;
    const grew =
      row.enWidth >= minEnWidth &&
      delta >= minDelta &&
      row.targetWidth >= row.enWidth * ratioLimit;
    if (!grew) return;
    if (row.enChars > cutoff) checkWrapping.push(row);
    else tooLong.push(row);
  });

  const byRatio = (a, b) => b.ratio - a.ratio || b.targetWidth - a.targetWidth;
  tooLong.sort(byRatio);
  checkWrapping.sort(byRatio);
  stillEnglish.sort(
    (a, b) => b.value.length - a.value.length || a.key.localeCompare(b.key),
  );

  const limitChecks = [];
  const overLimit = [];
  Object.keys(limits.keys || {}).forEach((key) => {
    if (!inScope(key, namespaces)) return;
    const rule = limits.keys[key];
    const enValue = enFlat[key];
    const targetValue = targetFlat[key];
    const present = typeof targetValue === 'string' && targetValue.trim() !== '';
    const characters = present ? characterCount(targetValue) : null;
    const status = !present
      ? 'missing'
      : characters > rule.maxCharacters
        ? 'over'
        : 'ok';
    const row = {
      key,
      where: rule.where || '',
      maxCharacters: rule.maxCharacters,
      en: typeof enValue === 'string' ? enValue : '',
      target: present ? targetValue : '',
      characters,
      widthHint: present ? displayWidth(targetValue) : null,
      status,
    };
    limitChecks.push(row);
    if (status === 'over') overLimit.push(row);
  });
  overLimit.sort((a, b) => (b.characters || 0) - (a.characters || 0));

  let extra = 0;
  Object.keys(targetFlat).forEach((key) => {
    if (!inScope(key, namespaces)) return;
    if (!Object.prototype.hasOwnProperty.call(enFlat, key)) extra += 1;
  });

  return {
    inScopeCount,
    missing,
    stillEnglish,
    tooLong,
    checkWrapping,
    overLimit,
    limitChecks,
    placeholderMismatches,
    pluralGaps: pluralGaps(enFlat, targetFlat, namespaces),
    skippedShared,
    extra,
    cutoff,
  };
}

function stringKey(row) {
  return row.key || row.id;
}

/**
 * strings: { key|id, source_text, translations?: { lang: text }, context? }
 * options.lang selects the translation to compare. options.sharedFlats, when
 * passed, is the still-English corpus and is not rebuilt from the strings.
 */
function check(strings, options) {
  const lang = options.lang;
  const enFlat = {};
  const targetFlat = {};
  const builtShared = {};
  strings.forEach((row) => {
    const key = stringKey(row);
    if (!key) return;
    if (typeof row.source_text === 'string') enFlat[key] = row.source_text;
    const translations = row.translations || {};
    Object.keys(translations).forEach((code) => {
      if (typeof translations[code] !== 'string') return;
      if (!builtShared[code]) builtShared[code] = {};
      builtShared[code][key] = translations[code];
    });
    if (lang && typeof translations[lang] === 'string') {
      targetFlat[key] = translations[lang];
    }
  });
  const report = checkFlats(enFlat, targetFlat, {
    ...options,
    sharedFlats: options.sharedFlats || builtShared,
  });
  report.learned = matchLearned(strings, options.learned, lang);
  return report;
}

function matchLearned(strings, learned, lang) {
  if (!learned) return [];
  const notes = [];
  strings.forEach((row) => {
    const key = stringKey(row);
    const text = lang ? (row.translations || {})[lang] : '';
    (learned.corrections || []).forEach((item) => {
      if (item.lang && lang && item.lang !== lang) return;
      const keyMatch = item.key && item.key === key;
      const sourceMatch =
        item.source_text && item.source_text === row.source_text;
      if (!keyMatch && !sourceMatch) return;
      if (!item.rejected_text || !text) return;
      if (text !== item.rejected_text && !text.includes(item.rejected_text)) {
        return;
      }
      notes.push({
        key,
        lang: item.lang || lang,
        message: `linguists prefer ${item.preferred_text} over ${item.rejected_text}`,
        preferred_text: item.preferred_text,
        rejected_text: item.rejected_text,
        reason: item.reason || '',
        reviewer: item.reviewer || '',
      });
    });
    (learned.preferredPhrasing || []).forEach((item) => {
      if (item.lang && lang && item.lang !== lang) return;
      if (!item.avoid || !text || !text.includes(item.avoid)) return;
      notes.push({
        key,
        lang: item.lang || lang,
        message: `linguists prefer ${item.prefer} over ${item.avoid}`,
        preferred_text: item.prefer,
        rejected_text: item.avoid,
        reason: item.note || '',
      });
    });
    (learned.neverTranslate || []).forEach((term) => {
      if (!term || !text || !row.source_text) return;
      if (row.source_text !== term) return;
      if (text === term) return;
      notes.push({
        key,
        lang,
        message: `linguists keep ${term} untranslated`,
        preferred_text: term,
        rejected_text: text,
        reason: 'never-translate',
      });
    });
  });
  return notes;
}

function lengthAgainstLimits(strings, limits) {
  const rules = (limits && limits.keys) || {};
  return strings.map((row) => {
    const key = stringKey(row);
    const source = row.source_text || '';
    const rule = rules[key];
    const characters = characterCount(source);
    const maxCharacters = rule ? rule.maxCharacters : null;
    let status = 'no-limit';
    if (maxCharacters !== null) {
      status = characters > maxCharacters ? 'over' : 'ok';
    }
    return {
      key,
      source,
      characters,
      widthHint: displayWidth(source),
      maxCharacters,
      status,
      context: row.context || {},
      description: rule ? rule.where || '' : '',
      feature: (row.context && row.context.feature) || '',
      component: (row.context && row.context.component) || '',
    };
  });
}

module.exports = {
  PLURAL_FORMS,
  graphemes,
  displayWidth,
  characterCount,
  charCount,
  placeholderCounts,
  checkFlats,
  check,
  matchLearned,
  lengthAgainstLimits,
  inScope,
};
