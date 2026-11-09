import { bindingCatalog } from './bindingCatalog.ts';
import { buildLock, matchStep, StepMatchError } from './matchSteps.ts';
import { parseScenario } from './ScenarioLoader.ts';

const SOURCE = 'demo.scenario.md';

function step(text: string, kind: 'do' | 'expect' = 'do') {
  const line = kind === 'expect' ? `1. Expect: ${text}` : `1. ${text}`;
  const scenario = parseScenario(
    `# Demo

Tags: @PerformanceShadow
Team: @qa-team
Platforms: Android

## Steps

${line}
`,
    SOURCE,
  );
  return scenario.steps[0];
}

describe('matchStep', () => {
  it('matches a step that uses the catalog wording exactly', () => {
    const result = matchStep(
      step('Tap the Swap button on the wallet home'),
      bindingCatalog,
    );

    expect(result.ok && result.locked.binding).toBe(
      'WalletView.tapWalletSwapButton',
    );
  });

  it('captures values from a placeholder phrase', () => {
    const result = matchStep(
      step('Select USDC on Ethereum as the destination token'),
      bindingCatalog,
    );

    expect(result.ok && result.locked).toEqual(
      expect.objectContaining({
        binding: 'QuoteView.selectNetworkAndTokenTo',
        paramTemplate: 'Select {token} on {network} as the destination token',
      }),
    );
  });

  it('fuzzy-matches a shorter wording of the same action', () => {
    const result = matchStep(step('Tap the swap button'), bindingCatalog);

    expect(result.ok && result.locked.binding).toBe(
      'WalletView.tapWalletSwapButton',
    );
  });

  it('does not bind an expectation to a tap', () => {
    const result = matchStep(
      step('Tap the Swap button on the wallet home', 'expect'),
      bindingCatalog,
    );

    expect(result.ok).toBe(false);
  });

  it('lists the closest actions when nothing matches', () => {
    expect(() =>
      buildLock(
        parseScenario(
          `# Demo

Tags: @PerformanceShadow
Team: @qa-team
Platforms: Android

## Steps

1. Send a postcard to the moon
`,
          SOURCE,
        ),
        bindingCatalog,
      ),
    ).toThrow(StepMatchError);

    try {
      buildLock(
        parseScenario(
          `# Demo

Tags: @PerformanceShadow
Team: @qa-team
Platforms: Android

## Steps

1. Send a postcard to the moon
`,
          SOURCE,
        ),
        bindingCatalog,
      );
    } catch (error) {
      expect(error).toBeInstanceOf(StepMatchError);
      expect((error as Error).message).toContain(
        'Step 1: "Send a postcard to the moon"',
      );
      expect((error as Error).message).toContain('bindingCatalog.ts');
    }
  });
});
