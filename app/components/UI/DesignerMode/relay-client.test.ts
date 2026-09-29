import {
  buildAgentPrompt,
  sendToRelay,
  pollForResponse,
  checkRelayHealth,
} from './relay-client';
import type { RNComponentInfo } from './types';

const RELAY = 'http://localhost:3334';

const mockResponse = (status: number, body = ''): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
    text: async () => body,
  }) as unknown as Response;

const fetchMock = jest.fn();

beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
});

describe('relay-client', () => {
  describe('sendToRelay', () => {
    it('POSTs the prompt to /api/message and resolves on 200', async () => {
      fetchMock.mockResolvedValue(mockResponse(200));

      await expect(sendToRelay(RELAY, 'prompt')).resolves.toBeUndefined();

      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe(`${RELAY}/api/message`);
      expect(init.method).toBe('POST');
      expect(init.body).toBe('prompt');
    });

    it('throws on a non-ok status', async () => {
      fetchMock.mockResolvedValue(mockResponse(500));
      await expect(sendToRelay(RELAY, 'prompt')).rejects.toThrow('500');
    });
  });

  describe('pollForResponse', () => {
    it('returns the response text on 200', async () => {
      fetchMock.mockResolvedValue(mockResponse(200, 'Done — bumped padding'));

      const result = await pollForResponse(RELAY, new AbortController().signal);

      expect(result).toBe('Done — bumped padding');
      expect(fetchMock.mock.calls[0][0]).toBe(`${RELAY}/api/poll`);
    });

    it('returns null immediately for an already-aborted signal (no fetch)', async () => {
      const controller = new AbortController();
      controller.abort();

      const result = await pollForResponse(RELAY, controller.signal);

      expect(result).toBeNull();
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe('checkRelayHealth', () => {
    it('returns true when the relay responds ok', async () => {
      fetchMock.mockResolvedValue(mockResponse(200, '{"ok":true}'));
      await expect(checkRelayHealth(RELAY)).resolves.toBe(true);
    });

    it('returns false when the request throws', async () => {
      fetchMock.mockRejectedValue(new Error('ECONNREFUSED'));
      await expect(checkRelayHealth(RELAY)).resolves.toBe(false);
    });
  });

  describe('buildAgentPrompt', () => {
    const baseInfo: RNComponentInfo = {
      componentName: 'Text',
      parentComponent: 'Card',
      textContent: 'Heading',
      filePath: 'app/screens/Home.tsx',
      lineNumber: 42,
      callSiteComponent: 'HomeScreen',
      componentChain: [
        { name: 'Text', fileName: 'Button.tsx', lineNumber: 10 },
        { name: 'HomeScreen', fileName: 'Home.tsx', lineNumber: 42 },
      ],
      accessibilityLabel: 'Heading label',
      props: { numberOfLines: 1 },
      parentProps: null,
      testID: 'home-heading',
      ancestorChain: ['Text', 'Card', 'HomeScreen'],
      layout: { x: 0, y: 0, width: 100, height: 20, pageX: 0, pageY: 0 },
      style: { fontSize: 16 },
      styleNames: ['title'],
    };

    it('starts with the request envelope the relay validates', () => {
      const prompt = buildAgentPrompt(baseInfo, [], 'make it bigger');
      expect(prompt.startsWith('=== DESIGNER MODE REQUEST')).toBe(true);
    });

    it('includes component name, file path, message and changeset', () => {
      const prompt = buildAgentPrompt(
        baseInfo,
        [{ property: 'fontSize', original: '16', current: '20' }],
        'make it bigger',
      );
      expect(prompt).toContain('Text');
      expect(prompt).toContain('app/screens/Home.tsx:42');
      expect(prompt).toContain('fontSize : 16 → 20');
      expect(prompt).toContain('make it bigger');
      expect(prompt).toContain('=== END ===');
    });
  });
});
