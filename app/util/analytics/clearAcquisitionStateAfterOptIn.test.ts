import { clearAcquisitionStateAfterOptIn } from './clearAcquisitionStateAfterOptIn';
import { AppStateEventProcessor } from '../../core/AppStateEventListener';
import { clearAttribution } from '../../core/redux/slices/attribution';
import { isAttributionOnlyDeeplink } from './isAttributionOnlyDeeplink';

jest.mock('./isAttributionOnlyDeeplink', () => ({
  isAttributionOnlyDeeplink: jest.fn(),
}));

jest.mock('../../core/AppStateEventListener', () => ({
  AppStateEventProcessor: {
    pendingDeeplink: null as string | null,
    clearPendingDeeplink: jest.fn(),
  },
}));

const mockIsAttributionOnlyDeeplink =
  isAttributionOnlyDeeplink as jest.MockedFunction<
    typeof isAttributionOnlyDeeplink
  >;
const mockAppStateEventProcessor = AppStateEventProcessor as jest.Mocked<
  typeof AppStateEventProcessor
>;

describe('clearAcquisitionStateAfterOptIn', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAppStateEventProcessor.pendingDeeplink = null;
    mockIsAttributionOnlyDeeplink.mockReturnValue(false);
  });

  it('always clears persisted attribution', () => {
    const dispatch = jest.fn();

    clearAcquisitionStateAfterOptIn(dispatch);

    expect(dispatch).toHaveBeenCalledWith(clearAttribution());
  });

  it('clears attribution-only pending deeplinks', () => {
    const pendingDeeplink =
      'https://link.metamask.io/home?utm_source=campaign&utm_campaign=summer';
    mockAppStateEventProcessor.pendingDeeplink = pendingDeeplink;
    mockIsAttributionOnlyDeeplink.mockReturnValue(true);
    const dispatch = jest.fn();

    clearAcquisitionStateAfterOptIn(dispatch);

    expect(mockIsAttributionOnlyDeeplink).toHaveBeenCalledWith(pendingDeeplink);
    expect(
      mockAppStateEventProcessor.clearPendingDeeplink,
    ).toHaveBeenCalledTimes(1);
  });

  it('keeps navigation deeplinks that still need post-onboarding routing', () => {
    const pendingDeeplink =
      'https://link.metamask.io/rewards?utm_source=campaign&utm_campaign=summer';
    mockAppStateEventProcessor.pendingDeeplink = pendingDeeplink;
    mockIsAttributionOnlyDeeplink.mockReturnValue(false);
    const dispatch = jest.fn();

    clearAcquisitionStateAfterOptIn(dispatch);

    expect(
      mockAppStateEventProcessor.clearPendingDeeplink,
    ).not.toHaveBeenCalled();
  });
});
