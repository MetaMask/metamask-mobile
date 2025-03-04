import { MetaMetricsEvents } from '../../../../core/Analytics';
import {
  securityAlertResponse,
  typedSignV4ConfirmationState,
  typedSignV4SignatureRequest,
} from '../../../../util/test/confirm-data-helpers';
import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import { useSignatureMetrics } from './useSignatureMetrics';

const mockTypedSignV4SignatureRequest = typedSignV4SignatureRequest;
jest.mock('./useSignatureRequest', () => ({
  useSignatureRequest: () => mockTypedSignV4SignatureRequest,
}));

jest.mock('../../../../util/address', () => ({
  getAddressAccountType: (str: string) => str,
}));

const mockTrackEvent = jest.fn().mockImplementation();
jest.mock('../../../../core/Analytics', () => ({
  ...jest.requireActual('../../../../core/Analytics'),
  MetaMetrics: {
    getInstance: () => ({ trackEvent: mockTrackEvent }),
  },
}));

const mockAddProperties = jest
  .fn()
  .mockImplementation(() => ({ build: () => ({}) }));
jest.mock('../../../../core/Analytics/MetricsEventBuilder', () => ({
  ...jest.requireActual('../../../../core/Analytics/MetricsEventBuilder'),
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
  security_alert_reason: 'permit_farming',
  security_alert_response: 'Malicious',
  security_alert_source: 'api',
  signature_type: 'eth_signTypedData',
  ui_customizations: ['flagged_as_malicious'],
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
        signatureRequest: { securityAlertResponse },
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
});
