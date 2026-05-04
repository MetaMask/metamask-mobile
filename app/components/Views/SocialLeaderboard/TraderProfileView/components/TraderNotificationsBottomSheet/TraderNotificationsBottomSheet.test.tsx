import React, { useRef, useEffect } from 'react';
import { Platform } from 'react-native';
import { screen, fireEvent, act } from '@testing-library/react-native';
import {
  ImpactFeedbackStyle,
  ImpactMoment,
  playImpact,
} from '../../../../../../util/haptics';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import TraderNotificationsBottomSheet, {
  type TraderNotificationsBottomSheetRef,
} from './TraderNotificationsBottomSheet';
import { TraderNotificationsBottomSheetSelectorsIDs } from './TraderNotificationsBottomSheet.testIds';
import Routes from '../../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../../locales/i18n';
import type { SocialAIPreference } from '../../../NotificationPreferencesView/hooks';

const mockNavigate = jest.fn();
const mockToggleTraderNotification = jest.fn();
const mockIsTraderNotificationEnabled = jest.fn().mockReturnValue(true);

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({ navigate: mockNavigate }),
  };
});

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy',
  },
}));

jest.mock('../../../../../../util/haptics', () => {
  const actual = jest.requireActual<
    typeof import('../../../../../../util/haptics')
  >('../../../../../../util/haptics');
  return {
    ...actual,
    playImpact: jest.fn(),
  };
});

const { impactAsync: mockImpactAsync } = jest.requireMock('expo-haptics') as {
  impactAsync: jest.Mock;
};
const mockPlayImpact = jest.mocked(playImpact);

jest.mock(
  '../../../../../../component-library/components/BottomSheets/BottomSheet/BottomSheet',
  () => {
    const ReactActual = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');

    return ReactActual.forwardRef(
      (
        props: {
          children?: React.ReactNode;
          onClose?: () => void;
          testID?: string;
        },
        ref: React.Ref<{
          onCloseBottomSheet: (callback?: () => void) => void;
          onOpenBottomSheet: (callback?: () => void) => void;
        }>,
      ) => {
        ReactActual.useImperativeHandle(ref, () => ({
          onCloseBottomSheet: (callback?: () => void) => {
            props.onClose?.();
            callback?.();
          },
          onOpenBottomSheet: (callback?: () => void) => {
            callback?.();
          },
        }));

        return ReactActual.createElement(
          View,
          { testID: props.testID ?? 'bottom-sheet' },
          props.children,
        );
      },
    );
  },
);

const makePreferences = (
  overrides: Partial<SocialAIPreference> = {},
): SocialAIPreference => ({
  enabled: true,
  txAmountLimit: 500,
  mutedTraderProfileIds: [],
  ...overrides,
});

interface OpenedSheetProps {
  traderId?: string;
  traderName?: string;
  preferences?: SocialAIPreference;
  isTraderNotificationEnabled?: (id: string) => boolean;
  onDismiss?: () => void;
}

const OpenedSheet: React.FC<OpenedSheetProps> = ({
  traderId = 'trader-1',
  traderName = 'dutchiono',
  preferences = makePreferences(),
  isTraderNotificationEnabled = mockIsTraderNotificationEnabled,
  onDismiss,
}) => {
  const ref = useRef<TraderNotificationsBottomSheetRef>(null);

  useEffect(() => {
    ref.current?.onOpenBottomSheet();
  }, []);

  return (
    <TraderNotificationsBottomSheet
      ref={ref}
      traderId={traderId}
      traderName={traderName}
      preferences={preferences}
      isTraderNotificationEnabled={isTraderNotificationEnabled}
      toggleTraderNotification={mockToggleTraderNotification}
      onDismiss={onDismiss}
    />
  );
};

