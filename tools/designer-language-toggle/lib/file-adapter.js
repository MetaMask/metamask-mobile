/**
 * Design-stage copy that is not in the repo yet.
 * CSV columns: id, layer_name, frame_path, text, chars, kind
 * JSON: an array of those objects, or { strings: [...] }.
 * This does not machine-translate.
 */
const fs = require('fs');
const path = require('path');
const checker = require('./checker');

const SKIP_KINDS = new Set(['placeholder_or_annotation', 'number_or_data']);

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

function toStringRecord(row) {
  const id = row.id || row.key;
  if (!id) {
    throw new Error('Each design row needs an id.');
  }
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
      width_px: row.width_px || null,
    },
  };
}

function splitSkipped(records, includeSkipped) {
  if (includeSkipped) return { kept: records, skipped: [] };
  const kept = [];
  const skipped = [];
  records.forEach((row) => {
    const kind = (row.context && row.context.kind) || '';
    if (SKIP_KINDS.has(kind)) skipped.push(row);
    else kept.push(row);
  });
  return { kept, skipped };
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
  const limits = options.limits;
  const lengths = checker.lengthAgainstLimits(kept, limits);
  let report = null;
  if (options.lang) {
    report = checker.check(kept, {
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
    const pseudoStrings = kept.map((row) => ({
      ...row,
      translations: {
        ...(row.translations || {}),
        pseudo: pseudoText(row.source_text),
      },
    }));
    pseudo = {
      label: 'pseudo',
      note: 'Not a translation. Accented English, padded so length is easier to see.',
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
    kept,
    skipped,
    lengths,
    report,
    pseudo,
  };
}

module.exports = {
  SKIP_KINDS,
  parseCsv,
  readDesignFile,
  pseudoText,
  checkDesignFile,
};
