/**
 * Appium polling over a native balance label. Component-view cannot read that
 * element, and the loop does not cross an app-to-controller seam.
 */
import Utilities from '../../framework/Utilities';
import { PlatformDetector } from '../../framework/PlatformLocator';
import WalletView from './WalletView';

jest.mock('../../framework/Utilities', () => ({
  __esModule: true,
  default: {
    getElementText: jest.fn(),
  },
}));

jest.mock('../../framework/PlatformLocator', () => ({
  PlatformDetector: {
    isIOS: jest.fn(),
  },
}));

jest.mock('../../framework/Matchers', () => ({
  __esModule: true,
  default: {
    getElementByID: jest.fn(async () => ({})),
    getElementByText: jest.fn(async () => ({})),
  },
}));

jest.mock('../../framework/Gestures', () => ({
  __esModule: true,
  default: {},
}));

jest.mock('../../framework/Assertions', () => ({
  __esModule: true,
  default: {},
}));

jest.mock('../../framework/ai-locator/PerformanceLocatorRecovery.ts', () => ({
  isPerformanceSuiteActive: jest.fn(() => false),
}));

jest.mock('./WalletHomeScroll', () => ({
  __esModule: true,
  default: {
    walletScrollContainer: 'wallet-scroll',
  },
}));

const getElementText = Utilities.getElementText as jest.MockedFunction<
  typeof Utilities.getElementText
>;
const isIOS = PlatformDetector.isIOS as jest.MockedFunction<
  typeof PlatformDetector.isIOS
>;

describe('WalletView.waitForBalanceToStabilize', () => {
  beforeEach(() => {
    getElementText.mockReset();
    isIOS.mockReset();
    isIOS.mockReturnValue(false);
  });

  afterEach(() => {
    jest.useRealTimers();
    Date.now = jest.fn(() => 123);
  });

  async function expireBudget(ms: number): Promise<void> {
    jest.useFakeTimers();
    let clock = 10_000;
    jest.spyOn(Date, 'now').mockImplementation(() => clock);
    await Promise.resolve();
    clock += ms;
    await jest.advanceTimersByTimeAsync(ms);
  }

  function captureRejection(pending: Promise<unknown>): Promise<unknown> {
    return pending.then(
      () => {
        throw new Error('balance polling resolved');
      },
      (error: unknown) => error,
    );
  }

  it('returns the Android balance after the same value stays visible', async () => {
    getElementText.mockResolvedValue('$12.34');

    const balance = await WalletView.waitForBalanceToStabilize({
      maxWaitTime: 1_000,
      pollInterval: 1,
      sameResultTimeout: 0,
    });

    expect(balance).toBe('$12.34');
  });

  it('throws the last Android balance when the value never settles', async () => {
    getElementText.mockResolvedValue('$0.00');

    const settled = captureRejection(
      WalletView.waitForBalanceToStabilize({
        maxWaitTime: 30,
        pollInterval: 5,
        sameResultTimeout: 10_000,
      }),
    );

    await expireBudget(31);

    await expect(settled).resolves.toMatchObject({
      message:
        'Balance did not stabilize within 30ms (last observed balance: "$0.00")',
    });
  });

  it('throws none when Android never reads a balance', async () => {
    getElementText.mockRejectedValue(new Error('balance label missing'));

    const settled = captureRejection(
      WalletView.waitForBalanceToStabilize({
        maxWaitTime: 20,
        pollInterval: 5,
        sameResultTimeout: 10_000,
      }),
    );

    await expireBudget(21);

    await expect(settled).resolves.toMatchObject({
      message:
        'Balance did not stabilize within 20ms (last observed balance: none)',
    });
  });

  it('returns the first non-zero iOS balance', async () => {
    isIOS.mockReturnValue(true);
    getElementText.mockResolvedValue('$9.00');

    const balance = await WalletView.waitForBalanceToStabilize({
      maxWaitTime: 1_000,
    });

    expect(balance).toBe('$9.00');
  });

  it('throws the last iOS balance when the label stays at zero', async () => {
    isIOS.mockReturnValue(true);
    getElementText.mockResolvedValue('$0.00');

    const settled = captureRejection(
      WalletView.waitForBalanceToStabilize({
        maxWaitTime: 1_100,
      }),
    );

    await expireBudget(1_100);

    await expect(settled).resolves.toMatchObject({
      message:
        'Balance did not stabilize within 1100ms (last observed balance: "$0.00")',
    });
  });
});
