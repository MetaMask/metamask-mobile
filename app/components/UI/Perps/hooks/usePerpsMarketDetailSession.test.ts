import { act, renderHook } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';
import {
  PERPS_MARKET_DETAIL_SECTION,
  usePerpsMarketDetailSession,
  type PerpsMarketDetailSections,
} from './usePerpsMarketDetailSession';
import { endTrace, setTraceMeasurement, trace } from '../../../../util/trace';

let mockAddress = '0xabc';
let mockNetwork = 'testnet';
let mockProvider = 'hyperliquid';
let mockHip3ConfigVersion = 1;
let mockIsMarketContextReady = true;
let mockIsUserContextReady = true;
let mockConnectionGeneration = 0;
const mockDeliveryRevisions = {
  account: 0,
  chart: 0,
  orders: 0,
  positions: 0,
  price: 0,
};

jest.mock('react-redux', () => ({
  useSelector: (selector: (state: object) => unknown) => selector({}),
}));
jest.mock('../selectors/featureFlags', () => ({
  selectHip3ConfigVersion: () => mockHip3ConfigVersion,
}));
jest.mock('../selectors/perpsController', () => ({
  selectPerpsNetwork: () => mockNetwork,
  selectPerpsProvider: () => mockProvider,
}));
jest.mock('../selectors/selectedAccountAddress', () => ({
  selectPerpsSelectedAccountAddress: () => mockAddress,
}));
jest.mock('./usePerpsMarketContext', () => ({
  usePerpsMarketContext: () => ({
    key: `${mockNetwork}|${mockProvider}|${mockConnectionGeneration}`,
    isReady: mockIsMarketContextReady,
    isUserReady: mockIsUserContextReady,
  }),
}));
jest.mock('../services/PerpsConnectionManager', () => ({
  PerpsConnectionManager: {
    getConnectionGeneration: () => mockConnectionGeneration,
  },
}));
jest.mock('../utils/perpsCufTrace', () => ({
  buildPerpsCufStartTags: (tags: object) => ({
    feature: 'perps',
    lifecycle_context: 'warm',
    ...tags,
  }),
}));
jest.mock('../../../../core/SDKConnect/utils/DevLogger', () => ({
  DevLogger: { log: jest.fn() },
}));
jest.mock('../../../../util/trace', () => ({
  annotateTraceByRequest: jest.fn(),
  endTrace: jest.fn(),
  setTraceMeasurement: jest.fn(),
  trace: jest.fn(),
  TraceName: { PerpsMarketDetailSession: 'Perps Market Detail Session' },
  TraceOperation: { PerpsLoading: 'perps.loading' },
}));

let mockNow = 100;
jest.mock('react-native-performance', () => ({
  now: () => ++mockNow,
}));

let mockUuidCounter = 0;
jest.mock('uuid', () => ({
  v4: () => `session-${++mockUuidCounter}`,
}));

const resolvedSections: PerpsMarketDetailSections = {
  [PERPS_MARKET_DETAIL_SECTION.MARKET]: 'content',
  [PERPS_MARKET_DETAIL_SECTION.PRICE]: 'content',
  [PERPS_MARKET_DETAIL_SECTION.CHART]: 'content',
};

