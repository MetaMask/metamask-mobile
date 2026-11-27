import fs from 'node:fs';
import path from 'node:path';
import sequencerModule from '@jest/test-sequencer';
import {
  SNAPSHOT_RELATIVE_PATH,
  assignDurationShards,
  estimateSuiteWeight,
} from './duration-sharding.mjs';

// Node's ESM interop exposes the CJS `default` export under `.default`; Jest's
// Babel transform has already unwrapped it.
const TestSequencer = sequencerModule.default ?? sequencerModule;

const snapshotsByRoot = new Map();

function loadSnapshot(rootDir) {
  let snapshot = snapshotsByRoot.get(rootDir);
  if (!snapshot) {
    snapshot = JSON.parse(
      fs.readFileSync(path.join(rootDir, SNAPSHOT_RELATIVE_PATH), 'utf8'),
    );
    snapshotsByRoot.set(rootDir, snapshot);
  }
  return snapshot;
}

/**
 * Replaces Jest's file-count shard split with a duration-weighted one. Jest
 * calls `shard()` before `sort()`, so overriding only `sort()` would not change
 * which suites land on which shard. Without `--shard` the base behaviour is
 * unchanged.
 */
export default class DurationWeightedSequencer extends TestSequencer {
  shard(tests, options) {
    if (options.shardCount <= 1 || tests.length === 0) {
      return super.shard(tests, options);
    }

    const snapshot = loadSnapshot(tests[0].context.config.rootDir);
    const entries = tests.map((test, id) => {
      const key = path
        .relative(test.context.config.rootDir, test.path)
        .split(path.sep)
        .join('/');
      let sizeBytes = 0;
      try {
        sizeBytes = fs.statSync(test.path).size;
      } catch {
        sizeBytes = 0;
      }
      return {
        id,
        key,
        weight: estimateSuiteWeight({ key, sizeBytes }, snapshot),
      };
    });

    const shardIds = new Set(
      assignDurationShards(entries, options.shardCount)[options.shardIndex - 1],
    );

    return tests.filter((_, id) => shardIds.has(id));
  }
}
