import React from 'react';
import EarnLendingDepositConfirmationView, {
  EarnLendingDepositConfirmationViewProps,
} from '.';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { EARN_INPUT_VIEW_ACTIONS } from '../EarnInputView/EarnInputView.types';
import { CHAIN_ID_TO_AAVE_V3_POOL_CONTRACT_ADDRESS } from '../../utils/tempLending';
import { MOCK_USDC_MAINNET_ASSET } from '../../../Stake/__mocks__/stakeMockData';
import { useRoute } from '@react-navigation/native';
import { getStakingNavbar } from '../../../Navbar';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { selectStablecoinLendingEnabledFlag } from '../../selectors/featureFlags';
import { DEPOSIT_DETAILS_SECTION_TEST_ID } from './components/DepositInfoSection';
import { DEPOSIT_RECEIVE_SECTION_TEST_ID } from './components/DepositReceiveSection';
import {
  DEPOSIT_FOOTER_TEST_ID,
  LENDING_DEPOSIT_FOOTER_BUTTON_TEST_IDS,
} from './components/DepositFooter';
import { act, fireEvent } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import { selectSelectedInternalAccount } from '../../../../../selectors/accountsController';
import { MOCK_ADDRESS_2 } from '../../../../../util/test/accountsControllerTestUtils';
import { InternalAccount } from '@metamask/keyring-internal-api';
import Engine from '../../../../../core/Engine';
import { Result, TransactionType } from '@metamask/transaction-controller';

jest.mock('../../../../../selectors/accountsController', () => ({
  ...jest.requireActual('../../../../../selectors/accountsController'),
  selectSelectedInternalAccount: jest.fn(),
}));

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();

jest.mock('../../selectors/featureFlags', () => ({
  selectStablecoinLendingEnabledFlag: jest.fn(),
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

  const USDC_TOKEN_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

  const AAVE_V3_ETHEREUM_MAINNET_POOL_CONTRACT_ADDRESS =
    CHAIN_ID_TO_AAVE_V3_POOL_CONTRACT_ADDRESS['0x1'];

  const defaultRouteParams: EarnLendingDepositConfirmationViewProps['route'] = {
    key: 'EarnLendingDepositConfirmation-abc123',
    name: 'params',
    params: {
      action: EARN_INPUT_VIEW_ACTIONS.LEND,
      amountFiat: '4.99',
      amountTokenMinimalUnit: '5000000',
      annualRewardsFiat: '0.26',
      annualRewardsToken: '260000',
      lendingContractAddress: AAVE_V3_ETHEREUM_MAINNET_POOL_CONTRACT_ADDRESS,
      lendingProtocol: 'AAVE v3',
      token: { ...MOCK_USDC_MAINNET_ASSET, address: USDC_TOKEN_ADDRESS },
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
    expect(getByTestId(DEPOSIT_FOOTER_TEST_ID)).toBeDefined();
    expect(
      getByTestId(LENDING_DEPOSIT_FOOTER_BUTTON_TEST_IDS.CANCEL_BUTTON),
    ).toBeDefined();
    expect(
      getByTestId(LENDING_DEPOSIT_FOOTER_BUTTON_TEST_IDS.CONFIRM_BUTTON),
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
      LENDING_DEPOSIT_FOOTER_BUTTON_TEST_IDS.CANCEL_BUTTON,
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
        action: EARN_INPUT_VIEW_ACTIONS.ALLOWANCE_INCREASE,
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
      LENDING_DEPOSIT_FOOTER_BUTTON_TEST_IDS.CONFIRM_BUTTON,
    );

    // Ensure we're on the approval step
    expect(queryAllByText(strings('earn.approve')).length).toBe(2);

    await act(async () => {
      fireEvent.press(approveButton);
    });

    expect(Engine.controllerMessenger.subscribeOnceIf).toHaveBeenCalledTimes(3);

    expect(mockAddTransaction).toHaveBeenCalledWith(
      {
        data: '0x095ea7b300000000000000000000000087870bca3f3fd6335c3f4ce8392d69350b4fa4e200000000000000000000000000000000000000000000000000000000004c4b40',
        from: '0xC4966c0D659D99699BFD7EB54D8fafEE40e4a756',
        to: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        value: '0',
      },
      {
        deviceConfirmedOn: 'metamask_mobile',
        networkClientId: 'mainnet',
        origin: 'metamask',
        type: 'increaseAllowance',
      },
    );
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
      LENDING_DEPOSIT_FOOTER_BUTTON_TEST_IDS.CONFIRM_BUTTON,
    );

    // Ensure we're on the deposit step
    expect(queryAllByText(strings('earn.approve')).length).toBe(1);
    expect(queryAllByText(strings('earn.deposit')).length).toBe(1);

    await act(async () => {
      fireEvent.press(depositButton);
    });

    expect(Engine.controllerMessenger.subscribeOnceIf).toHaveBeenCalledTimes(3);

    expect(mockAddTransaction).toHaveBeenCalledWith(
      {
        data: '0x617ba037000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb4800000000000000000000000000000000000000000000000000000000004c4b40000000000000000000000000c4966c0d659d99699bfd7eb54d8fafee40e4a7560000000000000000000000000000000000000000000000000000000000000000',
        from: '0xC4966c0D659D99699BFD7EB54D8fafEE40e4a756',
        to: AAVE_V3_ETHEREUM_MAINNET_POOL_CONTRACT_ADDRESS,
        value: '0',
      },
      {
        deviceConfirmedOn: 'metamask_mobile',
        networkClientId: 'mainnet',
        origin: 'metamask',
        type: 'lendingDeposit',
      },
    );
  });
});
