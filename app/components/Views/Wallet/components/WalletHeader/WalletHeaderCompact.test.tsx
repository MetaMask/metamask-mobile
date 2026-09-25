import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { makeMutable } from 'react-native-reanimated';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import WalletHeaderCompact, {
  type WalletHeaderCompactProps,
} from './WalletHeaderCompact';
import { WalletViewSelectorsIDs } from '../../WalletView.testIds';
import { useAccountsMenuAttention } from '../../../../hooks/useAccountsMenuAttention';
import { selectIsSelectedAccountWatchOnly } from '../../../../../selectors/multichainAccounts/accountTreeController';

jest.mock('../../../../hooks/useAccountsMenuAttention', () => ({
  useAccountsMenuAttention: jest.fn(() => false),
}));

jest.mock(
  '../../../../../selectors/multichainAccounts/accountTreeController',
  () => ({
    ...jest.requireActual(
      '../../../../../selectors/multichainAccounts/accountTreeController',
    ),
    selectIsSelectedAccountWatchOnly: jest.fn(() => false),
  }),
);

const defaultProps: WalletHeaderCompactProps = {
  accountAddress: '0x1234567890123456789012345678901234567890',
  avatarAccountType:
    'JazzIcon' as WalletHeaderCompactProps['avatarAccountType'],
  displayName: 'Account 1',
  handleRewardsPress: jest.fn(),
  handleAccountHubPress: jest.fn(),
  touchAreaSlop: { top: 8, bottom: 8, left: 8, right: 8 },
  scrollY: makeMutable(0),
  titleSectionHeight: makeMutable(0),
};

describe('WalletHeaderCompact', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useAccountsMenuAttention).mockReturnValue(false);
    jest.mocked(selectIsSelectedAccountWatchOnly).mockReturnValue(false);
  });

  describe('watch-only tag', () => {
    it('hides the watch-only tag for a regular account', () => {
      const { queryByTestId } = renderWithProvider(
        <WalletHeaderCompact {...defaultProps} />,
      );

      expect(
        queryByTestId(WalletViewSelectorsIDs.WATCH_ONLY_TAG),
      ).not.toBeOnTheScreen();
    });

    it('shows the watch-only tag when the selected account is watch-only', () => {
      jest.mocked(selectIsSelectedAccountWatchOnly).mockReturnValue(true);

      const { getByTestId } = renderWithProvider(
        <WalletHeaderCompact {...defaultProps} />,
      );

      expect(
        getByTestId(WalletViewSelectorsIDs.WATCH_ONLY_TAG),
      ).toBeOnTheScreen();
    });
  });

  it('renders the rewards button without a search button by default', () => {
    const { getByTestId, queryByTestId } = renderWithProvider(
      <WalletHeaderCompact {...defaultProps} />,
    );

    expect(
      getByTestId(WalletViewSelectorsIDs.WALLET_REWARDS_BUTTON),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(WalletViewSelectorsIDs.WALLET_SEARCH_BUTTON),
    ).not.toBeOnTheScreen();
  });

  it('renders a search button when a search handler is provided', () => {
    const handleSearchPress = jest.fn();

    const { getByTestId } = renderWithProvider(
      <WalletHeaderCompact
        {...defaultProps}
        handleSearchPress={handleSearchPress}
      />,
    );

    fireEvent.press(getByTestId(WalletViewSelectorsIDs.WALLET_SEARCH_BUTTON));

    expect(handleSearchPress).toHaveBeenCalledTimes(1);
  });

  it('opens the account hub from the collapsed header title', () => {
    const { getByTestId } = renderWithProvider(
      <WalletHeaderCompact {...defaultProps} />,
    );

    fireEvent.press(
      getByTestId(WalletViewSelectorsIDs.WALLET_HEADER_ACCOUNT_NAME_BUTTON),
    );

    expect(defaultProps.handleAccountHubPress).toHaveBeenCalledTimes(1);
  });

  it('calls handleAccountHubPress when the avatar is pressed', () => {
    const { getByTestId } = renderWithProvider(
      <WalletHeaderCompact {...defaultProps} />,
    );

    fireEvent.press(
      getByTestId(WalletViewSelectorsIDs.WALLET_ACCOUNT_HUB_BUTTON),
    );

    expect(defaultProps.handleAccountHubPress).toHaveBeenCalledTimes(1);
  });

  it('shows the avatar badge when there is Accounts menu attention', () => {
    jest.mocked(useAccountsMenuAttention).mockReturnValue(true);

    const { getByTestId } = renderWithProvider(
      <WalletHeaderCompact {...defaultProps} />,
    );

    expect(
      getByTestId(WalletViewSelectorsIDs.WALLET_ACCOUNT_HUB_BUTTON_BADGE),
    ).toBeOnTheScreen();
  });

  it('hides the avatar badge when there is no Accounts menu attention', () => {
    const { queryByTestId } = renderWithProvider(
      <WalletHeaderCompact {...defaultProps} />,
    );

    expect(
      queryByTestId(WalletViewSelectorsIDs.WALLET_ACCOUNT_HUB_BUTTON_BADGE),
    ).toBeNull();
  });
});
