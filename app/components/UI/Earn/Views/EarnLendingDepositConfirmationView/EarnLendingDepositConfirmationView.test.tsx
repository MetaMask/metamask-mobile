import { InternalAccount } from '@metamask/keyring-internal-api';
import { Result, TransactionType } from '@metamask/transaction-controller';
import { useRoute } from '@react-navigation/native';
import { act, fireEvent } from '@testing-library/react-native';
import React from 'react';
import EarnLendingDepositConfirmationView, {
  EarnLendingDepositConfirmationViewProps,
} from '.';
import { strings } from '../../../../../../locales/i18n';
import Engine from '../../../../../core/Engine';
import { selectSelectedInternalAccount } from '../../../../../selectors/accountsController';
import { MOCK_ADDRESS_2 } from '../../../../../util/test/accountsControllerTestUtils';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { getStakingNavbar } from '../../../Navbar';
import { MOCK_USDC_MAINNET_ASSET } from '../../../Stake/__mocks__/stakeMockData';
import { selectStablecoinLendingEnabledFlag } from '../../selectors/featureFlags';
import { EARN_LENDING_ACTIONS } from '../../types/lending.types';
import { CHAIN_ID_TO_AAVE_V3_POOL_CONTRACT_ADDRESS } from '../../utils/tempLending';
import {
  CONFIRMATION_FOOTER_BUTTON_TEST_IDS,
  CONFIRMATION_FOOTER_TEST_IDS,
} from './components/ConfirmationFooter';
import { DEPOSIT_DETAILS_SECTION_TEST_ID } from './components/DepositInfoSection';
import { DEPOSIT_RECEIVE_SECTION_TEST_ID } from './components/DepositReceiveSection';

jest.mock('../../../../../selectors/accountsController', () => ({
  ...jest.requireActual('../../../../../selectors/accountsController'),
  selectSelectedInternalAccount: jest.fn(),
}));

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();

jest.mock('../../selectors/featureFlags', () => ({
  selectStablecoinLendingEnabledFlag: jest.fn(),
  selectPooledStakingEnabledFlag: jest.fn(),
}));

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useRoute: jest.fn(),
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
      setOptions: jest.fn(),
    }),
  };
});

