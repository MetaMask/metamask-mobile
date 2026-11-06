/**
 * Hand-edited linguist memory. A later slice can sync this from Notion.
 * This file only reads the JSON in references/learned/.
 */
const fs = require('fs');
const path = require('path');

function learnedDir() {
  return path.join(__dirname, '..', 'references', 'learned');
}

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function loadLearned(dir) {
  const root = dir || learnedDir();
  const corrections = readJson(path.join(root, 'corrections.json'), []);
  const neverTranslate = readJson(path.join(root, 'never-translate.json'), []);
  const preferredPhrasing = readJson(
    path.join(root, 'preferred-phrasing.json'),
    [],
  );
  const limits = readJson(path.join(root, 'limits.json'), []);
  return {
    corrections: Array.isArray(corrections) ? corrections : [],
    neverTranslate: Array.isArray(neverTranslate) ? neverTranslate : [],
    preferredPhrasing: Array.isArray(preferredPhrasing) ? preferredPhrasing : [],
    limits: Array.isArray(limits) ? limits : [],
  };
}

module.exports = {
  learnedDir,
  loadLearned,
};
