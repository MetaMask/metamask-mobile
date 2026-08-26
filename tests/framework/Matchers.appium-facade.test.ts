/**
 * @jest-environment node
 */

jest.mock('./AppiumMatchers.ts', () => ({
  __esModule: true,
  default: {
    countElementsByText: jest.fn().mockResolvedValue(2),
    getElementByNameiOS: jest.fn(),
    getElementByText: jest.fn(),
    getElementByXPath: jest.fn(),
    getElementById: jest.fn(),
    getElementByAccessibilityId: jest.fn(),
    getElementByAndroidUIAutomator: jest.fn(),
    getElementByIOSPredicate: jest.fn(),
    getElementByCatchAll: jest.fn(),
  },
}));

jest.mock('./AppiumWebMatchers.ts', () => ({
  __esModule: true,
  default: {
    getElementByWebID: jest.fn(),
    getElementByXPath: jest.fn(),
    getElementByCSS: jest.fn(),
    getElementByHref: jest.fn(),
  },
}));

jest.mock('./PlatformLocator.ts', () => ({
  PlatformDetector: {
    isAndroid: jest.fn().mockReturnValue(true),
    isIOS: jest.fn().mockReturnValue(false),
    getPlatform: jest.fn().mockReturnValue('android'),
  },
}));

import Matchers from './Matchers';
import AppiumMatchers from './AppiumMatchers';
import AppiumWebMatchers from './AppiumWebMatchers';
import { PlatformDetector } from './PlatformLocator';

describe('Matchers Appium-only facades', () => {
  const mockElement = { selector: 'mock-element' };

  beforeEach(() => {
    jest.clearAllMocks();
    (AppiumMatchers.getElementByNameiOS as jest.Mock).mockResolvedValue(
      mockElement,
    );
    (AppiumMatchers.getElementByText as jest.Mock).mockResolvedValue(
      mockElement,
    );
    (AppiumMatchers.countElementsByText as jest.Mock).mockResolvedValue(2);
    (AppiumMatchers.getElementByXPath as jest.Mock).mockResolvedValue(
      mockElement,
    );
    (AppiumMatchers.getElementById as jest.Mock).mockResolvedValue(mockElement);
    (AppiumMatchers.getElementByAccessibilityId as jest.Mock).mockResolvedValue(
      mockElement,
    );
    (
      AppiumMatchers.getElementByAndroidUIAutomator as jest.Mock
    ).mockResolvedValue(mockElement);
    (AppiumMatchers.getElementByIOSPredicate as jest.Mock).mockResolvedValue(
      mockElement,
    );
    (AppiumMatchers.getElementByCatchAll as jest.Mock).mockResolvedValue(
      mockElement,
    );
    (AppiumWebMatchers.getElementByCSS as jest.Mock).mockResolvedValue(
      mockElement,
    );
    (AppiumWebMatchers.getElementByHref as jest.Mock).mockResolvedValue(
      mockElement,
    );
    (PlatformDetector.isAndroid as jest.Mock).mockReturnValue(true);
  });

  it('forwards countElementsByText to AppiumMatchers', async () => {
    const count = await Matchers.countElementsByText('Got it', true);

    expect(count).toBe(2);
    expect(AppiumMatchers.countElementsByText).toHaveBeenCalledWith(
      'Got it',
      true,
    );
  });

  it('forwards getElementByNameiOS to AppiumMatchers', async () => {
    const matched = await Matchers.getElementByNameiOS('TabBarItemTitle');

    expect(matched).toBe(mockElement);
    expect(AppiumMatchers.getElementByNameiOS).toHaveBeenCalledWith(
      'TabBarItemTitle',
      false,
    );
  });

  it('forwards getElementByExactText as an exact AppiumMatchers text lookup', async () => {
    const matched = await Matchers.getElementByExactText('Not now');

    expect(matched).toBe(mockElement);
    expect(AppiumMatchers.getElementByText).toHaveBeenCalledWith(
      'Not now',
      true,
    );
  });

  it('forwards getElementByTextContains to AppiumMatchers text lookup', async () => {
    const matched = await Matchers.getElementByTextContains('Partial', 1);

    expect(matched).toBe(mockElement);
    expect(AppiumMatchers.getElementByText).toHaveBeenCalledWith(
      'Partial',
      false,
      { index: 1 },
    );
  });

  it('forwards getElementByDescendant to a native XPath', async () => {
    const matched = await Matchers.getElementByDescendant('parent', 'child');

    expect(matched).toBe(mockElement);
    expect(AppiumMatchers.getElementByXPath).toHaveBeenCalled();
    const xpath = (AppiumMatchers.getElementByXPath as jest.Mock).mock
      .calls[0][0] as string;
    expect(xpath).toContain('parent');
    expect(xpath).toContain('child');
  });

  it('forwards getElementIDWithAncestor to a native XPath', async () => {
    const matched = await Matchers.getElementIDWithAncestor('child', 'parent');

    expect(matched).toBe(mockElement);
    expect(AppiumMatchers.getElementByXPath).toHaveBeenCalled();
    const xpath = (AppiumMatchers.getElementByXPath as jest.Mock).mock
      .calls[0][0] as string;
    expect(xpath).toContain('child');
    expect(xpath).toContain('parent');
  });

  it('forwards getEditTextWithAncestorTestId to Android UIAutomator', async () => {
    const matched =
      await Matchers.getEditTextWithAncestorTestId('password-field');

    expect(matched).toBe(mockElement);
    expect(AppiumMatchers.getElementByAndroidUIAutomator).toHaveBeenCalled();
  });

  it('forwards getElementByCSS to AppiumWebMatchers with pageUrl', async () => {
    const matched = await Matchers.getElementByCSS(
      'browser-webview',
      '.network-modal-body',
      'http://localhost:8080',
    );

    expect(matched).toBe(mockElement);
    expect(AppiumWebMatchers.getElementByCSS).toHaveBeenCalledWith(
      '.network-modal-body',
      'http://localhost:8080',
    );
  });

  it('forwards getElementByHref to AppiumWebMatchers with pageUrl', async () => {
    const matched = await Matchers.getElementByHref(
      'browser-webview',
      'https://example.com',
      'http://localhost:8080',
    );

    expect(matched).toBe(mockElement);
    expect(AppiumWebMatchers.getElementByHref).toHaveBeenCalledWith(
      'https://example.com',
      'http://localhost:8080',
    );
  });

  it('forwards getSystemElementByText to Android text lookup', async () => {
    const matched = await Matchers.getSystemElementByText('Allow');

    expect(matched).toBe(mockElement);
    expect(AppiumMatchers.getElementByText).toHaveBeenCalledWith('Allow', true);
  });

  it('forwards getSystemElementByText to iOS predicate', async () => {
    (PlatformDetector.isAndroid as jest.Mock).mockReturnValue(false);

    const matched = await Matchers.getSystemElementByText('Allow');

    expect(matched).toBe(mockElement);
    expect(AppiumMatchers.getElementByIOSPredicate).toHaveBeenCalled();
  });

  it('forwards getElementByIDAndLabel to platform-specific locator', async () => {
    const matched = await Matchers.getElementByIDAndLabel(
      'cell',
      'Account 1',
      0,
    );

    expect(matched).toBe(mockElement);
    expect(AppiumMatchers.getElementByAndroidUIAutomator).toHaveBeenCalled();
  });
});
