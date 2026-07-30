import React from 'react';
import { InteractionManager } from 'react-native';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { FeatureNotificationsGate } from './FeatureNotificationsGate';
import { NotificationSettingsViewSelectorsIDs } from './NotificationSettingsView.testIds';
import { MAIN_NOTIFICATION_TOGGLE_TEST_ID } from './MainNotificationToggle';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import { createMockUseAnalyticsHook } from '../../../../util/test/analyticsMock';
import NotificationService, {
  isPushPermissionGranted,
  isPushPermissionPromptable,
  requestPushPermissions,
} from '../../../../util/notifications/services/NotificationService';
import { useNotificationStoragePreferences } from './hooks/useNotificationStoragePreferences';
import { useMainNotificationToggle } from './MainNotificationToggle.hooks';

jest.mock('./hooks/useNotificationStoragePreferences');
jest.mock('./MainNotificationToggle.hooks');
jest.mock('../../../hooks/useAnalytics/useAnalytics');

const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ goBack: mockGoBack }),
}));

let mockIsMasterEnabled = false;
jest.mock('../../../../selectors/notifications', () => ({
  selectIsMetamaskNotificationsEnabled: () => mockIsMasterEnabled,
}));

// `useSelector` memoizes against store state, which never changes here — re-read
// the (mocked) selector on every render so master can flip between re-renders.
jest.mock('react-redux', () => {
  const actual = jest.requireActual('react-redux');
  return {
    ...actual,
    useSelector: (selector: (state: unknown) => unknown) =>
      selector(actual.useStore().getState()),
  };
});

jest.mock(
  '../../../../util/notifications/services/NotificationService',
  () => ({
    __esModule: true,
    default: { requestPushNotificationsPermission: jest.fn() },
    isPushPermissionGranted: jest.fn(),
    isPushPermissionPromptable: jest.fn(),
    requestPushPermissions: jest.fn(),
  }),
);

// The real BottomSheet drives open/close through animations. This double keeps
// the imperative ref contract: closing invokes `onClose` and then the callback.
jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  const { forwardRef, useImperativeHandle } = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');

  const MockBottomSheet = forwardRef(
    (
      {
        children,
        onClose,
        testID,
      }: {
        children: React.ReactNode;
        onClose?: (hasCallback: boolean) => void;
        testID?: string;
      },
      ref: React.Ref<unknown>,
    ) => {
      useImperativeHandle(ref, () => ({
        onOpenBottomSheet: (callback?: () => void) => callback?.(),
        onCloseBottomSheet: (callback?: () => void) => {
          onClose?.(Boolean(callback));
          callback?.();
        },
      }));

      return <View testID={testID}>{children}</View>;
    },
  );

  return { ...actual, BottomSheet: MockBottomSheet };
});

const PUSH_TOGGLE =
  NotificationSettingsViewSelectorsIDs.PUSH_NOTIFICATIONS_TOGGLE;
const IN_APP_TOGGLE =
  NotificationSettingsViewSelectorsIDs.FEATURE_ANNOUNCEMENTS_TOGGLE;
const MASTER_TOGGLE = NotificationSettingsViewSelectorsIDs.NOTIFICATIONS_TOGGLE;

interface PreferencesState {
  isPushEnabled?: boolean;
  isInAppEnabled?: boolean;
  isLoading?: boolean;
  hasPreferences?: boolean;
}

