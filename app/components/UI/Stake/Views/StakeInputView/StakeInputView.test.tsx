import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import StakeInputView from './StakeInputView';
import { renderScreen } from '../../../../../util/test/renderWithProvider';
import Routes from '../../../../../constants/navigation/Routes';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { Stake } from '../../sdk/stakeSdkProvider';
import { ChainId, PooledStakingContract } from '@metamask/stake-sdk';
import { Contract } from 'ethers';
import { MOCK_GET_VAULT_RESPONSE } from '../../__mocks__/mockData';
import { toWei } from '../../../../../util/number';
import { strings } from '../../../../../../locales/i18n';
// eslint-disable-next-line import/no-namespace
import * as useStakingGasFee from '../../hooks/useStakingGasFee';

function render(Component: React.ComponentType) {
  return renderScreen(
    Component,
    {
      name: Routes.STAKING.STAKE,
    },
    {
      state: {
        engine: {
          backgroundState,
        },
      },
    },
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

// Mock necessary modules and hooks
jest.mock('../../../../../selectors/currencyRateController.ts', () => ({
  selectConversionRate: jest.fn(() => 2000),
  selectCurrentCurrency: jest.fn(() => 'USD'),
}));

// Add mock for multichain selectors
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

const mockBalanceBN = toWei('1.5'); // 1.5 ETH

const mockPooledStakingContractService: PooledStakingContract = {
  chainId: ChainId.ETHEREUM,
  connectSignerOrProvider: jest.fn(),
  contract: new Contract('0x0000000000000000000000000000000000000000', []),
  convertToShares: jest.fn(),
  encodeClaimExitedAssetsTransactionData: jest.fn(),
  encodeDepositTransactionData: jest.fn(),
  encodeEnterExitQueueTransactionData: jest.fn(),
  encodeMulticallTransactionData: jest.fn(),
  estimateClaimExitedAssetsGas: jest.fn(),
  estimateDepositGas: jest.fn(),
  estimateEnterExitQueueGas: jest.fn(),
  estimateMulticallGas: jest.fn(),
  getShares: jest.fn(),
};

jest.mock('../../hooks/useStakeContext.ts', () => ({
  useStakeContext: jest.fn(() => {
    const stakeContext: Stake = {
      setSdkType: jest.fn(),
      stakingContract: mockPooledStakingContractService,
    };
    return stakeContext;
  }),
}));

jest.mock('../../hooks/useBalance', () => ({
  __esModule: true,
  default: () => ({
    balanceETH: '1.5',
    balanceWei: mockBalanceBN,
    balanceFiatNumber: '3000',
  }),
}));

const mockGasFee = toWei('0.0001');

jest.mock('../../hooks/useStakingGasFee', () => ({
  __esModule: true,
  default: () => ({
    estimatedGasFeeWei: mockGasFee,
    isLoadingStakingGasFee: false,
    isStakingGasFeeError: false,
    refreshGasValues: jest.fn(),
  }),
}));

const mockVaultData = MOCK_GET_VAULT_RESPONSE;
// Mock hooks

jest.mock('../../hooks/useStakingEligibility', () => ({
  __esModule: true,
  default: () => ({
    isEligible: true,
    loading: false,
    error: null,
    refreshPooledStakingEligibility: jest.fn(),
  }),
}));

jest.mock('../../hooks/useVaultData', () => ({
  __esModule: true,
  default: () => ({
    vaultData: mockVaultData,
    loading: false,
    error: null,
    refreshVaultData: jest.fn(),
    annualRewardRate: '2.5%',
    annualRewardRateDecimal: 0.025,
  }),
}));

describe('StakeInputView', () => {
  it('render matches snapshot', () => {
    render(StakeInputView);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  describe('when values are entered in the keypad', () => {
    it('updates ETH and fiat values', () => {
      render(StakeInputView);

      fireEvent.press(screen.getByText('2'));

      expect(screen.getByText('4000 USD')).toBeTruthy();
    });
  });

  describe('currency toggle functionality', () => {
    it('switches between ETH and fiat correctly', () => {
      render(StakeInputView);

      expect(screen.getByText('ETH')).toBeTruthy();
      fireEvent.press(screen.getByText('0 USD'));

      expect(screen.getByText('USD')).toBeTruthy();
    });
  });

  describe('when calculating rewards', () => {
    it('calculates estimated annual rewards based on input', () => {
      render(StakeInputView);

      fireEvent.press(screen.getByText('2'));

      expect(screen.getByText('0.05 ETH')).toBeTruthy();
    });
  });

  describe('quick amount buttons', () => {
    it('handles 25% quick amount button press correctly', () => {
      render(StakeInputView);

      fireEvent.press(screen.getByText('25%'));

      expect(screen.getByText('0.375')).toBeTruthy();
    });
  });

  describe('stake button states', () => {
    it('displays `Enter amount` if input is 0', () => {
      render(StakeInputView);

      expect(screen.getByText('Enter amount')).toBeTruthy();
    });

    it('displays `Review` on stake button if input is valid', () => {
      render(StakeInputView);

      fireEvent.press(screen.getByText('1'));
      expect(screen.getByText('Review')).toBeTruthy();
    });

    it('displays `Not enough ETH` when input exceeds balance', () => {
      render(StakeInputView);

      fireEvent.press(screen.getByText('4'));
      expect(screen.queryAllByText('Not enough ETH')).toHaveLength(2);
    });

    it('navigates to Learn more modal when learn icon is pressed', () => {
      render(StakeInputView);
      fireEvent.press(screen.getByLabelText('Learn More'));
      expect(mockNavigate).toHaveBeenCalledWith('StakeModals', {
        screen: Routes.STAKING.MODALS.POOL_STAKING_LEARN_MORE,
      });
    });

    it('navigates to gas impact modal when gas cost is 30% or more of deposit amount', () => {
      jest.spyOn(useStakingGasFee, 'default').mockReturnValue({
        estimatedGasFeeWei: toWei('0.25'),
        isLoadingStakingGasFee: false,
        isStakingGasFeeError: false,
        refreshGasValues: jest.fn(),
      });

      render(StakeInputView);

      fireEvent.press(screen.getByText('25%'));

      fireEvent.press(screen.getByText(strings('stake.review')));

      expect(mockNavigate).toHaveBeenLastCalledWith('StakeModals', {
        screen: Routes.STAKING.MODALS.GAS_IMPACT,
        params: {
          amountFiat: '750',
          amountWei: '375000000000000000',
          annualRewardRate: '2.5%',
          annualRewardsETH: '0.00938 ETH',
          annualRewardsFiat: '18.75 USD',
          estimatedGasFee: '0.25',
          estimatedGasFeePercentage: '66%',
        },
      });
    });
  });
});