jest.mock('../../hooks/useEarnTokens', () => ({
  __esModule: true,
  default: () => ({
    getEarnToken: () => ({
      ...MOCK_USDC_MAINNET_ASSET,
      experience: {
        type: 'STABLECOIN_LENDING',
        apr: '4.5',
        estimatedAnnualRewardsFormatted: '45',
        estimatedAnnualRewardsFiatNumber: 45,
        estimatedAnnualRewardsTokenMinimalUnit: '45000000',
        estimatedAnnualRewardsTokenFormatted: '45',
        market: {
          protocol: 'AAVE v3',
          underlying: {
            address: MOCK_USDC_MAINNET_ASSET.address,
          },
          outputToken: {
            address: '0x91a9948b5002846b9fa5200a58291d46c30d6fe1',
          },
        },
      },
    }),
    getOutputToken: () => ({
      ...MOCK_USDC_MAINNET_ASSET,
      address: '0x91a9948b5002846b9fa5200a58291d46c30d6fe1',
      symbol: 'aUSDC',
      name: 'aUSDC TOKEN',
      ticker: 'aUSDC',
      experience: {
        type: 'STABLECOIN_LENDING',
        apr: '4.5',
        estimatedAnnualRewardsFormatted: '45',
        estimatedAnnualRewardsFiatNumber: 45,
        estimatedAnnualRewardsTokenMinimalUnit: '45000000',
        estimatedAnnualRewardsTokenFormatted: '45',
        market: {
          protocol: 'AAVE v3',
          underlying: {
            address: MOCK_USDC_MAINNET_ASSET.address,
          },
          outputToken: {
            address: '0x91a9948b5002846b9fa5200a58291d46c30d6fe1',
          },
        },
      },
    }),
    getPairedEarnTokens: () => ({
      earnToken: {
        ...MOCK_USDC_MAINNET_ASSET,
        experience: {
          type: 'STABLECOIN_LENDING',
          apr: '4.5',
          estimatedAnnualRewardsFormatted: '45',
          estimatedAnnualRewardsFiatNumber: 45,
          estimatedAnnualRewardsTokenMinimalUnit: '45000000',
          estimatedAnnualRewardsTokenFormatted: '45',
          market: {
            protocol: 'AAVE v3',
            underlying: {
              address: MOCK_USDC_MAINNET_ASSET.address,
            },
            outputToken: {
              address: '0x91a9948b5002846b9fa5200a58291d46c30d6fe1',
            },
          },
        },
      },
      outputToken: {
        ...MOCK_USDC_MAINNET_ASSET,
        address: '0x91a9948b5002846b9fa5200a58291d46c30d6fe1',
        symbol: 'aUSDC',
        name: 'aUSDC TOKEN',
        ticker: 'aUSDC',
        experience: {
          type: 'STABLECOIN_LENDING',
          apr: '4.5',
          estimatedAnnualRewardsFormatted: '45',
          estimatedAnnualRewardsFiatNumber: 45,
          estimatedAnnualRewardsTokenMinimalUnit: '45000000',
          estimatedAnnualRewardsTokenFormatted: '45',
          market: {
            protocol: 'AAVE v3',
            underlying: {
              address: MOCK_USDC_MAINNET_ASSET.address,
            },
            outputToken: {
              address: '0x91a9948b5002846b9fa5200a58291d46c30d6fe1',
            },
          },
        },
      },
    }),
    getEarnExperience: () => ({
      type: 'STABLECOIN_LENDING',
      apr: '0.05',
    }),
    getEstimatedAnnualRewardsForAmount: () => ({
      estimatedAnnualRewardsFormatted: '$45.00',
      estimatedAnnualRewardsFiatNumber: 45,
      estimatedAnnualRewardsTokenMinimalUnit: '45000000',
      estimatedAnnualRewardsTokenFormatted: '45 USDC',
    }),
  }),
}));

jest.mock('../../../../../core/Engine', () => ({
  context: {
    NetworkController: {
      getNetworkClientById: () => ({
        configuration: {
          chainId: '0x1',
          rpcUrl: 'https://mainnet.infura.io/v3',
          ticker: 'ETH',
          type: 'custom',
        },
      }),
      findNetworkClientIdByChainId: () => 'mainnet',
    },
    TransactionController: {
      addTransaction: jest.fn(),
    },
    EarnController: {
      executeLendingDeposit: jest.fn(),
      executeLendingTokenApprove: jest.fn(),
    },
  },
  controllerMessenger: {
    subscribeOnceIf: jest.fn(),
  },
}));

