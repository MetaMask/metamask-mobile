import type { Browser } from 'webdriverio';
import { ClaudeProvider } from '../ai-visual/providers/claude';
import {
  ClaudeLocatorRecoveryProvider,
  createLocatorRecoveryPrompt,
  pageSourceContainsSecrets,
} from './ClaudeLocatorRecoveryProvider';

jest.mock('../ai-visual/providers/claude', () => ({
  ClaudeProvider: jest.fn().mockImplementation(() => ({
    analyzeImage: jest.fn(),
  })),
}));

describe('pageSourceContainsSecrets', () => {
  it('detects import-from-seed SRP entry screens', () => {
    expect(
      pageSourceContainsSecrets(
        '<AppiumAUT><XCUIElementTypeOther name="import-from-seed-screen"/><XCUIElementTypeTextField value="abandon"/></AppiumAUT>',
      ),
    ).toBe(true);
  });

  it('detects SrpInputGrid word fields', () => {
    expect(
      pageSourceContainsSecrets(
        '<android.widget.EditText resource-id="srp-input-word-3" text="ability"/>',
      ),
    ).toBe(true);
  });

  it('detects reveal-private-credential screens', () => {
    expect(
      pageSourceContainsSecrets(
        '<AppiumAUT><XCUIElementTypeOther name="reveal-private-credential-screen"/><XCUIElementTypeStaticText value="abandon ability able"/></AppiumAUT>',
      ),
    ).toBe(true);
  });

  it('returns false for non-secret wallet screens', () => {
    expect(
      pageSourceContainsSecrets(
        '<AppiumAUT><XCUIElementTypeButton name="wallet-send-button"/></AppiumAUT>',
      ),
    ).toBe(false);
  });
});

describe('createLocatorRecoveryPrompt', () => {
  it('omits the known-locators section when none are provided', () => {
    const prompt = createLocatorRecoveryPrompt(
      'tap Send',
      'not found',
      '<tree/>',
    );

    expect(prompt).toContain(
      'Primary locator error: not found\n\nAccessibility tree:',
    );
    expect(prompt).not.toContain('Locators that matched this control before');
  });

  it('lists known locators before the accessibility tree', () => {
    const prompt = createLocatorRecoveryPrompt(
      'tap Swap',
      'not found',
      '<tree/>',
      [{ strategy: 'testID', value: 'wallet-swap-button' }],
    );

    expect(prompt).toContain(
      'Locators that matched this control before (they no longer match):\n- testID: wallet-swap-button\n\nAccessibility tree:',
    );
  });
});

describe('ClaudeLocatorRecoveryProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('refuses recovery on SRP-entry screens without screenshot or model call', async () => {
    const analyzeImage = jest.fn();
    jest.mocked(ClaudeProvider).mockImplementation(
      () =>
        ({
          analyzeImage,
        }) as unknown as ClaudeProvider,
    );

    const takeScreenshot = jest.fn().mockResolvedValue('c2NyZWVuc2hvdA==');
    const getPageSource = jest.fn().mockResolvedValue(`
      <hierarchy>
        <android.widget.FrameLayout resource-id="import-from-seed-screen">
          <android.widget.EditText resource-id="seed-phrase-input" text="abandon ability able about above absent"/>
        </android.widget.FrameLayout>
      </hierarchy>
    `);

    const provider = new ClaudeLocatorRecoveryProvider();
    const result = await provider.recover({
      driver: { getPageSource, takeScreenshot } as unknown as Browser,
      intent: 'tap continue on import wallet',
      primaryError: 'continue button not found',
    });

    expect(result).toBeNull();
    expect(getPageSource).toHaveBeenCalledTimes(1);
    expect(takeScreenshot).not.toHaveBeenCalled();
    expect(analyzeImage).not.toHaveBeenCalled();
  });

  it('refuses recovery on reveal-seed screens without screenshot or model call', async () => {
    const analyzeImage = jest.fn();
    jest.mocked(ClaudeProvider).mockImplementation(
      () =>
        ({
          analyzeImage,
        }) as unknown as ClaudeProvider,
    );

    const takeScreenshot = jest.fn().mockResolvedValue('c2NyZWVuc2hvdA==');
    const getPageSource = jest.fn().mockResolvedValue(`
      <hierarchy>
        <android.widget.FrameLayout resource-id="reveal-private-credential-screen">
          <android.widget.TextView text="abandon ability able about above absent"/>
          <android.widget.ImageView resource-id="reveal-credential-qr-code-image"/>
        </android.widget.FrameLayout>
      </hierarchy>
    `);

    const provider = new ClaudeLocatorRecoveryProvider();
    const result = await provider.recover({
      driver: { getPageSource, takeScreenshot } as unknown as Browser,
      intent: 'tap done on reveal credential',
      primaryError: 'done button not found',
    });

    expect(result).toBeNull();
    expect(getPageSource).toHaveBeenCalledTimes(1);
    expect(takeScreenshot).not.toHaveBeenCalled();
    expect(analyzeImage).not.toHaveBeenCalled();
  });

  it('sends tree and screenshot when the screen is not secret-bearing', async () => {
    const analyzeImage = jest.fn().mockResolvedValue({
      success: true,
      rawResponse: '{"strategy":"testID","value":"wallet-send-button"}',
    });
    jest.mocked(ClaudeProvider).mockImplementation(
      () =>
        ({
          analyzeImage,
        }) as unknown as ClaudeProvider,
    );

    const takeScreenshot = jest.fn().mockResolvedValue('c2NyZWVuc2hvdA==');
    const getPageSource = jest
      .fn()
      .mockResolvedValue(
        '<AppiumAUT><XCUIElementTypeButton name="wallet-home"/></AppiumAUT>',
      );

    const provider = new ClaudeLocatorRecoveryProvider();
    const result = await provider.recover({
      driver: { getPageSource, takeScreenshot } as unknown as Browser,
      intent: 'tap Send on the wallet home',
      primaryError: 'wallet-send-button was not found',
    });

    expect(result).toEqual({
      strategy: 'testID',
      value: 'wallet-send-button',
    });
    expect(takeScreenshot).toHaveBeenCalledTimes(1);
    expect(analyzeImage).toHaveBeenCalledTimes(1);
  });
});
