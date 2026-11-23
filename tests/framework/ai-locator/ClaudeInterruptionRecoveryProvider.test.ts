import type { Browser } from 'webdriverio';
import { ClaudeProvider } from '../ai-visual/providers/claude';
import {
  ClaudeInterruptionRecoveryProvider,
  createClaudeInterruptionRecoveryProvider,
  isSafeDismissControl,
} from './ClaudeInterruptionRecoveryProvider';

jest.mock('../ai-visual/providers/claude', () => ({
  ClaudeProvider: jest.fn().mockImplementation(() => ({
    analyzeImage: jest.fn(),
  })),
}));

const mockAnalyzeImage = (rawResponse: string, success = true) => {
  const analyzeImage = jest.fn().mockResolvedValue({ success, rawResponse });
  jest
    .mocked(ClaudeProvider)
    .mockImplementation(() => ({ analyzeImage }) as unknown as ClaudeProvider);
  return analyzeImage;
};

const createDriver = () =>
  ({
    takeScreenshot: jest.fn().mockResolvedValue('aW1hZ2U='),
  }) as unknown as Browser & { takeScreenshot: jest.Mock };

describe('isSafeDismissControl', () => {
  it.each([
    [['No thanks']],
    [['Not now']],
    [['perps-not-now-button']],
    [['notification-remind-later-button', 'Remind me later']],
    [['whats-new-modal-close-button']],
    [['Skip']],
    [['Got it']],
    [['X']],
    [['Close']],
  ])('allows dismiss control %j', (descriptors) => {
    expect(isSafeDismissControl(descriptors)).toBe(true);
  });

  it.each([
    [['I agree']],
    [['experience-enhancer-modal-accept-button']],
    [['Confirm']],
    [['Turn on notifications']],
    [['Buy now']],
    [['Continue']],
    [['Sign']],
    [['Get started']],
    [['close-button', 'Accept and close']],
    [['Close position']],
    [['perps-close-position-button']],
    [['enclosed']],
    [['Learn more']],
    [[]],
    [['', null, undefined]],
  ])('refuses non-dismiss or consenting control %j', (descriptors) => {
    expect(isSafeDismissControl(descriptors)).toBe(false);
  });
});

describe('ClaudeInterruptionRecoveryProvider', () => {
  const context = {
    pageSource:
      '<hierarchy><android.widget.Button resource-id="survey-close" text="Not now"/></hierarchy>',
    intent: 'tap wallet send button',
    primaryError: 'element not displayed',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the parsed blocking decision', async () => {
    mockAnalyzeImage(
      '```json\n{"blocking":true,"screenName":"survey-sheet","reason":"Survey covers wallet","dismissLabel":"Not now","dismissLocator":{"strategy":"testID","value":"survey-close"}}\n```',
    );
    const mockDriver = createDriver();
    const provider = new ClaudeInterruptionRecoveryProvider();

    const decision = await provider.identifyInterruption({
      ...context,
      driver: mockDriver,
    });

    expect(decision).toEqual({
      blocking: true,
      screenName: 'survey-sheet',
      reason: 'Survey covers wallet',
      dismissLabel: 'Not now',
      dismissLocator: { strategy: 'testID', value: 'survey-close' },
    });
  });

  it('refuses secret screens before screenshot or model call', async () => {
    const analyzeImage = mockAnalyzeImage('{"blocking":false}');
    const mockDriver = createDriver();
    const provider = new ClaudeInterruptionRecoveryProvider();

    const decision = await provider.identifyInterruption({
      ...context,
      pageSource:
        '<android.widget.EditText resource-id="srp-input-word-1" text="abandon"/>',
      driver: mockDriver,
    });

    expect(decision).toBeNull();
    expect(mockDriver.takeScreenshot).not.toHaveBeenCalled();
    expect(analyzeImage).not.toHaveBeenCalled();
  });

  it('returns null for malformed model output', async () => {
    mockAnalyzeImage('not json');
    const provider = new ClaudeInterruptionRecoveryProvider();

    const decision = await provider.identifyInterruption({
      ...context,
      driver: createDriver(),
    });

    expect(decision).toBeNull();
  });

  it('returns null when the model call fails', async () => {
    mockAnalyzeImage('', false);
    const provider = new ClaudeInterruptionRecoveryProvider();

    const decision = await provider.identifyInterruption({
      ...context,
      driver: createDriver(),
    });

    expect(decision).toBeNull();
  });
});

describe('createClaudeInterruptionRecoveryProvider', () => {
  it('returns undefined when AI recovery is not enabled', () => {
    expect(
      createClaudeInterruptionRecoveryProvider({ ANTHROPIC_API_KEY: 'key' }),
    ).toBeUndefined();
  });

  it('returns undefined without an API key', () => {
    expect(
      createClaudeInterruptionRecoveryProvider({
        AI_LOCATOR_RECOVERY_ENABLED: 'true',
        ANTHROPIC_API_KEY: ' ',
      }),
    ).toBeUndefined();
  });

  it('creates the provider when enabled with a key', () => {
    expect(
      createClaudeInterruptionRecoveryProvider({
        AI_LOCATOR_RECOVERY_ENABLED: 'true',
        ANTHROPIC_API_KEY: 'key',
      }),
    ).toBeInstanceOf(ClaudeInterruptionRecoveryProvider);
  });
});
