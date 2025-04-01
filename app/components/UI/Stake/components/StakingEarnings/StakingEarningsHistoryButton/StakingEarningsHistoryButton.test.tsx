import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { WalletViewSelectorsIDs } from '../../../../../../../e2e/selectors/wallet/WalletView.selectors';
import Routes from '../../../../../../constants/navigation/Routes';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { MOCK_STAKED_ETH_MAINNET_ASSET } from '../../../__mocks__/mockData';
import StakingEarningsHistoryButton from './StakingEarningsHistoryButton';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
    }),
  };
});

const renderComponent = () =>
  renderWithProvider(
    <StakingEarningsHistoryButton asset={MOCK_STAKED_ETH_MAINNET_ASSET} />,
  );

describe('StakingEarningsHistoryButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    const { getByTestId } = renderComponent();
    expect(
      getByTestId(WalletViewSelectorsIDs.STAKE_EARNINGS_HISTORY_BUTTON),
    ).toBeDefined();
  });

  it('navigates to Stake Rewards History screen when stake history button is pressed', async () => {
    const { getByTestId } = renderComponent();

    fireEvent.press(
      getByTestId(WalletViewSelectorsIDs.STAKE_EARNINGS_HISTORY_BUTTON),
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('StakeScreens', {
        screen: Routes.STAKING.EARNINGS_HISTORY,
        params: { asset: MOCK_STAKED_ETH_MAINNET_ASSET },
      });
    });
  });
});
