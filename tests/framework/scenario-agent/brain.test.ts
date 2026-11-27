import {
  blockedReason,
  notDoneReason,
  parseReply,
  scenarioModelConfig,
} from './brain.ts';

/** This repo's ProcessEnv typing requires keys a test env does not need. */
const testEnv = (vars: Record<string, string>): NodeJS.ProcessEnv =>
  vars as unknown as NodeJS.ProcessEnv;

describe('model config for CI', () => {
  it('treats empty env values as unset', () => {
    expect(
      scenarioModelConfig(
        testEnv({ ANTHROPIC_MODEL: '', ANTHROPIC_BASE_URL: '' }),
      ),
    ).toEqual({ model: 'claude-haiku-4-5-20251001' });
    expect(scenarioModelConfig(testEnv({}))).toEqual({
      model: 'claude-haiku-4-5-20251001',
    });
    expect(
      scenarioModelConfig(
        testEnv({
          ANTHROPIC_MODEL: 'claude-haiku-4-5',
          ANTHROPIC_BASE_URL: 'https://proxy.example',
        }),
      ),
    ).toEqual({
      model: 'claude-haiku-4-5',
      baseURL: 'https://proxy.example',
    });
  });
});

describe('model replies', () => {
  it('reads an action with or without the wrapper, and maps hideKeyboard', () => {
    expect(
      parseReply(
        'Sure: {"action":{"type":"tap","locator":{"strategy":"testID","value":"a"}},"final":true}',
      ),
    ).toEqual({
      action: { type: 'tap', locator: { strategy: 'testID', value: 'a' } },
      final: true,
      satisfied: false,
    });
    expect(
      parseReply('{"type":"swipe","direction":"up"}').action,
    ).toMatchObject({ type: 'swipe', direction: 'up' });
    expect(parseReply('{"action":{"type":"hideKeyboard"}}').action).toEqual({
      type: 'dismissKeyboard',
    });
  });

  it('rejects an action a person cannot do', () => {
    expect(() =>
      parseReply(
        '{"action":{"type":"type","locator":{"strategy":"id","value":"x"},"text":"1"}}',
      ),
    ).toThrow(/unusable action/);
    expect(() => parseReply('{"action":{"type":"shell"}}')).toThrow(
      /unusable action/,
    );
  });

  it('reads "blocked" and "done": false replies', () => {
    expect(blockedReason('{"blocked":"Insufficient funds"}')).toBe(
      'Insufficient funds',
    );
    expect(blockedReason('{"action":{"type":"swipe"}}')).toBeUndefined();
    expect(notDoneReason('{"done":false,"reason":"still loading"}')).toBe(
      'still loading',
    );
    expect(notDoneReason('{"done":false}')).toBe('no reason given');
    expect(notDoneReason('{"action":{}}')).toBeUndefined();
  });
});
