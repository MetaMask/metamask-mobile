import {
  MAX_SELECTED_SHARE,
  changedMessageKeys,
  computePlan,
  findFullRunTrigger,
  findKeyReferences,
  scanSource,
  shardIndexesFor,
  toPathPattern,
} from './selective-test-plan.mjs';

const ALL_SHARDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

type Suites = string[];

const makeListSuites =
  (
    universe: Record<'unit' | 'cv', Suites>,
    changedSince: Record<'unit' | 'cv', Suites> = { unit: [], cv: [] },
    related: Record<'unit' | 'cv', Suites> = { unit: [], cv: [] },
  ) =>
  (
    project: string,
    options: { changedSince?: string; relatedTo?: string[] },
  ): Suites => {
    const key = project as 'unit' | 'cv';
    if (options.relatedTo) {
      return related[key];
    }
    if (options.changedSince) {
      return changedSince[key];
    }
    return universe[key];
  };

const range = (count: number, prefix: string): Suites =>
  Array.from({ length: count }, (_, index) => `${prefix}/suite-${index}.test.ts`);

describe('findFullRunTrigger', () => {
  it.each([
    'jest.config.js',
    'jest.config.view.js',
    'babel.config.tests.js',
    'tsconfig.json',
    'package.json',
    'yarn.lock',
    '.yarn/patches/foo.patch',
    '.nvmrc',
    'app/util/test/testSetupView.js',
    'app/__mocks__/react-native-laminar.tsx',
    'app/core/__mocks__/engine.js',
    'tests/component-view/mocks.ts',
    'tests/helpers/fixture.ts',
    'tests/utils/wait.ts',
    'tests/setup/global.ts',
    'locales/i18n.js',
    'locales/languages/fr.json',
    'scripts/jest/duration-sequencer.mjs',
    '.github/workflows/ci.yml',
    '.github/scripts/foo.ts',
  ])('treats %s as a full-run trigger', (file) => {
    expect(findFullRunTrigger(['app/Foo.tsx', file])).toBe(file);
  });

  it('does not treat en.json or ordinary source files as triggers', () => {
    expect(
      findFullRunTrigger([
        'locales/languages/en.json',
        'app/components/Foo/Foo.tsx',
        'app/components/Foo/Foo.test.tsx',
      ]),
    ).toBeNull();
  });
});

describe('changedMessageKeys', () => {
  it('reports added, removed and changed leaf keys with dotted paths', () => {
    const base = { a: { b: 'one', c: 'two' }, gone: 'x' };
    const head = { a: { b: 'ONE', c: 'two', d: 'new' }, extra: 'y' };

    expect(changedMessageKeys(base, head)).toEqual([
      'a.b',
      'a.d',
      'extra',
      'gone',
    ]);
  });

  it('returns nothing for a reformatted but identical file', () => {
    expect(changedMessageKeys({ a: { b: 'x' } }, { a: { b: 'x' } })).toEqual(
      [],
    );
  });
});

describe('scanSource and findKeyReferences', () => {
  it('maps literal key references to the files that contain them', () => {
    const scans = [
      {
        file: 'app/Foo.tsx',
        ...scanSource("strings('perps.market.title');"),
      },
      {
        file: 'app/Bar.tsx',
        ...scanSource('const x = "other.key";'),
      },
    ];

    const result = findKeyReferences(['perps.market.title'], scans);

    expect([...result.files]).toEqual(['app/Foo.tsx']);
    expect(result.dynamicKeys).toEqual([]);
  });

  it('flags keys under a template-built prefix as dynamic', () => {
    const scans = [
      {
        file: 'app/Foo.tsx',
        ...scanSource('strings(`perps.${name}.title`);'),
      },
    ];

    const result = findKeyReferences(
      ['perps.market.title', 'settings.title'],
      scans,
    );

    expect(result.dynamicKeys).toEqual(['perps.market.title']);
  });

  it('flags keys under a string-concatenated prefix as dynamic', () => {
    const scans = [
      {
        file: 'app/Foo.tsx',
        ...scanSource("strings('perps.' + name);"),
      },
    ];

    const result = findKeyReferences(['perps.market'], scans);

    expect(result.dynamicKeys).toEqual(['perps.market']);
  });
});

describe('shardIndexesFor', () => {
  it('runs one unit shard for a small selection and all shards otherwise', () => {
    expect(shardIndexesFor('unit', 0)).toEqual([1]);
    expect(shardIndexesFor('unit', 100)).toEqual([1]);
    expect(shardIndexesFor('unit', 101)).toEqual(ALL_SHARDS);
  });

  it('uses a lower single-shard threshold for component-view suites', () => {
    expect(shardIndexesFor('cv', 15)).toEqual([1]);
    expect(shardIndexesFor('cv', 16)).toEqual(ALL_SHARDS);
  });
});

describe('toPathPattern', () => {
  it('escapes regex metacharacters and anchors at the end of the path', () => {
    const pattern = toPathPattern('app/a(b)/c.test.tsx');

    expect(new RegExp(pattern).test('/repo/app/a(b)/c.test.tsx')).toBe(true);
    expect(new RegExp(pattern).test('/repo/app/a(b)/cXtest.tsx')).toBe(false);
  });
});

