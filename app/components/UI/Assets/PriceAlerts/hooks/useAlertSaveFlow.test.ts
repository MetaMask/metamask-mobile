import React from 'react';
import { act, renderHook } from '@testing-library/react-native';
import { ToastContext } from '../../../../../component-library/components/Toast';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { createMockUseAnalyticsHook } from '../../../../../util/test/analyticsMock';
import { type AbsolutePriceAlert, PriceAlertAnalytics } from '../constants';
import useAlertSaveFlow from './useAlertSaveFlow';

const mockGoBack = jest.fn();
const mockPop = jest.fn();
const mockShowToast = jest.fn();
const mockCloseToast = jest.fn();
const mockSetQueryData = jest.fn();
const mockSubmit = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ goBack: mockGoBack, pop: mockPop }),
}));

jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual('@tanstack/react-query'),
  useQueryClient: () => ({ setQueryData: mockSetQueryData }),
}));

jest.mock('../api', () => ({
  priceAlertsQueryKey: (assetId: string) => ['priceAlerts', assetId],
}));

jest.mock('../../../../hooks/useAnalytics/useAnalytics');

const editingAlert: Pick<
  AbsolutePriceAlert,
  'id' | 'threshold' | 'recurring' | 'active'
> = {
  id: 'alert-42',
  threshold: 1500,
  recurring: true,
  active: true,
};

const baseAnalyticsProperties = {
  alert_type: PriceAlertAnalytics.TYPE.THRESHOLD,
  alert_value: 1500,
  alert_recurring: true,
};

const toastRef = {
  current: {
    showToast: mockShowToast,
    closeToast: mockCloseToast,
  },
};

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(ToastContext.Provider, { value: { toastRef } }, children);

const renderSaveFlow = (
  overrides: Partial<{
    assetId: string;
    displayTicker: string;
    fromManage: boolean;
  }> = {},
) =>
  renderHook(
    () =>
      useAlertSaveFlow({
        assetId: 'eip155:1/slip44:60',
        displayTicker: 'ETH',
        ...overrides,
      }),
    { wrapper },
  );

const mockAnalytics = () => {
  const hook = createMockUseAnalyticsHook();
  jest.mocked(useAnalytics).mockReturnValue(hook);
  return hook;
};

const builderForEvent = (
  analytics: ReturnType<typeof createMockUseAnalyticsHook>,
  event: unknown,
) => {
  const calls = jest.mocked(analytics.createEventBuilder).mock.calls;
  const index = calls.findIndex(([candidate]) => candidate === event);
  return jest.mocked(analytics.createEventBuilder).mock.results[index].value;
};

