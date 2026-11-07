/**
 * Group a design-file length report the way a designer reads it.
 * Real translations come from the repo flats. Estimates are labeled.
 */
const checker = require('./checker');
const { measurePixels } = require('./file-adapter');

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
  if (row && row.slots && row.slots.length) {
    if (row.copyText) candidates.push(row.copyText);
  } else {
    if (row && row.copyText) candidates.push(row.copyText);
    candidates.push(source);
  }
  if (!(row && row.slots && row.slots.length) && row && row.example && row.example !== source) candidates.push(row.example);
  if (!(row && row.slots && row.slots.length) && row && row.template) candidates.push(row.template);
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

function fixedSlotCharacters(row) {
  return (row.slots || []).reduce((sum, slot) => sum + (slot.characters || 0), 0) + (row.gapCharacters || 0);
}

function composedCharacters(copyValue, row) {
  if (row && row.slots && row.slots.length) {
    const copy = row.copyText ? checker.characterCount(copyValue) : 0;
    return copy + fixedSlotCharacters(row);
  }
  if (!row || !row.copyText) return checker.characterCount(copyValue);
  return checker.characterCount(copyValue) + (row.dataCharacters || 0) + (row.gapCharacters || 0);
}

function composedUnits(copyValue, row) {
  if (row && row.slots && row.slots.length) {
    const copy = row.copyText ? checker.displayWidth(copyValue) : 0;
    return copy + fixedSlotCharacters(row);
  }
  if (!row || !row.copyText) return checker.displayWidth(copyValue);
  return checker.displayWidth(copyValue) + (row.dataCharacters || 0) + (row.gapCharacters || 0);
}

function estimateSize(row, ratio) {
  const growth = ratio || 1.4;
  if (row && row.slots && row.slots.length) {
    const copy = row.copyText ? checker.characterCount(row.copyText) : 0;
    const fixed = fixedSlotCharacters(row);
    return {
      characters: Math.ceil(copy * growth) + fixed,
      units: Math.round(copy * growth * 10) / 10 + fixed,
    };
  }
  if (row && row.copyText) {
    const copy = checker.characterCount(row.copyText);
    const extra = (row.dataCharacters || 0) + (row.gapCharacters || 0);
    const grownUnits = Math.round(copy * growth * 10) / 10;
    return { characters: Math.ceil(copy * growth) + extra, units: grownUnits + extra };
  }
  const exact = (row.characters || 0) * growth;
  return { characters: Math.ceil(exact), units: Math.round(exact * 10) / 10 };
}

function valueOver(characters, units, row, text) {
  if (row.unconstrained || !(row.availableWidth > 0)) return false;
  const pixel = measurePixels(units, row, text);
  if (pixel && pixel.overflow) return true;
  return false;
}

