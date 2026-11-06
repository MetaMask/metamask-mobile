/**
 * Reads shipped locale flats and feeds the portable checker.
 * Does not write locales/languages.
 */
const checker = require('./checker');

function loadRepoStrings(enFlat, sharedFlats, targetFlat, lang) {
  const strings = [];
  const seen = new Set();
  Object.keys(enFlat).forEach((key) => {
    if (typeof enFlat[key] !== 'string') return;
    seen.add(key);
    const translations = {};
    Object.keys(sharedFlats || {}).forEach((code) => {
      if (code === 'en') return;
      const value = sharedFlats[code] && sharedFlats[code][key];
      if (typeof value === 'string') translations[code] = value;
    });
    if (targetFlat) {
      if (typeof targetFlat[key] === 'string') translations[lang] = targetFlat[key];
      else delete translations[lang];
    }
    const feature = key.split('.')[0];
    strings.push({
      key,
      source_text: enFlat[key],
      translations,
      context: { feature },
    });
  });
  if (targetFlat && lang) {
    Object.keys(targetFlat).forEach((key) => {
      if (seen.has(key)) return;
      if (typeof targetFlat[key] !== 'string') return;
      strings.push({
        key,
        source_text: null,
        translations: { [lang]: targetFlat[key] },
        context: { feature: key.split('.')[0] },
      });
    });
  }
  return strings;
}

function checkLanguage(enFlat, targetFlat, options) {
  const strings = loadRepoStrings(
    enFlat,
    options.sharedFlats || {},
    targetFlat,
    options.lang,
  );
  return checker.check(strings, options);
}

module.exports = {
  loadRepoStrings,
  checkLanguage,
};
