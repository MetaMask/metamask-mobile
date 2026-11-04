/**
 * Shared helpers for the designer language toggle.
 * Read-only on locales/languages/*.json. Those files belong to Crowdin.
 */
const fs = require('fs');
const path = require('path');

const MARKER_START = 'DESIGNER-LOCALE-OVERRIDE:START';
const MARKER_END = 'DESIGNER-LOCALE-OVERRIDE:END';

const RTL_NOTE =
  'RTL is off. locales/i18n.js sets isRTL = false, so the layout does not mirror. This skill does not turn RTL on.';

/** Locales imported by locales/i18n.js. Regional files are not in this list. */
const SHIPPED = {
  de: { label: 'Deutsch', file: 'de.json', regional: [] },
  el: { label: 'Ελληνικά', file: 'el.json', regional: [] },
  en: { label: 'English', file: 'en.json', regional: [] },
  es: { label: 'Español', file: 'es.json', regional: [] },
  fr: { label: 'Français', file: 'fr.json', regional: [] },
  hi: { label: 'हिन्दी', file: 'hi.json', regional: ['hi-in.json'] },
  id: { label: 'Bahasa Indonesia', file: 'id.json', regional: ['id-id.json'] },
  ja: { label: '日本語', file: 'ja.json', regional: ['ja-jp.json'] },
  ko: { label: '한국어', file: 'ko.json', regional: ['ko-kr.json'] },
  pt: {
    label: 'Português (Brasil)',
    file: 'pt.json',
    regional: ['pt-br.json'],
  },
  ru: { label: 'Русский', file: 'ru.json', regional: ['ru-ru.json'] },
  tl: { label: 'Filipino', file: 'tl.json', regional: [] },
  tr: { label: 'Türkçe', file: 'tr.json', regional: [] },
  vi: { label: 'Tiếng Việt', file: 'vi.json', regional: ['vi-vn.json'] },
  zh: { label: '简体中文', file: 'zh.json', regional: ['zh-cn.json'] },
};

const ALIASES = {
  german: 'de',
  deutsch: 'de',
  greek: 'el',
  english: 'en',
  spanish: 'es',
  espanol: 'es',
  francés: 'fr',
  french: 'fr',
  francais: 'fr',
  hindi: 'hi',
  indonesian: 'id',
  japanese: 'ja',
  'ja-jp': 'ja',
  korean: 'ko',
  'ko-kr': 'ko',
  portuguese: 'pt',
  'pt-br': 'pt',
  'portuguese-brazil': 'pt',
  russian: 'ru',
  'ru-ru': 'ru',
  filipino: 'tl',
  tagalog: 'tl',
  turkish: 'tr',
  vietnamese: 'vi',
  'vi-vn': 'vi',
  chinese: 'zh',
  'zh-cn': 'zh',
  'zh-hans': 'zh',
};

const FEATURES = {
  perps: ['perps'],
  social: ['social', 'social_leaderboard'],
};

const FEATURE_DIRS = {
  perps: ['app/components/UI/Perps'],
  social: ['app/components/UI/SocialFeed', 'app/components/UI/QuickBuy'],
};

/**
 * Short controls where truncation shows up first.
 * Width is not a fixed 114px in code: the position-card actions are flex-1.
 */
const FOCUS_KEYS = [
  {
    key: 'perps.pro_positions_panel.card.close',
    namespaces: ['perps'],
    note: 'Perps position card, Close. Three buttons share one row (flex-1). Designers budget about 114px.',
  },
  {
    key: 'perps.pro_positions_panel.card.reverse',
    namespaces: ['perps'],
    note: 'Perps position card, Reverse. A long shipped example is Russian.',
  },
  {
    key: 'perps.pro_positions_panel.card.share',
    namespaces: ['perps'],
    note: 'Perps position card, Share. A long shipped example is Portuguese in pt.json (the file the app loads).',
  },
  {
    key: 'social_leaderboard.feed.position_card.copy_trade',
    namespaces: ['social', 'social_leaderboard'],
    note: 'Social feed, Copy trade.',
  },
];

