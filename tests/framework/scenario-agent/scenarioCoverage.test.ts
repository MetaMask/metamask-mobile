import {
  scenarioCoverageProblems,
  secretStepHasCodePath,
} from './scenarioCoverage';

describe('scenario coverage', () => {
  it('accepts a built-in login secret and a registry code step', () => {
    expect(secretStepHasCodePath('Log in to the wallet')).toBe(true);
    expect(secretStepHasCodePath('Enter the second SRP and continue')).toBe(
      true,
    );
    expect(
      secretStepHasCodePath(
        'Unlock on the login screen with the login password',
      ),
    ).toBe(true);
    expect(
      secretStepHasCodePath('Tap the BTC market row', {
        'Tap the BTC market row': () => undefined,
      }),
    ).toBe(true);
    expect(secretStepHasCodePath('Tap the BTC market row')).toBe(false);
  });

  it('reports a registry key with no Markdown and a Secret step with no code path', () => {
    const problems = scenarioCoverageProblems(
      ['present.scenario.md'],
      {
        'present.scenario.md': {},
        'missing.scenario.md': {},
      },
      () => ({
        steps: [{ kind: 'secret', text: 'Import a hardware wallet' }],
      }),
    );

    expect(problems).toEqual([
      'Registry key missing.scenario.md has no matching .scenario.md',
      'present.scenario.md: Secret step "Import a hardware wallet" has no code path',
    ]);
  });
});
