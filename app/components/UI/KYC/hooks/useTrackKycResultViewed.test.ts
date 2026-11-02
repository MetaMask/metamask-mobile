import { renderHook } from '@testing-library/react-native';
import { trackVbaEvent } from '../../Ramp/Views/VirtualBankAccount/vbaAnalytics';
import { useTrackKycResultViewed } from './useTrackKycResultViewed';

jest.mock('../../Ramp/Views/VirtualBankAccount/vbaAnalytics', () => ({
  ...jest.requireActual('../../Ramp/Views/VirtualBankAccount/vbaAnalytics'),
  trackVbaEvent: jest.fn(),
}));

describe('useTrackKycResultViewed', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each(['pending', 'rejected', 'approved'] as const)(
    'tracks KYC Result Viewed with the %s status shown on the page',
    (kycStatus) => {
      renderHook(() => useTrackKycResultViewed(kycStatus));

      expect(trackVbaEvent).toHaveBeenCalledTimes(1);
      const [event, buildProperties] = jest.mocked(trackVbaEvent).mock.calls[0];
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

    expect(trackVbaEvent).toHaveBeenCalledTimes(1);
  });
});
