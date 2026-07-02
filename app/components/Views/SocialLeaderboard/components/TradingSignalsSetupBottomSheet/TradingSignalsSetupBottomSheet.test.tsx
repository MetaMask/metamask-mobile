import { act, fireEvent, render, screen } from '@testing-library/react-native';
import React, { useRef } from 'react';
import { Pressable, Text } from 'react-native';
import TradingSignalsSetupBottomSheet, {
  type TradingSignalsSetupBottomSheetRef,
} from './TradingSignalsSetupBottomSheet';
import { TradingSignalsSetupBottomSheetSelectorsIDs } from './TradingSignalsSetupBottomSheet.testIds';

const mockSetPushNotificationsEnabled = jest.fn();
const mockSetInAppNotificationsEnabled = jest.fn();
const mockSetTxAmountLimit = jest.fn();

jest.mock('../../NotificationPreferences/hooks', () => {
  const { DEFAULT_SOCIAL_AI_PREFERENCES } = jest.requireActual(
    '@metamask/notification-services-controller/notification-services',
  );
  return {
    ...jest.requireActual('../../NotificationPreferences/hooks'),
    useNotificationPreferences: () => ({
      preferences: {
        ...DEFAULT_SOCIAL_AI_PREFERENCES,
        pushNotificationsEnabled: false,
        inAppNotificationsEnabled: true,
        mutedTraderProfileIds: [
          ...DEFAULT_SOCIAL_AI_PREFERENCES.mutedTraderProfileIds,
        ],
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

const Harness = () => {
  const ref = useRef<TradingSignalsSetupBottomSheetRef>(null);

  return (
    <>
      <TradingSignalsSetupBottomSheet ref={ref} />
      <Pressable
        testID="open-trigger"
        onPress={() => ref.current?.onOpenBottomSheet()}
      >
        <Text>Open</Text>
      </Pressable>
    </>
  );
};

describe('TradingSignalsSetupBottomSheet', () => {
  it('renders push and in-app toggles when opened', () => {
    render(<Harness />);

    act(() => {
      fireEvent.press(screen.getByTestId('open-trigger'));
    });

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
});
