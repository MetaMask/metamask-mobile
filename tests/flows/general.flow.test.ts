jest.mock('../framework/logger', () => ({
  ...jest.requireActual('../framework/logger'),
  createLogger: jest.fn(() => ({
    debug: jest.fn(),
    error: jest.fn(),
  })),
}));

jest.mock('../framework/Gestures', () => ({
  __esModule: true,
  default: {
    tap: jest.fn(),
    waitAndTap: jest.fn(),
  },
}));

jest.mock('../framework/Assertions', () => ({
  __esModule: true,
  default: {
    expectElementToBeVisible: jest.fn(),
    expectElementToNotBeVisible: jest.fn(),
  },
}));

jest.mock('../framework/Matchers', () => ({
  __esModule: true,
  default: {
    getElementByID: jest.fn(),
    getElementByText: jest.fn(),
  },
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
import Gestures from '../framework/Gestures';
import Assertions from '../framework/Assertions';
import Matchers from '../framework/Matchers';
import { PlatformDetector } from '../framework/PlatformLocator';

describe('general.flow Playwright dev screens', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('dismisses only the development server picker before app bootstrap', async () => {
    const serverRow = { selector: 'metro-server-row' };
    (Matchers.getElementByText as jest.Mock).mockReturnValue(serverRow);

    await dismissDevelopmentServerPickerPlaywright();

    expect(Matchers.getElementByText).toHaveBeenCalledWith(
      'http://localhost:8081',
    );
    expect(Assertions.expectElementToBeVisible).toHaveBeenCalledWith(
      serverRow,
      expect.objectContaining({
        timeout: 1500,
        description: 'Dev Server Row should be visible',
      }),
    );
    expect(Gestures.waitAndTap).toHaveBeenCalledWith(serverRow);
    expect(Matchers.getElementByID).not.toHaveBeenCalled();
  });

  it('uses 10.0.2.2 as the Metro host on Android', async () => {
    (PlatformDetector.isAndroid as jest.Mock).mockReturnValueOnce(true);
    (Matchers.getElementByText as jest.Mock).mockReturnValue({
      selector: 'metro-server-row',
    });

    await dismissDevelopmentServerPickerPlaywright();

    expect(Matchers.getElementByText).toHaveBeenCalledWith(
      'http://10.0.2.2:8081',
    );
  });

  // The METRO_HOST_E2E override branch is not unit-testable here:
  // babel-plugin-transform-inline-environment-variables (babel.config.js)
  // inlines process.env.* at compile time, so runtime mutation has no effect.

  it('closes the developer menu directly without toggling Fast refresh', async () => {
    const closeButton = { selector: 'xmark' };
    (Matchers.getElementByText as jest.Mock).mockImplementation(() => {
      throw new Error('Continue not visible');
    });
    (Matchers.getElementByID as jest.Mock).mockReturnValue(closeButton);

    await dismissDeveloperMenuPlaywright();

    expect(Matchers.getElementByText).toHaveBeenCalledWith('Continue');
    expect(Matchers.getElementByID).toHaveBeenCalledWith('xmark');
    expect(Gestures.waitAndTap).toHaveBeenNthCalledWith(1, closeButton);
    expect(Assertions.expectElementToNotBeVisible).toHaveBeenCalledWith(
      closeButton,
      expect.objectContaining({
        timeout: 2000,
        description: 'Dev Menu Close Button should not be visible',
      }),
    );
    expect(
      (Assertions.expectElementToNotBeVisible as jest.Mock).mock
        .invocationCallOrder[0],
    ).toBeGreaterThan(
      (Gestures.waitAndTap as jest.Mock).mock.invocationCallOrder[0],
    );
    expect(Matchers.getElementByID).not.toHaveBeenCalledWith('fast-refresh');
  });
});