describe('EarnLendingDepositConfirmationView', () => {
  jest.mocked(getStakingNavbar);
  const mockAddTransaction = jest.mocked(
    Engine.context.TransactionController.addTransaction,
  );

  const selectSelectedInternalAccountMock = jest.mocked(
    selectSelectedInternalAccount,
  );

  const mockInitialState = {
    engine: {
      backgroundState,
    },
  };

  const AAVE_V3_ETHEREUM_MAINNET_POOL_CONTRACT_ADDRESS =
    CHAIN_ID_TO_AAVE_V3_POOL_CONTRACT_ADDRESS['0x1'];

  const defaultRouteParams: EarnLendingDepositConfirmationViewProps['route'] = {
    key: 'EarnLendingDepositConfirmation-abc123',
    name: 'params',
    params: {
      action: EARN_LENDING_ACTIONS.DEPOSIT,
      amountFiat: '4.99',
      amountTokenMinimalUnit: '5000000',
      annualRewardsFiat: '0.26',
      annualRewardsToken: '260000',
      lendingContractAddress: AAVE_V3_ETHEREUM_MAINNET_POOL_CONTRACT_ADDRESS,
      lendingProtocol: 'AAVE v3',
      token: {
        ...MOCK_USDC_MAINNET_ASSET,
        address: MOCK_USDC_MAINNET_ASSET.address,
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    (useRoute as jest.Mock).mockReturnValue(defaultRouteParams);

    (
      selectStablecoinLendingEnabledFlag as jest.MockedFunction<
        typeof selectStablecoinLendingEnabledFlag
      >
    ).mockReturnValue(true);

    selectSelectedInternalAccountMock.mockReturnValue({
      address: MOCK_ADDRESS_2,
    } as InternalAccount);
  });

  it('renders correctly', () => {
    const { toJSON, getByTestId } = renderWithProvider(
      <EarnLendingDepositConfirmationView />,
      { state: mockInitialState },
    );

    expect(toJSON()).toMatchSnapshot();

    // ERC20 Token Hero
    expect(getByTestId('earn-token-selector-USDC-0x1')).toBeDefined();
    // Deposit Details Section
    expect(getByTestId(DEPOSIT_DETAILS_SECTION_TEST_ID)).toBeDefined();
    // Deposit Receive Section
    expect(getByTestId(DEPOSIT_RECEIVE_SECTION_TEST_ID)).toBeDefined();
    // Footer
    expect(getByTestId(CONFIRMATION_FOOTER_TEST_IDS)).toBeDefined();
    expect(
      getByTestId(CONFIRMATION_FOOTER_BUTTON_TEST_IDS.CANCEL_BUTTON),
    ).toBeDefined();
    expect(
      getByTestId(CONFIRMATION_FOOTER_BUTTON_TEST_IDS.CONFIRM_BUTTON),
    ).toBeDefined();
  });

  it('does not render when stablecoin lending feature flag disabled', () => {
    (
      selectStablecoinLendingEnabledFlag as jest.MockedFunction<
        typeof selectStablecoinLendingEnabledFlag
      >
    ).mockReturnValue(false);

    const { toJSON } = renderWithProvider(
      <EarnLendingDepositConfirmationView />,
      { state: mockInitialState },
    );

    expect(toJSON()).toBeNull();
  });

  it('navigates to previous page when cancel button is pressed', () => {
    const { getByTestId } = renderWithProvider(
      <EarnLendingDepositConfirmationView />,
      { state: mockInitialState },
    );

    const cancelButton = getByTestId(
      CONFIRMATION_FOOTER_BUTTON_TEST_IDS.CANCEL_BUTTON,
    );

    act(() => {
      fireEvent.press(cancelButton);
    });

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('initiates transaction approval flow if token allowance is needed', async () => {
    const routeParamsWithApproveAction = {
      ...defaultRouteParams,
      params: {
        ...defaultRouteParams.params,
        action: EARN_LENDING_ACTIONS.ALLOWANCE_INCREASE,
      },
    };

    (useRoute as jest.Mock).mockReturnValue(routeParamsWithApproveAction);

    // We don't care about the result of addTransaction but want to ensure it's called with the correct parameters.
    mockAddTransaction.mockResolvedValue({
      transactionMeta: {
        id: '123',
        type: TransactionType.tokenMethodIncreaseAllowance,
      },
    } as Result);

    const { queryAllByText, getByTestId } = renderWithProvider(
      <EarnLendingDepositConfirmationView />,
      { state: mockInitialState },
    );

    const approveButton = getByTestId(
      CONFIRMATION_FOOTER_BUTTON_TEST_IDS.CONFIRM_BUTTON,
    );

    // Ensure we're on the approval step
    expect(queryAllByText(strings('earn.approve')).length).toBe(2);

    await act(async () => {
      fireEvent.press(approveButton);
    });

    expect(
      Engine.context.EarnController.executeLendingTokenApprove,
    ).toHaveBeenCalledWith({
      amount: '5000000',
      protocol: 'AAVE v3',
      underlyingTokenAddress: MOCK_USDC_MAINNET_ASSET.address,
      gasOptions: {},
      txOptions: {
        deviceConfirmedOn: 'metamask_mobile',
        networkClientId: 'mainnet',
        origin: 'metamask',
        type: 'increaseAllowance',
      },
    });
  });

  it('initiates deposit if user already has token allowance', async () => {
    // We don't care about the result of addTransaction but want to ensure it's called with the correct parameters.
    mockAddTransaction.mockResolvedValue({
      transactionMeta: {
        id: '123',
        type: 'lendingDeposit' as TransactionType,
      },
    } as Result);

    const { queryAllByText, getByTestId } = renderWithProvider(
      <EarnLendingDepositConfirmationView />,
      { state: mockInitialState },
    );

    const depositButton = getByTestId(
      CONFIRMATION_FOOTER_BUTTON_TEST_IDS.CONFIRM_BUTTON,
    );

    // Ensure we're on the deposit step
    expect(queryAllByText(strings('earn.approve')).length).toBe(1);
    expect(queryAllByText(strings('earn.deposit')).length).toBe(1);

    await act(async () => {
      fireEvent.press(depositButton);
    });

    expect(
      Engine.context.EarnController.executeLendingDeposit,
    ).toHaveBeenCalledWith({
      amount: '5000000',
      protocol: 'AAVE v3',
      underlyingTokenAddress: MOCK_USDC_MAINNET_ASSET.address,
      gasOptions: {},
      txOptions: {
        deviceConfirmedOn: 'metamask_mobile',
        networkClientId: 'mainnet',
        origin: 'metamask',
        type: 'lendingDeposit',
      },
    });
  });

  it('handles transaction error during approval flow', async () => {
    const routeParamsWithApproveAction = {
      ...defaultRouteParams,
      params: {
        ...defaultRouteParams.params,
        action: EARN_LENDING_ACTIONS.ALLOWANCE_INCREASE,
      },
    };

    (useRoute as jest.Mock).mockReturnValue(routeParamsWithApproveAction);

    mockAddTransaction.mockRejectedValue(new Error('Transaction failed'));

    const { getByTestId } = renderWithProvider(
      <EarnLendingDepositConfirmationView />,
      { state: mockInitialState },
    );

    const approveButton = getByTestId(
      CONFIRMATION_FOOTER_BUTTON_TEST_IDS.CONFIRM_BUTTON,
    );

    await act(async () => {
      fireEvent.press(approveButton);
    });

    expect(
      Engine.context.EarnController.executeLendingTokenApprove,
    ).toHaveBeenCalled();
  });

  it('handles transaction error during deposit flow', async () => {
    mockAddTransaction.mockRejectedValue(new Error('Transaction failed'));

    const { getByTestId } = renderWithProvider(
      <EarnLendingDepositConfirmationView />,
      { state: mockInitialState },
    );

    const depositButton = getByTestId(
      CONFIRMATION_FOOTER_BUTTON_TEST_IDS.CONFIRM_BUTTON,
    );

    await act(async () => {
      fireEvent.press(depositButton);
    });

    expect(
      Engine.context.EarnController.executeLendingDeposit,
    ).toHaveBeenCalled();
  });

  it('displays correct token information in the UI', () => {
    const { getByText } = renderWithProvider(
      <EarnLendingDepositConfirmationView />,
      { state: mockInitialState },
    );

    expect(getByText('45 USDC')).toBeDefined();
    expect(getByText('5 aUSDC')).toBeDefined();
    expect(getByText('4.5%')).toBeDefined();
  });

  it('displays correct amount information in the UI', () => {
    const { getByText, getAllByText } = renderWithProvider(
      <EarnLendingDepositConfirmationView />,
      { state: mockInitialState },
    );

    expect(getAllByText('$4.99')).toBeDefined();
    expect(getByText('5 aUSDC')).toBeDefined();
    expect(getByText('5 USDC')).toBeDefined();
  });

  it('handles missing route params gracefully', () => {
    (useRoute as jest.Mock).mockReturnValue({
      key: 'EarnLendingDepositConfirmation-abc123',
      name: 'params',
      params: {},
    });

    const { toJSON } = renderWithProvider(
      <EarnLendingDepositConfirmationView />,
      { state: mockInitialState },
    );

    expect(toJSON()).toBeNull();
  });
});
