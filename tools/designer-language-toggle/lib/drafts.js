/**
 * Draft translations for the designer preview.
 * Reads shipped locales. Never writes locales/languages/*.json.
 * The overlay, the needed-draft list, and the review export stay gitignored.
 */
const fs = require('fs');
const path = require('path');
const checker = require('./checker');
const { loadLearned } = require('./learned');

const COLUMNS = [
  'ID',
  'English',
  'Location',
  'Space',
  'Draft',
  'Source',
  'Fit check',
  'Shorter option',
  'Linguist edit',
  'Linguist status',
  'Comments',
];

const DRAFT_MARKER = '⟦draft⟧ ';

function emptyOverlay() {
  return { version: 1, devOnly: true, marker: false, locales: {} };
}

function overlayPath(root) {
  return path.join(root, 'locales', 'designer-drafts.overlay.json');
}

function neededPath(root) {
  return path.join(root, 'locales', 'designer-drafts.needed.json');
}

function reviewPath(root, extension) {
  return path.join(root, 'locales', `designer-drafts.review.${extension}`);
}

function componentOf(key) {
  const parts = String(key || '').split('.').filter(Boolean);
  if (parts.length <= 1) return parts[0] || '';
  return parts.slice(0, -1).join('.');
}

function spaceOf(key) {
  return String(key || '').split('.')[0] || '';
}

function locationFor(lang, key) {
  return `${lang} | locales/languages/en.json | ${componentOf(key)} | ${key}`;
}

function langFromLocation(location) {
  const first = String(location || '').split('|')[0].trim().toLowerCase();
  return /^[a-z]{2}$/.test(first) ? first : '';
}

function placeholderNames(value) {
  return Object.keys(checker.placeholderCounts(value));
}

function fitCheck(english, draft) {
  const diff = checker.placeholderDiff(english, draft);
  if (diff.missing.length || diff.extra.length) return 'placeholder mismatch';
  const enWidth = checker.displayWidth(english);
  const draftWidth = checker.displayWidth(draft);
  if (
    enWidth >= 4
    && draftWidth >= enWidth * 1.4
    && draftWidth - enWidth >= 4
    && checker.charCount(english) <= 25
  ) {
    return 'too long';
  }
  return 'fits';
}

function validatePlaceholders(english, draft) {
  const diff = checker.placeholderDiff(english, draft);
  if (diff.missing.length === 0 && diff.extra.length === 0) return null;
  const problems = [];
  if (diff.missing.length) problems.push(`missing {{${diff.missing.join('}}, {{')}}}`);
  if (diff.extra.length) problems.push(`extra {{${diff.extra.join('}}, {{')}}}`);
  return problems.join('; ');
}

function learnedMatch(learned, lang, key, english) {
  const corrections = (learned && learned.corrections) || [];
  const byKey = corrections.find((item) => item
    && item.lang === lang
    && item.key === key
    && typeof item.preferred_text === 'string'
    && item.preferred_text.trim());
  if (byKey) return byKey.preferred_text;
  const bySource = corrections.find((item) => item
    && item.lang === lang
    && item.source_text === english
    && typeof item.preferred_text === 'string'
    && item.preferred_text.trim());
  return bySource ? bySource.preferred_text : null;
}

function shippedMatch(english, lang, flats) {
  const target = (flats && flats[lang]) || {};
  const en = (flats && flats.en) || {};
  const sameKey = Object.keys(en).find((key) => en[key] === english && typeof target[key] === 'string' && target[key].trim() && target[key] !== english);
  if (sameKey) return { text: target[sameKey], source: `shipped:${sameKey}` };
  const regional = (flats && flats.regional && flats.regional[lang]) || {};
  const regionalKeys = Object.keys(regional);
  for (let index = 0; index < regionalKeys.length; index += 1) {
    const fileName = regionalKeys[index];
    const flat = regional[fileName] || {};
    const key = Object.keys(en).find((item) => en[item] === english && typeof flat[item] === 'string' && flat[item].trim() && flat[item] !== english);
    if (key) return { text: flat[key], source: `shipped:${fileName}:${key}` };
  }
  return null;
}

