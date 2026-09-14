/**
 * Timing-aware and equal-count shard assignment for Appium E2E.
 * Used by e2e-split-tags-shards.mjs; kept separate so Jest can import it.
 */

/**
 * @param {string} filePath
 * @returns {string}
 */
export function timingLookupKey(filePath) {
  return String(filePath).split(/[/\\]/).join('/');
}

/**
 * Map flakiness copies (`foo-retry-1.spec.ts`) back to the original spec path.
 * @param {string} filePath
 * @returns {string}
 */
export function baseSpecPath(filePath) {
  return timingLookupKey(filePath).replace(/-retry-\d+(\.spec\.(?:ts|js))$/, '$1');
}

/**
 * @param {number[]} values
 * @param {number} [fallback=60]
 * @returns {number}
 */
export function computeMedian(values, fallback = 60) {
  if (values.length === 0) return fallback;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

/**
 * @param {number} a
 * @param {number} b
 * @returns {number}
 */
function ceilDiv(a, b) {
  return Math.floor((a + b - 1) / b);
}

/**
 * Equal-count alphabetical slicing (fallback when no timings).
 * @param {string[]} files
 * @param {number} splitNumber 1-based
 * @param {number} totalSplits
 * @returns {string[]}
 */
export function computeShardingSplit(files, splitNumber, totalSplits) {
  const filesPerSplit = ceilDiv(files.length, totalSplits);
  const startIndex = (splitNumber - 1) * filesPerSplit;
  const endIndex = Math.min(startIndex + filesPerSplit, files.length);
  return files.slice(startIndex, endIndex);
}

/**
 * LPT bin-pack: longest files first into the lightest shard.
 * @param {string[]} files
 * @param {Record<string, { android?: number, ios?: number }>} timings
 * @param {string} platform
 * @param {number} totalSplits
 * @returns {{ index: number, files: string[], totalDuration: number }[]}
 */
export function planShards(files, timings, platform, totalSplits) {
  const platformKey = platform === 'ios' ? 'ios' : 'android';

  const getValidDuration = (file) => {
    const value = timings[timingLookupKey(file)]?.[platformKey];
    return typeof value === 'number' && Number.isFinite(value) && value > 0
      ? value
      : undefined;
  };

  const knownDurations = files
    .map(getValidDuration)
    .filter((t) => t !== undefined);

  const medianDuration = computeMedian(knownDurations, 60);

  const filesWithDuration = files.map((f) => ({
    file: f,
    duration: getValidDuration(f) ?? medianDuration,
  }));

  filesWithDuration.sort((a, b) => b.duration - a.duration);

  const shards = Array.from({ length: totalSplits }, (_, i) => ({
    index: i + 1,
    files: [],
    totalDuration: 0,
  }));

  for (const { file, duration } of filesWithDuration) {
    const lightest = shards.reduce(
      (min, s) => (s.totalDuration < min.totalDuration ? s : min),
      shards[0],
    );
    lightest.files.push(file);
    lightest.totalDuration += duration;
  }

  return shards;
}

/**
 * @param {string[]} files
 * @param {Record<string, { android?: number, ios?: number }>} timings
 * @param {string} platform
 * @param {number} splitNumber 1-based
 * @param {number} totalSplits
 * @returns {string[]}
 */
export function binPackShards(files, timings, platform, splitNumber, totalSplits) {
  const shards = planShards(files, timings, platform, totalSplits);
  const thisShard = shards.find((s) => s.index === splitNumber);
  return thisShard ? thisShard.files : [];
}
