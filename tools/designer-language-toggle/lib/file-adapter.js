/**
 * Design-stage copy that is not in the repo yet.
 * CSV columns: id, layer_name, frame_path, text, chars, kind
 * JSON: an array of those objects, or { strings: [...] }.
 * This does not machine-translate.
 */
const fs = require('fs');
const path = require('path');
const checker = require('./checker');

const SKIP_KINDS = new Set([
  'placeholder_or_annotation',
  'number_or_data',
  'forced_skip',
]);
const BUTTON_MAX_PX = 120;
const BUTTON_MAX_CHARACTERS = 10;
const WRAP_MIN_CHARACTERS = 25;

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

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;
  const source = String(text).replace(/^\uFEFF/, '');
  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    const next = source[i + 1];
    if (inQuotes) {
      if (char === '"' && next === '"') {
        cell += '"';
        i += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        cell += char;
      }
      continue;
    }
    if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(cell);
      cell = '';
    } else if (char === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else if (char !== '\r') {
      cell += char;
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((item) => item.some((value) => value.trim() !== ''));
}

function rowsToObjects(rows) {
  if (rows.length === 0) return [];
  const header = rows[0].map((name) => name.trim());
  return rows.slice(1).map((row) => {
    const record = {};
    header.forEach((name, index) => {
      record[name] = row[index] !== undefined ? row[index] : '';
    });
    return record;
  });
}

function readDesignFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.json') {
    const parsed = JSON.parse(raw);
    const list = Array.isArray(parsed) ? parsed : parsed.strings;
    if (!Array.isArray(list)) {
      throw new Error('JSON must be an array or { "strings": [...] }.');
    }
    return list;
  }
  if (ext === '.csv') return rowsToObjects(parseCsv(raw));
  throw new Error('Design files must be .csv or .json.');
}

function numericWidth(row) {
  const raw = row.width_px !== undefined && row.width_px !== null && row.width_px !== ''
    ? row.width_px
    : row.width;
  if (raw === undefined || raw === null || raw === '') return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function screenLabel(framePath) {
  const parts = String(framePath || '')
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => !/^frame \d+/i.test(part) && !/^group \d+/i.test(part) && part !== 'children');
  if (parts.length === 0) return '';
  const named = parts.find((part) => part.includes(' - ') || /screen|feed|sheet|card/i.test(part));
  return named || parts[0];
}

function toStringRecord(row) {
  const id = row.id || row.key;
  if (!id) {
    throw new Error('Each design row needs an id.');
  }
  const width = numericWidth(row);
  return {
    id,
    key: id,
    source_text: row.text !== undefined ? String(row.text) : '',
    translations: row.translations || {},
    context: {
      screen: row.frame_path || row.screen || '',
      feature: row.feature || '',
      component: row.layer_name || row.component || '',
      kind: row.kind || '',
      width_px: width,
      visible: row.visible !== false,
    },
  };
}

function splitSkipped(records, includeSkipped) {
  if (includeSkipped) return { kept: records, skipped: [] };
  const kept = [];
  const skipped = [];
  records.forEach((row) => {
    const kind = (row.context && row.context.kind) || '';
    const hidden = row.context && row.context.visible === false;
    if (hidden || SKIP_KINDS.has(kind)) skipped.push(row);
    else kept.push(row);
  });
  return { kept, skipped };
}

function dedupeRecords(records) {
  const groups = new Map();
  records.forEach((row) => {
    const text = row.source_text;
    if (!groups.has(text)) {
      groups.set(text, {
        ...row,
        occurrences: 0,
        screens: [],
        widths: [],
      });
    }
    const group = groups.get(text);
    group.occurrences += 1;
    const screen = screenLabel(row.context.screen);
    if (screen && !group.screens.includes(screen)) group.screens.push(screen);
    if (row.context.width_px !== null) group.widths.push(row.context.width_px);
  });
  return [...groups.values()].map((group) => {
    const width_px = group.widths.length > 0 ? Math.min(...group.widths) : null;
    return {
      ...group,
      context: {
        ...group.context,
        width_px,
        screens: group.screens,
      },
    };
  });
}

