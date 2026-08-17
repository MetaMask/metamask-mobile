import { captureException } from '@sentry/react-native';
import migrate from './151';
import { ensureValidState } from './util';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

jest.mock('./util', () => ({
  ensureValidState: jest.fn(),
}));

const mockedCaptureException = jest.mocked(captureException);
const mockedEnsureValidState = jest.mocked(ensureValidState);

const createState = (phishingController: unknown) => ({
  engine: {
    backgroundState: {
      PhishingController: phishingController,
      OtherController: { preserved: true },
    },
    preserved: true,
  },
  preserved: true,
});

describe('Migration 151: remove the PhishingController scan caches', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedEnsureValidState.mockReturnValue(true);
  });

  it('returns the state unchanged if it is invalid', () => {
    mockedEnsureValidState.mockReturnValue(false);
    const state = { invalid: true };

    const migratedState = migrate(state);

    expect(migratedState).toBe(state);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('removes the scan caches from PhishingController state', () => {
    const state = createState({
      c2DomainBlocklistLastFetched: 1757993558,
      hotlistLastFetched: 1757993558,
      phishingLists: [{ name: 'MetaMask' }],
      stalelistLastFetched: 1755694779,
      whitelist: [],
      whitelistPaths: {},
      urlScanCache: {
        'app.uniswap.org': {
          data: { hostname: 'app.uniswap.org', recommendedAction: 'VERIFIED' },
          timestamp: 1757993550,
        },
      },
      tokenScanCache: {
        '0x1:0x1234567890123456789012345678901234567890': {
          data: { result_type: 'Benign' },
          timestamp: 1757993550,
        },
      },
      addressScanCache: {
        '0x1:0x1234567890123456789012345678901234567890': {
          data: { result_type: 'Benign', label: '' },
          timestamp: 1757993550,
        },
      },
    });

    const migratedState = migrate(state) as typeof state;

    expect(migratedState.engine.backgroundState.PhishingController).toEqual({
      c2DomainBlocklistLastFetched: 1757993558,
      hotlistLastFetched: 1757993558,
      phishingLists: [{ name: 'MetaMask' }],
      stalelistLastFetched: 1755694779,
      whitelist: [],
      whitelistPaths: {},
    });
    expect(migratedState.engine.backgroundState.OtherController).toEqual({
      preserved: true,
    });
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('does nothing if the scan caches do not exist', () => {
    const state = createState({ phishingLists: [] });

    const migratedState = migrate(state) as typeof state;

    expect(migratedState.engine.backgroundState.PhishingController).toEqual({
      phishingLists: [],
    });
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('does nothing if PhishingController state is missing', () => {
    const state = {
      engine: {
        backgroundState: {
          OtherController: { preserved: true },
        },
      },
    };

    const migratedState = migrate(state) as typeof state;

    expect(migratedState.engine.backgroundState).toEqual({
      OtherController: { preserved: true },
    });
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('does nothing if PhishingController state is not an object', () => {
    const state = createState('not an object');

    const migratedState = migrate(state) as typeof state;

    expect(migratedState.engine.backgroundState.PhishingController).toBe(
      'not an object',
    );
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });
});