const VOWELS = {
  a: 'ȧ',
  e: 'ḗ',
  i: 'ī',
  o: 'ǿ',
  u: 'ū',
  y: 'ȳ',
  A: 'Ȧ',
  E: 'Ḗ',
  I: 'Ī',
  O: 'Ǿ',
  U: 'Ū',
  Y: 'Ȳ',
};

const VALUE_DATE_PATTERNS = [
  { name: 'numeric-date', re: /\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/ },
  { name: 'iso-date', re: /\b\d{4}-\d{2}-\d{2}\b/ },
  {
    name: 'format-token',
    re: /\b(?:YYYY|yyyy|DD\/MM|MM\/DD|MM\/dd|dd\/MM|HH:mm|hh:mm)\b/,
  },
  {
    name: 'english-month-day',
    re: /\b(?:January|February|March|April|June|July|August|September|October|November|December)\s+\d{1,2}\b/,
  },
];

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      out.help = true;
    } else if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) {
        out[key] = true;
      } else {
        out[key] = next;
        i += 1;
      }
    } else {
      out._.push(arg);
    }
  }
  return out;
}

function findRepoRoot(explicit) {
  if (explicit) {
    const root = path.resolve(explicit);
    assertRepo(root);
    return root;
  }
  const starts = [process.cwd(), path.resolve(__dirname, '..', '..', '..')];
  for (const start of starts) {
    const found = walkForRepo(start);
    if (found) return found;
  }
  throw new Error(
    'Could not find a MetaMask Mobile checkout (locales/i18n.js and locales/languages/en.json). Run this from the repo root.',
  );
}

function walkForRepo(start) {
  let dir = path.resolve(start);
  for (let i = 0; i < 8; i += 1) {
    if (isRepo(dir)) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

function isRepo(dir) {
  return (
    fs.existsSync(path.join(dir, 'locales', 'i18n.js')) &&
    fs.existsSync(path.join(dir, 'locales', 'languages', 'en.json'))
  );
}

function assertRepo(dir) {
  if (!isRepo(dir)) {
    throw new Error(`Not a MetaMask Mobile checkout: ${dir}`);
  }
}

function translationDir(root) {
  return path.join(root, 'locales', 'languages');
}

function assertNotTranslationFile(root, filePath) {
  const languagesDir = path.resolve(translationDir(root));
  const resolved = path.resolve(filePath);
  if (resolved === languagesDir || resolved.startsWith(languagesDir + path.sep)) {
    throw new Error(
      `Refusing to write ${resolved}. Crowdin owns locales/languages/*.json (see crowdin.yml).`,
    );
  }
}

function readJson(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`Could not parse ${filePath}: ${error.message}`);
  }
}

function flatten(node, prefix, out) {
  if (typeof node === 'string') {
    if (prefix) out[prefix] = node;
    return;
  }
  if (!node || typeof node !== 'object') return;
  Object.keys(node).forEach((key) => {
    const next = prefix ? `${prefix}.${key}` : key;
    flatten(node[key], next, out);
  });
}

function flattenFile(filePath) {
  const out = {};
  flatten(readJson(filePath), '', out);
  return out;
}

function countLeaves(filePath) {
  return Object.keys(flattenFile(filePath)).length;
}

function resolveLanguage(input) {
  if (!input || typeof input !== 'string') return null;
  const token = input.trim().toLowerCase().replace(/_/g, '-');
  if (SHIPPED[token]) return token;
  if (ALIASES[token]) return ALIASES[token];
  return null;
}

function languageList() {
  return Object.keys(SHIPPED).join(', ');
}

