import React, { useRef, useEffect } from 'react';
import { screen, fireEvent, act } from '@testing-library/react-native';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import TraderNotificationsBottomSheet, {
  type TraderNotificationsBottomSheetRef,
} from './TraderNotificationsBottomSheet';
import { TraderNotificationsBottomSheetSelectorsIDs } from './TraderNotificationsBottomSheet.testIds';
import Routes from '../../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../../locales/i18n';
import type { NotificationPreferences } from '../../../NotificationPreferencesView/hooks';

const mockNavigate = jest.fn();
const mockToggleTraderNotification = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({ navigate: mockNavigate }),
  };
});

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
  overrides: Partial<NotificationPreferences> = {},
): NotificationPreferences => ({
  enabled: true,
  txAmountLimit: 500,
  traderNotifications: { 'trader-1': false },
  ...overrides,
});

interface OpenedSheetProps {
  traderId?: string;
  traderName?: string;
  preferences?: NotificationPreferences;
  onDismiss?: () => void;
}

const OpenedSheet: React.FC<OpenedSheetProps> = ({
  traderId = 'trader-1',
  traderName = 'dutchiono',
  preferences = makePreferences(),
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
      toggleTraderNotification={mockToggleTraderNotification}
      onDismiss={onDismiss}
    />
  );
};

describe('TraderNotificationsBottomSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
    it('renders the toggle reflecting per-trader notification enabled state', () => {
      renderWithProvider(
        <OpenedSheet
          traderId="trader-1"
          preferences={makePreferences({
            traderNotifications: { 'trader-1': true },
          })}
        />,
      );

      const toggle = screen.getByTestId(
        TraderNotificationsBottomSheetSelectorsIDs.TOGGLE,
      );

      expect(toggle.props.value).toBe(true);
    });

    it('renders the toggle as off when no explicit preference has been set for the trader', () => {
      renderWithProvider(
        <OpenedSheet
          traderId="trader-1"
          preferences={makePreferences({ traderNotifications: {} })}
        />,
      );

      const toggle = screen.getByTestId(
        TraderNotificationsBottomSheetSelectorsIDs.TOGGLE,
      );

      expect(toggle.props.value).toBe(false);
    });

    it('calls toggleTraderNotification with the trader id when toggled', () => {
      renderWithProvider(<OpenedSheet traderId="trader-1" />);

      fireEvent(
        screen.getByTestId(TraderNotificationsBottomSheetSelectorsIDs.TOGGLE),
        'valueChange',
        false,
      );

      expect(mockToggleTraderNotification).toHaveBeenCalledWith('trader-1');
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
    it('closes the sheet and calls onDismiss without other side effects when save is pressed', () => {
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
      expect(mockToggleTraderNotification).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });
});
