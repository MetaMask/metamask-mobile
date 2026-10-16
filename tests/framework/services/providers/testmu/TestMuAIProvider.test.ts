jest.mock('webdriverio', () => ({ remote: jest.fn() }));

jest.mock('../../../logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
  LogLevel: { DEBUG: 'debug', INFO: 'info', WARN: 'warn', ERROR: 'error' },
}));

jest.mock('../../../Constants.ts', () => ({
  DEFAULT_BROWSERSTACK_SESSION_CREATE_MAX_ATTEMPTS: 3,
  DEFAULT_BROWSERSTACK_SESSION_CREATE_RETRY_DELAY_MS: 0,
}));

jest.mock('./TestMuAIConfigBuilder.ts', () => ({
  TestMuAIConfigBuilder: jest.fn().mockImplementation(() => ({
    build: () => ({ hostname: 'hub.testmu.test' }),
  })),
}));

jest.mock('./TestMuAIAPI.ts', () => ({
  TestMuAIAPI: jest.fn().mockImplementation(() => ({
    getVideoURL: jest.fn(),
    buildSessionURL: jest.fn(),
    updateSession: jest.fn(),
  })),
}));

import { remote, type Browser } from 'webdriverio';
import { Platform, ProviderName } from '../../../types';
import type { ProjectConfig } from '../../common/types';
import { TestMuAIAPI } from './TestMuAIAPI.ts';
import { TestMuAIProvider } from './TestMuAIProvider';

const remoteMock = remote as unknown as jest.Mock;

const project = {
  use: {
    platform: Platform.ANDROID,
    device: {
      provider: ProviderName.TESTMU,
      name: 'Pixel 8 Pro',
      osVersion: '14',
    },
    app: { buildPath: 'lt://APP101' },
  },
} as unknown as ProjectConfig;

const browser = { sessionId: 'sess-1' } as unknown as Browser;

const apiMock = (): {
  getVideoURL: jest.Mock;
  buildSessionURL: jest.Mock;
  updateSession: jest.Mock;
} => (TestMuAIAPI as unknown as jest.Mock).mock.results.at(-1)?.value;

describe('TestMuAIProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // clearAllMocks keeps implementations; remote must start each test unset.
    remoteMock.mockReset();
  });

  describe('getDriver', () => {
    it.each([
      ['401 Unauthorized: aborted due to timeout'],
      ['App not found, waiting in queue'],
    ])(
      'throws on the first attempt for the permanent error "%s"',
      async (message) => {
        remoteMock.mockRejectedValue(new Error(message));
        const provider = new TestMuAIProvider(project);

        const result = provider.getDriver();

        await expect(result).rejects.toThrow(
          'TestMu AI WebDriver session creation failed',
        );
        expect(remoteMock).toHaveBeenCalledTimes(1);
      },
    );

    it.each([['All parallel tests are currently in use'], ['read ECONNRESET']])(
      'retries the transient error "%s" and returns the browser',
      async (message) => {
        remoteMock
          .mockRejectedValueOnce(new Error(message))
          .mockResolvedValueOnce(browser);
        const provider = new TestMuAIProvider(project);

        const result = await provider.getDriver();

        expect(result).toBe(browser);
        expect(remoteMock).toHaveBeenCalledTimes(2);
      },
    );

    it('throws on the first attempt when the message matches neither list', async () => {
      remoteMock.mockRejectedValue(new Error('Something unexpected broke'));
      const provider = new TestMuAIProvider(project);

      const result = provider.getDriver();

      await expect(result).rejects.toThrow('Something unexpected broke');
      expect(remoteMock).toHaveBeenCalledTimes(1);
    });

    it('stops retrying a transient error after the maximum attempts', async () => {
      remoteMock.mockRejectedValue(new Error('read ECONNRESET'));
      const provider = new TestMuAIProvider(project);

      const result = provider.getDriver();

      await expect(result).rejects.toThrow('Underlying error: read ECONNRESET');
      expect(remoteMock).toHaveBeenCalledTimes(3);
    });

    it('records the session id of the created browser', async () => {
      remoteMock.mockResolvedValue(browser);
      const provider = new TestMuAIProvider(project);

      await provider.getDriver();

      expect(provider.sessionId).toBe('sess-1');
    });
  });

  describe('getRecordingUrl', () => {
    it('returns the video URL from the API', async () => {
      const provider = new TestMuAIProvider(project);
      apiMock().getVideoURL.mockResolvedValue('https://video.test/a.mp4');

      const result = await provider.getRecordingUrl('sess-1');

      expect(result).toBe('https://video.test/a.mp4');
    });

    it('returns the session URL when fetching the video URL throws', async () => {
      const provider = new TestMuAIProvider(project);
      apiMock().getVideoURL.mockRejectedValue(new Error('boom'));
      apiMock().buildSessionURL.mockReturnValue('https://session.test/sess-1');

      const result = await provider.getRecordingUrl('sess-1');

      expect(result).toBe('https://session.test/sess-1');
      expect(apiMock().buildSessionURL).toHaveBeenCalledWith('sess-1');
    });
  });

  describe('syncTestDetails', () => {
    it('throws before a session exists', async () => {
      const provider = new TestMuAIProvider(project);

      const result = provider.syncTestDetails({ name: 'Login' });

      await expect(result).rejects.toThrow('Session ID is not available');
      expect(apiMock().updateSession).not.toHaveBeenCalled();
    });

    it('sends the details for the current session once it exists', async () => {
      remoteMock.mockResolvedValue(browser);
      const provider = new TestMuAIProvider(project);
      await provider.getDriver();

      await provider.syncTestDetails({ name: 'Login', status: 'passed' });

      expect(apiMock().updateSession).toHaveBeenCalledWith('sess-1', {
        name: 'Login',
        status: 'passed',
      });
    });
  });
});
