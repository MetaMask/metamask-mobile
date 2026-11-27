import { SignatureRequest } from '@metamask/signature-controller';
import { act } from '@testing-library/react-native';

import {
  Reason,
  ResultType,
  SecurityAlertResponse,
  SecurityAlertSource,
} from '../../../../../components/Views/confirmations/components/blockaid-banner/BlockaidBanner.types';
import { useAnalytics } from '../../../../../components/hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { updateConfirmationMetric } from '../../../../../core/redux/slices/confirmationMetrics';
import { setSecurityAlertResponse } from '../../../../../reducers/security-alerts';
import { AnalyticsEventBuilder } from '../../../../../util/analytics/AnalyticsEventBuilder';
import { createMockUseAnalyticsHook } from '../../../../../util/test/analyticsMock';
import {
  personalSignSignatureRequest,
  securityAlertResponse,
  typedSignV4ConfirmationState,
  typedSignV4SignatureRequest,
} from '../../../../../util/test/confirm-data-helpers';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import {
  useSignatureMetrics,
  useTrackSignatureRequested,
} from './useSignatureMetrics';
import { useSignatureRequest } from './useSignatureRequest';

jest.mock('./useSignatureRequest', () => ({
  useSignatureRequest: jest.fn(),
}));

jest.mock('../../../../../util/address', () => ({
  getAddressAccountType: (str: string) => str,
}));

jest.mock('../../../../../components/hooks/useAnalytics/useAnalytics');

const REQUEST_ID =
  typedSignV4SignatureRequest.messageParams.requestId?.toString() ?? '';

const TYPED_SIGN_BASE_METRICS = {
  account_type: '0x935e73edb9ff52e23bac7f7e043a1ecd06d05477',
  chain_id: '1',
  dapp_host_name: 'metamask.github.io',
  eip712_primary_type: 'Permit',
  request_source: 'In-App-Browser',
  signature_type: 'eth_signTypedData',
  version: 'V4',
};

const TYPED_SIGN_MALICIOUS_METRICS = {
  ...TYPED_SIGN_BASE_METRICS,
  security_alert_reason: Reason.permitFarming,
  security_alert_response: 'Malicious',
  security_alert_source: 'api',
  ui_customizations: ['flagged_as_malicious'],
};

const SECURITY_ALERT_LOADING: SecurityAlertResponse = {
  features: [],
  providerRequestsCount: {
    eth_call: 5,
    eth_getCode: 3,
  },
  reason: Reason.notApplicable,
  result_type: ResultType.RequestInProgress,
  source: SecurityAlertSource.API,
};

const TYPED_SIGN_LOADING_METRICS = {
  ...TYPED_SIGN_BASE_METRICS,
  ppom_eth_call_count: 5,
  ppom_eth_getCode_count: 3,
  security_alert_reason: Reason.notApplicable,
  security_alert_response: 'loading',
  security_alert_source: 'api',
  ui_customizations: ['security_alert_loading'],
};

const PERSONAL_SIGN_METRICS = {
  account_type: '0x935e73edb9ff52e23bac7f7e043a1ecd06d05477',
  chain_id: '1',
  dapp_host_name: 'metamask.github.io',
  request_source: 'In-App-Browser',
  signature_type: 'personal_sign',
  version: 'N/A',
};

function setup<Result>(
  hook: () => Result,
  overrides: {
    alerts?: Record<string, SecurityAlertResponse | undefined>;
    signatureRequest?: SignatureRequest | undefined;
  } = {},
) {
  const mockTrackEvent = jest.fn();
  const signatureRequest =
    'signatureRequest' in overrides
      ? overrides.signatureRequest
      : typedSignV4SignatureRequest;

  jest.mocked(useAnalytics).mockReturnValue(
    createMockUseAnalyticsHook({
      createEventBuilder: AnalyticsEventBuilder.createEventBuilder,
      trackEvent: mockTrackEvent,
    }),
  );
  jest.mocked(useSignatureRequest).mockReturnValue(signatureRequest);

  const renderResult = renderHookWithProvider(hook, {
    state: {
      ...typedSignV4ConfirmationState,
      securityAlerts: {
        alerts: overrides.alerts ?? {},
      },
    },
  });

  return {
    ...renderResult,
    mockTrackEvent,
  };
}

