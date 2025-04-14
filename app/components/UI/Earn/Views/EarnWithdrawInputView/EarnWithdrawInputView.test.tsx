import { fireEvent, screen } from '@testing-library/react-native';
import BN4 from 'bnjs4';
import React from 'react';
import Routes from '../../../../../constants/navigation/Routes';
import { ConfirmationRedesignRemoteFlags, selectConfirmationRedesignFlags } from '../../../../../selectors/featureFlagController/confirmations';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { renderScreen } from '../../../../../util/test/renderWithProvider';
import {
  MOCK_ETH_MAINNET_ASSET,
  MOCK_GET_POOLED_STAKES_API_RESPONSE,
  MOCK_GET_VAULT_RESPONSE,
  MOCK_STAKED_ETH_MAINNET_ASSET,
} from '../../../Stake/__mocks__/mockData';
import EarnWithdrawInputView from './EarnWithdrawInputView';
import { EarnWithdrawInputViewProps } from './EarnWithdrawInputView.types';

jest.mock('../../../../../selectors/multichain', () => ({
  selectAccountTokensAcrossChains: jest.fn(() => ({
    '0x1': [
      {
        address: '0x0',
        symbol: 'ETH',
        decimals: 18,
        balance: '1.5',
        balanceFiat: '$3000',
        isNative: true,
        isETH: true,
      },
    ],
  })),
}));

const mockBalanceBN = new BN4('1000000000000000000');

const baseProps: EarnWithdrawInputViewProps = {
  route: {
    params: {
      token: MOCK_ETH_MAINNET_ASSET,
    },
    key: Routes.STAKING.UNSTAKE,
    name: 'params',
  },
};

function render(Component: React.ComponentType) {
  return renderScreen(
    Component,
    {
      name: Routes.STAKING.UNSTAKE,
    },
    {
      state: {
        engine: {
          backgroundState,
        },
      },
    },
    baseProps.route.params,
  );
}

const mockSetOptions = jest.fn();
const mockNavigate = jest.fn();
const mockReset = jest.fn();
const mockPop = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
      setOptions: mockSetOptions.mockImplementation(
        actualReactNavigation.useNavigation().setOptions,
      ),
      reset: mockReset,
      dangerouslyGetParent: () => ({
        pop: mockPop,
      }),
    }),
  };
});

jest.mock('../../../../../selectors/currencyRateController.ts', () => ({
  selectConversionRate: jest.fn(() => 2000),
  selectCurrentCurrency: jest.fn(() => 'USD'),
  selectCurrencyRates: jest.fn(() => ({
    ETH: 2000,
  })),
}));

const mockVaultMetadata = MOCK_GET_VAULT_RESPONSE;
const mockPooledStakeData = MOCK_GET_POOLED_STAKES_API_RESPONSE.accounts[0];

jest.mock('../../../Stake/hooks/useStakingEligibility', () => ({
  __esModule: true,
  default: () => ({
    isEligible: true,
    loading: false,
    error: null,
    refreshPooledStakingEligibility: jest.fn(),
  }),
}));

jest.mock('../../../Stake/hooks/useVaultMetadata', () => ({
  __esModule: true,
  default: () => ({
    vaultMetadata: mockVaultMetadata,
    isLoadingVaultMetadata: false,
    error: null,
    annualRewardRate: '2.5%',
    annualRewardRateDecimal: 0.025,
  }),
}));

jest.mock('../../../Stake/hooks/useBalance', () => ({
  __esModule: true,
  default: () => ({
    balanceWei: mockBalanceBN,
    stakedBalanceWei: mockPooledStakeData.assets,
    stakedBalanceFiat: MOCK_STAKED_ETH_MAINNET_ASSET.balanceFiat,
    formattedStakedBalanceETH: '5.79133 ETH',
  }),
}));

jest.mock('../../../Stake/hooks/usePoolStakedUnstake', () => ({
  __esModule: true,
  default: () => ({
    attemptUnstakeTransaction: jest.fn().mockResolvedValue(undefined),
  }),
}));

