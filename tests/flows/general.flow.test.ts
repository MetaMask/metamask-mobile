jest.mock('../framework/logger', () => ({
  createLogger: jest.fn(() => ({
    debug: jest.fn(),
    error: jest.fn(),
  })),
}));

jest.mock('../framework', () => ({
  Gestures: {
    tap: jest.fn(),
  },
  PlaywrightAssertions: {
    expectElementToBeVisible: jest.fn(),
    expectElementToNotBeVisible: jest.fn(),
  },
  PlaywrightGestures: {
    waitAndTap: jest.fn(),
  },
  PlaywrightMatchers: {
    getElementById: jest.fn(),
    getElementByText: jest.fn(),
  },
}));

jest.mock('../framework/Assertions', () => ({
  expectElementToBeVisible: jest.fn(),
}));

jest.mock('../framework/Matchers', () => ({
  getElementByID: jest.fn(),
  getElementByText: jest.fn(),
}));

jest.mock('../framework/Utilities', () => ({
  __esModule: true,
  default: {
    executeWithRetry: jest.fn(),
  },
  sleep: jest.fn(),
}));

jest.mock('../framework/PlatformLocator', () => ({
  PlatformDetector: {
    isAndroid: jest.fn(() => false),
  },
}));

jest.mock('../page-objects/wallet/LoginView', () => ({
  container: {},
}));

import {
  dismissDeveloperMenuPlaywright,
  dismissDevelopmentServerPickerPlaywright,
} from './general.flow';
import {
  PlaywrightAssertions,
  PlaywrightGestures,
  PlaywrightMatchers,
} from '../framework';
import { PlatformDetector } from '../framework/PlatformLocator';

describe('general.flow Playwright dev screens', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('dismisses only the development server picker before app bootstrap', async () => {
    const serverRow = { selector: 'metro-server-row' };
    (PlaywrightMatchers.getElementByText as jest.Mock).mockResolvedValue(
      serverRow,
    );

    await dismissDevelopmentServerPickerPlaywright();

    expect(PlaywrightMatchers.getElementByText).toHaveBeenCalledWith(
      'http://localhost:8081',
    );
    expect(PlaywrightAssertions.expectElementToBeVisible).toHaveBeenCalledWith(
      serverRow,
      expect.objectContaining({
        timeout: 1500,
        description: 'Dev Server Row should be visible',
      }),
    );
    expect(PlaywrightGestures.waitAndTap).toHaveBeenCalledWith(serverRow);
    expect(PlaywrightMatchers.getElementById).not.toHaveBeenCalled();
  });

  it('uses 10.0.2.2 as the Metro host on Android', async () => {
    (PlatformDetector.isAndroid as jest.Mock).mockReturnValueOnce(true);
    (PlaywrightMatchers.getElementByText as jest.Mock).mockResolvedValue({
      selector: 'metro-server-row',
    });

    await dismissDevelopmentServerPickerPlaywright();

    expect(PlaywrightMatchers.getElementByText).toHaveBeenCalledWith(
      'http://10.0.2.2:8081',
    );
  });

  // The METRO_HOST_E2E override branch is not unit-testable here:
  // babel-plugin-transform-inline-environment-variables (babel.config.js)
  // inlines process.env.* at compile time, so runtime mutation has no effect.

  it('closes the developer menu directly without toggling Fast refresh', async () => {
    const closeButton = { selector: 'xmark' };
    (PlaywrightMatchers.getElementByText as jest.Mock).mockRejectedValue(
      new Error('Continue not visible'),
    );
    (PlaywrightMatchers.getElementById as jest.Mock).mockResolvedValue(
      closeButton,
    );

    await dismissDeveloperMenuPlaywright();

    expect(PlaywrightMatchers.getElementByText).toHaveBeenCalledWith(
      'Continue',
    );
    expect(PlaywrightMatchers.getElementById).toHaveBeenCalledWith('xmark', {
      exact: true,
    });
    expect(PlaywrightGestures.waitAndTap).toHaveBeenNthCalledWith(
      1,
      closeButton,
    );
    expect(
      PlaywrightAssertions.expectElementToNotBeVisible,
    ).toHaveBeenCalledWith(
      closeButton,
      expect.objectContaining({ timeout: 5000 }),
    );
    expect(
      (PlaywrightAssertions.expectElementToNotBeVisible as jest.Mock).mock
        .invocationCallOrder[0],
    ).toBeGreaterThan(
      (PlaywrightGestures.waitAndTap as jest.Mock).mock.invocationCallOrder[0],
    );
    expect(PlaywrightMatchers.getElementById).not.toHaveBeenCalledWith(
      'fast-refresh',
      { exact: true },
    );
  });
});
