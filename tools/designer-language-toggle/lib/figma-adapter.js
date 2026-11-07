/**
 * Read TEXT from a Figma file and turn it into the design-file shape.
 * The token is read from the environment and is never printed.
 */
const fs = require('fs');
const path = require('path');
const checker = require('./checker');

const DEFAULT_RULES = {
  includeMarker: '[copy]',
  excludeMarker: '[skip]',
  button: {
    layerNames: ['Label'],
    pathIncludes: ['Button Label', 'ButtonBase', 'FilterButton', 'Segmented Control'],
  },
  title: {
    layerNames: ['title'],
    pathIncludes: ['titleRow', 'SectionHeader', 'headerRow'],
  },
  navTitle: {
    layerNames: ['Label'],
    pathIncludes: ['Header'],
    pathExcludes: ['SectionHeader'],
  },
  skipLayerNames: ['fallbackText'],
  skipExactText: ['Heading Sm', 'Title'],
  placeholderPatterns: [
    '\\bTeam A\\b',
    '\\bTeam B\\b',
    '\\bPlayer\\s*\\d+\\b',
    '\\bPlayer\\s+[A-Z]\\b',
    '\\bPlayer N\\b',
    '\\bHeading Sm\\b',
    '^Title$',
    '\\blorem\\b',
    '\\bJohn Doe\\b',
    '\\bJane Doe\\b',
  ],
  controlAncestors: [
    'Button',
    'Buttons',
    'ButtonBase',
    'Button Label',
    'Button Group',
    'FilterButton',
    'Segmented',
    'Segmented Control',
    'Tab',
    'Tabs',
    'TabsBar',
    'Chip',
    'Chips',
    'Pill',
    'Pills',
    'CTA',
    'Action',
    'Actions',
  ],
  tabAncestors: ['Tab', 'Tabs', 'TabsBar'],
  buttonMarker: '[button]',
  dataPatterns: [
    '\\$',
    '¢',
    '%',
    '\\d+\\.\\d+',
    '^[OU] \\d',
    '\\d+\\s*[\\-\\u2013]\\s*\\d+',
    '^\\d+$',
    "\\d+'",
    '\\d{1,2}:\\d{2}',
    '\\d{1,2}/\\d{1,2}',
    '\\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\\.?\\s+\\d{1,2}\\b',
    '\\d{4}-\\d{2}-\\d{2}',
    '(?:^|\\s)[+-]\\d{2,4}\\b',
  ],
  buttonMaxPx: 120,
  buttonMaxCharacters: 10,
  chunkAfterChildren: 8,
  chunkSize: 5,
  slotMaxLengths: {
    price: 9,
    pct: 4,
    num: 6,
    range: 5,
    name: 18,
  },
  timeRangeTokens: ['1H', '1D', '1W', '1M', '3M', '1Y', 'YTD', 'ALL'],
  nameHints: ['Roster', 'Player', 'Matchup', 'Scoreboard'],
  fonts: {},
  contextHints: {
    predict: ['predict', 'kalshi'],
    perps: ['perps', 'perpetual'],
  },
  dataTokens: [
    { name: 'name', pattern: '<[^>\\n]+>' },
    { name: 'price', pattern: '\\$\\s?\\d[\\d,]*(?:\\.\\d+)?\\s?[kKmMbB]?|\\d[\\d,]*(?:\\.\\d+)?\\s?¢' },
    { name: 'num', pattern: '\\b\\d[\\d,]*(?:\\.\\d+)?[kKmMbB]\\b' },
    { name: 'pct', pattern: '\\d[\\d,]*(?:\\.\\d+)?\\s?%' },
    { name: 'mult', pattern: '\\b\\d+(?:\\.\\d+)?x\\b' },
    { name: 'num', pattern: '\\b\\d+(?=\\+\\s*(?:points|goals)\\b)' },
    { name: 'ou', pattern: '\\b[OU]\\s+\\d+(?:\\.\\d+)?\\b' },
    { name: 'range', pattern: '\\b\\d+\\s*[-\\u2013]\\s*\\d+\\b' },
    { name: 'clock', pattern: '\\b\\d{1,2}:\\d{2}\\b' },
    { name: 'date', pattern: '\\b\\d{4}-\\d{2}-\\d{2}\\b|\\b\\d{1,2}/\\d{1,2}\\b|\\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\\.?\\s+\\d{1,2}\\b' },
    { name: 'minutes', pattern: "\\b\\d+'" },
    { name: 'odds', pattern: '(?<![\\p{L}\\p{N}])[+\\-]\\d{2,4}\\b' },
    { name: 'decimal', pattern: '\\b\\d+\\.\\d+\\b' },
  ],
};

const DATA_GLUE = new Set([
  'by', 'to', 'vs', 'at', 'o', 'u', 'over', 'under', 'from',
  'am', 'pm', 'et', 'pt', 'ct', 'mt', 'utc',
]);

