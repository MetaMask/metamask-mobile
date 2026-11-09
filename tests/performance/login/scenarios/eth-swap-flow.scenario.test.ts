/* eslint-disable import-x/no-nodejs-modules */
import path from 'path';
import type { Browser } from 'webdriverio';
import WalletView from '../../../page-objects/wallet/WalletView';
import QuoteView from '../../../page-objects/swaps/QuoteView';
import {
  formatScenarioReport,
  loadScenario,
  parseSimulatedDrift,
  ScenarioExecutor,
  type LocatorActions,
} from '../../../framework/scenario';
import { swapBindings } from './swapBindings';

jest.mock('../../../page-objects/wallet/WalletView', () => ({
  __esModule: true,
  default: { tapWalletSwapButton: jest.fn() },
}));

jest.mock('../../../page-objects/swaps/QuoteView', () => ({
  __esModule: true,
  default: {
    isVisible: jest.fn(),
    selectNetworkAndTokenTo: jest.fn(),
    enterSourceTokenAmount: jest.fn(),
    dismissKeypad: jest.fn(),
    isQuoteDisplayed: jest.fn(),
  },
}));

const SCENARIO_PATH = path.join(__dirname, 'eth-swap-flow.scenario.md');

function createLocatorActions(): jest.Mocked<LocatorActions> {
  return {
    tap: jest.fn().mockResolvedValue(undefined),
    assertVisible: jest.fn().mockResolvedValue(undefined),
  };
}

function runSwapScenario(drift?: string) {
  const loaded = loadScenario(SCENARIO_PATH);
  const performanceTracker = { addTimer: jest.fn() };
  const locatorActions = createLocatorActions();
  const executor = new ScenarioExecutor({
    loaded,
    platform: 'android',
    bindings: swapBindings,
    locatorActions,
    performanceTracker,
    driver: {} as Browser,
    policy: 'report',
    simulatedDrift: parseSimulatedDrift(drift),
    log: jest.fn(),
  });
  return { executor, performanceTracker, locatorActions, loaded };
}

describe('eth-swap-flow scenario', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('binds every lockfile step to a swap Page Object method', () => {
    const { lock } = loadScenario(SCENARIO_PATH);

    for (const step of Object.values(lock.steps)) {
      expect(swapBindings).toHaveProperty([step.binding]);
    }
  });

  it('calls the same Page Object methods as eth-swap-flow.spec.ts, in order', async () => {
    const calls: string[] = [];
    jest.mocked(WalletView.tapWalletSwapButton).mockImplementation(async () => {
      calls.push('WalletView.tapWalletSwapButton');
    });
    jest.mocked(QuoteView.isVisible).mockImplementation(async () => {
      calls.push('QuoteView.isVisible');
    });
    jest
      .mocked(QuoteView.selectNetworkAndTokenTo)
      .mockImplementation(async (network, token) => {
        calls.push(`QuoteView.selectNetworkAndTokenTo(${network}, ${token})`);
      });
    jest
      .mocked(QuoteView.enterSourceTokenAmount)
      .mockImplementation(async (amount) => {
        calls.push(`QuoteView.enterSourceTokenAmount(${amount})`);
      });
    jest.mocked(QuoteView.dismissKeypad).mockImplementation(async () => {
      calls.push('QuoteView.dismissKeypad');
    });
    jest.mocked(QuoteView.isQuoteDisplayed).mockImplementation(async () => {
      calls.push('QuoteView.isQuoteDisplayed');
    });
    const { executor, performanceTracker } = runSwapScenario();

    const report = await executor.run();

    expect(calls).toEqual([
      'WalletView.tapWalletSwapButton',
      'QuoteView.isVisible',
      'QuoteView.selectNetworkAndTokenTo(Ethereum, USDC)',
      'QuoteView.enterSourceTokenAmount(0.01)',
      'QuoteView.dismissKeypad',
      'QuoteView.isQuoteDisplayed',
    ]);
    expect(
      performanceTracker.addTimer.mock.calls.map(([timer]) => [
        timer.id,
        timer.baseThreshold,
      ]),
    ).toEqual([
      [
        'Time since the user clicks on the "Swap" button until the swap page is loaded',
        2500,
      ],
      [
        'Time since the user enters the amount until the quote is displayed',
        3000,
      ],
    ]);
    expect(report.status).toBe('PASS');
  });

  it('heals a drifted Swap button from the lockfile and reports PASS_HEALED_TRIGGER', async () => {
    const { executor, locatorActions } = runSwapScenario('1:binding');

    const report = await executor.run();

    expect(WalletView.tapWalletSwapButton).not.toHaveBeenCalled();
    expect(locatorActions.tap).toHaveBeenCalledWith(
      { strategy: 'testID', value: 'wallet-swap-button' },
      'Tap the Swap button on the wallet home',
    );
    expect(report.status).toBe('PASS_HEALED_TRIGGER');
    expect(formatScenarioReport(report)).toContain(
      'Status: PASS_HEALED_TRIGGER',
    );
  });

  it('marks the quote timer INVALID_MEASUREMENT when its end condition drifts', async () => {
    const { executor, performanceTracker } = runSwapScenario('6:binding');

    const report = await executor.run();

    expect(performanceTracker.addTimer).toHaveBeenCalledTimes(1);
    expect(report.timers.map((timer) => timer.valid)).toEqual([true, false]);
    expect(report.status).toBe('INVALID_MEASUREMENT');
  });
});