function guidelineOver(characters, row) {
  const narrow = (row.bucket === 'button' || row.bucket === 'tab')
    && !row.template
    && (row.width_px == null || row.width_px <= 120);
  return narrow && characters > (row.maxCharacters || 10);
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

function pixelResult(units, row) {
  return measurePixels(units, row);
}

function textOverLimit(text, row) {
  if (row.unconstrained || !(row.availableWidth > 0)) return false;
  const units = checker.displayWidth(text);
  const pixel = measurePixels(units, row, text);
  return Boolean(pixel && pixel.overflow);
}

function labelIssue(units, row, text) {
  const pixel = measurePixels(units, row, text);
  if (!pixel) return null;
  if (pixel.unconstrained) return { issue: 'check', detail: null, basis: pixel.basis, unconstrained: true };
  if (pixel.note && !pixel.overflow) {
    return { issue: 'note', detail: pixel.note, basis: pixel.basis };
  }
  if (!pixel.overflow) return null;
  const boxLines = row.maxLines || row.lineCount || 1;
  if (row.layout === 'wrap' && pixel.lines > boxLines) {
    return {
      issue: 'wrap',
      detail: `wraps to ${pixel.lines} lines, box fits ${boxLines}`,
      basis: pixel.basis,
    };
  }
  return { issue: 'overflow', detail: null, basis: pixel.basis };
}

function worstDataCharacters(row) {
  const limits = row.slotMaxLengths || {};
  const slots = row.slots || [];
  if (slots.length === 0) return row.dataCharacters || 0;
  return slots.reduce((sum, slot) => {
    const cap = limits[slot.name];
    const example = slot.characters || 0;
    return sum + (typeof cap === 'number' ? Math.max(example, cap) : example);
  }, 0);
}

function unitsWithSlots(units, row, useWorst) {
  const example = row.dataCharacters || 0;
  const data = useWorst ? worstDataCharacters(row) : example;
  return Math.max(0, (units || 0) - example + data);
}

function entryOver(entry, row, useWorst) {
  const units = unitsWithSlots(entry.units || entry.characters, row, useWorst);
  const characters = (entry.characters || 0) - (row.dataCharacters || 0) + (useWorst ? worstDataCharacters(row) : (row.dataCharacters || 0));
  return valueOver(characters, units, row, useWorst || (row.slots && row.slots.length) ? null : entry.text);
}

function assessLanguage(entry, row) {
  const chars = entry && typeof entry.characters === 'number'
    ? entry.characters
    : checker.characterCount(row.source || '');
  const limit = row.maxCharacters || 10;
  const narrow = (row.bucket === 'button' || row.bucket === 'tab')
    && !row.template
    && (row.width_px == null || row.width_px <= 120);
  const guideline = narrow && chars > limit;
  const units = entry && typeof entry.units === 'number' ? entry.units : (row.widthHint || chars);
  const text = entry && entry.text && !(row.slots && row.slots.length) ? entry.text : null;
  const pixel = row.availableWidth > 0 ? measurePixels(units, row, text) : null;
  const pixelOver = Boolean(pixel && pixel.overflow);
  let category = 'fits';
  if (guideline && pixelOver) category = 'both';
  else if (pixelOver) category = 'pixel only';
  else if (guideline) category = 'guideline only';
  const needed = pixel && pixel.pxPerUnit ? Math.round(units * pixel.pxPerUnit * 10) / 10 : null;
  const source = row.pxSource || 'estimated glyph width';
  const parts = [];
  parts.push(guideline ? `${chars} chars over ${limit}-char guideline` : `${chars} chars within ${limit}`);
  if (needed != null && row.availableWidth > 0) {
    parts.push(pixelOver
      ? `${needed}px needs > ${row.availableWidth}px available (${source})`
      : `${needed}px within ${row.availableWidth}px available (${source})`);
  }
  const label = category === 'both' || category === 'pixel only' ? `hard break (${category})` : category;
  return { category, pixelOver, guideline, chars, line: `${label}: ${parts.join('; ')}` };
}

function languageVerdict(entry, row) {
  if (!entry || entry.basis === 'estimate') return 'estimate';
  if (entry.basis === 'range') {
    if (entry.shortestOver) return 'break';
    if (entry.someOver) return 'might';
    return 'fit';
  }
  const assessment = assessLanguage(entry, row);
  if (assessment.pixelOver) return 'break';
  return 'fit';
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
  const checkVisually = [];
  const slotMax = [];
  const guideline = [];
  const layoutNotes = [];
  const layoutProblems = [];
  const alreadyOver = [];
  const breaks = [];
  const mightBreak = [];
  const atRisk = [];
  const fits = [];

  function crowded(row) {
    return row.availableWidth > 0 && typeof row.width_px === 'number' && row.width_px > row.availableWidth + 0.5;
  }

  function placeControl(row) {
    if (row.kind === 'name') return;
    if (row.unconstrained) return;
    if (crowded(row)) {
      layoutProblems.push({
        ...row,
        verdict: 'layout',
        basis: `English is ${row.width_px}px in a ${row.availableWidth}px slot`,
      });
      return;
    }
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
    const narrow = (row.bucket === 'button' || row.bucket === 'tab') && !row.template && (row.width_px == null || row.width_px <= 120);
    if (narrow) {
      const overLangs = [];
      if (checker.characterCount(row.source) > (row.maxCharacters || 10)) overLangs.push('en');
      langs.forEach((lang) => {
        const entry = real && real.perLang[lang];
        if (entry && entry.characters > (row.maxCharacters || 10)) overLangs.push(lang);
      });
      if (overLangs.length > 0) guideline.push({ ...item, overLangs, verdict: 'guideline' });
    }
    if (textOverLimit(row.source, row)) {
      alreadyOver.push(item);
      return;
    }
    const entries = real ? langs.map((lang) => real.perLang[lang]).filter(Boolean) : [];
    const verdicts = {};
    const reasons = {};
    langs.forEach((lang) => {
      const entry = real && real.perLang[lang];
      verdicts[lang] = languageVerdict(entry, row);
      reasons[lang] = assessLanguage(entry, row).line;
    });
    item.langVerdicts = verdicts;
    item.langReasons = reasons;
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

  function slotBreaks(row, units) {
    if (!row.slots || row.slots.length === 0) return false;
    const exampleUnits = unitsWithSlots(units, row, false);
    const worstUnits = unitsWithSlots(units, row, true);
    const example = pixelResult(exampleUnits, row);
    const worst = pixelResult(worstUnits, row);
    const exampleOver = example ? example.overflow : false;
    const worstOver = worst ? worst.overflow : false;
    return !exampleOver && worstOver;
  }

  (lengths || []).filter((row) => row.bucket === 'text' || row.bucket === 'label' || row.bucket === 'button' || row.bucket === 'tab').forEach((row) => {
    if (crowded(row)) {
      layoutProblems.push({
        ...row,
        verdict: 'layout',
        basis: `English is ${row.width_px}px in a ${row.availableWidth}px slot`,
      });
      return;
    }
    if (row.kind === 'name') return;
    if (row.unconstrained) {
      checkVisually.push({
        ...row,
        basis: row.reason ? `estimate: ${row.reason}` : 'estimate: unconstrained auto-width, verify visually',
        verdict: 'check',
      });
      return;
    }
    const real = realTranslations(row.source, index, shared, langs, row, options);
    const estimate = estimateSize(row, ratio);
    const sampleUnits = real
      ? Math.max(...langs.map((lang) => (real.perLang[lang] ? real.perLang[lang].units || real.perLang[lang].characters : 0)))
      : estimate.units;
    if (slotBreaks(row, sampleUnits) && row.bucket !== 'button' && row.bucket !== 'tab') {
      slotMax.push({
        ...row,
        verdict: 'slot-max',
        basis: 'measured',
        note: 'fits with the example, breaks at max slot length',
        real,
      });
    }
    if (row.bucket === 'button' || row.bucket === 'tab') return;
    const problems = [];
    langs.forEach((lang) => {
      const entry = real && real.perLang[lang];
      const units = entry ? (entry.units || entry.characters) : estimate.units;
      if (slotBreaks(row, units)) return;
      const found = labelIssue(units, row, entry ? entry.text : row.source);
      if (!found || found.unconstrained) return;
      if (found.issue === 'note') {
        layoutNotes.push({
          ...row,
          lang,
          detail: found.detail,
          basis: found.basis,
          verdict: 'note',
        });
        return;
      }
      problems.push({
        lang,
        issue: found.issue,
        detail: found.detail,
        pixelBasis: found.basis,
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
      basis: (problems[0] && problems[0].pixelBasis) || (real ? 'real' : 'estimate'),
      chosenKey: real ? real.chosenKey : null,
      real,
      problems,
      verdict: 'text',
    });
  });

  function collapse(rows) {
    const groups = new Map();
    rows.forEach((row) => {
      const key = `${row.source}\u0000${row.verdict}\u0000${row.issue || ''}`;
      const existing = groups.get(key);
      if (!existing) {
        groups.set(key, { ...row, screens: [...(row.screens || [])] });
        return;
      }
      const worse = (row.availableWidth || Infinity) < (existing.availableWidth || Infinity);
      const screens = [...new Set([...(existing.screens || []), ...(row.screens || [])])];
      groups.set(key, worse ? { ...row, screens } : { ...existing, screens });
    });
    return [...groups.values()];
  }

  const byExpected = (a, b) => b.expected - a.expected || b.characters - a.characters;
  alreadyOver.sort(byExpected);
  breaks.sort(byExpected);
  mightBreak.sort(byExpected);
  atRisk.sort(byExpected);
  return {
    alreadyOver: collapse(alreadyOver),
    breaks: collapse(breaks),
    mightBreak: collapse(mightBreak),
    atRisk: collapse(atRisk),
    fits: collapse(fits),
    labels: collapse(labels),
    checkVisually: collapse(checkVisually),
    slotMax: collapse(slotMax),
    guideline: collapse(guideline),
    layoutNotes: collapse(layoutNotes),
    layoutProblems: collapse(layoutProblems),
  };
}

function mightLanguageCount(report) {
  return [...(report.breaks || []), ...(report.mightBreak || [])].reduce(
    (sum, row) => sum + ((row.mightLangs || []).length),
    0,
  );
}

function translatedTemplate(row, translation) {
  if (!row || !row.template || !row.copyText || !translation) return null;
  const shown = row.template.split(row.copyText).join(translation);
  const exampleSource = row.example || row.source || '';
  const example = exampleSource.split(row.copyText).join(translation);
  return { shown, example };
}

module.exports = {
  buildBreakReport,
  realTranslations,
  shipMatchKey,
  mightLanguageCount,
  translatedTemplate,
  assessLanguage,
};