jest.mock('../../../../../selectors/featureFlagController/confirmations');

jest.mock('../../selectors/featureFlags', () => ({
  selectStablecoinLendingEnabledFlag: jest.fn().mockReturnValue(false),
}));

describe('UnstakeInputView', () => {
  const selectConfirmationRedesignFlagsMock = jest.mocked(selectConfirmationRedesignFlags)

  beforeEach(() => {
    jest.useFakeTimers();

    selectConfirmationRedesignFlagsMock.mockReturnValue({
      staking_confirmations: false,
    } as unknown as ConfirmationRedesignRemoteFlags) ;
  });

  it('render matches snapshot', () => {
    render(EarnWithdrawInputView);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  describe('when values are entered in the keypad', () => {
    it('updates ETH and fiat values', () => {
      render(EarnWithdrawInputView);

      fireEvent.press(screen.getByText('2'));

      expect(screen.getByText('4000 USD')).toBeTruthy();
    });
  });

  describe('currency toggle functionality', () => {
    it('switches between ETH and fiat correctly', () => {
      render(EarnWithdrawInputView);

      expect(screen.getByText('ETH')).toBeTruthy();
      fireEvent.press(screen.getByText('0 USD'));

      expect(screen.getByText('USD')).toBeTruthy();
    });
  });

  describe('quick amount buttons', () => {
    it('handles 25% quick amount button press correctly', () => {
      render(EarnWithdrawInputView);

      fireEvent.press(screen.getByText('25%'));

      expect(screen.getByText('1.44783')).toBeTruthy();
    });
  });

  describe('stake button states', () => {
    it('displays `Enter amount` if input is 0', () => {
      render(EarnWithdrawInputView);

      expect(screen.getByText('Enter amount')).toBeTruthy();
    });

    it('displays `Review` on stake button if input is valid', () => {
      render(EarnWithdrawInputView);

      fireEvent.press(screen.getByText('1'));

      expect(screen.getByText('Review')).toBeTruthy();
    });

    it('displays `Not enough ETH` when input exceeds balance', () => {
      render(EarnWithdrawInputView);

      fireEvent.press(screen.getByText('8'));
      expect(screen.queryAllByText('Not enough ETH')).toHaveLength(2);
    });
  });

  describe('when staking_confirmations feature flag is enabled', () => {
    let originalMock: jest.Mock;
    let mockAttemptUnstakeTransaction: jest.Mock;

    beforeEach(() => {
      originalMock = jest.requireMock(
        '../../../../../selectors/featureFlagController',
      ).selectConfirmationRedesignFlags as jest.Mock;

      jest.requireMock(
        '../../../../../selectors/featureFlagController',
      ).selectConfirmationRedesignFlags = jest.fn(() => ({
        staking_confirmations: true,
      }));

      mockAttemptUnstakeTransaction = jest.fn().mockResolvedValue(undefined);
      jest.requireMock('../../../Stake/hooks/usePoolStakedUnstake').default =
        () => ({
          attemptUnstakeTransaction: mockAttemptUnstakeTransaction,
        });

      selectConfirmationRedesignFlagsMock.mockReturnValue({
        staking_confirmations: true,
      } as unknown as ConfirmationRedesignRemoteFlags) ;
    });

    afterEach(() => {
      jest.requireMock(
        '../../../../../selectors/featureFlagController',
      ).selectConfirmationRedesignFlags = originalMock;
    });

    it('calls attemptUnstakeTransaction when Review button is pressed', async () => {
      render(EarnWithdrawInputView);

      fireEvent.press(screen.getByText('1'));

      fireEvent.press(screen.getByText('Review'));

      jest.useRealTimers();
      // Wait for the async operation to complete
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockAttemptUnstakeTransaction).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('StakeScreens', {
        screen: Routes.STANDALONE_CONFIRMATIONS.STAKE_WITHDRAWAL,
        params: expect.objectContaining({
          amountWei: expect.any(String),
          amountFiat: expect.any(String),
        }),
      });
    });
  });
});
