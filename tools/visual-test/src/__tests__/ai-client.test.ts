import { AiClient } from '../ai-client';
import { AiNavigationResponse, AiEvaluationResponse } from '../types';

const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('AiClient', () => {
  let client: AiClient;

  beforeEach(() => {
    jest.clearAllMocks();
    client = new AiClient(
      'https://litellm.consensys.info',
      'gemma4',
      'test-key',
    );
  });

  describe('navigate', () => {
    it('sends screenshot and goal, returns parsed navigation response', async () => {
      const aiResponse: AiNavigationResponse = {
        observation: 'I see the home screen',
        action: { type: 'tap', target: 'Send button', coords: [540, 890] },
        done: false,
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: JSON.stringify(aiResponse) } }],
        }),
      });

      const result = await client.navigate(
        'iVBORw0KGgo=',
        'test the send flow',
        [],
      );

      expect(result.observation).toBe('I see the home screen');
      expect(result.action.type).toBe('tap');
      expect(mockFetch).toHaveBeenCalledTimes(1);

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('https://litellm.consensys.info/v1/chat/completions');
      expect(options.method).toBe('POST');

      const body = JSON.parse(options.body);
      expect(body.model).toBe('gemma4');
      expect(body.messages[0].role).toBe('system');
    });
  });

  describe('evaluate', () => {
    it('sends current and baseline screenshots, returns evaluation', async () => {
      const aiResponse: AiEvaluationResponse = {
        verdict: 'pass',
        summary: 'Screen matches baseline',
        details: 'No visual differences detected',
        severity: 'low',
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: JSON.stringify(aiResponse) } }],
        }),
      });

      const result = await client.evaluate(
        'currentBase64',
        'baselineBase64',
        'Home screen with wallet balance',
      );
      expect(result.verdict).toBe('pass');
      expect(result.summary).toBe('Screen matches baseline');
    });

    it('handles evaluation without baseline', async () => {
      const aiResponse: AiEvaluationResponse = {
        verdict: 'pass',
        summary: 'Screen looks normal',
        details: 'No obvious issues',
        severity: 'low',
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: JSON.stringify(aiResponse) } }],
        }),
      });

      const result = await client.evaluate('currentBase64', null, null);
      expect(result.verdict).toBe('pass');
    });
  });

  describe('error handling', () => {
    it('throws on non-ok response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized',
      });

      await expect(client.navigate('img', 'goal', [])).rejects.toThrow(
        'AI API error (401)',
      );
    });
  });
});
