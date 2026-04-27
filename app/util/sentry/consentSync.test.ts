import { subscribeSentryToAnalyticsConsent } from './consentSync';
import { AGREED, DENIED, SENTRY_CONSENT } from '../../constants/storage';

jest.mock('../../store/storage-wrapper', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
  },
}));

jest.mock('./utils', () => ({
  setupSentry: jest.fn(),
}));

jest.mock('../trace', () => ({
  updateCachedConsent: jest.fn(),
  flushBufferedTraces: jest.fn(),
  discardBufferedTraces: jest.fn(),
}));

jest.mock('../Logger', () => ({
  __esModule: true,
  default: { log: jest.fn(), error: jest.fn() },
}));

jest.mock('@metamask/analytics-controller', () => ({
  analyticsControllerSelectors: {
    selectOptedIn: (state: { optedIn?: boolean } | undefined) => state?.optedIn,
  },
}));

const mockedStorageWrapper = jest.requireMock('../../store/storage-wrapper')
  .default as { setItem: jest.Mock };
const mockedSetupSentry = jest.requireMock('./utils').setupSentry as jest.Mock;
const mockedTrace = jest.requireMock('../trace') as {
  updateCachedConsent: jest.Mock;
  flushBufferedTraces: jest.Mock;
  discardBufferedTraces: jest.Mock;
};

type StateChangeHandler = (state: { optedIn?: boolean }) => void;

const buildEngineMock = (initialOptedIn: boolean | undefined) => {
  let handler: StateChangeHandler | undefined;
  const subscribe = jest.fn((_eventType: string, fn: StateChangeHandler) => {
    handler = fn;
  });
  return {
    engine: {
      context: {
        AnalyticsController: { state: { optedIn: initialOptedIn } },
      },
      controllerMessenger: { subscribe },
    } as unknown as Parameters<typeof subscribeSentryToAnalyticsConsent>[0],
    subscribe,
    emit: (state: { optedIn?: boolean }) => handler?.(state),
  };
};

describe('subscribeSentryToAnalyticsConsent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('performs an initial sync from the current AnalyticsController state', async () => {
    const { engine } = buildEngineMock(true);

    await subscribeSentryToAnalyticsConsent(engine);

    expect(mockedTrace.updateCachedConsent).toHaveBeenCalledWith(true);
    expect(mockedStorageWrapper.setItem).toHaveBeenCalledWith(
      SENTRY_CONSENT,
      AGREED,
    );
    expect(mockedSetupSentry).toHaveBeenCalledTimes(1);
    expect(mockedTrace.flushBufferedTraces).toHaveBeenCalledTimes(1);
    expect(mockedTrace.discardBufferedTraces).not.toHaveBeenCalled();
  });

  it('writes DENIED and discards buffered traces when controller state is opted out', async () => {
    const { engine } = buildEngineMock(false);

    await subscribeSentryToAnalyticsConsent(engine);

    expect(mockedTrace.updateCachedConsent).toHaveBeenCalledWith(false);
    expect(mockedStorageWrapper.setItem).toHaveBeenCalledWith(
      SENTRY_CONSENT,
      DENIED,
    );
    expect(mockedTrace.discardBufferedTraces).toHaveBeenCalledTimes(1);
    expect(mockedTrace.flushBufferedTraces).not.toHaveBeenCalled();
  });

  it('treats a missing/undefined optedIn as opted out during initial sync', async () => {
    const { engine } = buildEngineMock(undefined);

    await subscribeSentryToAnalyticsConsent(engine);

    expect(mockedStorageWrapper.setItem).toHaveBeenCalledWith(
      SENTRY_CONSENT,
      DENIED,
    );
  });

  it('subscribes to AnalyticsController:stateChange after initial sync', async () => {
    const { engine, subscribe } = buildEngineMock(false);

    await subscribeSentryToAnalyticsConsent(engine);

    expect(subscribe).toHaveBeenCalledWith(
      'AnalyticsController:stateChange',
      expect.any(Function),
    );
  });

  it('re-applies consent whenever the controller emits a state change', async () => {
    const { engine, emit } = buildEngineMock(false);

    await subscribeSentryToAnalyticsConsent(engine);
    jest.clearAllMocks();

    emit({ optedIn: true });
    await new Promise((resolve) => setImmediate(resolve));

    expect(mockedTrace.updateCachedConsent).toHaveBeenCalledWith(true);
    expect(mockedStorageWrapper.setItem).toHaveBeenCalledWith(
      SENTRY_CONSENT,
      AGREED,
    );
    expect(mockedSetupSentry).toHaveBeenCalledTimes(1);
    expect(mockedTrace.flushBufferedTraces).toHaveBeenCalledTimes(1);
  });

  it('discards buffered traces when the user opts back out at runtime', async () => {
    const { engine, emit } = buildEngineMock(true);

    await subscribeSentryToAnalyticsConsent(engine);
    jest.clearAllMocks();

    emit({ optedIn: false });
    await new Promise((resolve) => setImmediate(resolve));

    expect(mockedTrace.updateCachedConsent).toHaveBeenCalledWith(false);
    expect(mockedStorageWrapper.setItem).toHaveBeenCalledWith(
      SENTRY_CONSENT,
      DENIED,
    );
    expect(mockedTrace.discardBufferedTraces).toHaveBeenCalledTimes(1);
  });

  it('is resilient when storage, setupSentry, or flush fails', async () => {
    mockedStorageWrapper.setItem.mockRejectedValueOnce(
      new Error('storage full'),
    );
    mockedSetupSentry.mockRejectedValueOnce(new Error('sentry down'));
    mockedTrace.flushBufferedTraces.mockRejectedValueOnce(
      new Error('flush failed'),
    );

    const { engine } = buildEngineMock(true);

    await expect(
      subscribeSentryToAnalyticsConsent(engine),
    ).resolves.not.toThrow();
  });
});