function classifyRecord(row, limits) {
  const source = row.source_text || '';
  const characters = checker.characterCount(source);
  const width = row.context.width_px;
  const named = limits && limits.keys && limits.keys[row.key];
  const longText = characters > WRAP_MIN_CHARACTERS;
  const control = row.context.kind === 'button' || row.context.kind === 'tab';
  let maxCharacters = named ? named.maxCharacters : null;
  let status = 'no-limit';
  let bucket = 'label';
  if (control) {
    maxCharacters = named ? named.maxCharacters : BUTTON_MAX_CHARACTERS;
    status = characters > maxCharacters ? 'over' : 'ok';
    bucket = row.context.kind === 'tab' ? 'tab' : 'button';
  } else if (longText || (typeof width === 'number' && width > BUTTON_MAX_PX)) {
    status = 'check-wrapping';
    bucket = 'wrap';
    maxCharacters = named ? named.maxCharacters : null;
  } else if (named) {
    maxCharacters = named.maxCharacters;
    status = characters > maxCharacters ? 'over' : 'ok';
    bucket = 'named';
  } else {
    status = 'ok';
  }
  return {
    key: row.key,
    source,
    characters,
    widthHint: checker.displayWidth(source),
    width_px: width,
    maxCharacters,
    status,
    bucket,
    occurrences: row.occurrences || 1,
    screens: row.context.screens || [screenLabel(row.context.screen)].filter(Boolean),
    component: row.context.component,
    kind: row.context.kind,
    description: named ? named.where || '' : '',
    feature: row.context.feature || '',
  };
}

function pseudoControlHits(lengths) {
  return lengths.filter((row) => {
    if (row.bucket !== 'button' && row.bucket !== 'tab') return false;
    const limit = row.maxCharacters || BUTTON_MAX_CHARACTERS;
    return checker.characterCount(pseudoText(row.source)) > limit;
  });
}
function pseudoText(value) {
  const pieces = String(value).split(/(\{\{[^}]*\}\})/g);
  const accented = pieces
    .map((piece) => {
      if (piece.startsWith('{{')) return piece;
      return piece.replace(/[aeiouyAEIOUY]/g, (char) => VOWELS[char] || char);
    })
    .join('');
  const pad = Math.max(2, Math.round(checker.characterCount(value) * 0.3));
  return `⟦${accented}${'·'.repeat(pad)}⟧`;
}

/**
 * No machine translation. --pseudo builds a labeled expansion for length only.
 */
function checkDesignFile(filePath, options) {
  const records = readDesignFile(filePath).map(toStringRecord);
  const { kept, skipped } = splitSkipped(records, Boolean(options.includeSkipped));
  const unique = dedupeRecords(kept);
  const limits = options.limits;
  const lengths = unique.map((row) => classifyRecord(row, limits));
  let report = null;
  if (options.lang) {
    report = checker.check(unique, {
      lang: options.lang,
      limits,
      namespaces: null,
      strict: true,
      ratio: options.ratio,
      learned: options.learned,
    });
  }
  let pseudo = null;
  if (options.pseudo) {
    const pseudoStrings = unique.map((row) => ({
      ...row,
      translations: {
        ...(row.translations || {}),
        pseudo: pseudoText(row.source_text),
      },
    }));
    pseudo = {
      label: 'pseudo',
      note: 'Not a translation. Accented English, padded so length is easier to see.',
      controls: pseudoControlHits(lengths),
      report: checker.check(pseudoStrings, {
        lang: 'pseudo',
        limits,
        namespaces: null,
        strict: true,
        ratio: options.ratio,
        learned: null,
      }),
    };
  }
  return {
    file: filePath,
    rowsRead: records.length,
    rowsChecked: kept.length,
    unique: unique.length,
    kept: unique,
    skipped,
    lengths,
    report,
    pseudo,
  };
}

module.exports = {
  SKIP_KINDS,
  BUTTON_MAX_PX,
  BUTTON_MAX_CHARACTERS,
  parseCsv,
  readDesignFile,
  pseudoText,
  pseudoControlHits,
  dedupeRecords,
  classifyRecord,
  checkDesignFile,
};
