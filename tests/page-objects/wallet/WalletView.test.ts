/**
 * Appium polling over a native balance label. Component-view cannot read that
 * element, and the loop does not cross an app-to-controller seam.
 */
import Matchers from '../../framework/Matchers';
import { PlatformDetector } from '../../framework/PlatformLocator';
import WalletView from './WalletView';

jest.mock('../../framework/Utilities', () => ({
  __esModule: true,
  default: {},
}));

jest.mock('../../framework/PlatformLocator', () => ({
  PlatformDetector: {
    isIOS: jest.fn(),
  },
}));

jest.mock('../../framework/Matchers', () => ({
  __esModule: true,
  default: {
    getElementByID: jest.fn(),
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

const getElementByID = Matchers.getElementByID as jest.MockedFunction<
  typeof Matchers.getElementByID
>;
const isIOS = PlatformDetector.isIOS as jest.MockedFunction<
  typeof PlatformDetector.isIOS
>;

function mockBalanceContainer(getAttribute: jest.Mock): void {
  getElementByID.mockResolvedValue({
    getAttribute,
  } as never);
}

describe('WalletView.waitForBalanceToStabilize', () => {
  let getAttribute: jest.Mock;

  beforeEach(() => {
    getAttribute = jest.fn().mockResolvedValue(null);
    mockBalanceContainer(getAttribute);
    isIOS.mockReset();
    isIOS.mockReturnValue(false);
  });

  afterEach(() => {
    jest.useRealTimers();
    Date.now = jest.fn(() => 123);
  });

  async function settleAfter(
    ms: number,
    start: () => Promise<unknown>,
  ): Promise<unknown> {
    jest.useFakeTimers();
    let clock = 10_000;
    jest.spyOn(Date, 'now').mockImplementation(() => clock);
    const settled = captureRejection(start());
    for (let step = 0; step < 10; step += 1) {
      await Promise.resolve();
    }
    clock += ms;
    await jest.advanceTimersByTimeAsync(ms);
    return settled;
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
    getAttribute.mockResolvedValue('$12.34');

    const balance = await WalletView.waitForBalanceToStabilize({
      maxWaitTime: 1_000,
      pollInterval: 1,
      sameResultTimeout: 0,
    });

    expect(balance).toBe('$12.34');
  });

  it('reads the account total from the parent content description', async () => {
    getAttribute.mockResolvedValue('$9.02, -$0.01, (-0.08%)');

    const balance = await WalletView.waitForBalanceToStabilize({
      maxWaitTime: 1_000,
      pollInterval: 1,
      sameResultTimeout: 0,
    });

    expect(balance).toBe('$9.02');
    expect(getAttribute).toHaveBeenCalledWith('content-desc');
  });

  it('reads the homepage hero total without probing for the surface first', async () => {
    getAttribute.mockResolvedValue('$1,234.56, +$3.00, +0.2%, Today');

    const balance = await WalletView.waitForBalanceToStabilize({
      maxWaitTime: 1_000,
      pollInterval: 1,
      sameResultTimeout: 0,
    });

    expect(balance).toBe('$1,234.56');
    const pattern = getElementByID.mock.calls[0][0] as RegExp;
    expect(pattern.test('io.metamask:id/homepage-balance-breakdown-hero')).toBe(
      true,
    );
    expect(pattern.test('balance-container')).toBe(true);
    expect(pattern.test('homepage-balance-breakdown-hero-content')).toBe(false);
    expect(pattern.test('money-balance-container')).toBe(false);
  });

  it('throws the last Android balance when the value never settles', async () => {
    getAttribute.mockResolvedValue('$0.00');

    const settled = settleAfter(31, () =>
      WalletView.waitForBalanceToStabilize({
        maxWaitTime: 30,
        pollInterval: 5,
        sameResultTimeout: 10_000,
      }),
    );

    await expect(settled).resolves.toMatchObject({
      message:
        'Balance did not stabilize within 30ms (last observed balance: "$0.00")',
    });
  });

  it('throws none when Android never reads a balance', async () => {
    getAttribute.mockRejectedValue(new Error('balance label missing'));

    const settled = settleAfter(21, () =>
      WalletView.waitForBalanceToStabilize({
        maxWaitTime: 20,
        pollInterval: 5,
        sameResultTimeout: 10_000,
      }),
    );

    await expect(settled).resolves.toMatchObject({
      message:
        'Balance did not stabilize within 20ms (last observed balance: none)',
    });
  });

  it('returns the first non-zero iOS balance', async () => {
    isIOS.mockReturnValue(true);
    getAttribute.mockResolvedValue('$9.00');

    const balance = await WalletView.waitForBalanceToStabilize({
      maxWaitTime: 1_000,
    });

    expect(balance).toBe('$9.00');
  });

  it('throws the last iOS balance when the label stays at zero', async () => {
    isIOS.mockReturnValue(true);
    getAttribute.mockResolvedValue('$0.00');

    const settled = settleAfter(1_100, () =>
      WalletView.waitForBalanceToStabilize({
        maxWaitTime: 1_100,
      }),
    );

    await expect(settled).resolves.toMatchObject({
      message:
        'Balance did not stabilize within 1100ms (last observed balance: "$0.00")',
    });
  });
});
