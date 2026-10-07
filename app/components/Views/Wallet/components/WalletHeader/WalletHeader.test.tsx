import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import WalletHeader, { type WalletHeaderProps } from './WalletHeader';
import { WalletViewSelectorsIDs } from '../../WalletView.testIds';
import { useAccountsMenuAttention } from '../../../../hooks/useAccountsMenuAttention';

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

jest.mock('../../../../hooks/useAccountsMenuAttention', () => ({
  useAccountsMenuAttention: jest.fn(() => false),
}));

jest.mock('../../../ProfileDrawer', () => ({
  createProfileDrawerNavDetails: jest.fn(() => ['ProfileDrawer', {}]),
}));

const touchAreaSlop = { top: 8, bottom: 8, left: 8, right: 8 };

const defaultProps: WalletHeaderProps = {
  displayName: 'Account 1',
  navigation: {},
  isMoneyAccountVisible: false,
  handleSearchPress: jest.fn(),
  useSearchHeaderLayout: true,
  showSearchPastePill: false,
  handleSearchPastePress: jest.fn(),
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
    jest.mocked(useAccountsMenuAttention).mockReturnValue(false);
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

  it('navigates to Profile Drawer when the account picker is pressed', () => {
    const navigate = jest.fn();
    const { getByTestId } = renderWithProvider(
      <WalletHeader
        {...defaultProps}
        navigation={{ navigate }}
        useSearchHeaderLayout={false}
      />,
    );

    fireEvent.press(getByTestId(WalletViewSelectorsIDs.ACCOUNT_ICON));

    expect(navigate).toHaveBeenCalledWith('ProfileDrawer', {});
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

  describe('Accounts menu attention badge', () => {
    it('shows the hamburger badge when there is Accounts menu attention', () => {
      jest.mocked(useAccountsMenuAttention).mockReturnValue(true);

      const { getByTestId } = renderWithProvider(
        <WalletHeader {...defaultProps} />,
      );

      expect(
        getByTestId(WalletViewSelectorsIDs.WALLET_HAMBURGER_MENU_BADGE),
      ).toBeOnTheScreen();
    });

    it('hides the hamburger badge when there is no Accounts menu attention', () => {
      const { queryByTestId } = renderWithProvider(
        <WalletHeader {...defaultProps} />,
      );

      expect(
        queryByTestId(WalletViewSelectorsIDs.WALLET_HAMBURGER_MENU_BADGE),
      ).toBeNull();
    });
  });
});
