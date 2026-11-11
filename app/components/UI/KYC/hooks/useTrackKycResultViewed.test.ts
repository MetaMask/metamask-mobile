import { renderHook } from '@testing-library/react-native';
import { trackKycEvent } from '../utils/trackKycEvent';
import { useTrackKycResultViewed } from './useTrackKycResultViewed';

jest.mock('../utils/trackKycEvent', () => ({
  trackKycEvent: jest.fn(),
}));

describe('useTrackKycResultViewed', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each(['pending', 'rejected', 'approved'] as const)(
    'tracks KYC Result Viewed with the %s status shown on the page',
    (kycStatus) => {
      renderHook(() => useTrackKycResultViewed(kycStatus));

      expect(trackKycEvent).toHaveBeenCalledTimes(1);
      const [event, buildProperties] = jest.mocked(trackKycEvent).mock.calls[0];
      expect(event).toMatchObject({ category: 'KYC Result Viewed' });
      expect(buildProperties()).toMatchObject({
        kyc_status: kycStatus,
        screen_name: 'vba_onboarding',
      });
    },
  );

  it('does not track again when the page re-renders with the same status', () => {
    const { rerender } = renderHook(() => useTrackKycResultViewed('pending'));

    rerender({});

    expect(trackKycEvent).toHaveBeenCalledTimes(1);
  });
});
