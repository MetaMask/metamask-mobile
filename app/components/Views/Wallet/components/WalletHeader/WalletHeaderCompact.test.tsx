import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { makeMutable } from 'react-native-reanimated';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import WalletHeaderCompact, {
  type WalletHeaderCompactProps,
} from './WalletHeaderCompact';
import { WalletViewSelectorsIDs } from '../../WalletView.testIds';

jest.mock('../../../../hooks/useHasUnreadNotifications', () => ({
  useHasUnreadNotifications: jest.fn(() => false),
}));

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
  beforeEach(() => jest.clearAllMocks());

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
});
