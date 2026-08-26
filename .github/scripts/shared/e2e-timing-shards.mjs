/**
 * Timing-aware and equal-count shard assignment for Appium E2E.
 * Used by e2e-split-tags-shards.mjs; packing is not framework-specific.
 */

/** Defaults for opt-in dynamic shard count (`appium-dynamic-shards` label). */
export const DYNAMIC_SHARD_DEFAULTS = {
  targetMinutes: 25,
  overheadMinutes: 8,
  maxShards: 6,
  medianFallbackSeconds: 60,
};

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

/**
 * @param {string[]} files
 * @param {Record<string, { android?: number, ios?: number }>} timings
 * @param {string} platform
 * @param {number} [medianFallback]
 * @returns {number}
 */
export function estimateTotalDurationSeconds(
  files,
  timings,
  platform,
  medianFallback = DYNAMIC_SHARD_DEFAULTS.medianFallbackSeconds,
) {
  const platformKey = platform === 'ios' ? 'ios' : 'android';
  const getValidDuration = (file) => {
    const value = timings[timingLookupKey(file)]?.[platformKey];
    return typeof value === 'number' && Number.isFinite(value) && value > 0
      ? value
      : undefined;
  };
  const known = files.map(getValidDuration).filter((t) => t !== undefined);
  const median = computeMedian(known, medianFallback);
  return files.reduce((sum, file) => sum + (getValidDuration(file) ?? median), 0);
}

/**
 * Choose shard count from packed duration budget (target − overhead), capped by maxShards.
 * @param {number} filesLength
 * @param {number} totalDurationSeconds
 * @param {Partial<typeof DYNAMIC_SHARD_DEFAULTS>} [config]
 * @returns {number}
 */
export function chooseShardCount(
  filesLength,
  totalDurationSeconds,
  config = {},
) {
  const {
    targetMinutes = DYNAMIC_SHARD_DEFAULTS.targetMinutes,
    overheadMinutes = DYNAMIC_SHARD_DEFAULTS.overheadMinutes,
    maxShards = DYNAMIC_SHARD_DEFAULTS.maxShards,
  } = config;

  if (filesLength <= 0) return 0;

  const budgetSeconds = (targetMinutes - overheadMinutes) * 60;
  if (budgetSeconds <= 0) return 1;

  const total = Number.isFinite(totalDurationSeconds)
    ? Math.max(0, totalDurationSeconds)
    : 0;
  const raw = total === 0 ? 1 : ceilDiv(total, budgetSeconds);
  return Math.max(1, Math.min(filesLength, maxShards, raw));
}

/**
 * Build all shards for a tag: LPT when timings exist, else equal-count.
 * @param {string[]} files
 * @param {Record<string, { android?: number, ios?: number }> | null | undefined} timings
 * @param {string} platform
 * @param {number} shardCount
 * @returns {{ index: number, files: string[], totalDuration: number }[]}
 */
export function assignShards(files, timings, platform, shardCount) {
  const count = Math.max(0, Math.min(files.length, shardCount));
  if (count === 0) return [];

  if (timings && Object.keys(timings).length > 0) {
    return planShards(files, timings, platform, count);
  }

  return Array.from({ length: count }, (_, i) => {
    const shardFiles = computeShardingSplit(files, i + 1, count);
    return { index: i + 1, files: shardFiles, totalDuration: 0 };
  });
}

/**
 * GitHub Actions strategy.matrix payload: `{ include: [{ shard, spec_files }] }`.
 * @param {{ index: number, files: string[] }[]} shards
 * @returns {{ include: { shard: number, spec_files: string }[] }}
 */
export function shardsToGithubMatrix(shards) {
  return {
    include: shards
      .filter((s) => s.files.length > 0)
      .map((s) => ({
        shard: s.index,
        spec_files: s.files.join(' '),
      })),
  };
}