function splitList(value) {
  if (!value || value === true) return [];
  return String(value)
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

function resolveNamespaces(args) {
  const names = new Set();
  splitList(args.namespace).forEach((name) => names.add(name));
  splitList(args.feature).forEach((feature) => {
    const key = feature.toLowerCase();
    const mapped = FEATURES[key];
    if (!mapped) {
      throw new Error(
        `Unknown feature "${feature}". Use perps or social.`,
      );
    }
    mapped.forEach((name) => names.add(name));
  });
  return names.size > 0 ? [...names] : null;
}

function featureDirsForNamespaces(namespaces) {
  if (!namespaces) return [];
  const dirs = new Set();
  if (namespaces.includes('perps')) {
    FEATURE_DIRS.perps.forEach((dir) => dirs.add(dir));
  }
  if (
    namespaces.includes('social') ||
    namespaces.includes('social_leaderboard')
  ) {
    FEATURE_DIRS.social.forEach((dir) => dirs.add(dir));
  }
  return [...dirs];
}

function inScope(key, namespaces) {
  if (!namespaces) return true;
  return namespaces.some(
    (name) => key === name || key.startsWith(`${name}.`),
  );
}

function comparable(value) {
  return String(value).replace(/\{\{[^}]*\}\}/g, '');
}

const GRAPHEME_SEGMENTER = new Intl.Segmenter(undefined, {
  granularity: 'grapheme',
});

const PLURAL_FORMS = ['zero', 'one', 'two', 'few', 'many', 'other'];

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

function displayWidth(value) {
  return graphemes(comparable(value)).reduce(
    (sum, grapheme) => sum + graphemeWidth(grapheme),
    0,
  );
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
  const parts = key.split('.');
  const form = parts[parts.length - 1];
  if (!PLURAL_FORMS.includes(form) || parts.length < 2) return null;
  return { stem: parts.slice(0, -1).join('.'), form };
}

function defaultLimitsPath() {
  return path.join(__dirname, '..', 'references', 'limits.json');
}

function loadLimits(filePath) {
  const raw = readJson(filePath);
  const keys = raw.keys && typeof raw.keys === 'object' ? raw.keys : {};
  Object.keys(keys).forEach((key) => {
    const entry = keys[key];
    if (!entry || typeof entry.maxWidth !== 'number' || entry.maxWidth < 1) {
      throw new Error(
        `Hard limit for ${key} in ${filePath} needs a maxWidth of at least 1.`,
      );
    }
  });
  return {
    shortStringMaxGraphemes: raw.shortStringMaxGraphemes ?? 25,
    ratio: raw.ratio ?? 1.4,
    minDelta: raw.minDelta ?? 4,
    minEnglishWidth: raw.minEnglishWidth ?? 4,
    keys,
  };
}

function hasLetter(value) {
  return /\p{L}/u.test(value);
}