describe('TraderNotificationsBottomSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsTraderNotificationEnabled.mockReturnValue(true);
  });

  describe('rendering', () => {
    it('renders nothing when not opened', () => {
      const ref = React.createRef<TraderNotificationsBottomSheetRef>();
      renderWithProvider(
        <TraderNotificationsBottomSheet
          ref={ref}
          traderId="trader-1"
          traderName="dutchiono"
          preferences={makePreferences()}
          isTraderNotificationEnabled={mockIsTraderNotificationEnabled}
          toggleTraderNotification={mockToggleTraderNotification}
        />,
      );

      expect(
        screen.queryByTestId(
          TraderNotificationsBottomSheetSelectorsIDs.CONTAINER,
        ),
      ).not.toBeOnTheScreen();
    });

    it('renders the container when opened', () => {
      renderWithProvider(<OpenedSheet />);

      expect(
        screen.getByTestId(
          TraderNotificationsBottomSheetSelectorsIDs.CONTAINER,
        ),
      ).toBeOnTheScreen();
    });

    it('renders the title interpolated with trader name', () => {
      renderWithProvider(<OpenedSheet traderName="dutchiono" />);

      expect(
        screen.getByText(
          strings('social_leaderboard.trader_notifications.title', {
            traderName: 'dutchiono',
          }),
        ),
      ).toBeOnTheScreen();
    });

    it('renders the notification description with trader name', () => {
      renderWithProvider(<OpenedSheet traderName="dutchiono" />);

      expect(
        screen.getByText(
          strings(
            'social_leaderboard.trader_notifications.allow_push_notifications_desc',
            { traderName: 'dutchiono' },
          ),
        ),
      ).toBeOnTheScreen();
    });

    it('renders the manage traders row', () => {
      renderWithProvider(<OpenedSheet />);

      expect(
        screen.getByTestId(
          TraderNotificationsBottomSheetSelectorsIDs.MANAGE_TRADERS_ROW,
        ),
      ).toBeOnTheScreen();
    });

    it('renders the save button', () => {
      renderWithProvider(<OpenedSheet />);

      expect(
        screen.getByTestId(
          TraderNotificationsBottomSheetSelectorsIDs.SAVE_BUTTON,
        ),
      ).toBeOnTheScreen();
    });
  });

  describe('toggle', () => {
    it('renders the toggle as on when isTraderNotificationEnabled returns true', () => {
      renderWithProvider(
        <OpenedSheet
          traderId="trader-1"
          isTraderNotificationEnabled={() => true}
        />,
      );

      const toggle = screen.getByTestId(
        TraderNotificationsBottomSheetSelectorsIDs.TOGGLE,
      );

      expect(toggle.props.value).toBe(true);
    });

    it('renders the toggle as off when isTraderNotificationEnabled returns false', () => {
      renderWithProvider(
        <OpenedSheet
          traderId="trader-1"
          isTraderNotificationEnabled={() => false}
        />,
      );

      const toggle = screen.getByTestId(
        TraderNotificationsBottomSheetSelectorsIDs.TOGGLE,
      );

      expect(toggle.props.value).toBe(false);
    });

    it('flips the toggle value locally but does NOT call toggleTraderNotification immediately', () => {
      renderWithProvider(
        <OpenedSheet
          traderId="trader-1"
          isTraderNotificationEnabled={() => true}
        />,
      );

      fireEvent(
        screen.getByTestId(TraderNotificationsBottomSheetSelectorsIDs.TOGGLE),
        'valueChange',
        false,
      );

      expect(mockToggleTraderNotification).not.toHaveBeenCalled();
      expect(
        screen.getByTestId(TraderNotificationsBottomSheetSelectorsIDs.TOGGLE)
          .props.value,
      ).toBe(false);
    });

    it('disables the toggle when global notifications are off', () => {
      renderWithProvider(
        <OpenedSheet
          traderId="trader-1"
          preferences={makePreferences({ enabled: false })}
        />,
      );

      const toggle = screen.getByTestId(
        TraderNotificationsBottomSheetSelectorsIDs.TOGGLE,
      );

      expect(toggle.props.disabled).toBe(true);
    });

    it('does not call toggleTraderNotification when global is off and toggle fires a change event', () => {
      renderWithProvider(
        <OpenedSheet
          traderId="trader-1"
          preferences={makePreferences({ enabled: false })}
        />,
      );

      fireEvent(
        screen.getByTestId(TraderNotificationsBottomSheetSelectorsIDs.TOGGLE),
        'valueChange',
        false,
      );

      expect(mockToggleTraderNotification).not.toHaveBeenCalled();
    });
  });

  describe('manage traders row', () => {
    it('navigates to notification preferences when manage traders row is pressed', () => {
      renderWithProvider(<OpenedSheet />);

      fireEvent.press(
        screen.getByTestId(
          TraderNotificationsBottomSheetSelectorsIDs.MANAGE_TRADERS_ROW,
        ),
      );

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.SOCIAL_LEADERBOARD.NOTIFICATION_PREFERENCES,
      );
    });
  });

  describe('save button', () => {
    it('calls toggleTraderNotification when the toggle was changed before saving', () => {
      renderWithProvider(
        <OpenedSheet
          traderId="trader-1"
          isTraderNotificationEnabled={() => true}
        />,
      );

      fireEvent(
        screen.getByTestId(TraderNotificationsBottomSheetSelectorsIDs.TOGGLE),
        'valueChange',
        false,
      );

      act(() => {
        fireEvent.press(
          screen.getByTestId(
            TraderNotificationsBottomSheetSelectorsIDs.SAVE_BUTTON,
          ),
        );
      });

      expect(mockToggleTraderNotification).toHaveBeenCalledWith('trader-1');
    });

    it('does not call toggleTraderNotification when the toggle was not changed before saving', () => {
      renderWithProvider(
        <OpenedSheet
          traderId="trader-1"
          isTraderNotificationEnabled={() => true}
        />,
      );

      act(() => {
        fireEvent.press(
          screen.getByTestId(
            TraderNotificationsBottomSheetSelectorsIDs.SAVE_BUTTON,
          ),
        );
      });

      expect(mockToggleTraderNotification).not.toHaveBeenCalled();
    });

    it('does not call toggleTraderNotification when the toggle was changed and then reverted before saving', () => {
      renderWithProvider(
        <OpenedSheet
          traderId="trader-1"
          isTraderNotificationEnabled={() => true}
        />,
      );

      fireEvent(
        screen.getByTestId(TraderNotificationsBottomSheetSelectorsIDs.TOGGLE),
        'valueChange',
        false,
      );
      fireEvent(
        screen.getByTestId(TraderNotificationsBottomSheetSelectorsIDs.TOGGLE),
        'valueChange',
        true,
      );

      act(() => {
        fireEvent.press(
          screen.getByTestId(
            TraderNotificationsBottomSheetSelectorsIDs.SAVE_BUTTON,
          ),
        );
      });

      expect(mockToggleTraderNotification).not.toHaveBeenCalled();
    });

    it('closes the sheet and calls onDismiss when save is pressed', () => {
      const mockOnDismiss = jest.fn();

      renderWithProvider(<OpenedSheet onDismiss={mockOnDismiss} />);

      act(() => {
        fireEvent.press(
          screen.getByTestId(
            TraderNotificationsBottomSheetSelectorsIDs.SAVE_BUTTON,
          ),
        );
      });

      expect(mockOnDismiss).toHaveBeenCalledTimes(1);
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('haptic feedback', () => {
    const originalPlatform = Platform.OS;

    afterEach(() => {
      Platform.OS = originalPlatform;
    });

    it('fires a medium impact when pressing save', () => {
      Platform.OS = 'ios';
      renderWithProvider(
        <OpenedSheet
          traderId="trader-1"
          isTraderNotificationEnabled={() => true}
        />,
      );

      fireEvent(
        screen.getByTestId(TraderNotificationsBottomSheetSelectorsIDs.TOGGLE),
        'valueChange',
        false,
      );
      mockImpactAsync.mockClear();
      mockPlayImpact.mockClear();

      act(() => {
        fireEvent.press(
          screen.getByTestId(
            TraderNotificationsBottomSheetSelectorsIDs.SAVE_BUTTON,
          ),
        );
      });

      expect(mockPlayImpact).toHaveBeenCalledTimes(1);
      expect(mockPlayImpact).toHaveBeenCalledWith(ImpactMoment.PrimaryCTA);
    });

    it('fires a medium impact when pressing save even if the value did not change', () => {
      Platform.OS = 'ios';
      renderWithProvider(
        <OpenedSheet
          traderId="trader-1"
          isTraderNotificationEnabled={() => true}
        />,
      );

      act(() => {
        fireEvent.press(
          screen.getByTestId(
            TraderNotificationsBottomSheetSelectorsIDs.SAVE_BUTTON,
          ),
        );
      });

      expect(mockPlayImpact).toHaveBeenCalledTimes(1);
      expect(mockPlayImpact).toHaveBeenCalledWith(ImpactMoment.PrimaryCTA);
      expect(mockToggleTraderNotification).not.toHaveBeenCalled();
    });

    it('fires a light impact when toggling the local switch on Android', () => {
      Platform.OS = 'android';
      renderWithProvider(
        <OpenedSheet
          traderId="trader-1"
          isTraderNotificationEnabled={() => true}
        />,
      );

      fireEvent(
        screen.getByTestId(TraderNotificationsBottomSheetSelectorsIDs.TOGGLE),
        'valueChange',
        false,
      );

      expect(mockImpactAsync).toHaveBeenCalledTimes(1);
      expect(mockImpactAsync).toHaveBeenCalledWith(ImpactFeedbackStyle.Light);
    });

    it('does not fire a haptic when toggling the local switch on iOS', () => {
      Platform.OS = 'ios';
      renderWithProvider(
        <OpenedSheet
          traderId="trader-1"
          isTraderNotificationEnabled={() => true}
        />,
      );

      fireEvent(
        screen.getByTestId(TraderNotificationsBottomSheetSelectorsIDs.TOGGLE),
        'valueChange',
        false,
      );

      expect(mockImpactAsync).not.toHaveBeenCalled();
      expect(mockPlayImpact).not.toHaveBeenCalled();
    });

    it('does not fire a haptic when toggling the local switch while the global toggle is off', () => {
      Platform.OS = 'android';
      renderWithProvider(
        <OpenedSheet
          traderId="trader-1"
          preferences={makePreferences({ enabled: false })}
        />,
      );

      fireEvent(
        screen.getByTestId(TraderNotificationsBottomSheetSelectorsIDs.TOGGLE),
        'valueChange',
        false,
      );

      expect(mockImpactAsync).not.toHaveBeenCalled();
      expect(mockPlayImpact).not.toHaveBeenCalled();
    });

    it('does not fire a haptic when pressing the close button', () => {
      renderWithProvider(<OpenedSheet />);

      fireEvent.press(
        screen.getByTestId(
          TraderNotificationsBottomSheetSelectorsIDs.CLOSE_BUTTON,
        ),
      );

      expect(mockImpactAsync).not.toHaveBeenCalled();
      expect(mockPlayImpact).not.toHaveBeenCalled();
    });

    it('does not fire a haptic when pressing the manage traders row', () => {
      renderWithProvider(<OpenedSheet />);

      fireEvent.press(
        screen.getByTestId(
          TraderNotificationsBottomSheetSelectorsIDs.MANAGE_TRADERS_ROW,
        ),
      );

      expect(mockImpactAsync).not.toHaveBeenCalled();
      expect(mockPlayImpact).not.toHaveBeenCalled();
    });
  });
});