describe('useAlertSaveFlow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSubmit.mockResolvedValue(undefined);
    mockAnalytics();
  });

  it('navigates back and shows a success toast after a create save', async () => {
    const { result } = renderSaveFlow();

    await act(async () => {
      await result.current.saveAlert({
        submit: mockSubmit,
        analyticsProperties: baseAnalyticsProperties,
      });
    });

    expect(mockSubmit).toHaveBeenCalledTimes(1);
    expect(mockGoBack).toHaveBeenCalledTimes(1);
    expect(mockPop).not.toHaveBeenCalled();
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        hasNoTimeout: false,
        labelOptions: expect.arrayContaining([
          expect.objectContaining({ label: expect.stringContaining('ETH') }),
        ]),
      }),
    );
  });

  it('pops two screens after a create save opened from manage', async () => {
    const { result } = renderSaveFlow({ fromManage: true });

    await act(async () => {
      await result.current.saveAlert({
        submit: mockSubmit,
        analyticsProperties: baseAnalyticsProperties,
      });
    });

    expect(mockPop).toHaveBeenCalledWith(2);
    expect(mockGoBack).not.toHaveBeenCalled();
  });

  it('navigates back without popping after an edit save from manage', async () => {
    const { result } = renderSaveFlow({
      fromManage: true,
    });

    await act(async () => {
      await result.current.saveAlert({
        submit: mockSubmit,
        editingAlert,
        patch: { threshold: 1500, recurring: false },
        analyticsProperties: {
          ...baseAnalyticsProperties,
          alert_recurring: false,
        },
      });
    });

    expect(mockGoBack).toHaveBeenCalledTimes(1);
    expect(mockPop).not.toHaveBeenCalled();
  });

  it('shows an error toast without navigating when submit rejects', async () => {
    mockSubmit.mockRejectedValueOnce(new Error('HTTP 500'));
    const { result } = renderSaveFlow();

    await act(async () => {
      await result.current.saveAlert({
        submit: mockSubmit,
        analyticsProperties: baseAnalyticsProperties,
      });
    });

    expect(mockGoBack).not.toHaveBeenCalled();
    expect(mockPop).not.toHaveBeenCalled();
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        labelOptions: expect.arrayContaining([
          expect.objectContaining({
            label: 'Failed to save price alert. Please try again.',
          }),
        ]),
        hasNoTimeout: false,
      }),
    );
  });

  it('patches the matching cached alert after an edit save', async () => {
    const { result } = renderSaveFlow();

    await act(async () => {
      await result.current.saveAlert({
        submit: mockSubmit,
        editingAlert,
        patch: { threshold: 1600, recurring: false },
        analyticsProperties: {
          ...baseAnalyticsProperties,
          alert_value: 1600,
          alert_recurring: false,
        },
      });
    });

    expect(mockSetQueryData).toHaveBeenCalledWith(
      ['priceAlerts', 'eip155:1/slip44:60'],
      expect.any(Function),
    );
    const updater = mockSetQueryData.mock.calls[0][1] as (
      previous: AbsolutePriceAlert[] | undefined,
    ) => AbsolutePriceAlert[] | undefined;
    expect(updater(undefined)).toBeUndefined();
    expect(
      updater([
        {
          ...editingAlert,
          userId: 'user-1',
          asset: 'eip155:1/slip44:60',
          type: 'absolute_price',
          createdAt: '2025-01-01T00:00:00.000Z',
        },
      ]),
    ).toEqual([
      expect.objectContaining({
        id: 'alert-42',
        threshold: 1600,
        recurring: false,
      }),
    ]);
  });

  it('skips the cache patch on create', async () => {
    const { result } = renderSaveFlow();

    await act(async () => {
      await result.current.saveAlert({
        submit: mockSubmit,
        patch: { threshold: 1500, recurring: true },
        analyticsProperties: baseAnalyticsProperties,
      });
    });

    expect(mockSetQueryData).not.toHaveBeenCalled();
  });

  it('tracks created analytics properties', async () => {
    const analytics = mockAnalytics();
    const { result } = renderSaveFlow();

    await act(async () => {
      await result.current.saveAlert({
        submit: mockSubmit,
        analyticsProperties: baseAnalyticsProperties,
      });
    });

    expect(analytics.createEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.PRICE_ALERT_CREATION_INTERACTION,
    );
    expect(
      builderForEvent(
        analytics,
        MetaMetricsEvents.PRICE_ALERT_CREATION_INTERACTION,
      ).addProperties,
    ).toHaveBeenCalledWith({
      interaction_type: 'created',
      asset_id: 'eip155:1/slip44:60',
      token_symbol: 'ETH',
      alert_type: 'threshold',
      alert_value: 1500,
      alert_recurring: true,
      alert_active: true,
    });
  });

  it('tracks updated analytics properties with previous values', async () => {
    const analytics = mockAnalytics();
    const { result } = renderSaveFlow();

    await act(async () => {
      await result.current.saveAlert({
        submit: mockSubmit,
        editingAlert,
        patch: { threshold: 1500, recurring: false },
        analyticsProperties: {
          ...baseAnalyticsProperties,
          alert_recurring: false,
        },
      });
    });

    expect(
      builderForEvent(
        analytics,
        MetaMetricsEvents.PRICE_ALERT_CREATION_INTERACTION,
      ).addProperties,
    ).toHaveBeenCalledWith({
      interaction_type: 'updated',
      asset_id: 'eip155:1/slip44:60',
      token_symbol: 'ETH',
      alert_type: 'threshold',
      alert_value: 1500,
      alert_recurring: false,
      alert_active: true,
      prev_alert_value: 1500,
      prev_alert_recurring: true,
      prev_alert_active: true,
    });
  });

  it('forwards type-specific analytics properties', async () => {
    const analytics = mockAnalytics();
    const { result } = renderSaveFlow();

    await act(async () => {
      await result.current.saveAlert({
        submit: mockSubmit,
        analyticsProperties: {
          alert_type: PriceAlertAnalytics.TYPE.PERCENT,
          alert_value: 5,
          alert_recurring: true,
          alert_period: '24h',
          alert_direction: 'up',
        },
      });
    });

    expect(
      builderForEvent(
        analytics,
        MetaMetricsEvents.PRICE_ALERT_CREATION_INTERACTION,
      ).addProperties,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        alert_type: 'percent',
        alert_period: '24h',
        alert_direction: 'up',
        alert_value: 5,
      }),
    );
  });
});