function loadShippedFlats(root) {
  const flats = {};
  Object.keys(SHIPPED).forEach((code) => {
    const filePath = path.join(translationDir(root), SHIPPED[code].file);
    flats[code] = flattenFile(filePath);
  });
  return flats;
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

function analyzePair(enFlat, targetFlat, options) {
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
  Object.keys(limits.keys).forEach((key) => {
    if (!inScope(key, namespaces)) return;
    const rule = limits.keys[key];
    const enValue = enFlat[key];
    const targetValue = targetFlat[key];
    const present = typeof targetValue === 'string' && targetValue.trim() !== '';
    const targetWidth = present ? displayWidth(targetValue) : null;
    const status = !present
      ? 'missing'
      : targetWidth > rule.maxWidth
        ? 'over'
        : 'ok';
    const row = {
      key,
      where: rule.where || '',
      maxWidth: rule.maxWidth,
      en: typeof enValue === 'string' ? enValue : '',
      target: present ? targetValue : '',
      targetWidth,
      targetChars: present ? charCount(targetValue) : 0,
      status,
    };
    limitChecks.push(row);
    if (status === 'over') overLimit.push(row);
  });
  overLimit.sort((a, b) => (b.targetWidth || 0) - (a.targetWidth || 0));

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

function pluralSiblings(key, enFlat) {
  const info = pluralStem(key);
  if (!info) return [];
  return PLURAL_FORMS.filter((form) => form !== info.form)
    .map((form) => `${info.stem}.${form}`)
    .filter((sibling) => Object.prototype.hasOwnProperty.call(enFlat, sibling));
}

function dateHitsInValue(value) {
  const hits = [];
  VALUE_DATE_PATTERNS.forEach((pattern) => {
    if (pattern.re.test(value)) hits.push(pattern.name);
  });
  return hits;
}

function scanDateValues(flat, namespaces) {
  const hits = [];
  Object.keys(flat).forEach((key) => {
    if (!inScope(key, namespaces)) return;
    const value = flat[key];
    if (typeof value !== 'string') return;
    const names = dateHitsInValue(value);
    if (names.length > 0) {
      hits.push({ key, value, names });
    }
  });
  return hits;
}

function scanDateSource(root, namespaces) {
  const dirs = featureDirsForNamespaces(namespaces);
  const hits = [];
  dirs.forEach((relDir) => {
    const abs = path.join(root, relDir);
    if (!fs.existsSync(abs)) return;
    walkSource(abs, root, hits);
  });
  return { dirs, hits: hits.sort(compareDateHints) };
}

function compareDateHints(a, b) {
  return dateHintRank(a) - dateHintRank(b) || a.file.localeCompare(b.file) || a.line - b.line;
}

function dateHintRank(hit) {
  if (hit.names.includes('english-month-list')) return 0;
  if (
    hit.names.includes('hour12-ampm') ||
    hit.names.includes('yyyymmdd-helper') ||
    hit.names.includes('format-literal')
  ) {
    return 1;
  }
  if (hit.file.includes(`${path.sep}utils${path.sep}`)) return 2;
  return 3;
}

function dateHintNamesForLine(line) {
  const names = [];
  if (/hour12:\s*true/.test(line)) names.push('hour12-ampm');
  if (/formatTimestampToYYYYMMDD/.test(line)) names.push('yyyymmdd-helper');
  if (
    /['"`][^'"`\n]*(?:YYYY|yyyy|MM\/DD|DD\/MM|HH:mm)[^'"`\n]*['"`]/.test(line)
  ) {
    names.push('format-literal');
  }
  if (
    /['"]en-US['"]/.test(line) &&
    /date|Date|hour|month|weekday|timeZone/.test(line)
  ) {
    names.push('hard-coded-en-US-date');
  }
  return names;
}

function walkSource(dir, root, hits) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  entries.forEach((entry) => {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '__mocks__') return;
      walkSource(abs, root, hits);
      return;
    }
    if (!/\.(tsx?|jsx?)$/.test(entry.name)) return;
    if (/\.test\./.test(entry.name) || /\.view\.test\./.test(entry.name)) return;
    const stat = fs.statSync(abs);
    if (stat.size > 1024 * 1024) return;
    const text = fs.readFileSync(abs, 'utf8');
    const monthList = text.match(
      /['"]Jan['"]\s*,\s*(?:\r?\n\s*)?['"]Feb['"]/,
    );
    if (monthList) {
      const line = text.slice(0, monthList.index).split(/\r?\n/).length;
      hits.push({
        file: path.relative(root, abs),
        line,
        names: ['english-month-list'],
        text: 'English month abbreviations (Jan, Feb, …)',
      });
    }
    const lines = text.split(/\r?\n/);
    lines.forEach((line, index) => {
      const names = dateHintNamesForLine(line);
      if (names.length === 0) return;
      hits.push({
        file: path.relative(root, abs),
        line: index + 1,
        names,
        text: line.trim().slice(0, 180),
      });
    });
  });
}

function accentString(value) {
  const pieces = String(value).split(/(\{\{[^}]*\}\})/g);
  const accented = pieces
    .map((piece) => {
      if (piece.startsWith('{{')) return piece;
      return piece.replace(/[aeiouyAEIOUY]/g, (char) => VOWELS[char] || char);
    })
    .join('');
  return `⟦${accented}⟧`;
}

