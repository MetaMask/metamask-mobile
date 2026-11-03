/**
 * Size-balanced shard assignment and CLI parsing for yarn lint.
 * Used by lint-shard.mjs; kept separate so Jest can import it.
 */

/**
 * @typedef {object} LintShardArgs
 * @property {boolean} [help]
 * @property {boolean} [selfTest]
 * @property {boolean} [plan]
 * @property {boolean} [checkUnion]
 * @property {boolean} [list]
 * @property {boolean} [skipMessenger]
 * @property {string} [shard]
 * @property {string} [shards]
 * @property {string} [filesFrom]
 */

/**
 * Longest-processing-time bin pack. File size is the weight.
 * Equal totals go to the lower shard index so the split is stable.
 * @param {{ path: string, bytes: number }[]} entries
 * @param {number} shards
 * @returns {{ files: string[], bytes: number }[]}
 */
export function splitBySize(entries, shards) {
  if (!Number.isInteger(shards) || shards < 1) {
    throw new Error(`shards must be a positive integer, got ${shards}`);
  }
  const bins = Array.from({ length: shards }, () => ({
    files: /** @type {string[]} */ ([]),
    bytes: 0,
  }));
  const ordered = [...entries].sort(
    (a, b) => b.bytes - a.bytes || (a.path < b.path ? -1 : a.path > b.path ? 1 : 0),
  );
  for (const entry of ordered) {
    let target = 0;
    for (let index = 1; index < bins.length; index += 1) {
      if (bins[index].bytes < bins[target].bytes) {
        target = index;
      }
    }
    bins[target].files.push(entry.path);
    bins[target].bytes += entry.bytes;
  }
  for (const bin of bins) {
    bin.files.sort();
  }
  return bins;
}

/**
 * @param {string[][]} groups
 * @param {string[]} expected
 * @returns {{ missing: string[], extra: string[], duplicates: string[] }}
 */
export function unionDiff(groups, expected) {
  const union = new Set();
  /** @type {string[]} */
  const duplicates = [];
  for (const group of groups) {
    for (const filePath of group) {
      if (union.has(filePath)) {
        duplicates.push(filePath);
      }
      union.add(filePath);
    }
  }
  const expectedSet = new Set(expected);
  const missing = expected.filter((filePath) => !union.has(filePath));
  const extra = [...union].filter((filePath) => !expectedSet.has(filePath)).sort();
  return { missing, extra, duplicates };
}

/**
 * @param {string[]} argv
 * @returns {LintShardArgs}
 */
export function parseArgs(argv) {
  /** @type {LintShardArgs} */
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--help' || token === '-h') args.help = true;
    else if (token === '--self-test') args.selfTest = true;
    else if (token === '--plan') args.plan = true;
    else if (token === '--check-union') args.checkUnion = true;
    else if (token === '--list') args.list = true;
    else if (token === '--skip-messenger') args.skipMessenger = true;
    else if (token === '--shard') {
      args.shard = argv[++index];
    } else if (token === '--shards') {
      args.shards = argv[++index];
    } else if (token === '--files-from') {
      args.filesFrom = argv[++index];
    } else {
      throw new Error(`Unknown argument ${token}`);
    }
  }
  return args;
}
