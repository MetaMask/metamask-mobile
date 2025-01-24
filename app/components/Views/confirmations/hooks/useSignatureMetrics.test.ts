import { MetaMetricsEvents } from '../../../../core/Analytics';
import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import { useSignatureMetrics } from './useSignatureMetrics';

const mockSigRequest = {
  type: 'personal_sign',
  messageParams: {
    data: '0x4578616d706c652060706572736f6e616c5f7369676e60206d657373616765',
    from: '0x935e73edb9ff52e23bac7f7e043a1ecd06d05477',
    meta: {
      url: 'https://metamask.github.io/test-dapp/',
      title: 'E2E Test Dapp',
      icon: { uri: 'https://metamask.github.io/metamask-fox.svg' },
      analytics: { request_source: 'In-App-Browser' },
    },
    origin: 'metamask.github.io',
    metamaskId: '76b33b40-7b5c-11ef-bc0a-25bce29dbc09',
  },
  chainId: '0x0',
};

jest.mock('./useSignatureRequest', () => ({
  useSignatureRequest: () => mockSigRequest,
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

describe('useSignatureMetrics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('should capture metrics events correctly', async () => {
    const { result } = renderHookWithProvider(() => useSignatureMetrics(), {
      state: {},
    });
    // first call for 'SIGNATURE_REQUESTED' event
    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    result?.current?.captureSignatureMetrics(
      MetaMetricsEvents.SIGNATURE_APPROVED,
    );
    expect(mockTrackEvent).toHaveBeenCalledTimes(2);
    result?.current?.captureSignatureMetrics(
      MetaMetricsEvents.SIGNATURE_REJECTED,
    );
    expect(mockTrackEvent).toHaveBeenCalledTimes(3);
  });
});
