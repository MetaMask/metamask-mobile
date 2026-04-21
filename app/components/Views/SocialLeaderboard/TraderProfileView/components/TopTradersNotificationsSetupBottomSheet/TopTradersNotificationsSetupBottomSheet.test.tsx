import React, { useRef, useEffect } from 'react';
import { screen, fireEvent, act } from '@testing-library/react-native';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import TopTradersNotificationsSetupBottomSheet, {
  type TopTradersNotificationsSetupBottomSheetRef,
} from './TopTradersNotificationsSetupBottomSheet';
import { TopTradersNotificationsSetupBottomSheetSelectorsIDs } from './TopTradersNotificationsSetupBottomSheet.testIds';
import { strings } from '../../../../../../../locales/i18n';
import type {
  NotificationPreferences,
  TxAmountThreshold,
} from '../../../NotificationPreferencesView/hooks';

const mockSetEnabled = jest.fn();
const mockSetTxAmountLimit = jest.fn();

jest.mock('../../../../../../selectors/currencyRateController', () => ({
  selectCurrentCurrency: () => 'USD',
}));

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
  enabled: false,
  txAmountLimit: 500 as TxAmountThreshold,
  traderNotifications: {},
  ...overrides,
});

interface OpenedSheetProps {
  preferences?: NotificationPreferences;
  onDismiss?: () => void;
}

const OpenedSheet: React.FC<OpenedSheetProps> = ({
  preferences = makePreferences(),
  onDismiss,
}) => {
  const ref = useRef<TopTradersNotificationsSetupBottomSheetRef>(null);

  useEffect(() => {
    ref.current?.onOpenBottomSheet();
  }, []);

  return (
    <TopTradersNotificationsSetupBottomSheet
      ref={ref}
      preferences={preferences}
      setEnabled={mockSetEnabled}
      setTxAmountLimit={mockSetTxAmountLimit}
      onDismiss={onDismiss}
    />
  );
};

describe('TopTradersNotificationsSetupBottomSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders nothing when not opened', () => {
      const ref = React.createRef<TopTradersNotificationsSetupBottomSheetRef>();
      renderWithProvider(
        <TopTradersNotificationsSetupBottomSheet
          ref={ref}
          preferences={makePreferences()}
          setEnabled={mockSetEnabled}
          setTxAmountLimit={mockSetTxAmountLimit}
        />,
      );

      expect(
        screen.queryByTestId(
          TopTradersNotificationsSetupBottomSheetSelectorsIDs.CONTAINER,
        ),
      ).not.toBeOnTheScreen();
    });

    it('renders the container when opened', () => {
      renderWithProvider(<OpenedSheet />);

      expect(
        screen.getByTestId(
          TopTradersNotificationsSetupBottomSheetSelectorsIDs.CONTAINER,
        ),
      ).toBeOnTheScreen();
    });

    it('renders the title', () => {
      renderWithProvider(<OpenedSheet />);

      expect(
        screen.getByText(
          strings('social_leaderboard.trader_notifications_setup.title'),
        ),
      ).toBeOnTheScreen();
    });

    it('renders the description', () => {
      renderWithProvider(<OpenedSheet />);

      expect(
        screen.getByText(
          strings('social_leaderboard.trader_notifications_setup.description'),
        ),
      ).toBeOnTheScreen();
    });

    it('renders the allow push notifications toggle', () => {
      renderWithProvider(<OpenedSheet />);

      expect(
        screen.getByTestId(
          TopTradersNotificationsSetupBottomSheetSelectorsIDs.TOGGLE,
        ),
      ).toBeOnTheScreen();
    });

    it('renders the save button', () => {
      renderWithProvider(<OpenedSheet />);

      expect(
        screen.getByTestId(
          TopTradersNotificationsSetupBottomSheetSelectorsIDs.SAVE_BUTTON,
        ),
      ).toBeOnTheScreen();
    });

    it('renders the threshold options', () => {
      renderWithProvider(
        <OpenedSheet preferences={makePreferences({ enabled: true })} />,
      );

      expect(
        screen.getByTestId(
          TopTradersNotificationsSetupBottomSheetSelectorsIDs.THRESHOLD_OPTION(
            500,
          ),
        ),
      ).toBeOnTheScreen();
    });
  });

  describe('toggle', () => {
    it('renders the toggle as off by default when global notifications are disabled', () => {
      renderWithProvider(
        <OpenedSheet preferences={makePreferences({ enabled: false })} />,
      );

      const toggle = screen.getByTestId(
        TopTradersNotificationsSetupBottomSheetSelectorsIDs.TOGGLE,
      );

      expect(toggle.props.value).toBe(false);
    });

    it('renders the toggle as on when global notifications are enabled', () => {
      renderWithProvider(
        <OpenedSheet preferences={makePreferences({ enabled: true })} />,
      );

      const toggle = screen.getByTestId(
        TopTradersNotificationsSetupBottomSheetSelectorsIDs.TOGGLE,
      );

      expect(toggle.props.value).toBe(true);
    });

    it('calls setEnabled with true when the toggle is turned on', () => {
      renderWithProvider(<OpenedSheet />);

      fireEvent(
        screen.getByTestId(
          TopTradersNotificationsSetupBottomSheetSelectorsIDs.TOGGLE,
        ),
        'valueChange',
        true,
      );

      expect(mockSetEnabled).toHaveBeenCalledWith(true);
    });

    it('calls setEnabled with false when the toggle is turned off', () => {
      renderWithProvider(
        <OpenedSheet preferences={makePreferences({ enabled: true })} />,
      );

      fireEvent(
        screen.getByTestId(
          TopTradersNotificationsSetupBottomSheetSelectorsIDs.TOGGLE,
        ),
        'valueChange',
        false,
      );

      expect(mockSetEnabled).toHaveBeenCalledWith(false);
    });
  });

  describe('threshold selection', () => {
    it('calls setTxAmountLimit when a threshold option is pressed', () => {
      renderWithProvider(
        <OpenedSheet preferences={makePreferences({ enabled: true })} />,
      );

      fireEvent.press(
        screen.getByTestId(
          TopTradersNotificationsSetupBottomSheetSelectorsIDs.THRESHOLD_OPTION(
            100,
          ),
        ),
      );

      expect(mockSetTxAmountLimit).toHaveBeenCalledWith(100);
    });

    it('disables threshold options when global notifications are off', () => {
      renderWithProvider(
        <OpenedSheet preferences={makePreferences({ enabled: false })} />,
      );

      const option = screen.getByTestId(
        TopTradersNotificationsSetupBottomSheetSelectorsIDs.THRESHOLD_OPTION(
          500,
        ),
      );

      expect(option.props.accessibilityState?.disabled).toBe(true);
    });
  });

  describe('save button', () => {
    it('closes the sheet and calls onDismiss when save is pressed', () => {
      const mockOnDismiss = jest.fn();

      renderWithProvider(<OpenedSheet onDismiss={mockOnDismiss} />);

      act(() => {
        fireEvent.press(
          screen.getByTestId(
            TopTradersNotificationsSetupBottomSheetSelectorsIDs.SAVE_BUTTON,
          ),
        );
      });

      expect(mockOnDismiss).toHaveBeenCalledTimes(1);
    });

    it('does not call setEnabled when save is pressed', () => {
      renderWithProvider(<OpenedSheet />);

      act(() => {
        fireEvent.press(
          screen.getByTestId(
            TopTradersNotificationsSetupBottomSheetSelectorsIDs.SAVE_BUTTON,
          ),
        );
      });

      expect(mockSetEnabled).not.toHaveBeenCalled();
    });
  });
});
