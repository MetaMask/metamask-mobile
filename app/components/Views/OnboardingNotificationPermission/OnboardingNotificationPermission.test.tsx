import React from 'react';
import { BackHandler } from 'react-native';
import HeaderStandardGlass from '../../../component-library/components-temp/HeaderStandardGlass';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import OnboardingNotificationPermission from './OnboardingNotificationPermission';
import { OnboardingNotificationPermissionTestIds } from './OnboardingNotificationPermission.testIds';

import DarkBackground from '../../../images/notification-onboarding-background.png';
import LightBackground from '../../../images/notification-onboarding-background-light.png';

import { resolveNativePushPermissionStatus } from '../../../util/notifications/utils/push-notification-status';
import Logger from '../../../util/Logger';
import { selectIsUpdatingMetamaskNotifications as mockSelectIsUpdatingMetamaskNotifications } from '../../../selectors/notifications';

jest.mock('../../../util/Logger', () => ({ error: jest.fn() }));
let mockFeatureEnabled = true;
let mockShowQuestionnaire = true;

let mockThemeAppearance = 'light';
jest.mock('../../../util/theme', () => ({
  ...jest.requireActual('../../../util/theme'),
  useTheme: () => ({
    ...jest.requireActual('../../../util/theme').useTheme(),
    themeAppearance: mockThemeAppearance,
  }),
}));

const mockEnableMarketingConsent = jest.fn().mockResolvedValue(undefined);
const mockTrackDismissed = jest.fn();
const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockOnComplete = jest.fn();
const mockMarkAnswered = jest.fn().mockResolvedValue(undefined);
const mockRequestPushPermission = jest.fn().mockResolvedValue(true);
const mockEnableNotificationsInBackground = jest.fn().mockResolvedValue(true);

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (effect: () => (() => void) | undefined) => {
    jest.requireActual('react').useEffect(effect, [effect]);
  },
  useNavigation: () => ({
    goBack: mockGoBack,
    navigate: mockNavigate,
  }),
  useRoute: () => ({
    params: {
      accountType: 'metamask',
      onComplete: mockOnComplete,
      shouldShowQuestionnaire: mockShowQuestionnaire,
    },
  }),
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(
    (selector) => selector !== mockSelectIsUpdatingMetamaskNotifications,
  ),
  useDispatch: () => jest.fn(),
}));

jest.mock('../../../hooks/useNetworkTier', () => ({
  useNetworkTier: () => 'WIFI',
}));

jest.mock('../../../util/deviceCapability', () => ({
  getHardwareTier: () => 'HIGH',
}));

jest.mock('../../../util/notifications/constants', () => ({
  isNotificationsFeatureEnabled: () => mockFeatureEnabled,
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
    setPushPrePromptAnswered: () => mockMarkAnswered(),
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
      enableMarketingConsent: mockEnableMarketingConsent,
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
      trackPrePromptDismissed: mockTrackDismissed,
    }),
  }),
);

