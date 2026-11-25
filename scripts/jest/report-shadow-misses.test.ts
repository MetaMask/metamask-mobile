import { findShadowMisses } from './report-shadow-misses.mjs';
import { toPathPattern } from './selective-test-plan.mjs';

describe('findShadowMisses', () => {
  const selected = toPathPattern('app/components/Foo/Foo.test.tsx');

  it('reports a failing suite the plan would have skipped', () => {
    const misses = findShadowMisses(
      { mode: 'selective', patterns: [selected] },
      {
        testResults: [
          {
            name: '/repo/app/components/Foo/Foo.test.tsx',
            status: 'failed',
          },
          {
            name: '/repo/app/components/Bar/Bar.test.tsx',
            status: 'failed',
          },
          {
            name: '/repo/app/components/Baz/Baz.test.tsx',
            status: 'passed',
          },
        ],
      },
    );

    expect(misses).toEqual(['/repo/app/components/Bar/Bar.test.tsx']);
  });

  it('reports nothing when the plan ran the full suite', () => {
    expect(
      findShadowMisses(
        { mode: 'full', patterns: [] },
        {
          testResults: [
            { name: '/repo/app/Foo.test.tsx', status: 'failed' },
          ],
        },
      ),
    ).toEqual([]);
  });
});
