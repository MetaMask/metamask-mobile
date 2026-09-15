import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import OnboardingPushNotifications from './index';
import { OnboardingPushNotificationsSelectorsIDs } from './OnboardingPushNotifications.testIds';
import { navigateToNextOnboardingConsentStep } from '../../../util/onboarding/onboardingConsentFlow';
import { setPushPrePromptShown } from '../../../util/notifications/constants/notification-storage-keys';
import { selectBasicFunctionalityEnabled } from '../../../selectors/settings';
import { resolveNativePushPermissionStatus } from '../../../util/notifications/utils/push-notification-status';
import { usePushPermissionNotificationSetup } from '../../../util/notifications/hooks/usePushPermissionNotificationSetup';
import { canOsPromptForPushPermission } from '../../../util/notifications/services/NotificationService';
import { strings } from '../../../../locales/i18n';

const mockNavigate = jest.fn();
const mockRouteParams = { kind: 'srp' as const };
const mockEnableNotificationsInBackground = jest.fn();
const mockRequestPushPermission = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
  useRoute: () => ({ params: mockRouteParams }),
}));

jest.mock('react-redux', () => ({
  useSelector: (selector: (state: unknown) => unknown) => selector({}),
}));

jest.mock('../../../selectors/settings', () => ({
  selectBasicFunctionalityEnabled: jest.fn(() => true),
}));

jest.mock(
  '../../../util/notifications/constants/notification-storage-keys',
  () => ({
    setPushPrePromptShown: jest.fn().mockResolvedValue(undefined),
  }),
);

jest.mock('../../../util/onboarding/onboardingConsentFlow', () => ({
  navigateToNextOnboardingConsentStep: jest.fn(),
}));

jest.mock(
  '../../../util/notifications/hooks/usePushPermissionNotificationSetup',
  () => ({
    usePushPermissionNotificationSetup: jest.fn(),
  }),
);

jest.mock(
  '../../../util/notifications/hooks/usePushPrePromptAnalytics',
  () => ({
    usePushPrePromptAnalytics: () => ({
      trackPrePromptViewed: jest.fn(),
      trackPrePromptDismissed: jest.fn(),
      trackPrePromptButtonClicked: jest.fn(),
      trackOsPromptShown: jest.fn(),
      trackOsPromptResponse: jest.fn(),
      identifyPushNotificationsEnabled: jest.fn().mockResolvedValue(undefined),
    }),
  }),
);

jest.mock('../../../util/notifications/utils/push-notification-status', () => ({
  resolveNativePushPermissionStatus: jest.fn(),
}));

jest.mock('../../../util/notifications/services/NotificationService', () => ({
  __esModule: true,
  default: {
    requestPushNotificationsPermission: jest.fn().mockResolvedValue(undefined),
  },
  canOsPromptForPushPermission: jest.fn(() => true),
}));

jest.mock('../../../util/device', () => ({
  isMediumDevice: jest.fn(() => false),
  isAndroid: jest.fn(() => false),
  isIos: jest.fn(() => true),
}));

describe('OnboardingPushNotifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(selectBasicFunctionalityEnabled).mockReturnValue(true);
    jest.mocked(canOsPromptForPushPermission).mockReturnValue(true);
    jest.mocked(resolveNativePushPermissionStatus).mockResolvedValue({
      nativeOsPermissionEnabled: false,
      nativeOsPermissionPromptable: true,
    });
    jest.mocked(usePushPermissionNotificationSetup).mockReturnValue({
      enableNotificationsInBackground: mockEnableNotificationsInBackground,
      requestPushPermission: mockRequestPushPermission,
    });
  });

  it('renders the title, description, and both CTAs', () => {
    const { getByTestId, getByText } = render(<OnboardingPushNotifications />);

    expect(
      getByTestId(OnboardingPushNotificationsSelectorsIDs.TITLE),
    ).toHaveTextContent(strings('onboarding.push_notifications.title'));
    expect(
      getByTestId(OnboardingPushNotificationsSelectorsIDs.DESCRIPTION),
    ).toHaveTextContent(strings('onboarding.push_notifications.description'));
    expect(
      getByText(strings('onboarding.push_notifications.cta_enable')),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('onboarding.push_notifications.cta_skip')),
    ).toBeOnTheScreen();
  });

  it('renders the notification preview illustration', () => {
    const { getByTestId } = render(<OnboardingPushNotifications />);

    expect(
      getByTestId(OnboardingPushNotificationsSelectorsIDs.PREVIEW),
    ).toBeOnTheScreen();
  });

  it('marks the pre-prompt as shown so the post-onboarding sheet stays closed', async () => {
    render(<OnboardingPushNotifications />);

    await waitFor(() => {
      expect(setPushPrePromptShown).toHaveBeenCalled();
    });
  });

  it('renders even when the OS permission is already granted', async () => {
    jest.mocked(resolveNativePushPermissionStatus).mockResolvedValue({
      nativeOsPermissionEnabled: true,
      nativeOsPermissionPromptable: false,
    });

    const { getByTestId } = render(<OnboardingPushNotifications />);

    expect(
      getByTestId(OnboardingPushNotificationsSelectorsIDs.TITLE),
    ).toBeOnTheScreen();
    expect(navigateToNextOnboardingConsentStep).not.toHaveBeenCalled();
  });

  it('skips to the next consent step when basic functionality is off', async () => {
    jest.mocked(selectBasicFunctionalityEnabled).mockReturnValue(false);

    const { queryByTestId } = render(<OnboardingPushNotifications />);

    expect(
      queryByTestId(OnboardingPushNotificationsSelectorsIDs.TITLE),
    ).toBeNull();
    await waitFor(() => {
      expect(navigateToNextOnboardingConsentStep).toHaveBeenCalledWith(
        expect.objectContaining({ navigate: mockNavigate }),
        mockRouteParams,
      );
    });
  });

  it('requests the OS permission and enables notifications without marketing consent on Turn on', async () => {
    mockRequestPushPermission.mockResolvedValue(true);

    const { getByTestId } = render(<OnboardingPushNotifications />);

    fireEvent.press(
      getByTestId(OnboardingPushNotificationsSelectorsIDs.YES_BUTTON),
    );

    await waitFor(() => {
      expect(mockRequestPushPermission).toHaveBeenCalled();
    });
    expect(mockEnableNotificationsInBackground).toHaveBeenCalledWith(true, {
      hasMarketingConsent: false,
    });
    expect(navigateToNextOnboardingConsentStep).toHaveBeenCalledWith(
      expect.objectContaining({ navigate: mockNavigate }),
      mockRouteParams,
    );
  });

  it('advances without enabling notifications when Not now is pressed', () => {
    const { getByTestId } = render(<OnboardingPushNotifications />);

    fireEvent.press(
      getByTestId(OnboardingPushNotificationsSelectorsIDs.NOT_NOW_BUTTON),
    );

    expect(mockEnableNotificationsInBackground).not.toHaveBeenCalled();
    expect(navigateToNextOnboardingConsentStep).toHaveBeenCalledWith(
      expect.objectContaining({ navigate: mockNavigate }),
      mockRouteParams,
    );
  });
});
