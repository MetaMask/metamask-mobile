import type { Browser } from 'webdriverio';
import { BaseServiceProvider } from './BaseServiceProvider.ts';
import type { ProjectConfig } from '../types.ts';
import { Platform, ProviderName } from '../../../types.ts';

class TestServiceProvider extends BaseServiceProvider {
  async getDriver(): Promise<Browser> {
    throw new Error('not used');
  }
}

function createProject(): ProjectConfig {
  return {
    use: {
      platform: Platform.ANDROID,
      device: {
        provider: ProviderName.BROWSERSTACK,
        name: 'Pixel_5',
      },
    },
  } as ProjectConfig;
}

describe('BaseServiceProvider.cleanupSession', () => {
  it('deletes the WebDriver session when drv is provided', async () => {
    const provider = new TestServiceProvider(createProject(), 'TestProvider');
    provider.sessionId = 'bs-session-1';
    const deleteSession = jest.fn().mockResolvedValue(undefined);
    const drv = {
      sessionId: 'bs-session-1',
      deleteSession,
    } as unknown as Browser;

    await provider.cleanupSession(drv);

    expect(deleteSession).toHaveBeenCalledTimes(1);
    expect(provider.sessionId).toBeUndefined();
  });

  it('clears sessionId without deleting when drv is omitted', async () => {
    const provider = new TestServiceProvider(createProject(), 'TestProvider');
    provider.sessionId = 'bs-session-2';
    const deleteSession = jest.fn();

    await provider.cleanupSession();

    expect(deleteSession).not.toHaveBeenCalled();
    expect(provider.sessionId).toBeUndefined();
  });
});