function parseFigmaUrl(input) {
  let url;
  try {
    url = new URL(String(input).trim());
  } catch (error) {
    throw new Error('Paste a full Figma link, including https://www.figma.com/design/...');
  }
  const parts = url.pathname.split('/').filter(Boolean);
  const designIndex = parts.findIndex((part) => part === 'design' || part === 'file');
  if (designIndex < 0 || !parts[designIndex + 1]) {
    throw new Error('That link is not a Figma design file. Copy the link from the browser bar.');
  }
  let fileKey = parts[designIndex + 1];
  const branchIndex = parts.indexOf('branch');
  if (branchIndex >= 0 && parts[branchIndex + 1]) {
    fileKey = parts[branchIndex + 1];
  }
  const rawNode = url.searchParams.get('node-id');
  if (!rawNode) {
    throw new Error('The link needs a frame, section, or page selected. In Figma, select it and copy the link again.');
  }
  const nodeId = rawNode.replace(/-/g, ':');
  return { fileKey, nodeId };
}

function statusMessage(status) {
  if (status === 403) {
    return "Figma refused this token. Confirm you can open the file, and that the token is a personal access token with the read-only file content scope.";
  }
  if (status === 404) {
    return "Figma couldn't find that file or frame. Check the link.";
  }
  if (status === 429) {
    return 'Figma is rate-limiting requests. Wait a minute and try the same link again.';
  }
  return `Figma returned status ${status}. Wait a minute and try the same link again.`;
}

