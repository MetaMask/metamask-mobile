import { MetaMetricsEvents } from '../../../../../core/Analytics';
import {
  securityAlertResponse,
  typedSignV4ConfirmationState,
  typedSignV4SignatureRequest,
} from '../../../../../util/test/confirm-data-helpers';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { useSignatureMetrics } from './useSignatureMetrics';
import {
  ResultType,
  Reason,
  SecurityAlertSource,
} from '../../../../../components/Views/confirmations/components/blockaid-banner/BlockaidBanner.types';

const mockTypedSignV4SignatureRequest = typedSignV4SignatureRequest;
jest.mock('./useSignatureRequest', () => ({
  useSignatureRequest: () => mockTypedSignV4SignatureRequest,
}));

jest.mock('../../../../../util/address', () => ({
  getAddressAccountType: (str: string) => str,
}));

const mockTrackEvent = jest.fn().mockImplementation();
jest.mock('../../../../../core/Analytics', () => ({
  ...jest.requireActual('../../../../../core/Analytics'),
  MetaMetrics: {
    getInstance: () => ({
      trackEvent: mockTrackEvent,
      updateDataRecordingFlag: jest.fn(),
    }),
  },
}));

const mockAddProperties = jest
  .fn()
  .mockImplementation(() => ({ build: () => ({}) }));
jest.mock('../../../../../core/Analytics/MetricsEventBuilder', () => ({
  ...jest.requireActual('../../../../../core/Analytics/MetricsEventBuilder'),
  MetricsEventBuilder: {
    createEventBuilder: () => ({ addProperties: mockAddProperties }),
  },
}));

const SignatureMetrics = {
  account_type: '0x935e73edb9ff52e23bac7f7e043a1ecd06d05477',
  chain_id: '1',
  dapp_host_name: 'metamask.github.io',
  eip712_primary_type: 'Permit',
  request_source: 'In-App-Browser',
  security_alert_reason: Reason.permitFarming,
  security_alert_response: 'Malicious',
  security_alert_source: 'api',
  signature_type: 'eth_signTypedData',
  ui_customizations: ['flagged_as_malicious'],
  version: 'V4',
};

const securityAlertResponseLoading = {
  result_type: ResultType.RequestInProgress,
  reason: Reason.notApplicable,
  source: SecurityAlertSource.API,
  providerRequestsCount: {
    eth_call: 5,
    eth_getCode: 3,
  },
  features: [],
};

const SignatureMetricsLoading = {
  account_type: '0x935e73edb9ff52e23bac7f7e043a1ecd06d05477',
  chain_id: '1',
  dapp_host_name: 'metamask.github.io',
  eip712_primary_type: 'Permit',
  request_source: 'In-App-Browser',
  security_alert_reason: Reason.notApplicable,
  security_alert_response: 'loading',
  security_alert_source: 'api',
  signature_type: 'eth_signTypedData',
  ui_customizations: ['security_alert_loading'],
  version: 'V4',
  ppom_eth_call_count: 5,
  ppom_eth_getCode_count: 3,
};

const securityAlertResponseUndefined = undefined;

const SignatureMetricsUndefined = {
  account_type: '0x935e73edb9ff52e23bac7f7e043a1ecd06d05477',
  chain_id: '1',
  dapp_host_name: 'metamask.github.io',
  eip712_primary_type: 'Permit',
  request_source: 'In-App-Browser',
  signature_type: 'eth_signTypedData',
  version: 'V4',
};

describe('useSignatureMetrics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should capture metrics events correctly', async () => {
    const { result } = renderHookWithProvider(() => useSignatureMetrics(), {
      state: {
        ...typedSignV4ConfirmationState,
        securityAlerts: {
          alerts: {
            'fb2029e1-b0ab-11ef-9227-05a11087c334': securityAlertResponse,
          },
        },
      },
    });
    // first call for 'SIGNATURE_REQUESTED' event
    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    expect(mockAddProperties).toHaveBeenCalledWith(SignatureMetrics);
    result?.current?.captureSignatureMetrics(
      MetaMetricsEvents.SIGNATURE_APPROVED,
    );
    expect(mockTrackEvent).toHaveBeenCalledTimes(2);
    expect(mockAddProperties).toHaveBeenLastCalledWith(SignatureMetrics);
    result?.current?.captureSignatureMetrics(
      MetaMetricsEvents.SIGNATURE_REJECTED,
    );
    expect(mockTrackEvent).toHaveBeenCalledTimes(3);
    expect(mockAddProperties).toHaveBeenLastCalledWith(SignatureMetrics);
  });

  it('captures metrics events correctly with loading security alert response', async () => {
    const { result } = renderHookWithProvider(() => useSignatureMetrics(), {
      state: {
        ...typedSignV4ConfirmationState,
        securityAlerts: {
          alerts: {
            'fb2029e1-b0ab-11ef-9227-05a11087c334':
              securityAlertResponseLoading,
          },
        },
      },
    });

    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    expect(mockAddProperties).toHaveBeenCalledWith(SignatureMetricsLoading);
    result?.current?.captureSignatureMetrics(
      MetaMetricsEvents.SIGNATURE_APPROVED,
    );
    expect(mockTrackEvent).toHaveBeenCalledTimes(2);
    expect(mockAddProperties).toHaveBeenLastCalledWith(SignatureMetricsLoading);
    result?.current?.captureSignatureMetrics(
      MetaMetricsEvents.SIGNATURE_REJECTED,
    );
    expect(mockTrackEvent).toHaveBeenCalledTimes(3);
    expect(mockAddProperties).toHaveBeenLastCalledWith(SignatureMetricsLoading);
  });

  it('captures metrics events correctly with undefined security alert response', async () => {
    const { result } = renderHookWithProvider(() => useSignatureMetrics(), {
      state: {
        ...typedSignV4ConfirmationState,
        securityAlerts: {
          alerts: {
            'fb2029e1-b0ab-11ef-9227-05a11087c334':
              securityAlertResponseUndefined,
          },
        },
      },
    });

    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    expect(mockAddProperties).toHaveBeenCalledWith(SignatureMetricsUndefined);
    result?.current?.captureSignatureMetrics(
      MetaMetricsEvents.SIGNATURE_APPROVED,
    );
    expect(mockTrackEvent).toHaveBeenCalledTimes(2);
    expect(mockAddProperties).toHaveBeenLastCalledWith(
      SignatureMetricsUndefined,
    );
    result?.current?.captureSignatureMetrics(
      MetaMetricsEvents.SIGNATURE_REJECTED,
    );
    expect(mockTrackEvent).toHaveBeenCalledTimes(3);
    expect(mockAddProperties).toHaveBeenLastCalledWith(
      SignatureMetricsUndefined,
    );
  });
});
