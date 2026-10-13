import { act, renderHook } from '@testing-library/react-native';
import { toast, ToastSeverity } from '@metamask/design-system-react-native';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import { createMockUseAnalyticsHook } from '../../../../util/test/analyticsMock';
import {
  type AbsolutePriceAlert,
  type PercentChangeAlert,
  PriceAlertAnalytics,
} from './constants';
import usePerpAlertSaveFlow, {
  perpAlertsQueryKey,
  fetchPerpAlerts,
  createPerpAlert,
  updatePerpAlert,
  deletePerpAlert,
  createPerpPercentAlert,
  updatePerpPercentAlert,
  deletePerpPercentAlert,
  deletePerpAlertByType,
  normalizePerpAlerts,
  updatePerpAlertByType,
  useSubmitPerpAlert,
  useSubmitPerpPercentAlert,
} from './perpApi';

// ─── Shared mock state ────────────────────────────────────────────────────────

const mockGoBack = jest.fn();
const mockPop = jest.fn();
const mockSetQueryData = jest.fn();
const mockSubmit = jest.fn();
const mockGetBearerToken = jest.fn().mockResolvedValue('test-token');

// ─── Module mocks ─────────────────────────────────────────────────────────────

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  return {
    ...actual,
    toast: Object.assign(jest.fn(), { dismiss: jest.fn() }),
  };
});

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ goBack: mockGoBack, pop: mockPop }),
}));

jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual('@tanstack/react-query'),
  useMutation: jest.fn(
    ({ mutationFn }: { mutationFn: (params: unknown) => Promise<void> }) => ({
      mutateAsync: mutationFn,
      isPending: false,
    }),
  ),
  useQueryClient: () => ({ setQueryData: mockSetQueryData }),
}));

jest.mock('../../../../core/Engine', () => ({
  context: {
    AuthenticationController: {
      getBearerToken: () => mockGetBearerToken(),
    },
  },
}));

jest.mock('../../../hooks/useAnalytics/useAnalytics');

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MARKET_ID = 'btc-hyperliquid-mainnet';
const DISPLAY_TICKER = 'BTC';

const editingAlert: AbsolutePriceAlert = {
  id: 'alert-99',
  userId: 'user-1',
  asset: MARKET_ID,
  threshold: 50000,
  recurring: false,
  active: true,
  type: 'absolute_price',
  createdAt: '2026-01-01T00:00:00Z',
};

const editingPercentAlert: PercentChangeAlert = {
  ...editingAlert,
  id: 'percent-alert-99',
  type: 'percent_change',
  period: '1h',
  direction: 'down',
};

const baseAnalyticsProperties = {
  alert_type: PriceAlertAnalytics.TYPE.THRESHOLD,
  alert_value: 55000,
  alert_recurring: false,
  alert_market_type: PriceAlertAnalytics.MARKET_TYPE.PERPS,
};

// ─── perpAlertsQueryKey ───────────────────────────────────────────────────────

describe('perpAlertsQueryKey', () => {
  it('returns a tuple with the market id', () => {
    expect(perpAlertsQueryKey(MARKET_ID)).toEqual(['perpAlerts', MARKET_ID]);
  });
});

// ─── API functions ────────────────────────────────────────────────────────────

describe('API functions', () => {
  const mockFetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => [],
  } as unknown as Response);

  beforeAll(() => {
    global.fetch = mockFetch;
  });

  beforeEach(() => {
    mockFetch.mockClear();
    mockGetBearerToken.mockClear();
  });

  it('fetchPerpAlerts sends a GET with the correct url and auth header', async () => {
    await fetchPerpAlerts(MARKET_ID);
    expect(mockGetBearerToken).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining(`marketId=${encodeURIComponent(MARKET_ID)}`),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
        }),
      }),
    );
  });

  it('createPerpAlert sends a POST with the alert payload', async () => {
    const params = { marketId: MARKET_ID, threshold: 55000, recurring: false };
    await createPerpAlert(params);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('perp-alerts'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(params),
      }),
    );
  });

  it('updatePerpAlert sends a PATCH to the alert id endpoint', async () => {
    await updatePerpAlert('alert-99', { threshold: 60000, recurring: true });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('alert-99'),
      expect.objectContaining({ method: 'PATCH' }),
    );
  });

  it('deletePerpAlert sends a DELETE to the alert id endpoint', async () => {
    await deletePerpAlert('alert-99');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('alert-99'),
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('sends percent-change create, update, and delete requests to the percent endpoint', async () => {
    const params = {
      marketId: MARKET_ID,
      threshold: 5,
      period: '24h' as const,
      direction: 'up' as const,
      recurring: false,
    };

    await createPerpPercentAlert(params);
    await updatePerpPercentAlert('percent-alert-1', { active: false });
    await deletePerpPercentAlert('percent-alert-1');

    expect(mockFetch).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('perp-alerts/percent-change'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(params),
      }),
    );
    expect(mockFetch).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('perp-alerts/percent-change/percent-alert-1'),
      expect.objectContaining({ method: 'PATCH' }),
    );
    expect(mockFetch).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('perp-alerts/percent-change/percent-alert-1'),
      expect.objectContaining({ method: 'DELETE' }),
    );
  });
});