describe('OnboardingNotificationPermission', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEnableNotificationsInBackground.mockResolvedValue(true);
    mockThemeAppearance = 'light';
    mockFeatureEnabled = true;
    mockShowQuestionnaire = true;
    jest.mocked(resolveNativePushPermissionStatus).mockResolvedValue({
      nativeOsPermissionEnabled: false,
      nativeOsPermissionPromptable: true,
    });
  });

  it('does not offer navigation back to completed onboarding steps', async () => {
    const { findByTestId, UNSAFE_getByType } = render(
      <OnboardingNotificationPermission />,
    );

    await findByTestId(OnboardingNotificationPermissionTestIds.SCREEN);

    expect(UNSAFE_getByType(HeaderStandardGlass).props.onBack).toBeUndefined();
    expect(mockGoBack).not.toHaveBeenCalled();
  });

  it('consumes hardware Back and removes the listener on cleanup', () => {
    const remove = jest.fn();
    const addListener = jest
      .spyOn(BackHandler, 'addEventListener')
      .mockReturnValue({ remove });
    const { unmount } = render(<OnboardingNotificationPermission />);
    const handler = addListener.mock.calls.find(
      ([event]) => event === 'hardwareBackPress',
    )?.[1];

    const handled = handler?.({ type: 'hardwareBackPress', timeStamp: 0 });
    unmount();

    expect(handled).toBe(true);
    expect(mockGoBack).not.toHaveBeenCalled();
    expect(remove).toHaveBeenCalledTimes(1);
    addListener.mockRestore();
  });

  it('bypasses the prompt when notifications are disabled', async () => {
    mockFeatureEnabled = false;

    render(<OnboardingNotificationPermission />);

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledTimes(1));
    expect(resolveNativePushPermissionStatus).not.toHaveBeenCalled();
    expect(mockMarkAnswered).not.toHaveBeenCalled();
  });

  it.each([
    { nativeOsPermissionEnabled: false, nativeOsPermissionPromptable: false },
  ])('bypasses already-decided permission: %j', async (status) => {
    jest.mocked(resolveNativePushPermissionStatus).mockResolvedValue(status);

    render(<OnboardingNotificationPermission />);

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledTimes(1));
    expect(mockMarkAnswered).not.toHaveBeenCalled();
    expect(mockRequestPushPermission).not.toHaveBeenCalled();
  });

  it.each([new Error('permission check failed'), 'permission check failed'])(
    'logs a permission lookup failure and continues: %s',
    async (error) => {
      jest
        .mocked(resolveNativePushPermissionStatus)
        .mockRejectedValueOnce(error);

      render(<OnboardingNotificationPermission />);

      await waitFor(() => expect(mockNavigate).toHaveBeenCalledTimes(1));
      expect(Logger.error).toHaveBeenCalledWith(
        expect.any(Error),
        'Failed to resolve onboarding notification permission',
      );
    },
  );

  it('completes onboarding when no questionnaire is required', async () => {
    mockShowQuestionnaire = false;
    const { findByTestId } = render(<OnboardingNotificationPermission />);
    const skip = await findByTestId(
      OnboardingNotificationPermissionTestIds.SKIP_BUTTON,
    );

    await act(async () => {
      fireEvent.press(skip);
    });

    expect(mockOnComplete).toHaveBeenCalledTimes(1);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('continues when native permission is declined', async () => {
    mockRequestPushPermission.mockResolvedValueOnce(false);
    const { findByTestId } = render(<OnboardingNotificationPermission />);
    const enable = await findByTestId(
      OnboardingNotificationPermissionTestIds.ENABLE_BUTTON,
    );

    fireEvent.press(enable);

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledTimes(1));
    expect(mockEnableNotificationsInBackground).not.toHaveBeenCalled();
    expect(mockEnableMarketingConsent).not.toHaveBeenCalled();
    expect(mockMarkAnswered).toHaveBeenCalledTimes(1);
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
      expect(mockMarkAnswered).toHaveBeenCalledTimes(1);
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
      expect(mockMarkAnswered).toHaveBeenCalledTimes(1);
    });
  });
  it('records no answer merely from displaying the screen', async () => {
    const { findByTestId } = render(<OnboardingNotificationPermission />);

    await findByTestId(OnboardingNotificationPermissionTestIds.SCREEN);

    expect(mockMarkAnswered).not.toHaveBeenCalled();
  });

  it('ignores a duplicate Enable tap while permission resolves', async () => {
    const { findByTestId } = render(<OnboardingNotificationPermission />);
    const enable = await findByTestId(
      OnboardingNotificationPermissionTestIds.ENABLE_BUTTON,
    );

    await act(async () => {
      fireEvent.press(enable);
      fireEvent.press(enable);
    });

    expect(mockRequestPushPermission).toHaveBeenCalledTimes(1);
    expect(mockEnableMarketingConsent).toHaveBeenCalledTimes(1);
  });
});
