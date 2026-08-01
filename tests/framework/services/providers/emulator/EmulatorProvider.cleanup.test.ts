import type { Browser } from 'webdriverio';
import { stopAppiumServer } from '../../appium';
import type { ProjectConfig } from '../../common/types.ts';
import { Platform, ProviderName } from '../../../types.ts';
import { EmulatorProvider } from './EmulatorProvider.ts';

jest.mock('../../appium', () => ({
  ...jest.requireActual('../../appium'),
  stopAppiumServer: jest.fn().mockResolvedValue(undefined),
}));

const stopAppiumServerMock = stopAppiumServer as jest.MockedFunction<
  typeof stopAppiumServer
>;

function createProject(): ProjectConfig {
  return {
    use: {
      platform: Platform.ANDROID,
      device: {
        provider: ProviderName.EMULATOR,
        name: 'Pixel_5',
        udid: 'emulator-5554',
      },
      app: {
        packageName: 'io.metamask',
      },
    },
  } as ProjectConfig;
}

describe('EmulatorProvider cleanup split', () => {
  beforeEach(() => {
    stopAppiumServerMock.mockClear();
    stopAppiumServerMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('cleanupSession deletes the WebDriver session without stopping Appium', async () => {
    const provider = new EmulatorProvider(createProject());
    const deleteSession = jest.fn().mockResolvedValue(undefined);
    const browser = {
      sessionId: 'session-1',
      deleteSession,
    } as unknown as Browser;
    // Seed the private browser used when no drv arg is passed.
    (provider as unknown as { browser?: Browser }).browser = browser;
    provider.sessionId = 'session-1';

    await provider.cleanupSession();

    expect(deleteSession).toHaveBeenCalledTimes(1);
    expect(stopAppiumServerMock).not.toHaveBeenCalled();
    expect(provider.sessionId).toBeUndefined();
  });

  it('cleanupProvider stops Appium without deleting the session', async () => {
    const provider = new EmulatorProvider(createProject());
    const deleteSession = jest.fn().mockResolvedValue(undefined);
    const browser = {
      sessionId: 'session-2',
      deleteSession,
    } as unknown as Browser;
    (provider as unknown as { browser?: Browser }).browser = browser;
    provider.sessionId = 'session-2';

    await provider.cleanupProvider();

    expect(stopAppiumServerMock).toHaveBeenCalledTimes(1);
    expect(deleteSession).not.toHaveBeenCalled();
    expect(provider.sessionId).toBe('session-2');
  });

  it('legacy cleanup only stops Appium (cleanupProvider)', async () => {
    const provider = new EmulatorProvider(createProject());
    const deleteSession = jest.fn().mockResolvedValue(undefined);
    (provider as unknown as { browser?: Browser }).browser = {
      sessionId: 'session-3',
      deleteSession,
    } as unknown as Browser;
    provider.sessionId = 'session-3';

    await provider.cleanup();

    expect(stopAppiumServerMock).toHaveBeenCalledTimes(1);
    expect(deleteSession).not.toHaveBeenCalled();
    expect(provider.sessionId).toBe('session-3');
  });
});