function resolveDraft(item, lang, context) {
  const english = item.english;
  const proposed = context.proposals
    && context.proposals[lang]
    && context.proposals[lang][item.id];
  const learnedText = learnedMatch(context.learned, lang, item.id, english);
  let text = null;
  let source = 'draft';
  if (learnedText) {
    text = learnedText;
    source = 'learned';
  } else {
    const shipped = shippedMatch(english, lang, context.flats);
    if (shipped) {
      text = shipped.text;
      source = shipped.source;
    } else if (typeof proposed === 'string' && proposed.trim()) {
      text = proposed;
      source = 'draft';
    }
  }
  if (text == null) {
    return { error: `${lang} ${item.id} needs a draft` };
  }
  const problem = validatePlaceholders(english, text);
  if (problem) {
    return { error: `${lang} ${item.id} ${problem}` };
  }
  return {
    entry: {
      text,
      source,
      english,
      location: locationFor(lang, item.id),
      space: item.space || spaceOf(item.id),
      component: item.component || componentOf(item.id),
      fit: fitCheck(english, text),
    },
  };
}

function gatherStrings(enFlat, options) {
  const langs = options.langs || [];
  const explicit = Array.isArray(options.keys) && options.keys.length > 0;
  let keys = Object.keys(enFlat || {}).filter((key) => typeof enFlat[key] === 'string');
  if (explicit) {
    keys = options.keys.filter((key) => typeof enFlat[key] === 'string');
  } else if (options.namespace) {
    keys = keys.filter((key) => checker.inScope(key, [options.namespace]));
  }
  if (!explicit) {
    keys = keys.filter((key) => langs.some((lang) => {
      const value = options.flats && options.flats[lang] && options.flats[lang][key];
      return typeof value !== 'string' || !value.trim();
    }));
  }
  return keys.map((key) => ({
    id: key,
    english: enFlat[key],
    space: spaceOf(key),
    component: componentOf(key),
    placeholders: placeholderNames(enFlat[key]),
  }));
}

function composeDrafts(items, proposals, context) {
  const overlay = emptyOverlay();
  if (context && context.marker === true) overlay.marker = true;
  const errors = [];
  const langs = context.langs || [];
  items.forEach((item) => {
    langs.forEach((lang) => {
      const resolved = resolveDraft(item, lang, { ...context, proposals });
      if (resolved.error) {
        errors.push(resolved.error);
        return;
      }
      if (!overlay.locales[lang]) overlay.locales[lang] = {};
      overlay.locales[lang][item.id] = resolved.entry;
    });
  });
  return { overlay, errors };
}

function keepLinguist(previous, incoming) {
  const next = { ...(previous || {}) };
  const fields = ['edit', 'status', 'comments', 'shorter'];
  fields.forEach((field) => {
    const value = incoming && incoming[field];
    if (typeof value === 'string' && value.trim()) next[field] = value.trim();
  });
  return next;
}

function mergeOverlay(existing, updates) {
  const base = existing && existing.locales ? existing : emptyOverlay();
  const next = {
    version: 1,
    devOnly: true,
    marker: updates && updates.marker === true ? true : base.marker === true,
    locales: {},
  };
  Object.keys(base.locales).forEach((lang) => {
    next.locales[lang] = { ...base.locales[lang] };
  });
  const incoming = (updates && updates.locales) || {};
  Object.keys(incoming).forEach((lang) => {
    if (!next.locales[lang]) next.locales[lang] = {};
    Object.keys(incoming[lang] || {}).forEach((key) => {
      const prior = next.locales[lang][key] || {};
      const entry = incoming[lang][key] || {};
      next.locales[lang][key] = {
        ...prior,
        ...entry,
        linguist: keepLinguist(prior.linguist, entry.linguist),
      };
    });
  });
  return next;
}