describe('normalizePerpAlerts', () => {
  it('maps absolute and percent API discriminators to shared alert types', () => {
    const shared = {
      userId: 'user-1',
      marketId: MARKET_ID,
      recurring: true,
      active: true,
      createdAt: '2026-01-01T00:00:00Z',
    };

    const result = normalizePerpAlerts([
      {
        ...shared,
        id: 'absolute-1',
        type: 'perp_absolute_price',
        threshold: 60000,
      },
      {
        ...shared,
        id: 'percent-1',
        type: 'perp_percent_change',
        threshold: 5,
        period: '1h',
        direction: 'down',
      },
    ]);

    expect(result).toEqual([
      expect.objectContaining({
        id: 'absolute-1',
        asset: MARKET_ID,
        type: 'absolute_price',
      }),
      expect.objectContaining({
        id: 'percent-1',
        asset: MARKET_ID,
        type: 'percent_change',
        period: '1h',
        direction: 'down',
      }),
    ]);
  });
});

describe('perps CRUD routing', () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true } as Response);
  });

  it('routes percent updates and deletes to percent-change endpoints', async () => {
    await updatePerpAlertByType(editingPercentAlert, { active: false });
    await deletePerpAlertByType(editingPercentAlert);

    expect(global.fetch).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('perp-alerts/percent-change/percent-alert-99'),
      expect.objectContaining({ method: 'PATCH' }),
    );
    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('perp-alerts/percent-change/percent-alert-99'),
      expect.objectContaining({ method: 'DELETE' }),
    );
  });
});

// ─── useSubmitPerpAlert ───────────────────────────────────────────────────────

describe('useSubmitPerpAlert', () => {
  it('calls createPerpAlert (POST) when no editingAlert is supplied', async () => {
    const params = { marketId: MARKET_ID, threshold: 55000, recurring: false };
    const mockResponse = { ok: true } as unknown as Response;
    global.fetch = jest.fn().mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useSubmitPerpAlert());
    await act(async () => {
      await result.current.submit(params);
    });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('perp-alerts'),
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('calls updatePerpAlert (PATCH) when editingAlert is supplied', async () => {
    const params = { marketId: MARKET_ID, threshold: 60000, recurring: true };
    const mockResponse = { ok: true } as unknown as Response;
    global.fetch = jest.fn().mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useSubmitPerpAlert(editingAlert));
    await act(async () => {
      await result.current.submit(params);
    });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('alert-99'),
      expect.objectContaining({ method: 'PATCH' }),
    );
  });
});

describe('useSubmitPerpPercentAlert', () => {
  const params = {
    marketId: MARKET_ID,
    threshold: 7.5,
    period: '24h' as const,
    direction: 'up' as const,
    recurring: true,
  };

  it('posts a percent alert when no editing alert is supplied', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true } as Response);
    const { result } = renderHook(() => useSubmitPerpPercentAlert());

    await act(async () => {
      await result.current.submit(params);
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('perp-alerts/percent-change'),
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('patches a percent alert when an editing alert is supplied', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true } as Response);
    const { result } = renderHook(() =>
      useSubmitPerpPercentAlert(editingPercentAlert),
    );

    await act(async () => {
      await result.current.submit(params);
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('perp-alerts/percent-change/percent-alert-99'),
      expect.objectContaining({ method: 'PATCH' }),
    );
  });
});

// ─── usePerpAlertSaveFlow ─────────────────────────────────────────────────────

