import { fireEvent, waitFor } from '@testing-library/react-native';
import React from 'react';
import { WalletViewSelectorsIDs } from '../../../../../Views/Wallet/WalletView.testIds';
import Routes from '../../../../../../constants/navigation/Routes';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { MOCK_STAKED_ETH_MAINNET_ASSET } from '../../../../Stake/__mocks__/stakeMockData';
import { EarnTokenDetails } from '../../../types/lending.types';
import EarningsHistoryButton from './EarningsHistoryButton';

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

jest.mock('../../../../../../selectors/earnController', () => ({
  earnSelectors: {
    selectEarnTokenPair: jest.fn().mockReturnValue({
      outputToken: {
        ticker: 'ETH',
        symbol: 'ETH',
        chainId: '0x1',
      } as EarnTokenDetails,
    }),
  },
}));

const renderComponent = () =>
  renderWithProvider(
    <EarningsHistoryButton asset={MOCK_STAKED_ETH_MAINNET_ASSET} />,
  );

describe('EarningsHistoryButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    const { getByTestId } = renderComponent();
    expect(
      getByTestId(WalletViewSelectorsIDs.EARN_EARNINGS_HISTORY_BUTTON),
    ).toBeDefined();
  });

  it('navigates to Stake Rewards History screen when stake history button is pressed', async () => {
    const { getByTestId } = renderComponent();

    fireEvent.press(
      getByTestId(WalletViewSelectorsIDs.EARN_EARNINGS_HISTORY_BUTTON),
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('StakeScreens', {
        screen: Routes.STAKING.EARNINGS_HISTORY,
        params: { asset: MOCK_STAKED_ETH_MAINNET_ASSET },
      });
    });
  });
});