function setFlatKey(tree, key, value) {
  const parts = String(key).split('.');
  let node = tree;
  for (let index = 0; index < parts.length - 1; index += 1) {
    const part = parts[index];
    if (!node[part] || typeof node[part] !== 'object') node[part] = {};
    node = node[part];
  }
  node[parts[parts.length - 1]] = value;
}

function readFlatKey(tree, key) {
  const parts = String(key).split('.');
  let node = tree;
  for (let index = 0; index < parts.length; index += 1) {
    if (!node || typeof node !== 'object') return undefined;
    node = node[parts[index]];
  }
  return node;
}

function previewText(entry, marker) {
  if (!entry) return null;
  const linguist = entry.linguist && typeof entry.linguist.edit === 'string'
    ? entry.linguist.edit.trim()
    : '';
  const base = linguist || (typeof entry.text === 'string' ? entry.text : '');
  if (!base) return null;
  if (marker && entry.source === 'draft' && !linguist) return `${DRAFT_MARKER}${base}`;
  return base;
}

function applyDraftOverlay(translations, overlay, options) {
  if (!options || options.dev !== true) return translations;
  if (!overlay || overlay.devOnly !== true) return translations;
  const next = { ...translations };
  const locales = (overlay && overlay.locales) || {};
  const marker = Boolean(overlay && overlay.marker);
  Object.keys(locales).forEach((code) => {
    if (!next[code] || typeof next[code] !== 'object') return;
    const copy = JSON.parse(JSON.stringify(next[code]));
    Object.keys(locales[code] || {}).forEach((key) => {
      const text = previewText(locales[code][key], marker);
      if (typeof text !== 'string') return;
      setFlatKey(copy, key, text);
    });
    next[code] = copy;
  });
  return next;
}

function reviewRowsFromOverlay(overlay) {
  const rows = [];
  const locales = (overlay && overlay.locales) || {};
  Object.keys(locales).forEach((lang) => {
    Object.keys(locales[lang] || {}).forEach((key) => {
      const entry = locales[lang][key];
      const linguist = entry.linguist || {};
      rows.push({
        id: key,
        english: entry.english || '',
        location: entry.location || locationFor(lang, key),
        space: entry.space || spaceOf(key),
        draft: entry.text || '',
        source: entry.source || 'draft',
        fit: entry.fit || fitCheck(entry.english || '', entry.text || ''),
        shorter: linguist.shorter || '',
        linguistEdit: linguist.edit || '',
        linguistStatus: linguist.status || '',
        comments: linguist.comments || '',
      });
    });
  });
  return rows;
}

