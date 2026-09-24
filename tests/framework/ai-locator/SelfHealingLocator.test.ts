import type { Browser } from 'webdriverio';
import type { AppiumElement } from '../AppiumElement.ts';
import Matchers from '../Matchers.ts';
import {
  tapWithSelfHealingLocator,
  type LocatorRecoveryProvider,
} from './SelfHealingLocator.ts';

jest.mock('../Matchers.ts', () => ({
  __esModule: true,
  default: {
    getElementByID: jest.fn(),
    getElementByLabel: jest.fn(),
    getElementByText: jest.fn(),
    getElementByNativeXPath: jest.fn(),
  },
}));

const appiumDriver = {} as Browser;

function createElement(click: () => Promise<void>): AppiumElement {
  return { click } as unknown as AppiumElement;
}

describe('tapWithSelfHealingLocator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses the deterministic locator without invoking recovery', async () => {
    const click = jest.fn().mockResolvedValue(undefined);
    const recovery = {
      recover: jest.fn(),
    } as unknown as LocatorRecoveryProvider;

    const result = await tapWithSelfHealingLocator({
      intent: 'tap Send on the wallet home',
      primary: async () => createElement(click),
      driver: appiumDriver,
      recovery,
    });

    expect(result).toBe('primary');
    expect(click).toHaveBeenCalledTimes(1);
    expect(recovery.recover).not.toHaveBeenCalled();
  });

  it('recovers with the provider result after the deterministic locator fails', async () => {
    const recoveredClick = jest.fn().mockResolvedValue(undefined);
    const recoveredElement = createElement(recoveredClick);
    jest.mocked(Matchers.getElementByLabel).mockResolvedValue(recoveredElement);

    const recovery: LocatorRecoveryProvider = {
      recover: jest.fn().mockResolvedValue({
        strategy: 'label',
        value: 'Transfer',
      }),
    };
    const onRecovered = jest.fn();

    const result = await tapWithSelfHealingLocator({
      intent: 'tap Send on the wallet home',
      primary: async () => {
        throw new Error('wallet-send-button was not found');
      },
      driver: appiumDriver,
      recovery,
      onRecovered,
    });

    expect(result).toBe('recovered');
    expect(recovery.recover).toHaveBeenCalledWith(
      expect.objectContaining({
        driver: appiumDriver,
        intent: 'tap Send on the wallet home',
        primaryError: 'wallet-send-button was not found',
      }),
    );
    expect(recoveredClick).toHaveBeenCalledTimes(1);
    expect(onRecovered).toHaveBeenCalledWith(
      expect.objectContaining({
        intent: 'tap Send on the wallet home',
        locator: { strategy: 'label', value: 'Transfer' },
      }),
    );
  });

  it('rethrows the primary error when recovery finds no locator', async () => {
    const recovery: LocatorRecoveryProvider = {
      recover: jest.fn().mockResolvedValue(null),
    };
    const error = new Error('primary locator failed');

    await expect(
      tapWithSelfHealingLocator({
        intent: 'tap Send on the wallet home',
        primary: async () => {
          throw error;
        },
        driver: appiumDriver,
        recovery,
      }),
    ).rejects.toBe(error);
  });

  it('does not recover unless a provider is explicitly supplied', async () => {
    const error = new Error('primary locator failed');

    await expect(
      tapWithSelfHealingLocator({
        intent: 'tap Send on the wallet home',
        primary: async () => {
          throw error;
        },
        driver: appiumDriver,
      }),
    ).rejects.toBe(error);
  });
});
