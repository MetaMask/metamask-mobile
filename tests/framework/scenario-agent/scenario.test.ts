import { parseScenario } from './scenario';

const header = `# Demo

Tags: @PerformanceShadow
Team: @qa
Platforms: Android
`;

describe('parseScenario hints', () => {
  it('reads a Hints section as tokens and leaves steps alone', () => {
    const scenario = parseScenario(`${header}
## Hints

- WalletViewSelectorsIDs
- WalletViewSelectorsIDs.HOMEPAGE_SECTION_TITLE("tokens")
- asset-ETH

## Steps

1. Tap the Swap button
`);

    expect(scenario.hints).toEqual([
      'WalletViewSelectorsIDs',
      'WalletViewSelectorsIDs.HOMEPAGE_SECTION_TITLE("tokens")',
      'asset-ETH',
    ]);
    expect(scenario.steps.map((step) => step.text)).toEqual([
      'Tap the Swap button',
    ]);
  });

  it('allows a scenario with no Hints section', () => {
    const scenario = parseScenario(`${header}
## Steps

1. Tap the Swap button
`);

    expect(scenario.hints).toEqual([]);
  });

  it('rejects a hint line that is not a bullet', () => {
    expect(() =>
      parseScenario(`${header}
## Hints

WalletViewSelectorsIDs

## Steps

1. Tap the Swap button
`),
    ).toThrow('Not a hint');
  });
});