function csvEscape(value) {
  const text = value == null ? '' : String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function toCsv(rows) {
  const lines = [COLUMNS.join(',')];
  rows.forEach((row) => {
    lines.push([
      row.id,
      row.english,
      row.location,
      row.space,
      row.draft,
      row.source,
      row.fit,
      row.shorter,
      row.linguistEdit,
      row.linguistStatus,
      row.comments,
    ].map(csvEscape).join(','));
  });
  return `${lines.join('\n')}\n`;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  const source = String(text || '').replace(/^\uFEFF/, '');
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (quoted) {
      if (char === '"') {
        if (source[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        cell += char;
      }
      continue;
    }
    if (char === '"') {
      quoted = true;
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
  if (cell.length || row.length) {
    row.push(cell);
    rows.push(row);
  }
  if (rows.length === 0) return [];
  const header = rows[0];
  return rows.slice(1).filter((cells) => cells.some((value) => value !== '')).map((cells) => {
    const record = {};
    header.forEach((name, index) => {
      record[name] = cells[index] || '';
    });
    return record;
  });
}

function rowToLinguist(record) {
  return {
    shorter: record['Shorter option'] || '',
    edit: record['Linguist edit'] || '',
    status: record['Linguist status'] || '',
    comments: record.Comments || '',
  };
}

function importRecords(records, overlay, learned) {
  const next = mergeOverlay(overlay, { locales: {} });
  const corrections = learned && Array.isArray(learned.corrections)
    ? learned.corrections.slice()
    : [];
  records.forEach((record) => {
    const lang = langFromLocation(record.Location);
    const key = record.ID;
    if (!lang || !key) return;
    if (!next.locales[lang]) next.locales[lang] = {};
    const prior = next.locales[lang][key] || {
      text: record.Draft || '',
      source: record.Source || 'draft',
      english: record.English || '',
      location: record.Location || locationFor(lang, key),
      space: record.Space || spaceOf(key),
    };
    const linguist = keepLinguist(prior.linguist, rowToLinguist(record));
    const text = prior.text || record.Draft || '';
    next.locales[lang][key] = {
      ...prior,
      text,
      english: prior.english || record.English || '',
      source: prior.source || record.Source || 'draft',
      location: prior.location || record.Location,
      space: prior.space || record.Space || spaceOf(key),
      fit: fitCheck(prior.english || record.English || '', linguist.edit || text),
      linguist,
    };
    if (/^accepted$/i.test(linguist.status || '') && linguist.edit) {
      const duplicate = corrections.some((item) => item.lang === lang
        && item.key === key
        && item.preferred_text === linguist.edit);
      if (!duplicate) {
        corrections.push({
          lang,
          key,
          source_text: record.English || prior.english || '',
          rejected_text: text,
          preferred_text: linguist.edit,
          reason: 'linguist review import',
          reviewer: 'linguist',
          date: (learned && learned.date) || new Date().toISOString().slice(0, 10),
        });
      }
    }
  });
  return { overlay: next, learned: { ...(learned || {}), corrections } };
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (let index = 0; index < buffer.length; index += 1) {
    crc ^= buffer[index];
    for (let bit = 0; bit < 8; bit += 1) {
      const mask = -(crc & 1);
      crc = (crc >>> 1) ^ (0xedb88320 & mask);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function zipStore(files) {
  const parts = [];
  const centrals = [];
  let offset = 0;
  files.forEach((file) => {
    const name = Buffer.from(file.name);
    const data = Buffer.isBuffer(file.data) ? file.data : Buffer.from(file.data);
    const crc = crc32(data);
    const local = Buffer.alloc(30 + name.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 8);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    name.copy(local, 30);
    parts.push(local, data);
    const central = Buffer.alloc(46 + name.length);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(offset, 42);
    name.copy(central, 46);
    centrals.push(central);
    offset += local.length + data.length;
  });
  const centralBuf = Buffer.concat(centrals);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(centralBuf.length, 12);
  eocd.writeUInt32LE(offset, 16);
  return Buffer.concat([...parts, centralBuf, eocd]);
}

function unzipStore(buffer) {
  const files = {};
  let cursor = 0;
  while (cursor + 30 <= buffer.length) {
    const signature = buffer.readUInt32LE(cursor);
    if (signature !== 0x04034b50) break;
    const method = buffer.readUInt16LE(cursor + 8);
    const compressed = buffer.readUInt32LE(cursor + 18);
    const nameLength = buffer.readUInt16LE(cursor + 26);
    const extraLength = buffer.readUInt16LE(cursor + 28);
    const nameStart = cursor + 30;
    const name = buffer.slice(nameStart, nameStart + nameLength).toString('utf8');
    const dataStart = nameStart + nameLength + extraLength;
    const data = buffer.slice(dataStart, dataStart + compressed);
    if (method !== 0) {
      throw new Error(`Only stored zip entries can be read (${name}).`);
    }
    files[name] = data;
    cursor = dataStart + compressed;
  }
  return files;
}

function xmlEscape(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function columnName(index) {
  let name = '';
  let current = index + 1;
  while (current > 0) {
    const remainder = (current - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    current = Math.floor((current - 1) / 26);
  }
  return name;
}

function sheetXml(rows) {
  const body = rows.map((row, rowIndex) => {
    const cells = COLUMNS.map((column, columnIndex) => {
      const value = row[columnIndex];
      const ref = `${columnName(columnIndex)}${rowIndex + 1}`;
      return `<c r="${ref}" t="inlineStr"><is><t>${xmlEscape(value)}</t></is></c>`;
    }).join('');
    return `<row r="${rowIndex + 1}">${cells}</row>`;
  }).join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${body}</sheetData></worksheet>`;
}

function toXlsx(rows) {
  const table = [
    COLUMNS,
    ...rows.map((row) => [
      row.id,
      row.english,
      row.location,
      row.space,
      row.draft,
      row.source,
      row.fit,
      row.shorter,
      row.linguistEdit,
      row.linguistStatus,
      row.comments,
    ]),
  ];
  return zipStore([
    {
      name: '[Content_Types].xml',
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`,
    },
    {
      name: '_rels/.rels',
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`,
    },
    {
      name: 'xl/workbook.xml',
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Drafts" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    },
    {
      name: 'xl/_rels/workbook.xml.rels',
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>`,
    },
    { name: 'xl/worksheets/sheet1.xml', data: sheetXml(table) },
  ]);
}

function parseXlsx(buffer) {
  const files = unzipStore(buffer);
  const sheet = files['xl/worksheets/sheet1.xml'];
  if (!sheet) throw new Error('The review workbook has no sheet.');
  const xml = sheet.toString('utf8');
  const byRow = new Map();
  const cellRe = /<c r="([A-Z]+)(\d+)"[^>]*>(?:<is><t(?:[^>]*)>([\s\S]*?)<\/t><\/is>)?/g;
  let match = cellRe.exec(xml);
  while (match) {
    const column = match[1];
    const rowNumber = Number(match[2]);
    let index = 0;
    for (let cursor = 0; cursor < column.length; cursor += 1) {
      index = index * 26 + (column.charCodeAt(cursor) - 64);
    }
    if (!byRow.has(rowNumber)) byRow.set(rowNumber, []);
    const text = (match[3] || '')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&');
    byRow.get(rowNumber)[index - 1] = text;
    match = cellRe.exec(xml);
  }
  const numbers = [...byRow.keys()].sort((a, b) => a - b);
  if (numbers.length === 0) return [];
  const header = byRow.get(numbers[0]);
  return numbers.slice(1).map((number) => {
    const cells = byRow.get(number);
    const record = {};
    header.forEach((name, index) => {
      record[name] = (cells && cells[index]) || '';
    });
    return record;
  });
}

function readReview(filePath) {
  const raw = fs.readFileSync(filePath);
  if (filePath.endsWith('.xlsx')) return parseXlsx(raw);
  return parseCsv(raw.toString('utf8'));
}

function writeReview(filePath, rows) {
  if (filePath.endsWith('.xlsx')) {
    fs.writeFileSync(filePath, toXlsx(rows));
    return;
  }
  fs.writeFileSync(filePath, `\uFEFF${toCsv(rows)}`);
}

function loadOverlay(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return emptyOverlay();
  const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  return mergeOverlay(emptyOverlay(), parsed);
}

function saveOverlay(filePath, overlay) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(overlay, null, 2)}\n`);
}

function saveLearned(dir, learned) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'corrections.json'),
    `${JSON.stringify(learned.corrections || [], null, 2)}\n`,
  );
}

function modelDraftEnabled(env) {
  return Boolean(env && env.DESIGNER_DRAFT_MODEL_URL);
}

function assertDevOnly(overlay) {
  if (!overlay || overlay.devOnly !== true) {
    throw new Error('Draft overlays are dev-only. Refusing to apply this file.');
  }
}

module.exports = {
  COLUMNS,
  DRAFT_MARKER,
  emptyOverlay,
  overlayPath,
  neededPath,
  reviewPath,
  placeholderNames,
  validatePlaceholders,
  fitCheck,
  gatherStrings,
  resolveDraft,
  composeDrafts,
  mergeOverlay,
  applyDraftOverlay,
  readFlatKey,
  reviewRowsFromOverlay,
  toCsv,
  parseCsv,
  toXlsx,
  parseXlsx,
  readReview,
  writeReview,
  importRecords,
  loadOverlay,
  saveOverlay,
  saveLearned,
  loadLearned,
  modelDraftEnabled,
  assertDevOnly,
  locationFor,
};
