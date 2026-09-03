import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import type { NavigationProp, ParamListBase } from '@react-navigation/native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import WalletHeader, { type WalletHeaderProps } from './WalletHeader';
import { WalletViewSelectorsIDs } from '../../WalletView.testIds';
import { isNotificationsFeatureEnabled } from '../../../../../util/notifications';

jest.mock('../../../../UI/AddressCopy', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ testID }: { testID: string }) => <View testID={testID} />,
  };
});

jest.mock('../../../../UI/Card/components/CardButton', () => {
  const { View } = jest.requireActual('react-native');
  const { WalletViewSelectorsIDs: TestIds } = jest.requireActual(
    '../../WalletView.testIds',
  );
  return {
    __esModule: true,
    default: ({ onPress }: { onPress: () => void }) => (
      <View testID={TestIds.CARD_BUTTON} onTouchEnd={onPress} />
    ),
  };
});

jest.mock('../../../../../util/notifications', () => ({
  ...jest.requireActual('../../../../../util/notifications'),
  isNotificationsFeatureEnabled: jest.fn(() => false),
}));

jest.mock('../../../AccountSelector', () => ({
  createAccountSelectorNavDetails: jest.fn(() => [
    'AccountSelector',
    { screen: 'AccountSelector' },
  ]),
}));

const touchAreaSlop = { top: 8, bottom: 8, left: 8, right: 8 };

const defaultProps: WalletHeaderProps = {
  displayName: 'Account 1',
  navigation: {
    navigate: jest.fn(),
  } as unknown as NavigationProp<ParamListBase>,
  isMoneyAccountVisible: false,
  isNotificationEnabled: false,
  unreadNotificationCount: 0,
  handleSearchPress: jest.fn(),
  handleActivityPress: jest.fn(),
  handleCardPress: jest.fn(),
  handleHamburgerPress: jest.fn(),
  touchAreaSlop,
  headerActionButtonsContainerStyle: {},
  headerAccountPickerStyle: {},
};

describe('WalletHeader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(isNotificationsFeatureEnabled).mockReturnValue(false);
  });

  it('renders the header root and account picker', () => {
    const { getByTestId } = renderWithProvider(
      <WalletHeader {...defaultProps} />,
    );

    expect(
      getByTestId(WalletViewSelectorsIDs.WALLET_HEADER_ROOT),
    ).toBeOnTheScreen();
    expect(getByTestId(WalletViewSelectorsIDs.ACCOUNT_ICON)).toBeOnTheScreen();
  });

  it('calls handleSearchPress when the search button is pressed', () => {
    const { getByTestId } = renderWithProvider(
      <WalletHeader {...defaultProps} />,
    );

    fireEvent.press(getByTestId(WalletViewSelectorsIDs.WALLET_SEARCH_BUTTON));

    expect(defaultProps.handleSearchPress).toHaveBeenCalledTimes(1);
  });

  it('calls handleHamburgerPress when the menu button is pressed', () => {
    const { getByTestId } = renderWithProvider(
      <WalletHeader {...defaultProps} />,
    );

    fireEvent.press(
      getByTestId(WalletViewSelectorsIDs.WALLET_HAMBURGER_MENU_BUTTON),
    );

    expect(defaultProps.handleHamburgerPress).toHaveBeenCalledTimes(1);
  });

  it('navigates to the account selector when the account picker is pressed', () => {
    const { getByTestId } = renderWithProvider(
      <WalletHeader {...defaultProps} />,
    );

    fireEvent.press(getByTestId(WalletViewSelectorsIDs.ACCOUNT_ICON));

    expect(defaultProps.navigation.navigate).toHaveBeenCalledWith(
      'AccountSelector',
      { screen: 'AccountSelector' },
    );
  });

  describe('when the Money account is visible', () => {
    it('shows the activity button and hides the card button', () => {
      const { getByTestId, queryByTestId } = renderWithProvider(
        <WalletHeader {...defaultProps} isMoneyAccountVisible />,
      );

      expect(
        getByTestId(WalletViewSelectorsIDs.WALLET_ACTIVITY_BUTTON),
      ).toBeOnTheScreen();
      expect(
        queryByTestId(WalletViewSelectorsIDs.CARD_BUTTON),
      ).not.toBeOnTheScreen();
    });

    it('calls handleActivityPress when the activity button is pressed', () => {
      const { getByTestId } = renderWithProvider(
        <WalletHeader {...defaultProps} isMoneyAccountVisible />,
      );

      fireEvent.press(
        getByTestId(WalletViewSelectorsIDs.WALLET_ACTIVITY_BUTTON),
      );

      expect(defaultProps.handleActivityPress).toHaveBeenCalledTimes(1);
    });
  });

  describe('when the Money account is not visible', () => {
    it('shows the card button and hides the activity button', () => {
      const { getByTestId, queryByTestId } = renderWithProvider(
        <WalletHeader {...defaultProps} isMoneyAccountVisible={false} />,
      );

      expect(getByTestId(WalletViewSelectorsIDs.CARD_BUTTON)).toBeOnTheScreen();
      expect(
        queryByTestId(WalletViewSelectorsIDs.WALLET_ACTIVITY_BUTTON),
      ).not.toBeOnTheScreen();
    });
  });

  describe('when the notifications feature is enabled', () => {
    beforeEach(() => {
      jest.mocked(isNotificationsFeatureEnabled).mockReturnValue(true);
    });

    it('still calls handleHamburgerPress when the menu button is pressed', () => {
      const { getByTestId } = renderWithProvider(
        <WalletHeader {...defaultProps} />,
      );

      fireEvent.press(
        getByTestId(WalletViewSelectorsIDs.WALLET_HAMBURGER_MENU_BUTTON),
      );

      expect(defaultProps.handleHamburgerPress).toHaveBeenCalledTimes(1);
    });
  });
});
