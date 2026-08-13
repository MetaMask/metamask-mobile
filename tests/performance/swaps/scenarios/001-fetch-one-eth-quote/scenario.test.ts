import { ScenarioContext, ScenarioPhase } from '../types';
import { SCENARIO_001_LOCATORS } from './locators';
import { hasPositiveNumericValue, scenario001 } from './scenario';

function createContext(): {
  context: ScenarioContext;
  clicks: string[];
  waits: { testId: string; timeoutMs: number }[];
} {
  const clicks: string[] = [];
  const waits: { testId: string; timeoutMs: number }[] = [];
  let timestamp = 100;

  const context: ScenarioContext = {
    log: jest.fn(),
    clickTestId: (testId) => clicks.push(testId),
    waitForTestId: (testId, timeoutMs) => waits.push({ testId, timeoutMs }),
    getVisibleText: (testId) =>
      testId === SCENARIO_001_LOCATORS.sourceAmountInput
        ? '0 ETH'
        : '1.25 USDC',
    getExactScreenText: () => 'ETH',
    hasTestId: () => false,
    delay: async () => undefined,
    now: () => timestamp,
    measurePhase: async (name, action): Promise<ScenarioPhase> => {
      const startedAt = timestamp;
      await action();
      timestamp += 10;
      return { name, startedAt, endedAt: timestamp, durationMs: 10 };
    },
  };

  return { context, clicks, waits };
}

describe('Scenario 001', () => {
  it.each([
    ['1.25 USDC', true],
    ['0 USDC', false],
    ['Select amount', false],
    [null, false],
  ])('detects a positive quote in %s', (text, expected) => {
    const result = hasPositiveNumericValue(text);

    expect(result).toBe(expected);
  });

  it('executes the deterministic quote flow', async () => {
    const { context, clicks, waits } = createContext();

    const result = await scenario001.run(context);

    expect(scenario001.startingTestId).toBe(SCENARIO_001_LOCATORS.openSwaps);
    expect(result.phases.map(({ name }) => name)).toEqual([
      'open-swaps',
      'select-destination',
      'fetch-first-quote',
    ]);
    expect(clicks).toEqual([
      SCENARIO_001_LOCATORS.openSwaps,
      SCENARIO_001_LOCATORS.destinationTokenSelector,
      SCENARIO_001_LOCATORS.ethereumUsdc,
      SCENARIO_001_LOCATORS.sourceAmountInput,
      SCENARIO_001_LOCATORS.keypadDelete,
      SCENARIO_001_LOCATORS.keypadDigitOne,
    ]);
    expect(waits).toContainEqual({
      testId: SCENARIO_001_LOCATORS.ethereumUsdc,
      timeoutMs: 20_000,
    });
    expect(result.preconditions).toEqual({
      walletUnlocked: true,
      sourceAmountInitiallyEmpty: true,
      sourceTokenText: 'ETH',
      destinationToken: 'USDC',
      sourceAmount: '1',
    });
  });

  it('rejects a prepopulated source amount before selecting a destination', async () => {
    const { context, clicks } = createContext();
    context.getVisibleText = () => '1 ETH';

    await expect(scenario001.run(context)).rejects.toThrow(
      'Expected an empty source amount before measurement',
    );
    expect(clicks).toEqual([SCENARIO_001_LOCATORS.openSwaps]);
  });

  it('rejects a non-ETH source token', async () => {
    const { context } = createContext();
    context.getExactScreenText = () => 'POL';

    await expect(scenario001.run(context)).rejects.toThrow(
      'Expected ETH as the source token',
    );
  });

  it('fails when a positive quote does not appear before the deadline', async () => {
    const { context } = createContext();
    let nowCalls = 0;
    context.getVisibleText = () => null;
    context.now = () => {
      nowCalls += 1;
      return nowCalls === 1 ? 0 : 30_001;
    };

    await expect(scenario001.run(context)).rejects.toThrow(
      'First quote did not become visible within 30000ms',
    );
  });

  it('returns from Swaps to Wallet after measurement', async () => {
    const { context, clicks, waits } = createContext();
    const visibleTestIds = new Set([SCENARIO_001_LOCATORS.swapsBack]);
    context.hasTestId = (testId) => visibleTestIds.has(testId);
    context.clickTestId = (testId) => {
      clicks.push(testId);
      if (testId === SCENARIO_001_LOCATORS.swapsBack) {
        visibleTestIds.delete(SCENARIO_001_LOCATORS.swapsBack);
        visibleTestIds.add(SCENARIO_001_LOCATORS.openSwaps);
      }
    };

    await scenario001.restoreAppState(context);

    expect(clicks).toEqual([SCENARIO_001_LOCATORS.swapsBack]);
    expect(waits).toContainEqual({
      testId: SCENARIO_001_LOCATORS.openSwaps,
      timeoutMs: 15_000,
    });
  });

  it('backs out of the token selector before returning to Wallet', async () => {
    const { context, clicks, waits } = createContext();
    const visibleTestIds = new Set([SCENARIO_001_LOCATORS.tokenSelectorBack]);
    context.hasTestId = (testId) => visibleTestIds.has(testId);
    context.clickTestId = (testId) => {
      clicks.push(testId);
      if (testId === SCENARIO_001_LOCATORS.tokenSelectorBack) {
        visibleTestIds.delete(SCENARIO_001_LOCATORS.tokenSelectorBack);
        visibleTestIds.add(SCENARIO_001_LOCATORS.swapsBack);
      } else if (testId === SCENARIO_001_LOCATORS.swapsBack) {
        visibleTestIds.delete(SCENARIO_001_LOCATORS.swapsBack);
        visibleTestIds.add(SCENARIO_001_LOCATORS.openSwaps);
      }
    };

    await scenario001.restoreAppState(context);

    expect(clicks).toEqual([
      SCENARIO_001_LOCATORS.tokenSelectorBack,
      SCENARIO_001_LOCATORS.swapsBack,
    ]);
    expect(waits).toEqual([
      { testId: SCENARIO_001_LOCATORS.swapsBack, timeoutMs: 10_000 },
      { testId: SCENARIO_001_LOCATORS.openSwaps, timeoutMs: 15_000 },
    ]);
  });

  it('does not navigate when Wallet is already visible', async () => {
    const { context, clicks, waits } = createContext();
    context.hasTestId = (testId) => testId === SCENARIO_001_LOCATORS.openSwaps;

    await scenario001.restoreAppState(context);

    expect(clicks).toEqual([]);
    expect(waits).toEqual([]);
  });

  it('fails restoration when neither Wallet nor a known Swaps screen is visible', async () => {
    const { context } = createContext();

    await expect(scenario001.restoreAppState(context)).rejects.toThrow(
      'Could not identify the Swaps or Wallet screen',
    );
  });
});
