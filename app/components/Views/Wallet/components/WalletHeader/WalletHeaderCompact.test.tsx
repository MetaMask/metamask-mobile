import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { useSharedValue } from 'react-native-reanimated';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import WalletHeaderCompact from './WalletHeaderCompact';
import { WalletViewSelectorsIDs } from '../../WalletView.testIds';
import { useAccountsMenuAttention } from '../../../../hooks/useAccountsMenuAttention';
import { AvatarAccountType } from '../../../../../component-library/components-temp/MultichainAccounts/avatarAccountVariant';

jest.mock('../../../../hooks/useAccountsMenuAttention', () => ({
  useAccountsMenuAttention: jest.fn(() => false),
}));

const touchAreaSlop = { top: 8, bottom: 8, left: 8, right: 8 };

const CompactHeaderHarness = ({
  handleAccountHubPress = jest.fn(),
  handleRewardsPress = jest.fn(),
}: {
  handleAccountHubPress?: () => void;
  handleRewardsPress?: () => void;
}) => {
  const scrollY = useSharedValue(0);
  const titleSectionHeight = useSharedValue(0);

  return (
    <WalletHeaderCompact
      accountAddress="0xabc123"
      avatarAccountType={AvatarAccountType.JazzIcon}
      displayName="Account 1"
      handleRewardsPress={handleRewardsPress}
      handleAccountHubPress={handleAccountHubPress}
      touchAreaSlop={touchAreaSlop}
      scrollY={scrollY}
      titleSectionHeight={titleSectionHeight}
    />
  );
};

describe('WalletHeaderCompact', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useAccountsMenuAttention).mockReturnValue(false);
  });

  it('calls handleAccountHubPress when the avatar is pressed', () => {
    const handleAccountHubPress = jest.fn();

    const { getByTestId } = renderWithProvider(
      <CompactHeaderHarness handleAccountHubPress={handleAccountHubPress} />,
    );

    fireEvent.press(
      getByTestId(WalletViewSelectorsIDs.WALLET_ACCOUNT_HUB_BUTTON),
    );

    expect(handleAccountHubPress).toHaveBeenCalledTimes(1);
  });

  it('shows the avatar badge when there is Accounts menu attention', () => {
    jest.mocked(useAccountsMenuAttention).mockReturnValue(true);

    const { getByTestId } = renderWithProvider(<CompactHeaderHarness />);

    expect(
      getByTestId(WalletViewSelectorsIDs.WALLET_ACCOUNT_HUB_BUTTON_BADGE),
    ).toBeOnTheScreen();
  });

  it('hides the avatar badge when there is no Accounts menu attention', () => {
    const { queryByTestId } = renderWithProvider(<CompactHeaderHarness />);

    expect(
      queryByTestId(WalletViewSelectorsIDs.WALLET_ACCOUNT_HUB_BUTTON_BADGE),
    ).toBeNull();
  });
});