describe('computePlan', () => {
  const baseInput = {
    baseSha: 'base',
    changedFiles: ['app/components/Foo/Foo.tsx'],
    changedMessages: null,
    scans: [],
  };

  it('runs the full suite when the run-all-unit-tests label is set', () => {
    const plan = computePlan({
      ...baseInput,
      eventName: 'pull_request',
      runAll: 'true',
      listSuites: () => {
        throw new Error('should not list suites');
      },
    });

    expect(plan.reason).toContain('run-all-unit-tests');
    expect(plan.projects.unit.mode).toBe('full');
    expect(plan.thresholdsEnforced).toBe(true);
  });

  it('keeps a selection under the retuned cutoff', () => {
    const unit = range(100, 'app');
    const plan = computePlan({
      ...baseInput,
      eventName: 'pull_request',
      listSuites: makeListSuites(
        { unit, cv: [] },
        { unit: unit.slice(0, 60), cv: [] },
      ),
    });

    expect(plan.projects.unit.mode).toBe('selective');
    expect(plan.projects.unit.count).toBe(60);
  });

  it('runs the full suite for events other than pull requests', () => {
    const plan = computePlan({
      ...baseInput,
      eventName: 'push',
      listSuites: () => {
        throw new Error('should not list suites');
      },
    });

    expect(plan.thresholdsEnforced).toBe(true);
    expect(plan.projects.unit).toMatchObject({
      mode: 'full',
      shards: ALL_SHARDS,
      patterns: [],
    });
    expect(plan.projects.cv).toMatchObject({ mode: 'full', shards: ALL_SHARDS });
  });

  it('runs the full suite when a harness or config file changes', () => {
    const plan = computePlan({
      ...baseInput,
      eventName: 'pull_request',
      changedFiles: ['app/util/test/testSetupView.js'],
      listSuites: () => {
        throw new Error('should not list suites');
      },
    });

    expect(plan.reason).toContain('app/util/test/testSetupView.js');
    expect(plan.thresholdsEnforced).toBe(true);
    expect(plan.projects.cv.mode).toBe('full');
  });

  it('selects only changed and related suites for an ordinary change', () => {
    const unit = [...range(1000, 'app'), 'app/components/Foo/Foo.test.tsx'];
    const cv = range(182, 'tests/view');
    const plan = computePlan({
      ...baseInput,
      eventName: 'pull_request',
      listSuites: makeListSuites(
        { unit, cv },
        {
          unit: ['app/components/Foo/Foo.test.tsx'],
          cv: [],
        },
        { unit: [], cv: [] },
      ),
    });

    expect(plan.thresholdsEnforced).toBe(false);
    expect(plan.projects.unit).toMatchObject({
      mode: 'selective',
      count: 1,
      shards: [1],
      patterns: [toPathPattern('app/components/Foo/Foo.test.tsx')],
    });
    expect(plan.projects.cv).toMatchObject({ mode: 'selective', count: 0 });
  });

  it('keeps the suites that reference changed en.json keys, and nothing else', () => {
    const unit = [...range(1000, 'app'), 'app/components/Perps/Market.test.tsx'];
    const cv = range(182, 'tests/view');
    const scans = [
      {
        file: 'app/components/Perps/Market.tsx',
        ...scanSource("strings('perps.market.title')"),
      },
    ];
    const plan = computePlan({
      ...baseInput,
      eventName: 'pull_request',
      changedFiles: ['locales/languages/en.json'],
      changedMessages: ['perps.market.title'],
      scans,
      listSuites: makeListSuites(
        { unit, cv },
        { unit: [], cv: [] },
        {
          unit: ['app/components/Perps/Market.test.tsx'],
          cv: [],
        },
      ),
    });

    expect(plan.projects.unit).toMatchObject({
      mode: 'selective',
      count: 1,
      patterns: [toPathPattern('app/components/Perps/Market.test.tsx')],
    });
    expect(plan.projects.cv.count).toBe(0);
  });

  it('falls back to the full suite when message keys are built dynamically', () => {
    const scans = [
      {
        file: 'app/Foo.tsx',
        ...scanSource('strings(`perps.${name}.title`)'),
      },
    ];
    const plan = computePlan({
      ...baseInput,
      eventName: 'pull_request',
      changedFiles: ['locales/languages/en.json'],
      changedMessages: ['perps.market.title'],
      scans,
      listSuites: () => {
        throw new Error('should not list suites');
      },
    });

    expect(plan.reason).toContain('built dynamically');
    expect(plan.projects.unit.mode).toBe('full');
  });

  it('falls back to the full suite when a selection covers most of a project', () => {
    const unit = range(100, 'app');
    const plan = computePlan({
      ...baseInput,
      eventName: 'pull_request',
      listSuites: makeListSuites(
        { unit, cv: [] },
        { unit: unit.slice(0, Math.ceil(100 * MAX_SELECTED_SHARE) + 1), cv: [] },
      ),
    });

    expect(plan.projects.unit.mode).toBe('full');
    expect(plan.projects.unit.reason).toContain('covers');
  });

  it('ignores changed suites that are not in the project universe', () => {
    const unit = range(10, 'app');
    const plan = computePlan({
      ...baseInput,
      eventName: 'pull_request',
      listSuites: makeListSuites(
        { unit, cv: [] },
        { unit: ['app/not-in-universe.test.tsx'], cv: [] },
      ),
    });

    expect(plan.projects.unit).toMatchObject({ mode: 'selective', count: 0 });
  });
});
