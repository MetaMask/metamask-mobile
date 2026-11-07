/**
 * Design-stage copy that is not in the repo yet.
 * CSV columns: id, layer_name, frame_path, text, chars, kind
 * JSON: an array of those objects, or { strings: [...] }.
 * This does not machine-translate.
 */
const fs = require('fs');
const path = require('path');
const checker = require('./checker');
const { resolveAvailableWidth } = require('./figma-adapter');

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

function numericField(row, names) {
  for (let index = 0; index < names.length; index += 1) {
    const raw = row[names[index]];
    if (raw === undefined || raw === null || raw === '') continue;
    const value = Number(raw);
    if (Number.isFinite(value)) return value;
  }
  return null;
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
  const width = numericField(row, ['width_px', 'width']);
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
      height: numericField(row, ['height']),
      textAutoResize: row.textAutoResize || row.textAutoResizing || null,
      lineHeightPx: numericField(row, ['lineHeightPx', 'lineHeight', 'line_height_px']),
      fontSize: numericField(row, ['fontSize', 'font_size']),
      maxLines: numericField(row, ['maxLines', 'max_lines']),
      template: row.template || null,
      example: row.example || null,
      copyText: row.copyText || '',
      dataCharacters: Number(row.dataCharacters) || 0,
      gapCharacters: Number(row.gapCharacters) || 0,
      slots: Array.isArray(row.slots) ? row.slots : [],
      slotMaxLengths: row.slotMaxLengths || null,
      containers: Array.isArray(row.containers) ? row.containers : [],
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

function limitBucket(row) {
  const kind = (row.context && row.context.kind) || '';
  const width = row.context && row.context.width_px;
  if (kind === 'button' || kind === 'tab') {
    return typeof width === 'number' && width > BUTTON_MAX_PX ? 'wide-control' : 'narrow-control';
  }
  return 'text';
}

function dedupeKey(row) {
  const context = row.context || {};
  const maxTag = taggedMax(context.component) || '';
  const width = context.width_px == null ? '' : String(Math.round(context.width_px));
  const height = context.height == null ? '' : String(Math.round(context.height));
  return [
    row.source_text,
    context.kind || '',
    limitBucket(row),
    width,
    height,
    context.textAutoResize || '',
    context.maxLines || '',
    maxTag,
  ].join('\u0000');
}

function dedupeRecords(records) {
  const groups = new Map();
  records.forEach((row) => {
    const text = dedupeKey(row);
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
  });
  return [...groups.values()].map((group) => ({
    ...group,
    context: {
      ...group.context,
      screens: group.screens,
    },
  }));
}

function taggedMax(layerName) {
  const match = String(layerName || '').match(/\[max:\s*(\d+)\]/i);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function learnedMax(row, learned) {
  const items = (learned && learned.limits) || [];
  const hit = items.find((item) => {
    if (!item || typeof item.maxCharacters !== 'number' || item.maxCharacters < 1) return false;
    if (item.key && item.key === row.key) return true;
    return Boolean(item.source_text) && item.source_text === row.source_text;
  });
  return hit ? hit.maxCharacters : null;
}

function pxPerUnitFor(units, width, fontSize, mode) {
  if (String(mode || '').toUpperCase() === 'WIDTH_AND_HEIGHT' && width) return width / units;
  if (fontSize) return fontSize * 0.5;
  const fallback = 7;
  if (width && width <= fallback * units * 1.25) return width / units;
  return fallback;
}

function measurePixels(units, row) {
  const displayUnits = Math.max(units || 0, 0);
  const mode = String(row.textAutoResize || '').toUpperCase();
  const pxPerUnit = row.pxPerUnit || pxPerUnitFor(
    Math.max(row.widthHint || displayUnits, 1),
    row.width_px,
    row.fontSize,
    mode,
  );
  if (row.pixelUnconstrained || row.unconstrained) {
    return {
      pxPerUnit,
      availableWidth: null,
      lines: null,
      overflow: false,
      unconstrained: true,
      basis: 'estimate: unconstrained auto-width, verify visually',
    };
  }
  const available = row.availableWidth;
  if (typeof available !== 'number' || available <= 0 || !pxPerUnit) return null;
  const lines = Math.max(1, Math.ceil((displayUnits * pxPerUnit) / available));
  const fixedHeight = mode === 'NONE' || mode === 'TRUNCATE';
  const singleLine = mode === 'HEIGHT'
    ? false
    : mode === 'TRUNCATE' || mode === 'NONE' || mode === 'WIDTH_AND_HEIGHT' || row.layout === 'overflow' || (!mode && row.layout !== 'wrap');
  const maxLines = row.maxLines || null;
  const boxLines = maxLines || row.lineCount || (singleLine ? 1 : null);
  let overflow = false;
  if (maxLines && lines > maxLines) overflow = true;
  if (singleLine && lines > 1) overflow = true;
  if (fixedHeight && row.lineHeightPx && row.height && lines * row.lineHeightPx > row.height + 0.5) overflow = true;
  if (!singleLine && !maxLines && row.layout === 'wrap' && boxLines && lines > boxLines) overflow = true;
  const basis = `measured: box ${Math.round(available)}px, needs ${lines} line${lines === 1 ? '' : 's'}`;
  return { pxPerUnit, availableWidth: available, lines, overflow, unconstrained: false, basis };
}

function exceedsBudget(text, maxCharacters, maxUnits) {
  if (typeof maxUnits === 'number') return checker.displayWidth(text) > maxUnits;
  return checker.characterCount(text) > maxCharacters;
}

function labelLayout(row) {
  const mode = String(row.context.textAutoResize || '').toUpperCase();
  const height = row.context.height;
  const lineHeight = row.context.lineHeightPx || (row.context.fontSize ? row.context.fontSize * 1.2 : null);
  const measuredLines = lineHeight && height ? Math.max(1, Math.round(height / lineHeight)) : null;
  const capped = row.context.maxLines;
  const boxLines = capped || measuredLines || 1;
  if (mode === 'HEIGHT') {
    return { layout: 'wrap', lineCount: boxLines, assumption: null };
  }
  if (mode === 'NONE' || mode === 'WIDTH_AND_HEIGHT' || mode === 'TRUNCATE') {
    return { layout: 'overflow', lineCount: 1, assumption: null };
  }
  return {
    layout: 'overflow',
    lineCount: 1,
    assumption: 'Assumed single line. Figma did not say whether this text wraps.',
  };
}

function hasTemplateSlot(row) {
  return Boolean(row.context.template && row.context.template.includes('{'));
}

function classifyRecord(row, limits, learned) {
  const source = row.source_text || '';
  const characters = checker.characterCount(source);
  const width = row.context.width_px;
  const named = limits && limits.keys && limits.keys[row.key];
  const longText = characters > WRAP_MIN_CHARACTERS;
  const control = row.context.kind === 'button' || row.context.kind === 'tab';
  const explicitText = row.context.kind === 'label' || row.context.kind === 'title' || row.context.kind === 'body';
  const labelLike = !control && (explicitText || (row.context.kind === '' && !longText));
  const override = taggedMax(row.context.component) ?? learnedMax(row, learned) ?? (named ? named.maxCharacters : null);
  const units = Math.max(checker.displayWidth(source), 1);
  const space = resolveAvailableWidth({
    id: row.id,
    width,
    textAutoResize: row.context.textAutoResize,
    containers: row.context.containers || [],
  });
  const pxPerUnit = pxPerUnitFor(units, width, row.context.fontSize, row.context.textAutoResize);
  const slotted = hasTemplateSlot(row);
  const narrowControl = control && !slotted && (typeof width !== 'number' || width <= BUTTON_MAX_PX);
  let maxCharacters = override;
  let maxUnits = null;
  let status = 'no-limit';
  let bucket = 'label';
  let layout = null;
  let lineCount = null;
  let assumption = null;
  let pixel = null;
  const reasons = [];
  if (control || (labelLike && typeof width === 'number')) {
    if (!control) {
      const info = labelLayout(row);
      layout = info.layout;
      lineCount = info.lineCount;
      assumption = info.assumption;
    } else if (String(row.context.textAutoResize || '').toUpperCase() === 'HEIGHT') {
      layout = 'wrap';
      lineCount = row.context.maxLines || 1;
    }
    pixel = measurePixels(units, {
      widthHint: units,
      width_px: width,
      fontSize: row.context.fontSize,
      textAutoResize: row.context.textAutoResize,
      availableWidth: space.availableWidth,
      unconstrained: space.unconstrained,
      pxPerUnit,
      maxLines: row.context.maxLines,
      lineCount,
      layout,
      height: row.context.height,
      lineHeightPx: row.context.lineHeightPx,
    });
    if (override !== null) maxCharacters = override;
    else if (narrowControl) maxCharacters = BUTTON_MAX_CHARACTERS;
    else if (pixel && typeof pixel.availableWidth === 'number' && pxPerUnit) {
      maxUnits = pixel.availableWidth / pxPerUnit;
      maxCharacters = Math.max(characters, Math.floor(maxUnits));
    }
    const guidelineOver = narrowControl && override === null && characters > BUTTON_MAX_CHARACTERS;
    const overrideOver = override !== null && characters > override;
    if (guidelineOver) reasons.push('10-character guideline');
    if (overrideOver) reasons.push(`max ${override}`);
    if (pixel && pixel.overflow) reasons.push(pixel.basis);
    status = guidelineOver || overrideOver || (pixel && pixel.overflow) ? 'over' : 'ok';
    bucket = control ? (row.context.kind === 'tab' ? 'tab' : 'button') : 'text';
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
    maxUnits,
    status,
    bucket,
    layout,
    lineCount,
    assumption,
    template: row.context.template || null,
    example: row.context.example || null,
    copyText: row.context.copyText || '',
    dataCharacters: row.context.dataCharacters || 0,
    gapCharacters: row.context.gapCharacters || 0,
    framePath: row.context.screen || '',
    maxLines: row.context.maxLines || null,
    pxPerUnit: pixel ? pixel.pxPerUnit : pxPerUnit,
    availableWidth: space.unconstrained ? null : space.availableWidth,
    unconstrained: Boolean(space.unconstrained),
    pixelBasis: pixel ? pixel.basis : null,
    reasons,
    slots: row.context.slots || [],
    slotMaxLengths: row.context.slotMaxLengths || null,
    fontSize: row.context.fontSize || null,
    height: row.context.height || null,
    lineHeightPx: row.context.lineHeightPx || null,
    textAutoResize: row.context.textAutoResize || null,
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
    return exceedsBudget(pseudoText(row.source), limit, row.maxUnits);
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
  const lengths = unique.map((row) => classifyRecord(row, limits, options.learned));
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
  measurePixels,
  exceedsBudget,
  checkDesignFile,
};