const arrangePreferences = ({
  isPushEnabled = false,
  isInAppEnabled = false,
  isLoading = false,
  hasPreferences = true,
}: PreferencesState = {}) => {
  jest.mocked(useNotificationStoragePreferences).mockReturnValue({
    preferences: hasPreferences
      ? {
          walletActivity: {
            pushNotificationsEnabled: true,
            inAppNotificationsEnabled: true,
            accounts: [],
          },
          marketing: {
            pushNotificationsEnabled: false,
            inAppNotificationsEnabled: false,
          },
          perps: {
            pushNotificationsEnabled: true,
            inAppNotificationsEnabled: true,
          },
          socialAI: {
            pushNotificationsEnabled: true,
            inAppNotificationsEnabled: true,
            txAmountLimit: 500,
            mutedTraderProfileIds: [],
          },
          agenticCli: {
            pushNotificationsEnabled: true,
            inAppNotificationsEnabled: true,
          },
          priceAlerts: {
            pushNotificationsEnabled: isPushEnabled,
            inAppNotificationsEnabled: isInAppEnabled,
          },
        }
      : undefined,
    hasNotificationPreferences: hasPreferences,
    isLoading,
    isUpdatingPreferences: false,
    error: null,
    updatePreference: jest.fn(),
    updateSectionChannel: jest.fn().mockResolvedValue(undefined),
    updatePreferencesSection: jest.fn().mockResolvedValue(undefined),
    refetch: jest.fn(),
  });
};

const renderGate = (
  props: { onDismiss?: () => void; autoDismiss?: boolean } = {},
) =>
  renderWithProvider(
    <FeatureNotificationsGate feature="priceAlerts" {...props} />,
  );