function mapLeaves(node, fn, keyPath) {
  if (typeof node === 'string') return fn(node, keyPath);
  if (Array.isArray(node)) {
    return node.map((item, index) =>
      mapLeaves(item, fn, keyPath ? `${keyPath}.${index}` : String(index)),
    );
  }
  if (node && typeof node === 'object') {
    const out = {};
    Object.keys(node).forEach((key) => {
      const next = keyPath ? `${keyPath}.${key}` : key;
      out[key] = mapLeaves(node[key], fn, next);
    });
    return out;
  }
  return node;
}

function buildPseudoBundle(root, mode) {
  if (mode !== 'accented' && mode !== 'longest') {
    throw new Error('Pseudo mode must be accented or longest.');
  }
  const enPath = path.join(translationDir(root), 'en.json');
  const en = readJson(enPath);
  if (mode === 'accented') {
    return mapLeaves(en, (value) => accentString(value), '');
  }
  const flats = loadShippedFlats(root);
  return mapLeaves(en, (value, keyPath) => {
    let best = value;
    let bestWidth = displayWidth(value);
    Object.keys(flats).forEach((code) => {
      const candidate = flats[code][keyPath];
      if (typeof candidate !== 'string') return;
      const width = displayWidth(candidate);
      if (width > bestWidth) {
        best = candidate;
        bestWidth = width;
      }
    });
    return best;
  }, '');
}

function renderStartupBlock(override, pseudoRequire) {
  const literal = JSON.stringify(override, null, 2)
    .split('\n')
    .map((line, index) => (index === 0 ? line : `  ${line}`))
    .join('\n');
  const pseudoLines = pseudoRequire
    ? [
        'if (__DESIGNER_LOCALE_OVERRIDE.pseudo) {',
        '  // eslint-disable-next-line import-x/no-commonjs',
        "  I18n.translations.pseudo = require('./designer-pseudo.generated.json');",
        "  I18n.locale = 'pseudo';",
        '} else if (',
      ]
    : [
        '// No require() here. Metro would bundle it even when pseudo is off,',
        '// and the generated JSON does not exist in that mode.',
        'if (false && __DESIGNER_LOCALE_OVERRIDE.pseudo) {',
        "  I18n.locale = 'pseudo';",
        '} else if (',
      ];
  return [
    `// ${MARKER_START}`,
    '// Local designer preview. Uncommitted. Revert with:',
    '// node tools/designer-language-toggle/scripts/revert-locale.js',
    `const __DESIGNER_LOCALE_OVERRIDE = ${literal};`,
    ...pseudoLines,
    '  __DESIGNER_LOCALE_OVERRIDE.force &&',
    "  typeof __DESIGNER_LOCALE_OVERRIDE.locale === 'string' &&",
    '  __DESIGNER_LOCALE_OVERRIDE.locale',
    ') {',
    '  I18n.locale = __DESIGNER_LOCALE_OVERRIDE.locale;',
    '}',
    `// ${MARKER_END}`,
  ].join('\n');
}

function renderLanguagesFilter() {
  return [
    `  // ${MARKER_START}`,
    '  const allow = __DESIGNER_LOCALE_OVERRIDE.languages;',
    '  const withPseudo = (map) => {',
    '    if (!__DESIGNER_LOCALE_OVERRIDE.pseudo) return map;',
    '    return {',
    '      ...map,',
    '      pseudo:',
    "        __DESIGNER_LOCALE_OVERRIDE.pseudo === 'longest'",
    "          ? 'Pseudo (longest)'",
    "          : 'Pseudo (accented)',",
    '    };',
    '  };',
    '  if (Array.isArray(allow) && allow.length > 0) {',
    '    const filtered = {};',
    '    allow.forEach((code) => {',
    '      if (Object.prototype.hasOwnProperty.call(all, code)) {',
    '        filtered[code] = all[code];',
    '      }',
    '    });',
    '    return withPseudo(filtered);',
    '  }',
    '  return withPseudo(all);',
    `  // ${MARKER_END}`,
  ].join('\n');
}