describe('useSignatureMetrics', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('does not track SIGNATURE_REQUESTED on mount, even with multiple instances', () => {
    const { mockTrackEvent } = setup(() => {
      useSignatureMetrics();
      useSignatureMetrics();
    });

    expect(mockTrackEvent).not.toHaveBeenCalled();
  });

  it('captures approved and rejected events with malicious security alert properties', () => {
    const { mockTrackEvent, result } = setup(() => useSignatureMetrics(), {
      alerts: { [REQUEST_ID]: securityAlertResponse },
    });

    result.current.captureSignatureMetrics(
      MetaMetricsEvents.SIGNATURE_APPROVED,
    );
    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    expect(mockTrackEvent).toHaveBeenLastCalledWith(
      expect.objectContaining({
        name: MetaMetricsEvents.SIGNATURE_APPROVED.category,
        properties: TYPED_SIGN_MALICIOUS_METRICS,
      }),
    );

    result.current.captureSignatureMetrics(
      MetaMetricsEvents.SIGNATURE_REJECTED,
    );
    expect(mockTrackEvent).toHaveBeenCalledTimes(2);
    expect(mockTrackEvent).toHaveBeenLastCalledWith(
      expect.objectContaining({
        name: MetaMetricsEvents.SIGNATURE_REJECTED.category,
        properties: TYPED_SIGN_MALICIOUS_METRICS,
      }),
    );
  });

  it('captures approved and rejected events with loading security alert properties', () => {
    const { mockTrackEvent, result } = setup(() => useSignatureMetrics(), {
      alerts: { [REQUEST_ID]: SECURITY_ALERT_LOADING },
    });

    result.current.captureSignatureMetrics(
      MetaMetricsEvents.SIGNATURE_APPROVED,
    );
    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    expect(mockTrackEvent).toHaveBeenLastCalledWith(
      expect.objectContaining({
        name: MetaMetricsEvents.SIGNATURE_APPROVED.category,
        properties: TYPED_SIGN_LOADING_METRICS,
      }),
    );

    result.current.captureSignatureMetrics(
      MetaMetricsEvents.SIGNATURE_REJECTED,
    );
    expect(mockTrackEvent).toHaveBeenCalledTimes(2);
    expect(mockTrackEvent).toHaveBeenLastCalledWith(
      expect.objectContaining({
        name: MetaMetricsEvents.SIGNATURE_REJECTED.category,
        properties: TYPED_SIGN_LOADING_METRICS,
      }),
    );
  });

  it('captures approved and rejected events when security alert response is undefined', () => {
    const { mockTrackEvent, result } = setup(() => useSignatureMetrics(), {
      alerts: { [REQUEST_ID]: undefined },
    });

    result.current.captureSignatureMetrics(
      MetaMetricsEvents.SIGNATURE_APPROVED,
    );
    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    expect(mockTrackEvent).toHaveBeenLastCalledWith(
      expect.objectContaining({
        name: MetaMetricsEvents.SIGNATURE_APPROVED.category,
        properties: TYPED_SIGN_BASE_METRICS,
      }),
    );

    result.current.captureSignatureMetrics(
      MetaMetricsEvents.SIGNATURE_REJECTED,
    );
    expect(mockTrackEvent).toHaveBeenCalledTimes(2);
    expect(mockTrackEvent).toHaveBeenLastCalledWith(
      expect.objectContaining({
        name: MetaMetricsEvents.SIGNATURE_REJECTED.category,
        properties: TYPED_SIGN_BASE_METRICS,
      }),
    );
  });

  it('includes async-loaded properties on approved and rejected events after mount', () => {
    const { mockTrackEvent, result, store } = setup(() =>
      useSignatureMetrics(),
    );

    act(() => {
      store.dispatch(
        setSecurityAlertResponse(REQUEST_ID, securityAlertResponse),
      );
      store.dispatch(
        updateConfirmationMetric({
          id: typedSignV4SignatureRequest.id,
          params: { properties: { alert_trigger_count: 1 } },
        }),
      );
    });

    result.current.captureSignatureMetrics(
      MetaMetricsEvents.SIGNATURE_APPROVED,
    );
    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    expect(mockTrackEvent).toHaveBeenLastCalledWith(
      expect.objectContaining({
        name: MetaMetricsEvents.SIGNATURE_APPROVED.category,
        properties: {
          ...TYPED_SIGN_MALICIOUS_METRICS,
          alert_trigger_count: 1,
        },
      }),
    );
  });
});

