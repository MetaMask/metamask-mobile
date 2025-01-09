import { MetaMetricsEvents } from '../../../../core/Analytics';
import { personalSignatureConfirmationState } from '../../../../util/test/confirm-data-helpers';
import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import useSignatureMetrics from './useSignatureMetrics';

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
      state: personalSignatureConfirmationState,
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