function readToken(root) {
  const fromEnv = process.env.FIGMA_TOKEN;
  if (typeof fromEnv === 'string' && fromEnv.trim()) return fromEnv.trim();
  const envPath = path.join(root, '.env');
  if (!fs.existsSync(envPath)) return '';
  const text = fs.readFileSync(envPath, 'utf8');
  const match = text.match(/^FIGMA_TOKEN=(.*)$/m);
  if (!match) return '';
  return match[1].trim().replace(/^['"]|['"]$/g, '');
}

function missingTokenMessage() {
  return [
    "FIGMA_TOKEN isn't set, so this check can't read the Figma file directly.",
    'If this agent has a Figma connection, pull the text nodes yourself and save them as JSON with id, layer_name, frame_path, text, chars, kind, width, and visible. Then run check-file.js on that file.',
    'Otherwise create a Figma personal access token with the read-only file content scope.',
    'In Replit, put it in Secrets as FIGMA_TOKEN.',
    'In Cursor, put FIGMA_TOKEN in a gitignored .env at the repo root.',
    'Never paste the token into chat.',
  ].join(' ');
}

function hasPrivateUseGlyph(text) {
  for (const char of String(text)) {
    const code = char.codePointAt(0);
    if (code >= 0xf0000) return true;
  }
  return false;
}

function pathParts(framePath) {
  return String(framePath || '')
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean);
}

function pathIncludes(framePath, needles) {
  const haystack = String(framePath || '');
  return (needles || []).some((needle) => needle && haystack.includes(needle));
}

function isNavHeader(framePath, rules) {
  const excludes = (rules.navTitle && rules.navTitle.pathExcludes) || [];
  const includes = (rules.navTitle && rules.navTitle.pathIncludes) || [];
  return pathParts(framePath).some((part) => {
    if (excludes.some((needle) => part.includes(needle))) return false;
    return includes.some((needle) => part.includes(needle));
  });
}

function layerIs(layer, names) {
  return (names || []).includes(layer);
}

function compilePatterns(rules) {
  return (rules.dataPatterns || [])
    .map((source) => {
      try {
        return new RegExp(source, 'i');
      } catch (error) {
        throw new Error(`A data pattern in figma-rules.json is not valid: ${source}`);
      }
    });
}

function substantiveCopy(copyText) {
  const words = String(copyText || '').match(/\p{L}+/gu) || [];
  return words.some((word) => word.length >= 2 && !DATA_GLUE.has(word.toLowerCase()));
}

function tokenSpecs(rules) {
  const list = (rules && rules.dataTokens) || DEFAULT_RULES.dataTokens;
  return list.map((item) => ({
    name: item.name,
    pattern: new RegExp(item.pattern, 'giu'),
  }));
}

function splitCopyAndData(text, rules) {
  const source = String(text || '');
  const hits = [];
  tokenSpecs(rules).forEach((spec) => {
    spec.pattern.lastIndex = 0;
    let match = spec.pattern.exec(source);
    while (match) {
      if (match[0].length > 0) {
        hits.push({
          start: match.index,
          end: match.index + match[0].length,
          name: spec.name,
          value: match[0],
        });
      } else {
        spec.pattern.lastIndex += 1;
      }
      match = spec.pattern.exec(source);
    }
  });
  hits.sort((a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start));
  const taken = [];
  hits.forEach((hit) => {
    if (taken.some((item) => hit.start < item.end && hit.end > item.start)) return;
    taken.push(hit);
  });
  taken.sort((a, b) => a.start - b.start);
  return finishSplit(source, taken);
}

function finishSplit(source, taken) {
  let template = '';
  let rawCopy = '';
  let cursor = 0;
  let dataCharacters = 0;
  taken.forEach((hit) => {
    const between = source.slice(cursor, hit.start);
    template += between;
    rawCopy += between;
    template += `{${hit.name}}`;
    dataCharacters += checker.characterCount(hit.value);
    cursor = hit.end;
  });
  const tail = source.slice(cursor);
  template += tail;
  rawCopy += tail;
  const copyText = rawCopy.replace(/\s+/g, ' ').trim();
  const tokenSpaces = taken.reduce(
    (sum, hit) => sum + ((String(hit.value).match(/\s/g) || []).length),
    0,
  );
  const allSpaces = (String(source).match(/\s/g) || []).length;
  const internalSpaces = (copyText.match(/\s/g) || []).length;
  return {
    template: template.replace(/\s+/g, ' ').trim(),
    copyText,
    tokens: taken,
    dataCharacters,
    gapCharacters: Math.max(0, allSpaces - tokenSpaces - internalSpaces),
    hasName: taken.some((token) => token.name === 'name'),
  };
}

function placeholderHits(text, rules) {
  const hits = [];
  (rules.placeholderPatterns || []).forEach((source) => {
    let pattern;
    try {
      pattern = new RegExp(source, 'giu');
    } catch (error) {
      return;
    }
    let match = pattern.exec(text);
    while (match) {
      if (match[0]) {
        hits.push({
          start: match.index,
          end: match.index + match[0].length,
          name: 'name',
          value: match[0],
        });
      } else {
        pattern.lastIndex += 1;
      }
      match = pattern.exec(text);
    }
  });
  return hits;
}

function wordShips(word, rules) {
  const known = rules && rules.shippedWords;
  if (!known) return false;
  if (typeof known.has === 'function') return known.has(word) || known.has(word.toLowerCase());
  return false;
}

function hasVersus(source) {
  return /\bvs\.?\b/i.test(source);
}

function promoteFixedSlots(source, split, rules) {
  const hasData = split.tokens.some((token) => token.name !== 'name');
  if (!hasData && !hasVersus(source)) return split;
  const extra = [];
  const wordPattern = /\p{L}[\p{L}\p{N}]*/gu;
  let match = wordPattern.exec(source);
  while (match) {
    const word = match[0];
    const start = match.index;
    const end = start + word.length;
    const overlaps = split.tokens.some((token) => start < token.end && end > token.start);
    const code = /^[A-Z]{2,4}$/.test(word) && !DATA_GLUE.has(word.toLowerCase());
    const proper = /^\p{Lu}\p{Ll}{2,}$/u.test(word) || /^\p{Lu}[\p{L}\p{N}]*\p{Lu}/u.test(word);
    const known = rules && rules.shippedWords;
    const shipped = known ? wordShips(word, rules) : false;
    const unmatchedProper = proper && known && !shipped;
    if (!overlaps && !shipped && (code || unmatchedProper)) {
      extra.push({ start, end, name: 'name', value: word });
    }
    match = wordPattern.exec(source);
  }
  if (extra.length === 0) return split;
  const taken = mergeAdjacentNames(source, split.tokens.concat(extra));
  taken.sort((a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start));
  const kept = [];
  taken.forEach((hit) => {
    if (kept.some((item) => hit.start < item.end && hit.end > item.start)) return;
    kept.push(hit);
  });
  return finishSplit(source, kept);
}

function mergeAdjacentNames(source, tokens) {
  const names = tokens.filter((token) => token.name === 'name').sort((a, b) => a.start - b.start);
  const others = tokens.filter((token) => token.name !== 'name');
  const merged = [];
  names.forEach((token) => {
    const previous = merged[merged.length - 1];
    const between = previous ? source.slice(previous.end, token.start) : null;
    if (previous && /^(\s*[\/·]\s*|\s+)$/.test(between)) {
      previous.end = token.end;
      previous.value = source.slice(previous.start, previous.end);
      return;
    }
    merged.push({ ...token });
  });
  return others.concat(merged);
}

function matchesEntireText(value, patterns) {
  return patterns.some((pattern) => {
    pattern.lastIndex = 0;
    const match = pattern.exec(value);
    return Boolean(match) && match.index === 0 && match[0] === value;
  });
}

function isPureData(text, rules) {
  const value = String(text || '').trim();
  if (!value) return true;
  if (/^[^\p{L}\p{N}]+$/u.test(value)) return true;
  if (/^\d+(?:\.\d+)?x$/i.test(value)) return true;
  const patterns = rules._compiledPatterns || compilePatterns(rules);
  if (matchesEntireText(value, patterns)) return true;
  const split = rules._split || splitCopyAndData(value, rules);
  if (split.hasName) return false;
  if (substantiveCopy(split.copyText)) return false;
  if (split.tokens.length > 0) return true;
  return patterns.some((pattern) => {
    pattern.lastIndex = 0;
    return pattern.test(value);
  });
}

function tokenize(value) {
  return String(value || '')
    .replace(/([a-z\d])([A-Z])/g, '$1 $2')
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
    .map((token) => token.toLowerCase());
}

function sameToken(left, right) {
  if (left === right) return true;
  if (left === `${right}s`) return true;
  if (right === `${left}s`) return true;
  return false;
}

function ancestorMatches(framePath, names) {
  const parts = pathParts(framePath);
  return (names || []).some((name) => {
    const stems = tokenize(name);
    if (stems.length === 0) return false;
    return parts.some((part) => {
      const tokens = tokenize(part);
      let from = 0;
      return stems.every((stem) => {
        const found = tokens.findIndex(
          (token, index) => index >= from && sameToken(token, stem),
        );
        if (found < 0) return false;
        from = found + 1;
        return true;
      });
    });
  });
}

function compileList(patterns) {
  return (patterns || [])
    .map((source) => {
      try {
        return new RegExp(source, 'i');
      } catch (error) {
        throw new Error(`A pattern in figma-rules.json is not valid: ${source}`);
      }
    });
}

function isOnlyPlaceholder(text, split) {
  const value = String(text || '').trim();
  if (!value) return false;
  if (!split || split.tokens.length === 0) return false;
  if (!split.tokens.every((token) => token.name === 'name')) return false;
  return !/\p{L}/u.test(split.copyText || '');
}

function classifyTextNode(node, rules) {
  const text = node.text !== undefined ? String(node.text) : '';
  const layer = node.layer_name || '';
  const frame = node.frame_path || '';
  const markerSource = `${frame} / ${layer}`;
  if (markerSource.includes(rules.excludeMarker || '[skip]')) {
    return { ...node, kind: 'forced_skip', chars: checker.characterCount(text) };
  }
  const forced = markerSource.includes(rules.includeMarker || '[copy]');
  if (!forced && (rules.skipLayerNames || []).includes(layer)) {
    return { ...node, kind: 'placeholder_or_annotation', chars: checker.characterCount(text) };
  }
  if (!forced && hasPrivateUseGlyph(text)) {
    return { ...node, kind: 'placeholder_or_annotation', chars: checker.characterCount(text) };
  }
  const patterns = node._compiledPatterns || compilePatterns(rules);
  const withPlaceholders = splitCopyAndData(text, { ...rules, _compiledPatterns: patterns });
  const placeholderTokens = placeholderHits(text, rules);
  const merged = withPlaceholders.tokens.concat(placeholderTokens);
  merged.sort((a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start));
  const kept = [];
  merged.forEach((hit) => {
    if (kept.some((item) => hit.start < item.end && hit.end > item.start)) return;
    kept.push(hit);
  });
  let split = finishSplit(text, kept);
  split = promoteFixedSlots(text, split, rules);
  if (!forced && isTimeRange(text, rules)) {
    return { ...node, kind: 'button', chars: checker.characterCount(text) };
  }
  if (!forced && isPlainName(text, frame, rules, layer)) {
    return { ...node, kind: 'name', chars: checker.characterCount(text) };
  }
  const mixedName = !forced ? splitMixedName(text, frame, layer, rules) : null;
  if (!forced && isOnlyPlaceholder(text, split)) {
    return { ...node, kind: 'placeholder_or_annotation', chars: checker.characterCount(text) };
  }
  if (!forced && isPureData(text, { ...rules, _compiledPatterns: patterns, _split: split })) {
    return { ...node, kind: 'number_or_data', chars: checker.characterCount(text) };
  }
  const marker = String(rules.buttonMarker || '[button]').toLowerCase();
  const marked = `${layer} ${frame}`.toLowerCase().includes(marker);
  const underControl = ancestorMatches(frame, rules.controlAncestors);
  const underTab = ancestorMatches(frame, rules.tabAncestors);
  let kind = 'label';
  if (marked) {
    kind = 'button';
  } else if (underTab) {
    kind = 'tab';
  } else if (underControl) {
    kind = 'button';
  } else if (layerIs(layer, rules.title.layerNames) && pathIncludes(frame, rules.title.pathIncludes)) {
    kind = 'title';
  } else if (layerIs(layer, rules.navTitle.layerNames) && isNavHeader(frame, rules)) {
    kind = 'title';
  } else if (checker.characterCount(text) > 25) {
    kind = 'body';
  }
  if (mixedName) {
    return {
      ...node,
      kind,
      chars: checker.characterCount(text),
      template: mixedName.template,
      example: mixedName.example,
      copyText: mixedName.copyText,
      dataCharacters: mixedName.dataCharacters,
      gapCharacters: mixedName.gapCharacters,
      slots: mixedName.slots,
      slotMaxLengths: rules.slotMaxLengths || DEFAULT_RULES.slotMaxLengths,
    };
  }
  const mixed = split.tokens.length > 0;
  return {
    ...node,
    kind,
    chars: checker.characterCount(text),
    template: mixed ? split.template : null,
    example: mixed ? text : null,
    copyText: mixed ? split.copyText : '',
    dataCharacters: mixed ? split.dataCharacters : 0,
    gapCharacters: mixed ? split.gapCharacters : 0,
    slots: mixed ? split.tokens.map((token) => ({
      name: token.name,
      characters: checker.characterCount(token.value),
    })) : [],
    slotMaxLengths: rules.slotMaxLengths || DEFAULT_RULES.slotMaxLengths,
  };
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function hintMatchesPath(frame, hint) {
  const segments = String(frame || '').split('/').map((part) => part.trim()).filter(Boolean);
  const raw = String(hint || '').trim();
  if (!raw || segments.length === 0) return false;
  if (raw.includes('*')) {
    const body = raw.split('*').map((part) => escapeRegExp(part)).join('.*');
    const pattern = new RegExp(`^${body}$`, 'i');
    return pattern.test(segments.join(' / ')) || segments.some((part) => pattern.test(part));
  }
  const hintSegments = raw.split('/').map((part) => part.trim().toLowerCase()).filter(Boolean);
  if (hintSegments.length === 1) {
    return segments.some((part) => part.toLowerCase() === hintSegments[0]);
  }
  for (let index = 0; index <= segments.length - hintSegments.length; index += 1) {
    if (hintSegments.every((part, offset) => segments[index + offset].toLowerCase() === part)) return true;
  }
  return false;
}

function nameContext(frame, layer, rules) {
  if (/\[name\]/i.test(`${frame || ''} ${layer || ''}`)) return true;
  return (rules.nameHints || []).some((hint) => hintMatchesPath(frame, hint));
}

function isNameToken(token) {
  return /^\p{Lu}[\p{Ll}'’.-]*$/u.test(token)
    || /^\p{Lu}\.$/u.test(token)
    || /^[A-Z]{1,4}$/.test(token);
}

function isPlainName(text, frame, rules, layer) {
  if (!nameContext(frame, layer, rules)) return false;
  const trimmed = String(text || '').trim();
  if (!trimmed) return false;
  if (rules.shippedWords && (rules.shippedWords.has(trimmed) || rules.shippedWords.has(trimmed.toLowerCase()))) {
    return false;
  }
  const tokens = trimmed.split(/\s+/);
  return tokens.length > 0 && tokens.every((token) => isNameToken(token));
}

function isShippedValue(text, rules) {
  const known = rules && rules.shippedWords;
  if (!known || typeof known.has !== 'function') return false;
  const trimmed = String(text || '').trim();
  return known.has(trimmed) || known.has(trimmed.toLowerCase());
}

function isShortCopyWord(text) {
  const trimmed = String(text || '').trim();
  if (!/^\p{L}[\p{L}'’-]*$/u.test(trimmed)) return false;
  const count = checker.characterCount(trimmed);
  return count >= 2 && count <= 12;
}

function splitMixedName(text, frame, layer, rules) {
  const parts = String(text || '').split(/\s*·\s*/);
  if (parts.length < 2) return null;
  const name = parts[0].trim();
  const copy = parts.slice(1).join(' · ').trim();
  if (!name || !copy) return null;
  if (!name.split(/\s+/).every((token) => isNameToken(token))) return null;
  if (isShippedValue(name, rules)) return null;
  const contextual = nameContext(frame, layer, rules);
  if (!contextual && !isShortCopyWord(copy) && !isShippedValue(copy, rules)) return null;
  return {
    template: `{name} · ${copy}`,
    copyText: copy,
    example: String(text),
    slots: [{ name: 'name', characters: checker.characterCount(name) }],
    dataCharacters: checker.characterCount(name),
    gapCharacters: checker.characterCount(String(text)) - checker.characterCount(name) - checker.characterCount(copy),
  };
}

function isTimeRange(text, rules) {
  const value = String(text || '').trim().toUpperCase();
  return (rules.timeRangeTokens || DEFAULT_RULES.timeRangeTokens).some((token) => token.toUpperCase() === value);
}

function layoutSnapshot(node, pathChildId) {
  const box = node.absoluteBoundingBox || {};
  return {
    id: node.id || '',
    width: typeof box.width === 'number' ? box.width : null,
    height: typeof box.height === 'number' ? box.height : null,
    layoutMode: node.layoutMode || null,
    paddingLeft: node.paddingLeft || 0,
    paddingRight: node.paddingRight || 0,
    itemSpacing: node.itemSpacing || 0,
    primaryAxisSizingMode: node.primaryAxisSizingMode || null,
    counterAxisSizingMode: node.counterAxisSizingMode || null,
    layoutSizingHorizontal: node.layoutSizingHorizontal || null,
    layoutSizingVertical: node.layoutSizingVertical || null,
    clipsContent: Boolean(node.clipsContent),
    overflowDirection: node.overflowDirection || null,
    pathChildId: pathChildId || '',
    children: (node.children || []).map((child) => ({
      id: child.id || '',
      width: child.absoluteBoundingBox && typeof child.absoluteBoundingBox.width === 'number'
        ? child.absoluteBoundingBox.width
        : null,
      visible: child.visible !== false,
      absolute: child.layoutPositioning === 'ABSOLUTE',
      layoutSizingHorizontal: child.layoutSizingHorizontal || null,
      layoutMode: child.layoutMode || null,
      primaryAxisSizingMode: child.primaryAxisSizingMode || null,
      childCount: (child.children || []).filter((grand) => grand.visible !== false && grand.layoutPositioning !== 'ABSOLUTE').length,
    })),
  };
}

function visibleChildren(parent) {
  return (parent.children || []).filter((child) => child.visible !== false && !child.absolute);
}

function hugsWidth(parent) {
  if (parent.layoutSizingHorizontal === 'HUG') return true;
  if (parent.layoutMode === 'HORIZONTAL' && parent.primaryAxisSizingMode === 'AUTO') return true;
  if (parent.layoutMode === 'VERTICAL' && parent.counterAxisSizingMode === 'AUTO') return true;
  return false;
}

function hugsHeight(parent) {
  if (parent.layoutSizingVertical === 'HUG') return true;
  if (parent.layoutMode === 'VERTICAL' && parent.primaryAxisSizingMode === 'AUTO') return true;
  if (parent.layoutMode === 'HORIZONTAL' && parent.counterAxisSizingMode === 'AUTO') return true;
  return false;
}

function stopsWalk(parent) {
  if (hugsWidth(parent)) return false;
  if (parent.layoutSizingHorizontal === 'FIXED' || parent.layoutSizingHorizontal === 'FILL') return true;
  if (parent.layoutMode === 'HORIZONTAL' && parent.primaryAxisSizingMode === 'FIXED') return true;
  if (parent.layoutMode === 'VERTICAL' && parent.counterAxisSizingMode === 'FIXED') return true;
  if (parent.clipsContent) return true;
  return false;
}

function availableFromParent(parent) {
  if (typeof parent.width !== 'number') return null;
  const pad = (parent.paddingLeft || 0) + (parent.paddingRight || 0);
  const inner = parent.width - pad;
  const visible = visibleChildren(parent);
  if (parent.layoutMode === 'HORIZONTAL') {
    const others = visible.filter((child) => child.id !== parent.pathChildId);
    const siblingWidth = others.reduce((sum, child) => sum + (child.width || 0), 0);
    const gaps = (parent.itemSpacing || 0) * Math.max(visible.length - 1, 0);
    return inner - siblingWidth - gaps;
  }
  return inner;
}

function levelReservation(parent) {
  const pad = (parent.paddingLeft || 0) + (parent.paddingRight || 0);
  const visible = visibleChildren(parent);
  if (parent.layoutMode !== 'HORIZONTAL') return pad;
  const others = visible.filter((child) => child.id !== parent.pathChildId);
  const siblingWidth = others.reduce((sum, child) => sum + (child.width || 0), 0);
  const gaps = (parent.itemSpacing || 0) * Math.max(visible.length - 1, 0);
  return pad + siblingWidth + gaps;
}

function contentSpan(parent) {
  const visible = visibleChildren(parent);
  const sum = visible.reduce((total, child) => total + (child.width || 0), 0);
  const gaps = (parent.itemSpacing || 0) * Math.max(visible.length - 1, 0);
  const pad = (parent.paddingLeft || 0) + (parent.paddingRight || 0);
  return sum + gaps + pad;
}

function rowOverflows(parent) {
  if (parent.layoutMode !== 'HORIZONTAL' || typeof parent.width !== 'number') return false;
  return contentSpan(parent) > parent.width + 0.5;
}

function scrolls(parent) {
  return String(parent.overflowDirection || '').toUpperCase().includes('SCROLL');
}

function isSelfSized(child) {
  if (child.layoutSizingHorizontal === 'HUG') return true;
  if (child.layoutMode === 'HORIZONTAL' && child.primaryAxisSizingMode === 'AUTO') return true;
  return false;
}

function tabLikeRow(parent) {
  const visible = visibleChildren(parent);
  if (visible.length < 2) return false;
  if (!visible.every((child) => isSelfSized(child) && child.childCount <= 1)) return false;
  const widths = visible.map((child) => child.width || 0).filter((width) => width > 0);
  if (widths.length < 2) return false;
  return Math.max(...widths) <= Math.min(...widths) * 2;
}

function scrollCandidate(parent) {
  if (!rowOverflows(parent)) return false;
  if (scrolls(parent)) return true;
  return tabLikeRow(parent);
}

function nearestFixedAncestor(containers, index) {
  for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
    const parent = containers[cursor];
    if (hugsWidth(parent)) continue;
    if (typeof parent.width === 'number') return parent;
  }
  return null;
}

function hugWiderThanFixed(parent, containers, index) {
  if (!hugsWidth(parent) || parent.layoutMode !== 'HORIZONTAL' || typeof parent.width !== 'number') return false;
  const fixed = nearestFixedAncestor(containers, index);
  if (!fixed) return false;
  const inner = fixed.width - (fixed.paddingLeft || 0) - (fixed.paddingRight || 0);
  return parent.width > inner + 0.5;
}

const ROW_WIDER_NOTE = 'row is wider than its container; may scroll';

function ownWidthRow(record, parent, clips) {
  return {
    availableWidth: record.width,
    unconstrained: false,
    scrolling: !parent.clipsContent || scrolls(parent),
    pixelBasis: 'measured',
    clips,
    reason: ROW_WIDER_NOTE,
    rowKey: parent.id || '',
  };
}

function noRoom(clips) {
  return {
    availableWidth: null,
    unconstrained: true,
    pixelBasis: 'estimate',
    clips,
    reason: 'no room in English layout',
  };
}

function clipsVertically(parent, textHeight) {
  if (!parent.clipsContent || hugsHeight(parent)) return false;
  if (typeof parent.height !== 'number' || typeof textHeight !== 'number') return false;
  return parent.height <= textHeight + 1;
}

function resolveAvailableWidth(record) {
  const mode = String(record.textAutoResize || '').toUpperCase();
  const containers = record.containers || [];
  const horizontalClips = containers.some((parent) => parent.clipsContent && !hugsWidth(parent));
  const verticalClips = containers.some((parent) => clipsVertically(parent, record.height));
  const clips = mode === 'HEIGHT' ? verticalClips : horizontalClips;
  if (mode !== 'WIDTH_AND_HEIGHT') {
    if (typeof record.width === 'number' && record.width > 0) {
      return {
        availableWidth: record.width,
        unconstrained: false,
        pixelBasis: 'measured',
        clips,
        verticalClips,
      };
    }
    return noRoom(clips);
  }
  let reserved = 0;
  for (let index = containers.length - 1; index >= 0; index -= 1) {
    const parent = containers[index];
    if (hugWiderThanFixed(parent, containers, index)) {
      return ownWidthRow(record, parent, clips);
    }
    if (!hugsWidth(parent) && scrollCandidate(parent) && (scrolls(parent) || tabLikeRow(parent))) {
      return ownWidthRow(record, parent, clips);
    }
    if (hugsWidth(parent)) {
      reserved += levelReservation(parent);
      continue;
    }
    if (!stopsWalk(parent)) continue;
    const base = availableFromParent(parent);
    if (typeof base !== 'number') return noRoom(clips);
    const available = base - reserved;
    if (!(available > 0)) return noRoom(clips);
    return { availableWidth: available, unconstrained: false, pixelBasis: 'measured', clips, verticalClips };
  }
  return {
    availableWidth: null,
    unconstrained: true,
    pixelBasis: 'estimate',
    clips,
    reason: 'unconstrained auto-width, verify visually',
  };
}

function collectTextNodes(node, ancestors, ancestorHidden, out, layouts) {
  if (!node || typeof node !== 'object') return;
  const name = node.name || '';
  const hidden = ancestorHidden || node.visible === false;
  const chain = layouts || [];
  if (node.type === 'TEXT') {
    const box = node.absoluteBoundingBox || {};
    const style = node.style || {};
    const textAutoResize = node.textAutoResize || node.textAutoResizing || style.textAutoResize || style.textAutoResizing || null;
    out.push({
      id: node.id || '',
      layer_name: name,
      frame_path: ancestors.filter(Boolean).join(' / '),
      text: node.characters || '',
      chars: checker.characterCount(node.characters || ''),
      width: typeof box.width === 'number' ? box.width : null,
      height: typeof box.height === 'number' ? box.height : null,
      textAutoResize,
      lineHeightPx: typeof style.lineHeightPx === 'number' ? style.lineHeightPx : null,
      lineHeightUnit: style.lineHeightUnit || null,
      lineHeightPercent: typeof style.lineHeightPercent === 'number' ? style.lineHeightPercent : null,
      fontSize: typeof style.fontSize === 'number' ? style.fontSize : null,
      maxLines: typeof style.maxLines === 'number'
        ? style.maxLines
        : (typeof node.maxLines === 'number' ? node.maxLines : null),
      containers: chain,
      visible: !hidden,
    });
    return;
  }
  const nextAncestors = name ? [...ancestors, name] : ancestors;
  (node.children || []).forEach((child) => {
    const nextLayouts = [...chain, layoutSnapshot(node, child.id)];
    collectTextNodes(child, nextAncestors, hidden || child.visible === false, out, nextLayouts);
  });
}

function nodeDocument(payload, nodeId) {
  const nodes = (payload && payload.nodes) || {};
  if (nodes[nodeId] && nodes[nodeId].document) return nodes[nodeId].document;
  const dashed = nodeId.replace(/:/g, '-');
  if (nodes[dashed] && nodes[dashed].document) return nodes[dashed].document;
  const found = Object.keys(nodes)
    .map((key) => nodes[key])
    .find((item) => item && item.document);
  if (!found) {
    throw new Error("Figma didn't return that frame. Select a page, section, or frame and copy the link again.");
  }
  return found.document;
}

async function figmaGet(fileKey, ids, token, fetchImpl, depth) {
  const fetchFn = fetchImpl || fetch;
  const depthQuery = depth ? `&depth=${depth}` : '';
  const url = `https://api.figma.com/v1/files/${encodeURIComponent(fileKey)}/nodes?ids=${encodeURIComponent(ids.join(','))}&geometry=omit${depthQuery}`;
  let response;
  try {
    response = await fetchFn(url, { headers: { 'X-Figma-Token': token } });
  } catch (error) {
    throw new Error("Couldn't reach Figma. Check the network and try the link again.");
  }
  if (!response.ok) {
    throw new Error(statusMessage(response.status));
  }
  return response.json();
}

function frameChildren(document) {
  return (document.children || []).filter((child) =>
    ['FRAME', 'SECTION', 'COMPONENT', 'COMPONENT_SET', 'INSTANCE', 'GROUP'].includes(child.type),
  );
}

async function loadTextNodes(fileKey, nodeId, token, fetchImpl, rules) {
  const activeRules = rules || DEFAULT_RULES;
  const shallow = await figmaGet(fileKey, [nodeId], token, fetchImpl, 1);
  const shallowDoc = nodeDocument(shallow, nodeId);
  const children = frameChildren(shallowDoc);
  const collected = [];
  if (children.length >= (activeRules.chunkAfterChildren || 8)) {
    const size = activeRules.chunkSize || 5;
    for (let index = 0; index < children.length; index += size) {
      const slice = children.slice(index, index + size);
      const batch = await figmaGet(fileKey, slice.map((child) => child.id), token, fetchImpl);
      slice.forEach((child) => {
        const childDoc = nodeDocument(batch, child.id);
        collectTextNodes(childDoc, [shallowDoc.name], shallowDoc.visible === false, collected);
      });
    }
    return collected.map((node) => classifyTextNode(node, activeRules));
  }
  const full = await figmaGet(fileKey, [nodeId], token, fetchImpl);
  const fullDoc = nodeDocument(full, nodeId);
  collectTextNodes(fullDoc, [], false, collected);
  return collected.map((node) => classifyTextNode(node, activeRules));
}

function cachePath(root, fileKey, nodeId) {
  const safeId = String(nodeId).replace(/:/g, '-');
  return path.join(root, 'tools', 'designer-language-toggle', '.cache', 'figma', `${fileKey}-${safeId}.json`);
}

function writeCache(root, fileKey, nodeId, records) {
  const filePath = cachePath(root, fileKey, nodeId);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(records, null, 2)}\n`);
  return filePath;
}

function loadRules(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return { ...DEFAULT_RULES };
  const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  return {
    ...DEFAULT_RULES,
    ...parsed,
    button: { ...DEFAULT_RULES.button, ...(parsed.button || {}) },
    title: { ...DEFAULT_RULES.title, ...(parsed.title || {}) },
    navTitle: { ...DEFAULT_RULES.navTitle, ...(parsed.navTitle || {}) },
    contextHints: { ...DEFAULT_RULES.contextHints, ...(parsed.contextHints || {}) },
    slotMaxLengths: { ...DEFAULT_RULES.slotMaxLengths, ...(parsed.slotMaxLengths || {}) },
  };
}

module.exports = {
  parseFigmaUrl,
  statusMessage,
  readToken,
  missingTokenMessage,
  hasPrivateUseGlyph,
  classifyTextNode,
  splitCopyAndData,
  resolveAvailableWidth,
  collectTextNodes,
  loadTextNodes,
  cachePath,
  writeCache,
  loadRules,
};