function renderEarlyReturn() {
  return [
    `  // ${MARKER_START}`,
    '  // Skip the saved language so a previous choice in MMKV cannot',
    '  // overwrite this preview after startup.',
    '  if (__DESIGNER_LOCALE_OVERRIDE.force || __DESIGNER_LOCALE_OVERRIDE.pseudo) {',
    '    return;',
    '  }',
    `  // ${MARKER_END}`,
    '',
  ].join('\n');
}

function transformI18nSource(source, override, options) {
  if (source.includes(MARKER_START)) {
    throw new Error(
      'locales/i18n.js already contains a designer override. Run revert-locale.js before applying a new one.',
    );
  }
  const anchor = 'I18n.translations = supportedTranslations;';
  const anchorAt = source.indexOf(anchor);
  if (anchorAt < 0) {
    throw new Error(
      'Could not find the translations assignment in locales/i18n.js. The startup hook needs an update.',
    );
  }
  const startup = renderStartupBlock(override, Boolean(options.pseudoRequire));
  let next =
    source.slice(0, anchorAt + anchor.length) +
    `\n${startup}` +
    source.slice(anchorAt + anchor.length);

  const languagesRe =
    /export function getLanguages\(\) \{\r?\n  return \{([\s\S]*?)\r?\n  \};\r?\n\}/;
  const languagesMatch = languagesRe.exec(next);
  if (!languagesMatch) {
    throw new Error('Could not find getLanguages() in locales/i18n.js.');
  }
  const replacement = [
    'export function getLanguages() {',
    `  const all = {${languagesMatch[1]}`,
    '  };',
    renderLanguagesFilter(),
    '}',
  ].join('\n');
  next =
    next.slice(0, languagesMatch.index) +
    replacement +
    next.slice(languagesMatch.index + languagesMatch[0].length);

  const preferRe = /async function getUserPreferableLocale\(\) \{\r?\n/;
  if (!preferRe.test(next)) {
    throw new Error(
      'Could not find getUserPreferableLocale() in locales/i18n.js.',
    );
  }
  next = next.replace(preferRe, (match) => match + renderEarlyReturn());
  return next;
}

function i18nPath(root) {
  return path.join(root, 'locales', 'i18n.js');
}

function backupPath(root) {
  return path.join(root, 'locales', '.designer-locale.i18n.js.bak');
}

function overridePath(root) {
  return path.join(root, 'locales', 'designer-locale.override.json');
}

function pseudoPath(root) {
  return path.join(root, 'locales', 'designer-pseudo.generated.json');
}

function quote(value) {
  const flat = String(value).replace(/\s+/g, ' ').trim();
  if (flat.length <= 80) return `"${flat}"`;
  return `"${flat.slice(0, 77)}…"`;
}

module.exports = {
  MARKER_START,
  MARKER_END,
  RTL_NOTE,
  SHIPPED,
  FEATURES,
  FEATURE_DIRS,
  FOCUS_KEYS,
  parseArgs,
  findRepoRoot,
  assertNotTranslationFile,
  readJson,
  flatten,
  flattenFile,
  countLeaves,
  resolveLanguage,
  languageList,
  splitList,
  resolveNamespaces,
  featureDirsForNamespaces,
  inScope,
  displayWidth,
  charCount,
  graphemes,
  placeholderCounts,
  placeholderDiff,
  pluralStem,
  pluralSiblings,
  defaultLimitsPath,
  loadLimits,
  loadShippedFlats,
  analyzePair,
  scanDateValues,
  scanDateSource,
  accentString,
  buildPseudoBundle,
  transformI18nSource,
  i18nPath,
  backupPath,
  overridePath,
  pseudoPath,
  translationDir,
  quote,
};
