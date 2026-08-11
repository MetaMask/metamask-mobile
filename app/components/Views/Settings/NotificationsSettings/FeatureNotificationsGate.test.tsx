import React from 'react';
import { InteractionManager } from 'react-native';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { FeatureNotificationsGate } from './FeatureNotificationsGate';
import {
  FeatureNotificationsGateSheet,
  type FeatureNotificationsGateSheetParams,
} from './FeatureNotificationsGateSheet';
import { NotificationSettingsViewSelectorsIDs } from './NotificationSettingsView.testIds';
import Routes from '../../../../constants/navigation/Routes';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import { createMockUseAnalyticsHook } from '../../../../util/test/analyticsMock';
import NotificationService, {
  isPushPermissionGranted,
  isPushPermissionPromptable,
  requestPushPermissions,
} from '../../../../util/notifications/services/NotificationService';
import { useNotificationStoragePreferences } from './hooks/useNotificationStoragePreferences';
import { useMainNotificationToggle } from './MainNotificationToggle.hooks';
import { useNotificationsToggle } from '../../../../util/notifications/hooks/useSwitchNotifications';

jest.mock('./hooks/useNotificationStoragePreferences');
jest.mock('./MainNotificationToggle.hooks');
jest.mock('../../../hooks/useAnalytics/useAnalytics');
jest.mock('../../../../util/notifications/hooks/useSwitchNotifications');

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
let mockIsFocused = true;
let mockSheetParams: FeatureNotificationsGateSheetParams = {
  feature: 'priceAlerts',
};
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ goBack: mockGoBack, navigate: mockNavigate }),
  useIsFocused: () => mockIsFocused,
  useRoute: () => ({ params: mockSheetParams }),
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

const TURN_ON_BUTTON =
  NotificationSettingsViewSelectorsIDs.FEATURE_GATE_TURN_ON_BUTTON;

const mockSwitchNotifications = jest.fn().mockResolvedValue(undefined);

const SHEET_ROUTE_ARGS = [
  Routes.MODAL.ROOT_MODAL_FLOW,
  {
    screen: Routes.SHEET.FEATURE_NOTIFICATIONS_GATE,
    params: { feature: 'priceAlerts', autoDismiss: undefined },
  },
] as const;

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

const renderSheet = (
  params: Partial<FeatureNotificationsGateSheetParams> = {},
) => {
  mockSheetParams = { feature: 'priceAlerts', ...params };
  return renderWithProvider(<FeatureNotificationsGateSheet />);
};