describe('FeatureNotificationsGate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsMasterEnabled = false;
    arrangePreferences();

    jest
      .spyOn(InteractionManager, 'runAfterInteractions')
      .mockImplementation((task) => {
        if (typeof task === 'function') {
          task();
        }
        return {
          then: jest.fn(),
          done: jest.fn(),
          cancel: jest.fn(),
        } as ReturnType<typeof InteractionManager.runAfterInteractions>;
      });

    jest.mocked(useMainNotificationToggle).mockReturnValue({
      onToggle: jest.fn(),
      value: mockIsMasterEnabled,
      isUpdating: false,
    });
    jest.mocked(useAnalytics).mockReturnValue(createMockUseAnalyticsHook());
    jest.mocked(isPushPermissionGranted).mockResolvedValue(true);
    jest.mocked(isPushPermissionPromptable).mockResolvedValue(false);
    jest.mocked(requestPushPermissions).mockResolvedValue(true);
  });

  describe('preferences loading', () => {
    it('renders nothing while stored preferences are loading', () => {
      arrangePreferences({ isLoading: true, hasPreferences: false });

      renderGate();

      expect(
        screen.queryByTestId(
          NotificationSettingsViewSelectorsIDs.FEATURE_GATE_SHEET,
        ),
      ).not.toBeOnTheScreen();
    });

    it('opens the panel once preferences load with the feature blocked', () => {
      arrangePreferences({ isLoading: true, hasPreferences: false });
      const { rerender } = renderGate();

      arrangePreferences({ isPushEnabled: false, isInAppEnabled: false });
      rerender(<FeatureNotificationsGate feature="priceAlerts" />);

      expect(
        screen.getByTestId(
          NotificationSettingsViewSelectorsIDs.FEATURE_GATE_SHEET,
        ),
      ).toBeOnTheScreen();
    });

    it('renders nothing while preferences load for an already-enabled feature', () => {
      mockIsMasterEnabled = true;
      arrangePreferences({ isLoading: true, hasPreferences: false });

      renderGate();

      expect(
        screen.queryByTestId(
          NotificationSettingsViewSelectorsIDs.FEATURE_GATE_SHEET,
        ),
      ).not.toBeOnTheScreen();
    });

    it('keeps the panel closed when a partly enabled feature finishes loading', () => {
      mockIsMasterEnabled = true;
      arrangePreferences({ isLoading: true, hasPreferences: false });
      const { rerender } = renderGate();

      arrangePreferences({ isPushEnabled: true, isInAppEnabled: false });
      rerender(<FeatureNotificationsGate feature="priceAlerts" />);

      expect(
        screen.queryByTestId(
          NotificationSettingsViewSelectorsIDs.FEATURE_GATE_SHEET,
        ),
      ).not.toBeOnTheScreen();
    });
  });

  describe('panel contents', () => {
    it('renders master and channel toggles when master and both channels are off', () => {
      renderGate();

      expect(
        screen.getByTestId(MAIN_NOTIFICATION_TOGGLE_TEST_ID),
      ).toBeOnTheScreen();
      expect(screen.getByTestId(PUSH_TOGGLE)).toBeOnTheScreen();
      expect(screen.getByTestId(IN_APP_TOGGLE)).toBeOnTheScreen();
    });

    it('renders only the master toggle when a channel is already on', () => {
      arrangePreferences({ isPushEnabled: true });

      renderGate();

      expect(
        screen.getByTestId(MAIN_NOTIFICATION_TOGGLE_TEST_ID),
      ).toBeOnTheScreen();
      expect(screen.queryByTestId(PUSH_TOGGLE)).not.toBeOnTheScreen();
    });

    it('renders only the channel toggles when master is already on', () => {
      mockIsMasterEnabled = true;

      renderGate();

      expect(
        screen.queryByTestId(MAIN_NOTIFICATION_TOGGLE_TEST_ID),
      ).not.toBeOnTheScreen();
      expect(screen.getByTestId(PUSH_TOGGLE)).toBeOnTheScreen();
    });

    it('renders nothing when master is on and a channel is already on', () => {
      mockIsMasterEnabled = true;
      arrangePreferences({ isInAppEnabled: true });

      renderGate();

      expect(
        screen.queryByTestId(
          NotificationSettingsViewSelectorsIDs.FEATURE_GATE_SHEET,
        ),
      ).not.toBeOnTheScreen();
    });

    it('disables the channel toggles while master is off', () => {
      renderGate();

      expect(screen.getByTestId(PUSH_TOGGLE)).toHaveProp('disabled', true);
      expect(screen.getByTestId(IN_APP_TOGGLE)).toHaveProp('disabled', true);
    });

    it('disables the master toggle once master is turned on', () => {
      const { rerender } = renderGate();

      mockIsMasterEnabled = true;
      rerender(<FeatureNotificationsGate feature="priceAlerts" />);

      expect(screen.getByTestId(MASTER_TOGGLE)).toHaveProp('disabled', true);
    });
  });

  describe('auto-close', () => {
    it('closes the panel when master and both channels become enabled', () => {
      const { rerender } = renderGate();

      mockIsMasterEnabled = true;
      arrangePreferences({ isPushEnabled: true, isInAppEnabled: true });
      rerender(<FeatureNotificationsGate feature="priceAlerts" />);

      expect(
        screen.queryByTestId(
          NotificationSettingsViewSelectorsIDs.FEATURE_GATE_SHEET,
        ),
      ).not.toBeOnTheScreen();
    });

    it('closes the master-only panel when master is turned on', () => {
      arrangePreferences({ isPushEnabled: true });
      const { rerender } = renderGate();

      mockIsMasterEnabled = true;
      arrangePreferences({ isPushEnabled: true });
      rerender(<FeatureNotificationsGate feature="priceAlerts" />);

      expect(
        screen.queryByTestId(
          NotificationSettingsViewSelectorsIDs.FEATURE_GATE_SHEET,
        ),
      ).not.toBeOnTheScreen();
    });

    it('stays on the screen after auto-closing', () => {
      const { rerender } = renderGate();

      mockIsMasterEnabled = true;
      arrangePreferences({ isPushEnabled: true, isInAppEnabled: true });
      rerender(<FeatureNotificationsGate feature="priceAlerts" />);

      expect(mockGoBack).not.toHaveBeenCalled();
    });

    it('keeps the panel open when autoDismiss is false and the gate is satisfied', () => {
      const { rerender } = renderGate({ autoDismiss: false });

      mockIsMasterEnabled = true;
      arrangePreferences({ isPushEnabled: true, isInAppEnabled: true });
      rerender(
        <FeatureNotificationsGate feature="priceAlerts" autoDismiss={false} />,
      );

      expect(
        screen.getByTestId(
          NotificationSettingsViewSelectorsIDs.FEATURE_GATE_SHEET,
        ),
      ).toBeOnTheScreen();
      expect(mockGoBack).not.toHaveBeenCalled();
    });
  });

  describe('dismiss', () => {
    it('navigates back when the panel is closed while the feature is blocked', () => {
      renderGate();

      fireEvent.press(
        screen.getByTestId(
          NotificationSettingsViewSelectorsIDs.FEATURE_GATE_CLOSE_BUTTON,
        ),
      );

      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });

    it('calls onDismiss instead of navigating back when provided', () => {
      const mockOnDismiss = jest.fn();
      renderGate({ onDismiss: mockOnDismiss });

      fireEvent.press(
        screen.getByTestId(
          NotificationSettingsViewSelectorsIDs.FEATURE_GATE_CLOSE_BUTTON,
        ),
      );

      expect(mockOnDismiss).toHaveBeenCalledTimes(1);
      expect(mockGoBack).not.toHaveBeenCalled();
    });

    it('closes the panel when dismissed', () => {
      renderGate();

      fireEvent.press(
        screen.getByTestId(
          NotificationSettingsViewSelectorsIDs.FEATURE_GATE_CLOSE_BUTTON,
        ),
      );

      expect(
        screen.queryByTestId(
          NotificationSettingsViewSelectorsIDs.FEATURE_GATE_SHEET,
        ),
      ).not.toBeOnTheScreen();
    });
  });

  describe('OS push permission', () => {
    it('shows the OS prompt when push is on and the OS can still ask', async () => {
      mockIsMasterEnabled = true;
      jest.mocked(isPushPermissionGranted).mockResolvedValue(false);
      jest.mocked(isPushPermissionPromptable).mockResolvedValue(true);
      arrangePreferences({ isPushEnabled: true, isInAppEnabled: true });

      renderGate();

      await waitFor(() => {
        expect(requestPushPermissions).toHaveBeenCalledTimes(1);
      });
    });

    it('deep-links to settings when the OS can no longer prompt', async () => {
      mockIsMasterEnabled = true;
      jest.mocked(isPushPermissionGranted).mockResolvedValue(false);
      jest.mocked(isPushPermissionPromptable).mockResolvedValue(false);
      arrangePreferences({ isPushEnabled: true, isInAppEnabled: true });

      renderGate();

      await waitFor(() => {
        expect(
          NotificationService.requestPushNotificationsPermission,
        ).toHaveBeenCalledTimes(1);
      });
    });

    it('skips the OS prompt when permission is already granted', async () => {
      mockIsMasterEnabled = true;
      arrangePreferences({ isPushEnabled: true, isInAppEnabled: true });

      renderGate();

      await waitFor(() => {
        expect(isPushPermissionGranted).toHaveBeenCalled();
      });
      expect(requestPushPermissions).not.toHaveBeenCalled();
      expect(
        NotificationService.requestPushNotificationsPermission,
      ).not.toHaveBeenCalled();
    });

    it('skips the OS prompt when push is off for the feature', async () => {
      renderGate();

      await waitFor(() => {
        expect(screen.getByTestId(PUSH_TOGGLE)).toBeOnTheScreen();
      });
      expect(isPushPermissionGranted).not.toHaveBeenCalled();
    });

    it('prompts again after push is turned off and back on', async () => {
      mockIsMasterEnabled = true;
      jest.mocked(isPushPermissionGranted).mockResolvedValue(false);
      jest.mocked(isPushPermissionPromptable).mockResolvedValue(true);
      arrangePreferences({ isPushEnabled: true, isInAppEnabled: true });
      const { rerender } = renderGate();
      await waitFor(() => {
        expect(requestPushPermissions).toHaveBeenCalledTimes(1);
      });

      arrangePreferences({ isPushEnabled: false, isInAppEnabled: true });
      rerender(<FeatureNotificationsGate feature="priceAlerts" />);
      arrangePreferences({ isPushEnabled: true, isInAppEnabled: true });
      rerender(<FeatureNotificationsGate feature="priceAlerts" />);

      await waitFor(() => {
        expect(requestPushPermissions).toHaveBeenCalledTimes(2);
      });
    });
  });
});
