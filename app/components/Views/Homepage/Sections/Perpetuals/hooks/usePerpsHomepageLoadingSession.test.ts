import { act, renderHook } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';
import { useSelector } from 'react-redux';
import { selectHip3ConfigVersion } from '../../../../../UI/Perps/selectors/featureFlags';
import {
  selectPerpsNetwork,
  selectPerpsProvider,
} from '../../../../../UI/Perps/selectors/perpsController';
import { selectPerpsSelectedAccountAddress } from '../../../../../UI/Perps/selectors/selectedAccountAddress';
import {
  cancelPerpsLoadingSession,
  getActivePerpsLoadingSessionContext,
  startPerpsLoadingSession,
  type PerpsLoadingSessionContext,
} from '../../../../../UI/Perps/utils/perpsLoadingSession';
import { usePerpsHomepageLoadingSession } from './usePerpsHomepageLoadingSession';

jest.mock('react-redux', () => ({ useSelector: jest.fn() }));
jest.mock('../../../../../UI/Perps/selectors/featureFlags', () => ({
  selectHip3ConfigVersion: jest.fn(),
}));
jest.mock('../../../../../UI/Perps/selectors/selectedAccountAddress', () => ({
  selectPerpsSelectedAccountAddress: jest.fn(),
}));
jest.mock('../../../../../UI/Perps/selectors/perpsController', () => ({
  selectPerpsNetwork: jest.fn(),
  selectPerpsProvider: jest.fn(),
}));
jest.mock('../../../../../UI/Perps/utils/perpsLifecycleContext', () => ({
  getPerpsLifecycleContext: jest.fn(() => 'cold_process'),
}));
jest.mock('../../../../../UI/Perps/utils/perpsLoadingSession', () => ({
  cancelPerpsLoadingSession: jest.fn(),
  getActivePerpsLoadingSessionContext: jest.fn(),
  preparePerpsLoadingSession: jest.fn(),
  resolvePerpsLoadingLifecycle: jest.fn(() => 'cold_no_cache'),
  startPerpsLoadingSession: jest.fn(),
}));

describe('usePerpsHomepageLoadingSession', () => {
  let address: string | undefined;
  let network: 'mainnet' | 'testnet';
  let provider: string | undefined;
  let hip3ConfigVersion: number;
  let activeContext: PerpsLoadingSessionContext | null;
  let appStateListener: ((state: AppStateStatus) => void) | undefined;

  beforeEach(() => {
    jest.clearAllMocks();
    address = '0xabc';
    network = 'mainnet';
    provider = 'hyperliquid';
    hip3ConfigVersion = 1;
    activeContext = null;
    appStateListener = undefined;
    Object.defineProperty(AppState, 'currentState', {
      configurable: true,
      value: 'active',
    });
    jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation((_, listener) => {
        appStateListener = listener;
        return { remove: jest.fn() };
      });
    jest.mocked(useSelector).mockImplementation((selector) => {
      if (selector === selectPerpsSelectedAccountAddress) return address;
      if (selector === selectPerpsNetwork) return network;
      if (selector === selectPerpsProvider) return provider;
      if (selector === selectHip3ConfigVersion) return hip3ConfigVersion;
      return undefined;
    });
    jest
      .mocked(getActivePerpsLoadingSessionContext)
      .mockImplementation(() => activeContext);
    jest.mocked(startPerpsLoadingSession).mockImplementation((options) => {
      activeContext = {
        id: 'session-id',
        marketSource: 'unknown',
        accountSource: 'unknown',
        lifecycle: options?.lifecycle ?? 'cold_no_cache',
      };
      return activeContext.id;
    });
    jest.mocked(cancelPerpsLoadingSession).mockImplementation(() => {
      activeContext = null;
    });
  });

  afterEach(() => jest.restoreAllMocks());

  it('owns the session only while the homepage surface is mounted', () => {
    const { result, unmount } = renderHook(() =>
      usePerpsHomepageLoadingSession(),
    );

    expect(startPerpsLoadingSession).toHaveBeenCalledWith({
      lifecycle: 'cold_no_cache',
      restart: false,
      surface: 'homepage',
    });
    expect(result.current.sessionReady).toBe(true);

    unmount();
    expect(cancelPerpsLoadingSession).toHaveBeenCalledWith('surface_unmounted');
  });

  it('cancels before suspension and starts a resume session on return', () => {
    renderHook(() => usePerpsHomepageLoadingSession());
    jest.mocked(startPerpsLoadingSession).mockClear();

    act(() => appStateListener?.('background'));
    expect(cancelPerpsLoadingSession).toHaveBeenCalledWith('app_backgrounded');

    act(() => appStateListener?.('active'));
    expect(startPerpsLoadingSession).toHaveBeenCalledWith({
      lifecycle: 'background_short',
      restart: false,
      surface: 'homepage',
    });
  });

  it('does not restart for an iOS inactive-to-active interruption', () => {
    renderHook(() => usePerpsHomepageLoadingSession());
    jest.mocked(startPerpsLoadingSession).mockClear();
    jest.mocked(cancelPerpsLoadingSession).mockClear();

    act(() => appStateListener?.('inactive'));
    act(() => appStateListener?.('active'));

    expect(cancelPerpsLoadingSession).not.toHaveBeenCalled();
    expect(startPerpsLoadingSession).not.toHaveBeenCalled();
  });

  it('starts when a surface mounted while inactive becomes active', () => {
    Object.defineProperty(AppState, 'currentState', {
      configurable: true,
      value: 'inactive',
    });
    renderHook(() => usePerpsHomepageLoadingSession());
    expect(startPerpsLoadingSession).not.toHaveBeenCalled();

    act(() => appStateListener?.('active'));

    expect(startPerpsLoadingSession).toHaveBeenCalledWith({
      lifecycle: 'cold_no_cache',
      restart: false,
      surface: 'homepage',
    });
  });

  it('restarts for account and provider context changes', () => {
    const { rerender } = renderHook(() => usePerpsHomepageLoadingSession());
    jest.mocked(startPerpsLoadingSession).mockClear();

    address = '0xdef';
    rerender(undefined);
    expect(startPerpsLoadingSession).toHaveBeenLastCalledWith({
      lifecycle: 'account_switch',
      restart: false,
      surface: 'homepage',
    });

    provider = 'myx';
    rerender(undefined);
    expect(startPerpsLoadingSession).toHaveBeenLastCalledWith({
      lifecycle: 'network_switch',
      restart: false,
      surface: 'homepage',
    });
  });
});