describe('usePerpsMarketDetailSession', () => {
  let appState: AppStateStatus;
  let appStateListener: (state: AppStateStatus) => void;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockNow = 100;
    mockUuidCounter = 0;
    mockAddress = '0xabc';
    mockNetwork = 'testnet';
    mockProvider = 'hyperliquid';
    mockHip3ConfigVersion = 1;
    mockIsMarketContextReady = true;
    mockIsUserContextReady = true;
    mockConnectionGeneration = 0;
    Object.keys(mockDeliveryRevisions).forEach((channel) => {
      mockDeliveryRevisions[channel as keyof typeof mockDeliveryRevisions] = 0;
    });
    appState = 'active';
    Object.defineProperty(AppState, 'currentState', {
      configurable: true,
      get: () => appState,
    });
    jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation((_, listener) => {
        appStateListener = listener;
        return { remove: jest.fn() };
      });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  interface SessionTestProps {
    currentSections: PerpsMarketDetailSections;
    symbol: string;
    configurationKey?: string;
    configuredChartLibrary?: string;
    entrySource?: string;
  }

  const renderSession = (
    sections = resolvedSections,
    surfaceTrigger: 'initial' | 'market_switch' = 'initial',
    initialProps: Partial<SessionTestProps> = {},
  ) =>
    renderHook(
      ({
        currentSections,
        symbol,
        configurationKey = '',
        configuredChartLibrary = 'lightweight',
        entrySource,
      }: SessionTestProps) =>
        usePerpsMarketDetailSession({
          mode: 'lite',
          symbol,
          deliveryRevisions: { ...mockDeliveryRevisions },
          configuredChartLibrary,
          renderedChartLibrary: 'lightweight',
          marketSource: 'route',
          surfaceTrigger,
          configurationKey,
          entrySource,
          sections: currentSections,
        }),
      {
        initialProps: {
          currentSections: sections,
          symbol: 'ETH',
          ...initialProps,
        },
      },
    );

  const resumeFromBackground = () => {
    act(() => {
      appState = 'background';
      appStateListener('background');
      mockConnectionGeneration += 1;
      appState = 'active';
      appStateListener('active');
    });
  };

  it('records each resolved section once and completes the session', () => {
    renderSession();

    expect(trace).toHaveBeenCalledTimes(1);
    expect(trace).toHaveBeenCalledWith(
      expect.objectContaining({
        tags: expect.objectContaining({
          generation_trigger: 'initial',
        }),
      }),
    );
    expect(setTraceMeasurement).toHaveBeenCalledTimes(3);
    expect(endTrace).toHaveBeenCalledWith(
      expect.objectContaining({ data: { success: true } }),
    );
  });

  it('starts a remounted surface with its router-owned trigger', () => {
    const { result } = renderSession(resolvedSections, 'market_switch');

    expect(result.current.generationTrigger).toBe('market_switch');
    expect(trace).toHaveBeenCalledWith(
      expect.objectContaining({
        tags: expect.objectContaining({ generation_trigger: 'market_switch' }),
      }),
    );
  });

  it('waits for fresh stream deliveries before completing a resume cohort', () => {
    const { result, rerender } = renderSession();
    const initialLiveResetKey = result.current.liveResetKey;
    jest.clearAllMocks();

    act(() => {
      appState = 'background';
      appStateListener('background');
      appState = 'active';
      appStateListener('active');
      // The connection manager may advance before React commits the new
      // background-resume generation. The hook must retain the pre-resume
      // baseline captured by the AppState listener.
      mockConnectionGeneration += 1;
    });

    expect(trace).toHaveBeenCalledTimes(1);
    expect(trace).toHaveBeenCalledWith(
      expect.objectContaining({
        tags: expect.objectContaining({
          generation_trigger: 'background_resume',
        }),
      }),
    );
    expect(setTraceMeasurement).toHaveBeenCalledTimes(1);
    expect(endTrace).not.toHaveBeenCalled();

    mockDeliveryRevisions.price += 1;
    mockDeliveryRevisions.chart += 1;
    rerender({ symbol: 'ETH', currentSections: resolvedSections });

    expect(setTraceMeasurement).toHaveBeenCalledTimes(3);
    expect(result.current.liveResetKey).not.toBe(initialLiveResetKey);
    expect(endTrace).toHaveBeenCalledWith(
      expect.objectContaining({ data: { success: true } }),
    );
  });

  it('accepts fresh resume deliveries when the generation advanced in the background', () => {
    const { rerender } = renderSession();
    jest.clearAllMocks();

    act(() => {
      appState = 'background';
      appStateListener('background');
      mockConnectionGeneration += 1;
      appState = 'active';
      appStateListener('active');
    });

    expect(endTrace).not.toHaveBeenCalled();

    mockDeliveryRevisions.price += 1;
    mockDeliveryRevisions.chart += 1;
    rerender({ symbol: 'ETH', currentSections: resolvedSections });

    expect(setTraceMeasurement).toHaveBeenCalledTimes(3);
    expect(endTrace).toHaveBeenCalledWith(
      expect.objectContaining({ data: { success: true } }),
    );
  });

  it('does not fabricate a numeric offset for a non-applicable section', () => {
    renderSession({
      ...resolvedSections,
      [PERPS_MARKET_DETAIL_SECTION.ORDER_BOOK]: 'not_applicable',
    });

    expect(setTraceMeasurement).toHaveBeenCalledTimes(3);
    expect(endTrace).toHaveBeenCalledWith(
      expect.objectContaining({ data: { success: true } }),
    );
  });

  it('does not replay prior section readiness into a new symbol generation', () => {
    const { rerender } = renderSession();
    jest.clearAllMocks();

    rerender({
      symbol: 'BTC',
      currentSections: {
        [PERPS_MARKET_DETAIL_SECTION.MARKET]: 'content',
        [PERPS_MARKET_DETAIL_SECTION.PRICE]: 'loading',
        [PERPS_MARKET_DETAIL_SECTION.CHART]: 'loading',
      },
    });

    expect(trace).toHaveBeenCalledTimes(1);
    expect(trace).toHaveBeenCalledWith(
      expect.objectContaining({
        tags: expect.objectContaining({ generation_trigger: 'market_switch' }),
      }),
    );
    expect(setTraceMeasurement).toHaveBeenCalledTimes(1);
    expect(endTrace).not.toHaveBeenCalled();
  });

  it('restarts Live and Session with an account-switch trigger', () => {
    const { result, rerender } = renderSession();
    const initialLiveResetKey = result.current.liveResetKey;
    jest.clearAllMocks();

    mockAddress = '0xdef';
    rerender({ symbol: 'ETH', currentSections: resolvedSections });

    expect(result.current.liveResetKey).not.toBe(initialLiveResetKey);
    expect(result.current.generationTrigger).toBe('account_switch');
    expect(trace).toHaveBeenCalledWith(
      expect.objectContaining({
        tags: expect.objectContaining({ generation_trigger: 'account_switch' }),
      }),
    );
    expect(setTraceMeasurement).toHaveBeenCalledTimes(1);
    expect(endTrace).not.toHaveBeenCalled();

    mockDeliveryRevisions.price += 1;
    mockDeliveryRevisions.chart += 1;
    rerender({ symbol: 'ETH', currentSections: resolvedSections });

    expect(setTraceMeasurement).toHaveBeenCalledTimes(3);
    expect(endTrace).toHaveBeenCalledWith(
      expect.objectContaining({ data: { success: true } }),
    );
  });

  it.each([
    ['provider', () => (mockProvider = 'myx')],
    ['network', () => (mockNetwork = 'mainnet')],
    ['HIP-3 configuration', () => (mockHip3ConfigVersion = 2)],
  ])(
    'restarts Live and Session when the %s changes',
    (_name, changeContext) => {
      const { result, rerender } = renderSession();
      const initialLiveResetKey = result.current.liveResetKey;
      jest.clearAllMocks();

      changeContext();
      rerender({ symbol: 'ETH', currentSections: resolvedSections });

      expect(result.current.liveResetKey).not.toBe(initialLiveResetKey);
      expect(result.current.generationTrigger).toBe('network_switch');
      expect(trace).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: expect.objectContaining({
            generation_trigger: 'network_switch',
          }),
        }),
      );
      expect(endTrace).not.toHaveBeenCalled();

      mockDeliveryRevisions.price += 1;
      mockDeliveryRevisions.chart += 1;
      rerender({ symbol: 'ETH', currentSections: resolvedSections });

      expect(endTrace).toHaveBeenCalledWith(
        expect.objectContaining({ data: { success: true } }),
      );
    },
  );

  it('restarts readiness for a same-context reconnect', () => {
    const { result, rerender } = renderSession();
    jest.clearAllMocks();

    mockConnectionGeneration += 1;
    rerender({ symbol: 'ETH', currentSections: resolvedSections });

    expect(result.current.generationTrigger).toBe('network_switch');
    expect(endTrace).not.toHaveBeenCalled();

    mockDeliveryRevisions.price += 1;
    mockDeliveryRevisions.chart += 1;
    rerender({ symbol: 'ETH', currentSections: resolvedSections });

    expect(endTrace).toHaveBeenCalledWith(
      expect.objectContaining({ data: { success: true } }),
    );
  });

  it.each([
    ['chart strategy', { configuredChartLibrary: 'advanced' }],
    ['entry source', { entrySource: 'deeplink' }],
  ])('restarts Live and Session for a %s change', (_name, changedProps) => {
    const { result, rerender } = renderSession();
    const initialLiveResetKey = result.current.liveResetKey;
    jest.clearAllMocks();

    rerender({
      symbol: 'ETH',
      currentSections: resolvedSections,
      ...changedProps,
    });

    expect(result.current.liveResetKey).not.toBe(initialLiveResetKey);
    expect(result.current.generationTrigger).toBe('configuration_change');
    expect(trace).toHaveBeenCalledWith(
      expect.objectContaining({
        tags: expect.objectContaining({
          generation_trigger: 'configuration_change',
        }),
      }),
    );
  });

  it('restarts Live and Session for a configuration change', () => {
    const { result, rerender } = renderSession();
    const initialLiveResetKey = result.current.liveResetKey;
    jest.clearAllMocks();

    rerender({
      symbol: 'ETH',
      currentSections: resolvedSections,
      configurationKey: 'insights-on',
    });

    expect(result.current.liveResetKey).not.toBe(initialLiveResetKey);
    expect(result.current.generationTrigger).toBe('configuration_change');
    expect(trace).toHaveBeenCalledWith(
      expect.objectContaining({
        tags: expect.objectContaining({
          generation_trigger: 'configuration_change',
        }),
      }),
    );
  });

  it('completes an error section as an unsuccessful session', () => {
    renderSession({
      [PERPS_MARKET_DETAIL_SECTION.MARKET]: 'content',
      [PERPS_MARKET_DETAIL_SECTION.STATS]: 'error',
    });

    expect(setTraceMeasurement).toHaveBeenCalledTimes(2);
    expect(endTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          success: false,
          has_section_error: true,
          reason: 'section_error',
        },
      }),
    );
  });

  it('keeps account-owned sections loading until the selected user is ready', () => {
    mockIsUserContextReady = false;
    const sections: PerpsMarketDetailSections = {
      [PERPS_MARKET_DETAIL_SECTION.MARKET]: 'content',
      [PERPS_MARKET_DETAIL_SECTION.ACCOUNT]: 'content',
      [PERPS_MARKET_DETAIL_SECTION.POSITIONS_ORDERS]: 'empty',
    };
    const { rerender } = renderSession(sections);

    expect(setTraceMeasurement).toHaveBeenCalledTimes(1);
    expect(endTrace).not.toHaveBeenCalled();

    mockIsUserContextReady = true;
    rerender({ symbol: 'ETH', currentSections: sections });

    expect(setTraceMeasurement).toHaveBeenCalledTimes(3);
    expect(endTrace).toHaveBeenCalledWith(
      expect.objectContaining({ data: { success: true } }),
    );
  });

  it('labels surface teardown separately from a generation change', () => {
    const { unmount } = renderSession({
      [PERPS_MARKET_DETAIL_SECTION.MARKET]: 'loading',
    });

    unmount();

    expect(endTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { success: false, reason: 'surface_unmounted' },
      }),
    );
  });

  it('ends the active generation when the symbol disappears', () => {
    const { rerender } = renderSession({
      [PERPS_MARKET_DETAIL_SECTION.MARKET]: 'loading',
    });

    rerender({
      symbol: '',
      currentSections: {
        [PERPS_MARKET_DETAIL_SECTION.MARKET]: 'loading',
      },
    });

    expect(endTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { success: false, reason: 'generation_changed' },
      }),
    );
  });

  it('withholds Live delivery freshness until the resumed generation delivers', () => {
    const { result, rerender } = renderSession();

    expect(result.current.isLiveDeliveryFresh).toBe(true);

    resumeFromBackground();

    expect(result.current.isLiveDeliveryFresh).toBe(false);

    mockDeliveryRevisions.price += 1;
    rerender({ symbol: 'ETH', currentSections: resolvedSections });

    // Account delivery is still missing for this generation.
    expect(result.current.isLiveDeliveryFresh).toBe(false);

    mockDeliveryRevisions.account += 1;
    rerender({ symbol: 'ETH', currentSections: resolvedSections });

    expect(result.current.isLiveDeliveryFresh).toBe(true);
  });

  it('ends an unresolved session as a timeout with missing sections', () => {
    renderSession({
      [PERPS_MARKET_DETAIL_SECTION.MARKET]: 'loading',
      [PERPS_MARKET_DETAIL_SECTION.PRICE]: 'loading',
    });

    act(() => {
      jest.advanceTimersByTime(90_000);
    });

    expect(endTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          success: false,
          reason: 'detail_session_timeout',
          missing_sections: 'market,price',
        }),
      }),
    );
  });
});