describe('FeatureNotificationsGate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsMasterEnabled = false;
    mockIsFocused = true;
    mockSheetParams = { feature: 'priceAlerts' };
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

  describe('opening the sheet', () => {
    it('does nothing while stored preferences are loading', () => {
      arrangePreferences({ isLoading: true, hasPreferences: false });

      renderGate();

      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('opens the sheet once preferences load with the feature blocked', () => {
      arrangePreferences({ isLoading: true, hasPreferences: false });
      const { rerender } = renderGate();

      arrangePreferences({ isPushEnabled: false, isInAppEnabled: false });
      rerender(<FeatureNotificationsGate feature="priceAlerts" />);

      expect(mockNavigate).toHaveBeenCalledWith(...SHEET_ROUTE_ARGS);
    });

    it('does not open the sheet when master and a channel are already on', () => {
      mockIsMasterEnabled = true;
      arrangePreferences({ isInAppEnabled: true });

      renderGate();

      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('opens the sheet when only the master toggle is on', () => {
      mockIsMasterEnabled = true;

      renderGate();

      expect(mockNavigate).toHaveBeenCalledWith(...SHEET_ROUTE_ARGS);
    });

    it('opens the sheet only once', () => {
      const { rerender } = renderGate();

      rerender(<FeatureNotificationsGate feature="priceAlerts" />);

      expect(mockNavigate).toHaveBeenCalledTimes(1);
    });

    it('does not open the sheet while the screen is unfocused', () => {
      mockIsFocused = false;

      renderGate();

      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('opens the sheet when an unfocused screen gains focus', () => {
      // e.g. mounted in an inactive tab, or behind some other modal: nothing
      // happens until the screen is actually in front of the user.
      mockIsFocused = false;
      const { rerender } = renderGate();

      mockIsFocused = true;
      rerender(<FeatureNotificationsGate feature="priceAlerts" />);

      expect(mockNavigate).toHaveBeenCalledWith(...SHEET_ROUTE_ARGS);
      expect(mockGoBack).not.toHaveBeenCalled();
    });
  });

  describe('dismiss', () => {
    const openThenRefocus = (
      props: { onDismiss?: () => void } = {},
      refocusPreferences: PreferencesState = {},
    ) => {
      const { rerender } = renderGate(props);

      mockIsFocused = false;
      rerender(<FeatureNotificationsGate feature="priceAlerts" {...props} />);

      mockIsFocused = true;
      arrangePreferences(refocusPreferences);
      rerender(<FeatureNotificationsGate feature="priceAlerts" {...props} />);
    };

    it('navigates back when the screen refocuses with the gate still blocked', () => {
      openThenRefocus();

      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });

    it('calls onDismiss instead of navigating back when provided', () => {
      const mockOnDismiss = jest.fn();

      openThenRefocus({ onDismiss: mockOnDismiss });

      expect(mockOnDismiss).toHaveBeenCalledTimes(1);
      expect(mockGoBack).not.toHaveBeenCalled();
    });

    it('stays on the screen when the gate was satisfied before refocus', () => {
      mockIsMasterEnabled = true;
      openThenRefocus({}, { isPushEnabled: true, isInAppEnabled: true });

      expect(mockGoBack).not.toHaveBeenCalled();
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
        expect(mockNavigate).toHaveBeenCalled();
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

describe('FeatureNotificationsGateSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsMasterEnabled = false;
    mockSheetParams = { feature: 'priceAlerts' };
    arrangePreferences();
    mockSwitchNotifications.mockResolvedValue(undefined);

    jest.mocked(useNotificationsToggle).mockReturnValue({
      switchNotifications: mockSwitchNotifications,
      data: false,
      loading: false,
      error: null,
    });
    jest.mocked(useAnalytics).mockReturnValue(createMockUseAnalyticsHook());
  });

  describe('contents', () => {
    it('renders a single turn-on CTA instead of preference toggles', () => {
      renderSheet();

      expect(screen.getByTestId(TURN_ON_BUTTON)).toBeOnTheScreen();
      expect(
        screen.queryByTestId(
          NotificationSettingsViewSelectorsIDs.NOTIFICATIONS_TOGGLE,
        ),
      ).not.toBeOnTheScreen();
      expect(
        screen.queryByTestId(
          NotificationSettingsViewSelectorsIDs.PUSH_NOTIFICATIONS_TOGGLE,
        ),
      ).not.toBeOnTheScreen();
    });
  });

  describe('turn on CTA', () => {
    it('enables master notifications and both feature channels', async () => {
      const updatePreferencesSection = jest.fn().mockResolvedValue(undefined);
      arrangePreferences();
      jest.mocked(useNotificationStoragePreferences).mockReturnValue({
        ...jest.mocked(useNotificationStoragePreferences)(),
        updatePreferencesSection,
      });

      renderSheet();
      fireEvent.press(screen.getByTestId(TURN_ON_BUTTON));

      await waitFor(() => {
        expect(mockSwitchNotifications).toHaveBeenCalledWith(true);
      });
      expect(updatePreferencesSection).toHaveBeenCalledWith(
        'priceAlerts',
        expect.any(Function),
      );

      const sectionUpdater = updatePreferencesSection.mock.calls[0][1] as (
        section: Record<string, boolean>,
      ) => Record<string, boolean>;
      expect(
        sectionUpdater({
          pushNotificationsEnabled: false,
          inAppNotificationsEnabled: false,
        }),
      ).toEqual({
        pushNotificationsEnabled: true,
        inAppNotificationsEnabled: true,
      });
    });

    it('skips enabling master when it is already on', async () => {
      mockIsMasterEnabled = true;
      const updatePreferencesSection = jest.fn().mockResolvedValue(undefined);
      arrangePreferences();
      jest.mocked(useNotificationStoragePreferences).mockReturnValue({
        ...jest.mocked(useNotificationStoragePreferences)(),
        updatePreferencesSection,
      });

      renderSheet();
      fireEvent.press(screen.getByTestId(TURN_ON_BUTTON));

      await waitFor(() => {
        expect(updatePreferencesSection).toHaveBeenCalled();
      });
      expect(mockSwitchNotifications).not.toHaveBeenCalled();
    });
  });

  describe('auto-close', () => {
    it('closes when the gate becomes satisfied', () => {
      const { rerender } = renderSheet();

      mockIsMasterEnabled = true;
      arrangePreferences({ isPushEnabled: true, isInAppEnabled: true });
      rerender(<FeatureNotificationsGateSheet />);

      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });

    it('closes when master is on and at least one channel is on', () => {
      arrangePreferences({ isPushEnabled: true });
      const { rerender } = renderSheet();

      mockIsMasterEnabled = true;
      arrangePreferences({ isPushEnabled: true });
      rerender(<FeatureNotificationsGateSheet />);

      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });

    it('stays open when autoDismiss is false and the gate is satisfied', () => {
      const { rerender } = renderSheet({ autoDismiss: false });

      mockIsMasterEnabled = true;
      arrangePreferences({ isPushEnabled: true, isInAppEnabled: true });
      rerender(<FeatureNotificationsGateSheet />);

      expect(mockGoBack).not.toHaveBeenCalled();
    });
  });

  describe('close button', () => {
    it('closes the sheet when the header close button is pressed', () => {
      renderSheet();

      fireEvent.press(
        screen.getByTestId(
          NotificationSettingsViewSelectorsIDs.FEATURE_GATE_CLOSE_BUTTON,
        ),
      );

      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });
  });
});
