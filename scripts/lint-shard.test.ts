import { parseArgs, splitBySize, unionDiff } from './lint-shard-plan.mjs';

const sampleEntries = [
  { path: 'a', bytes: 50 },
  { path: 'b', bytes: 40 },
  { path: 'c', bytes: 30 },
  { path: 'd', bytes: 20 },
  { path: 'e', bytes: 10 },
];

describe('splitBySize', () => {
  it('returns the same bins when the same entries are packed twice', () => {
    const first = splitBySize(sampleEntries, 2);

    const second = splitBySize(sampleEntries, 2);

    expect(second).toEqual(first);
  });

  it('packs the longer files onto separate shards', () => {
    const bins = splitBySize(sampleEntries, 2);

    const totals = bins.map((bin) => bin.bytes).sort((left, right) => left - right);

    expect(totals).toEqual([70, 80]);
  });

  it('returns one empty bin for an empty list and one shard', () => {
    const bins = splitBySize([], 1);

    expect(bins).toEqual([{ files: [], bytes: 0 }]);
  });

  it('returns an empty bin for each shard when the file list is empty', () => {
    const bins = splitBySize([], 4);

    expect(bins).toEqual([
      { files: [], bytes: 0 },
      { files: [], bytes: 0 },
      { files: [], bytes: 0 },
      { files: [], bytes: 0 },
    ]);
  });

  it('places a single file on the first shard', () => {
    const bins = splitBySize([{ path: 'only.ts', bytes: 12 }], 4);

    expect(bins[0]).toEqual({ files: ['only.ts'], bytes: 12 });
    expect(bins.slice(1).every((bin) => bin.files.length === 0)).toBe(true);
  });

  it('puts every file on the only shard and sorts the paths', () => {
    const bins = splitBySize(
      [
        { path: 'z.ts', bytes: 3 },
        { path: 'a.ts', bytes: 9 },
        { path: 'm.ts', bytes: 1 },
      ],
      1,
    );

    expect(bins).toEqual([{ files: ['a.ts', 'm.ts', 'z.ts'], bytes: 13 }]);
  });

  it('assigns an equal-size file to the lower shard index', () => {
    const bins = splitBySize(
      [
        { path: 'a.ts', bytes: 10 },
        { path: 'b.ts', bytes: 10 },
        { path: 'c.ts', bytes: 10 },
      ],
      2,
    );

    expect(bins[0].files).toEqual(['a.ts', 'c.ts']);
    expect(bins[1].files).toEqual(['b.ts']);
  });

  it.each([0, -1, 1.5, Number.NaN])(
    'throws when the shard count is %s',
    (shards) => {
      const pack = () => splitBySize(sampleEntries, shards);

      expect(pack).toThrow(/shards must be a positive integer/);
    },
  );
});

describe('unionDiff', () => {
  it('reports an empty diff when the bins cover the file list once', () => {
    const bins = splitBySize(sampleEntries, 4);
    const expected = sampleEntries.map((entry) => entry.path);

    const diff = unionDiff(
      bins.map((bin) => bin.files),
      expected,
    );

    expect(diff).toEqual({ missing: [], extra: [], duplicates: [] });
    expect(bins.flatMap((bin) => bin.files).sort()).toEqual([...expected].sort());
  });

  it('reports a path that is absent from every bin', () => {
    const diff = unionDiff([['a.ts'], ['b.ts']], ['a.ts', 'b.ts', 'c.ts']);

    expect(diff.missing).toEqual(['c.ts']);
    expect(diff.extra).toEqual([]);
    expect(diff.duplicates).toEqual([]);
  });

  it('reports a path that is not in the expected list', () => {
    const diff = unionDiff([['a.ts', 'extra.ts']], ['a.ts']);

    expect(diff.extra).toEqual(['extra.ts']);
    expect(diff.missing).toEqual([]);
  });

  it('reports a path that appears in two bins', () => {
    const diff = unionDiff(
      [
        ['a.ts', 'b.ts'],
        ['b.ts'],
      ],
      ['a.ts', 'b.ts'],
    );

    expect(diff.duplicates).toEqual(['b.ts']);
    expect(diff.missing).toEqual([]);
    expect(diff.extra).toEqual([]);
  });
});

describe('parseArgs', () => {
  it('leaves every flag unset for an empty argument list', () => {
    const args = parseArgs([]);

    expect(args).toEqual({});
  });

  it('sets help for --help and for -h', () => {
    expect(parseArgs(['--help']).help).toBe(true);
    expect(parseArgs(['-h']).help).toBe(true);
  });

  it('stores shard, shards, and files-from values', () => {
    const args = parseArgs([
      '--shard',
      '2',
      '--shards',
      '4',
      '--files-from',
      'files.txt',
      '--plan',
      '--check-union',
      '--list',
      '--self-test',
      '--skip-messenger',
    ]);

    expect(args).toEqual({
      shard: '2',
      shards: '4',
      filesFrom: 'files.txt',
      plan: true,
      checkUnion: true,
      list: true,
      selfTest: true,
      skipMessenger: true,
    });
  });

  it('throws for an unknown flag', () => {
    expect(() => parseArgs(['--prove'])).toThrow('Unknown argument --prove');
  });
});
