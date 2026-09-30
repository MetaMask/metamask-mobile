import type { Browser } from 'webdriverio';
import { ClaudeProvider } from '../ai-visual/providers/claude';
import {
  ClaudeLocatorRecoveryProvider,
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

  it('returns false for non-secret wallet screens', () => {
    expect(
      pageSourceContainsSecrets(
        '<AppiumAUT><XCUIElementTypeButton name="wallet-send-button"/></AppiumAUT>',
      ),
    ).toBe(false);
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
