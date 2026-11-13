import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import OnboardingNotificationPermission from './OnboardingNotificationPermission';
import { OnboardingNotificationPermissionTestIds } from './OnboardingNotificationPermission.testIds';

import DarkBackground from '../../../images/notification-onboarding-background.png';
import LightBackground from '../../../images/notification-onboarding-background-light.png';

let mockThemeAppearance = 'light';
jest.mock('../../../util/theme', () => ({
  ...jest.requireActual('../../../util/theme'),
  useTheme: () => ({
    ...jest.requireActual('../../../util/theme').useTheme(),
    themeAppearance: mockThemeAppearance,
  }),
}));

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockOnComplete = jest.fn();
const mockMarkShown = jest.fn().mockResolvedValue(undefined);
const mockRequestPushPermission = jest.fn().mockResolvedValue(true);
const mockEnableNotificationsInBackground = jest
  .fn()
  .mockResolvedValue(undefined);

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: mockGoBack,
    navigate: mockNavigate,
  }),
  useRoute: () => ({
    params: {
      accountType: 'metamask',
      onComplete: mockOnComplete,
      shouldShowQuestionnaire: true,
    },
  }),
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(() => true),
  useDispatch: () => jest.fn(),
}));

jest.mock('../../../hooks/useNetworkTier', () => ({
  useNetworkTier: () => 'WIFI',
}));

jest.mock('../../../util/deviceCapability', () => ({
  getHardwareTier: () => 'HIGH',
}));

jest.mock('../../../util/notifications/constants', () => ({
  isNotificationsFeatureEnabled: () => true,
}));

jest.mock('../../../util/notifications/utils/push-notification-status', () => ({
  resolveNativePushPermissionStatus: jest.fn().mockResolvedValue({
    nativeOsPermissionEnabled: false,
    nativeOsPermissionPromptable: true,
  }),
}));

jest.mock(
  '../../../util/notifications/constants/notification-storage-keys',
  () => ({
    setPushPrePromptShown: () => mockMarkShown(),
  }),
);

jest.mock(
  '../../../util/notifications/hooks/usePushPermissionNotificationSetup',
  () => ({
    usePushPermissionNotificationSetup: () => ({
      enableNotificationsInBackground: mockEnableNotificationsInBackground,
      requestPushPermission: mockRequestPushPermission,
    }),
  }),
);

jest.mock(
  '../../../util/notifications/hooks/useEnableMarketingConsent',
  () => ({
    useEnableMarketingConsent: () => ({
      enableMarketingConsent: jest.fn().mockResolvedValue(undefined),
    }),
  }),
);

jest.mock(
  '../../../util/notifications/hooks/usePushPrePromptAnalytics',
  () => ({
    usePushPrePromptAnalytics: () => ({
      identifyPushNotificationsEnabled: jest.fn().mockResolvedValue(undefined),
      trackOsPromptResponse: jest.fn(),
      trackOsPromptShown: jest.fn(),
      trackPrePromptButtonClicked: jest.fn(),
      trackPrePromptViewed: jest.fn(),
    }),
  }),
);

describe('OnboardingNotificationPermission', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockThemeAppearance = 'light';
  });

  it.each(['light', 'dark'])(
    'uses the %s wallet illustration',
    async (theme) => {
      mockThemeAppearance = theme;

      const { findByTestId } = render(<OnboardingNotificationPermission />);
      const background = await findByTestId(
        OnboardingNotificationPermissionTestIds.BACKGROUND,
      );

      expect(background.props.source).toBe(
        theme === 'dark' ? DarkBackground : LightBackground,
      );
    },
  );

  it('requests notification permission and continues to the questionnaire', async () => {
    const { findByTestId, getByTestId } = render(
      <OnboardingNotificationPermission />,
    );
    await findByTestId(OnboardingNotificationPermissionTestIds.ENABLE_BUTTON);

    fireEvent.press(
      getByTestId(OnboardingNotificationPermissionTestIds.ENABLE_BUTTON),
    );

    await waitFor(() => {
      expect(mockRequestPushPermission).toHaveBeenCalledTimes(1);
      expect(mockEnableNotificationsInBackground).toHaveBeenCalledWith(true);
      expect(mockNavigate).toHaveBeenCalled();
    });
  });

  it('continues without requesting permission when the user skips', async () => {
    const { findByTestId, getByTestId } = render(
      <OnboardingNotificationPermission />,
    );
    await findByTestId(OnboardingNotificationPermissionTestIds.SKIP_BUTTON);

    fireEvent.press(
      getByTestId(OnboardingNotificationPermissionTestIds.SKIP_BUTTON),
    );

    await waitFor(() => {
      expect(mockRequestPushPermission).not.toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalled();
    });
  });
});
