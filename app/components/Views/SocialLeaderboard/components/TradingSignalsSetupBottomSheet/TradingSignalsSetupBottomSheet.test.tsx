import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import TradingSignalsSetupBottomSheet from './TradingSignalsSetupBottomSheet';
import { TradingSignalsSetupBottomSheetSelectorsIDs } from './TradingSignalsSetupBottomSheet.testIds';

const mockSetPushNotificationsEnabled = jest.fn();
const mockSetInAppNotificationsEnabled = jest.fn();
const mockSetTxAmountLimit = jest.fn();
const mockGoBack = jest.fn();
let mockRouteParams: { onSetupComplete?: () => void } = {};
let mockPreferences = {
  pushNotificationsEnabled: false,
  inAppNotificationsEnabled: true,
  txAmountLimit: 100,
  mutedTraderProfileIds: [] as string[],
};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack }),
  useRoute: () => ({ params: mockRouteParams }),
}));

// Render children and expose the `onClose` prop through a pressable so the
// close-gating logic can be exercised without the real sheet animation.
jest.mock('@metamask/design-system-react-native', () => {
  const ReactActual = jest.requireActual('react');
  const { Pressable } = jest.requireActual('react-native');
  const actual = jest.requireActual('@metamask/design-system-react-native');
  return {
    ...actual,
    BottomSheet: ReactActual.forwardRef(
      (
        {
          children,
          onClose,
          testID,
        }: {
          children: React.ReactNode;
          onClose?: () => void;
          testID?: string;
        },
        ref: React.Ref<{ onCloseBottomSheet: () => void }>,
      ) => {
        ReactActual.useImperativeHandle(ref, () => ({
          onCloseBottomSheet: () => onClose?.(),
        }));
        return (
          <Pressable testID={testID} onPress={() => onClose?.()}>
            {children}
          </Pressable>
        );
      },
    ),
  };
});

jest.mock('../../NotificationPreferences/hooks', () => {
  const { DEFAULT_SOCIAL_AI_PREFERENCES } = jest.requireActual(
    '@metamask/notification-services-controller/notification-services',
  );
  return {
    ...jest.requireActual('../../NotificationPreferences/hooks'),
    useNotificationPreferences: () => ({
      preferences: {
        ...DEFAULT_SOCIAL_AI_PREFERENCES,
        ...mockPreferences,
      },
      hasNotificationPreferences: true,
      isLoading: false,
      error: null,
      setPushNotificationsEnabled: mockSetPushNotificationsEnabled,
      setInAppNotificationsEnabled: mockSetInAppNotificationsEnabled,
      setTxAmountLimit: mockSetTxAmountLimit,
      toggleTraderNotification: jest.fn(),
      isTraderNotificationEnabled: jest.fn(() => true),
    }),
  };
});

jest.mock('../../../../../selectors/currencyRateController', () => ({
  selectCurrentCurrency: () => 'USD',
}));

jest.mock('react-redux', () => ({
  useSelector: (selector: () => unknown) => selector(),
}));

describe('TradingSignalsSetupBottomSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRouteParams = {};
    mockPreferences = {
      pushNotificationsEnabled: false,
      inAppNotificationsEnabled: true,
      txAmountLimit: 100,
      mutedTraderProfileIds: [],
    };
  });

  it('renders push and in-app toggles', () => {
    render(<TradingSignalsSetupBottomSheet />);

    expect(
      screen.getByTestId(TradingSignalsSetupBottomSheetSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(
        TradingSignalsSetupBottomSheetSelectorsIDs.PUSH_TOGGLE,
      ),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(
        TradingSignalsSetupBottomSheetSelectorsIDs.IN_APP_TOGGLE,
      ),
    ).toBeOnTheScreen();
  });

  it('invokes onSetupComplete on close when a channel is enabled', () => {
    const onSetupComplete = jest.fn();
    mockRouteParams = { onSetupComplete };

    render(<TradingSignalsSetupBottomSheet />);
    fireEvent.press(
      screen.getByTestId(TradingSignalsSetupBottomSheetSelectorsIDs.CONTAINER),
    );

    expect(onSetupComplete).toHaveBeenCalledTimes(1);
  });

  it('drops onSetupComplete on close when both channels are disabled', () => {
    const onSetupComplete = jest.fn();
    mockRouteParams = { onSetupComplete };
    mockPreferences = {
      pushNotificationsEnabled: false,
      inAppNotificationsEnabled: false,
      txAmountLimit: 100,
      mutedTraderProfileIds: [],
    };

    render(<TradingSignalsSetupBottomSheet />);
    fireEvent.press(
      screen.getByTestId(TradingSignalsSetupBottomSheetSelectorsIDs.CONTAINER),
    );

    expect(onSetupComplete).not.toHaveBeenCalled();
  });
});