describe('usePerpAlertSaveFlow', () => {
  const mockTrackEvent = jest.fn();
  const mockCreateEventBuilder = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    const mockBuilder = {
      addProperties: jest.fn().mockReturnThis(),
      build: jest.fn().mockReturnValue({}),
    };
    mockCreateEventBuilder.mockReturnValue(mockBuilder);
    jest.mocked(useAnalytics).mockReturnValue(
      createMockUseAnalyticsHook({
        trackEvent: mockTrackEvent,
        createEventBuilder: mockCreateEventBuilder,
      }),
    );
  });

  const renderFlow = (fromManage = false) =>
    renderHook(() =>
      usePerpAlertSaveFlow({
        marketId: MARKET_ID,
        displayTicker: DISPLAY_TICKER,
        fromManage,
      }),
    );

  it('calls goBack after a successful save (not editing, not fromManage)', async () => {
    const { result } = renderFlow(false);
    await act(async () => {
      await result.current.saveAlert({
        submit: mockSubmit,
        editingAlert: undefined,
        patch: undefined,
        analyticsProperties: baseAnalyticsProperties,
      });
    });
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('calls pop(2) after a successful create from ManageView (fromManage=true)', async () => {
    const { result } = renderFlow(true);
    await act(async () => {
      await result.current.saveAlert({
        submit: mockSubmit,
        editingAlert: undefined,
        patch: undefined,
        analyticsProperties: baseAnalyticsProperties,
      });
    });
    expect(mockPop).toHaveBeenCalledWith(2);
  });

  it('calls goBack after editing an alert regardless of fromManage', async () => {
    const { result } = renderFlow(true);
    await act(async () => {
      await result.current.saveAlert({
        submit: mockSubmit,
        editingAlert,
        patch: { threshold: 60000 },
        analyticsProperties: baseAnalyticsProperties,
      });
    });
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('emits CREATED analytics with perps market type on new alert', async () => {
    const mockBuilder = {
      addProperties: jest.fn().mockReturnThis(),
      build: jest.fn().mockReturnValue({}),
    };
    mockCreateEventBuilder.mockReturnValue(mockBuilder);

    const { result } = renderFlow(false);
    await act(async () => {
      await result.current.saveAlert({
        submit: mockSubmit,
        editingAlert: undefined,
        patch: undefined,
        analyticsProperties: baseAnalyticsProperties,
      });
    });

    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.PRICE_ALERT_CREATION_INTERACTION,
    );
    expect(mockBuilder.addProperties).toHaveBeenCalledWith(
      expect.objectContaining({
        alert_market_type: PriceAlertAnalytics.MARKET_TYPE.PERPS,
        interaction_type: PriceAlertAnalytics.INTERACTION_TYPE.CREATED,
      }),
    );
  });

  it('emits UPDATED analytics when editing an existing alert', async () => {
    const mockBuilder = {
      addProperties: jest.fn().mockReturnThis(),
      build: jest.fn().mockReturnValue({}),
    };
    mockCreateEventBuilder.mockReturnValue(mockBuilder);

    const { result } = renderFlow(false);
    await act(async () => {
      await result.current.saveAlert({
        submit: mockSubmit,
        editingAlert,
        patch: { threshold: 60000 },
        analyticsProperties: baseAnalyticsProperties,
      });
    });

    expect(mockBuilder.addProperties).toHaveBeenCalledWith(
      expect.objectContaining({
        alert_market_type: PriceAlertAnalytics.MARKET_TYPE.PERPS,
        interaction_type: PriceAlertAnalytics.INTERACTION_TYPE.UPDATED,
        prev_alert_value: editingAlert.threshold,
      }),
    );
  });

  it('patches the query cache when editing an alert', async () => {
    const { result } = renderFlow(false);
    await act(async () => {
      await result.current.saveAlert({
        submit: mockSubmit,
        editingAlert,
        patch: { threshold: 60000 },
        analyticsProperties: baseAnalyticsProperties,
      });
    });
    expect(mockSetQueryData).toHaveBeenCalledWith(
      perpAlertsQueryKey(MARKET_ID),
      expect.any(Function),
    );
  });

  it('shows a success toast after saving', async () => {
    const { result } = renderFlow(false);
    await act(async () => {
      await result.current.saveAlert({
        submit: mockSubmit,
        editingAlert: undefined,
        patch: undefined,
        analyticsProperties: baseAnalyticsProperties,
      });
    });
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({ severity: ToastSeverity.Success }),
    );
  });

  it('shows an error toast when submit throws', async () => {
    const failingSubmit = jest.fn().mockRejectedValue(new Error('network'));
    const { result } = renderFlow(false);
    await act(async () => {
      await result.current.saveAlert({
        submit: failingSubmit,
        editingAlert: undefined,
        patch: undefined,
        analyticsProperties: baseAnalyticsProperties,
      });
    });
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({ severity: ToastSeverity.Danger }),
    );
  });
});