describe('useTrackSignatureRequested', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('tracks SIGNATURE_REQUESTED once for eth_signTypedData_v4', () => {
    const { mockTrackEvent } = setup(() => useTrackSignatureRequested(), {
      alerts: { [REQUEST_ID]: securityAlertResponse },
    });

    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    expect(mockTrackEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        name: MetaMetricsEvents.SIGNATURE_REQUESTED.category,
        properties: TYPED_SIGN_MALICIOUS_METRICS,
      }),
    );
  });

  it('tracks SIGNATURE_REQUESTED once for personal_sign', () => {
    const { mockTrackEvent } = setup(() => useTrackSignatureRequested(), {
      signatureRequest: personalSignSignatureRequest,
    });

    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    expect(mockTrackEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        name: MetaMetricsEvents.SIGNATURE_REQUESTED.category,
        properties: PERSONAL_SIGN_METRICS,
      }),
    );
  });

  it('tracks SIGNATURE_REQUESTED only once when async data arrives after mount', () => {
    const { mockTrackEvent, rerender, store } = setup(() =>
      useTrackSignatureRequested(),
    );

    expect(mockTrackEvent).toHaveBeenCalledTimes(1);

    act(() => {
      store.dispatch(
        setSecurityAlertResponse(REQUEST_ID, SECURITY_ALERT_LOADING),
      );
    });

    act(() => {
      store.dispatch(
        setSecurityAlertResponse(REQUEST_ID, securityAlertResponse),
      );
    });

    act(() => {
      store.dispatch(
        updateConfirmationMetric({
          id: typedSignV4SignatureRequest.id,
          params: { properties: { alert_trigger_count: 1 } },
        }),
      );
    });

    jest.mocked(useSignatureRequest).mockReturnValue({
      ...typedSignV4SignatureRequest,
      decodingData: { stateChanges: [] },
      decodingLoading: false,
    });
    rerender({});

    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
  });

  it('tracks SIGNATURE_REQUESTED once per request when a new signature request arrives', () => {
    const { mockTrackEvent, rerender } = setup(() =>
      useTrackSignatureRequested(),
    );

    expect(mockTrackEvent).toHaveBeenCalledTimes(1);

    jest.mocked(useSignatureRequest).mockReturnValue({
      ...personalSignSignatureRequest,
      id: 'second-signature-request-id',
    });
    rerender({});

    expect(mockTrackEvent).toHaveBeenCalledTimes(2);
    expect(mockTrackEvent).toHaveBeenLastCalledWith(
      expect.objectContaining({
        name: MetaMetricsEvents.SIGNATURE_REQUESTED.category,
        properties: PERSONAL_SIGN_METRICS,
      }),
    );
  });

  it('tracks SIGNATURE_REQUESTED only once when mounted alongside multiple useSignatureMetrics instances', () => {
    const { mockTrackEvent } = setup(() => {
      useTrackSignatureRequested();
      useSignatureMetrics();
      useSignatureMetrics();
    });

    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    expect(mockTrackEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        name: MetaMetricsEvents.SIGNATURE_REQUESTED.category,
        properties: TYPED_SIGN_BASE_METRICS,
      }),
    );
  });

  it('does not track SIGNATURE_REQUESTED when there is no signature request', () => {
    const { mockTrackEvent } = setup(() => useTrackSignatureRequested(), {
      signatureRequest: undefined,
    });

    expect(mockTrackEvent).not.toHaveBeenCalled();
  });
});
