import { LendingMarketWithPosition } from '@metamask/earn-controller';
import { useRoute } from '@react-navigation/native';
import { act, fireEvent } from '@testing-library/react-native';
import React from 'react';
import { Linking } from 'react-native';
import EarnLendingWithdrawalConfirmationView, {
  EarnWithdrawalConfirmationViewProps,
} from '.';
import { strings } from '../../../../../../locales/i18n';
import AppConstants from '../../../../../core/AppConstants';
import Engine from '../../../../../core/Engine';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../../../util/test/accountsControllerTestUtils';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { EARN_EXPERIENCES } from '../../constants/experiences';
import { EarnTokenDetails, LendingProtocol } from '../../types/lending.types';
import { AAVE_WITHDRAWAL_RISKS } from '../../utils/tempLending';
import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { MetricsEventBuilder } from '../../../../../core/Analytics/MetricsEventBuilder';
import { useMetrics } from '../../../../hooks/useMetrics';
// eslint-disable-next-line import/no-namespace
import * as NavbarUtils from '../../../Navbar';
import { MOCK_USDC_MAINNET_ASSET } from '../../../Stake/__mocks__/stakeMockData';
import useEarnToken from '../../hooks/useEarnToken';
import {
  CONFIRMATION_FOOTER_BUTTON_TEST_IDS,
  CONFIRMATION_FOOTER_LINK_TEST_IDS,
} from '../EarnLendingDepositConfirmationView/components/ConfirmationFooter';
import Routes from '../../../../../constants/navigation/Routes';
import { trace, endTrace, TraceName } from '../../../../../util/trace';

expect.addSnapshotSerializer({
  // any is the expected type for the val parameter
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  test: (val: any) => val && val?.type === 'Image',
  print: () => `<Image />`,
});

const getStakingNavbarSpy = jest.spyOn(NavbarUtils, 'getStakingNavbar');

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useRoute: jest.fn(),
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
      setOptions: jest.fn(),
    }),
  };
});

jest.mock('../../../../hooks/useMetrics/useMetrics');

jest.mock('../../../../../core/Engine', () => ({
  controllerMessenger: {
    subscribeOnceIf: jest.fn(),
  },
  context: {
    NetworkController: {
      getNetworkConfigurationByChainId: jest.fn().mockReturnValue({
        blockExplorerUrls: [],
        chainId: '0xe708',
        defaultRpcEndpointIndex: 0,
        name: 'Linea',
        nativeCurrency: 'ETH',
        rpcEndpoints: [
          {
            failoverUrls: [],
            networkClientId: 'linea-mainnet',
            type: 'infura',
            url: 'https://linea-mainnet.infura.io/v3/{infuraProjectId}',
          },
        ],
      }),
      findNetworkClientIdByChainId: jest.fn().mockReturnValue('linea-mainnet'),
    },
    EarnController: {
      executeLendingWithdraw: jest.fn(() => ({
        transactionMeta: { id: '123' },
      })),
    },
    TokensController: {
      addToken: jest.fn().mockResolvedValue([]),
    },
  },
}));

jest.mock('../../../../../util/trace', () => ({
  ...jest.requireActual('../../../../../util/trace'),
  trace: jest.fn(),
  endTrace: jest.fn(),
}));

const mockLineaAUsdcExperience = {
  apr: '2.099841551444753',
  estimatedAnnualRewardsFiatNumber: 0.07599473563587163,
  estimatedAnnualRewardsFormatted: '$0.08',
  estimatedAnnualRewardsTokenFormatted: '0.07604 AUSDC',
  estimatedAnnualRewardsTokenMinimalUnit: '76036',
  market: {
    protocol: 'aave',
    underlying: {
      address: '0x176211869ca2b568f2a7d4ee941e073a821ee1ff',
      chainId: 59144,
    },
  } as LendingMarketWithPosition,
  type: EARN_EXPERIENCES.STABLECOIN_LENDING,
};

const mockLineaAUsdc = {
  address: '0x374D7860c4f2f604De0191298dD393703Cce84f3',
  aggregators: ['Metamask', 'LineaTeam', 'LiFi'],
  balanceFiat: '$3.62',
  balanceFiatNumber: 3.61907,
  balanceFormatted: '3.62106 AUSDC',
  balanceMinimalUnit: '3621061',
  chainId: '0xe708',
  decimals: 6,
  experience: mockLineaAUsdcExperience,
  experiences: [mockLineaAUsdcExperience],
  image:
    'https://static.cx.metamask.io/api/v1/tokenIcons/59144/0x374d7860c4f2f604de0191298dd393703cce84f3.png',
  isETH: false,
  isNative: false,
  isStaked: false,
  name: 'Aave Linea USDC',
  symbol: 'AUSDC',
  token: 'Aave Linea USDC',
  tokenUsdExchangeRate: 0.9994519022078041,
} as EarnTokenDetails;

jest.mock('../../hooks/useEarnToken', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    earnTokenPair: {
      earnToken: MOCK_USDC_MAINNET_ASSET,
      outputToken: mockLineaAUsdc,
    },
    getTokenSnapshot: jest.fn(),
  })),
}));

describe('EarnLendingWithdrawalConfirmationView', () => {
  const mockInitialState = {
    engine: {
      backgroundState: {
        ...backgroundState,
        AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
      },
    },
  };

  const defaultRouteParams: EarnWithdrawalConfirmationViewProps['route'] = {
    key: 'mock-key',
    name: 'params',
    params: {
      token: mockLineaAUsdc,
      amountTokenMinimalUnit: '1000000',
      amountFiat: '0.99',
      lendingContractAddress: '0xc47b8C00b0f69a36fa203Ffeac0334874574a8Ac',
      lendingProtocol: LendingProtocol.AAVE,
      healthFactorSimulation: {
        after: 'INFINITE',
        before: 'INFINITE',
        risk: AAVE_WITHDRAWAL_RISKS.LOW,
      },
    },
  };

  const mockTrackEvent = jest.fn();
  const useMetricsMock = jest.mocked(useMetrics);
  const mockTrace = jest.mocked(trace);
  const mockEndTrace = jest.mocked(endTrace);

  beforeEach(() => {
    jest.clearAllMocks();

    (useRoute as jest.MockedFunction<typeof useRoute>).mockReturnValue(
      defaultRouteParams,
    );

    useMetricsMock.mockReturnValue({
      trackEvent: mockTrackEvent,
      createEventBuilder: MetricsEventBuilder.createEventBuilder,
    } as unknown as ReturnType<typeof useMetrics>);
  });

  it('matches snapshot', () => {
    const { toJSON } = renderWithProvider(
      <EarnLendingWithdrawalConfirmationView />,
      {
        state: mockInitialState,
      },
    );

    // Assert Navbar was updated
    expect(getStakingNavbarSpy).toHaveBeenCalledWith(
      strings('earn.withdraw'),
      expect.any(Object), // navigation object
      expect.any(Object), // theme.colors
      {
        hasCancelButton: false,
        backgroundColor: '#f3f5f9',
      },
      {
        backButtonEvent: {
          event: {
            category: 'Earn Lending Withdraw Confirmation Back Clicked',
          },
          properties: {
            experience: 'STABLECOIN_LENDING',
            location: 'EarnLendingWithdrawConfirmationView',
            selected_provider: 'consensys',
            token: 'AUSDC',
            transaction_value: '1 AUSDC',
            user_token_balance: '3.62106 AUSDC',
          },
        },
      },
    );

    expect(toJSON()).toMatchSnapshot();
  });

  // TODO: https://consensyssoftware.atlassian.net/browse/STAKE-1044 Add back in v1.1
  it.skip('displays advanced details section when user has detected borrow positions', () => {
    (useRoute as jest.MockedFunction<typeof useRoute>).mockReturnValue({
      ...defaultRouteParams,
      params: {
        ...defaultRouteParams.params,
        healthFactorSimulation: {
          after: '14.2',
          before: '15.1',
          risk: AAVE_WITHDRAWAL_RISKS.LOW,
        },
      },
    });

    const { getByText } = renderWithProvider(
      <EarnLendingWithdrawalConfirmationView />,
      {
        state: mockInitialState,
      },
    );

    expect(getByText(strings('stake.advanced_details'))).toBeTruthy();
  });

  it('navigates back when cancel button is pressed', async () => {
    const { getByTestId } = renderWithProvider(
      <EarnLendingWithdrawalConfirmationView />,
      {
        state: mockInitialState,
      },
    );

    const footerCancelButton = getByTestId(
      CONFIRMATION_FOOTER_BUTTON_TEST_IDS.CANCEL_BUTTON,
    );

    await act(async () => {
      fireEvent.press(footerCancelButton);
    });

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('executes lending withdrawal transaction when confirm button is pressed', async () => {
    const { getByTestId } = renderWithProvider(
      <EarnLendingWithdrawalConfirmationView />,
      {
        state: mockInitialState,
      },
    );

    const footerConfirmationButton = getByTestId(
      CONFIRMATION_FOOTER_BUTTON_TEST_IDS.CONFIRM_BUTTON,
    );

    await act(async () => {
      fireEvent.press(footerConfirmationButton);
    });

    expect(
      Engine.context.EarnController.executeLendingWithdraw,
    ).toHaveBeenCalledWith({
      amount: '1000000',
      chainId: '0xe708',
      gasOptions: {
        gasLimit: 'none',
      },
      protocol: LendingProtocol.AAVE,
      txOptions: {
        deviceConfirmedOn: 'metamask_mobile',
        networkClientId: 'linea-mainnet',
        origin: 'metamask',
        type: 'lendingWithdraw',
      },
      underlyingTokenAddress: '0x176211869ca2b568f2a7d4ee941e073a821ee1ff',
    });

    // Assert creation of transaction listeners
    expect(Engine.controllerMessenger.subscribeOnceIf).toHaveBeenNthCalledWith(
      1,
      'TransactionController:transactionDropped',
      expect.any(Function),
      expect.any(Function),
    );

    expect(Engine.controllerMessenger.subscribeOnceIf).toHaveBeenNthCalledWith(
      2,
      'TransactionController:transactionRejected',
      expect.any(Function),
      expect.any(Function),
    );

    expect(Engine.controllerMessenger.subscribeOnceIf).toHaveBeenNthCalledWith(
      3,
      'TransactionController:transactionFailed',
      expect.any(Function),
      expect.any(Function),
    );

    expect(Engine.controllerMessenger.subscribeOnceIf).toHaveBeenNthCalledWith(
      4,
      'TransactionController:transactionSubmitted',
      expect.any(Function),
      expect.any(Function),
    );
  });

  it('Redirects to terms of use when footer terms of use is pressed', async () => {
    const { getByTestId } = renderWithProvider(
      <EarnLendingWithdrawalConfirmationView />,
      {
        state: mockInitialState,
      },
    );

    const footerTermsOfUseLink = getByTestId(
      CONFIRMATION_FOOTER_LINK_TEST_IDS.TERMS_OF_USE_BUTTON,
    );

    await act(async () => {
      fireEvent.press(footerTermsOfUseLink);
    });

    expect(Linking.openURL).toHaveBeenLastCalledWith(
      AppConstants.URLS.TERMS_OF_USE,
    );
  });

  it('Redirects to risk disclosure when footer risk disclosure is pressed', async () => {
    const { getByTestId } = renderWithProvider(
      <EarnLendingWithdrawalConfirmationView />,
      {
        state: mockInitialState,
      },
    );

    const footerRiskDisclosureButton = getByTestId(
      CONFIRMATION_FOOTER_LINK_TEST_IDS.RISK_DISCLOSURE_BUTTON,
    );

    await act(async () => {
      fireEvent.press(footerRiskDisclosureButton);
    });

    expect(Linking.openURL).toHaveBeenLastCalledWith(
      AppConstants.URLS.EARN_RISK_DISCLOSURE,
    );
  });

  it('handles token import and confirmation via subscription listener when no earnToken is present', async () => {
    // Update the mock to return no earnToken
    (useEarnToken as jest.Mock).mockReturnValueOnce({
      earnTokenPair: {
        earnToken: null,
        outputToken: mockLineaAUsdc,
      },
      getTokenSnapshot: jest.fn(),
    });

    const { getByTestId } = renderWithProvider(
      <EarnLendingWithdrawalConfirmationView />,
      {
        state: mockInitialState,
      },
    );

    const footerConfirmationButton = getByTestId(
      CONFIRMATION_FOOTER_BUTTON_TEST_IDS.CONFIRM_BUTTON,
    );

    // Mock the subscription callback
    let subscriptionCallback:
      | ((event: { transaction: { hash: string; status: string } }) => void)
      | undefined;
    (
      Engine.controllerMessenger.subscribeOnceIf as jest.Mock
    ).mockImplementation((event, callback) => {
      if (event === 'TransactionController:transactionConfirmed') {
        subscriptionCallback = callback;
      }
      return () => {
        // Cleanup function
      };
    });

    await act(async () => {
      fireEvent.press(footerConfirmationButton);
    });

    // Simulate transaction submission
    await act(async () => {
      if (subscriptionCallback) {
        subscriptionCallback({
          transaction: {
            hash: '0x123',
            status: 'submitted',
          },
        });
      }
    });

    // Verify the transaction was executed
    expect(
      Engine.context.EarnController.executeLendingWithdraw,
    ).toHaveBeenCalledWith({
      amount: '1000000',
      chainId: '0xe708',
      gasOptions: {
        gasLimit: 'none',
      },
      protocol: LendingProtocol.AAVE,
      txOptions: {
        deviceConfirmedOn: 'metamask_mobile',
        networkClientId: 'linea-mainnet',
        origin: 'metamask',
        type: 'lendingWithdraw',
      },
      underlyingTokenAddress: '0x176211869ca2b568f2a7d4ee941e073a821ee1ff',
    });

    expect(Engine.context.TokensController.addToken).toHaveBeenCalledTimes(1);
  });

  it('should handle error adding counter-token on confirmation', async () => {
    // Update the mock to return no earnToken
    (useEarnToken as jest.Mock).mockReturnValueOnce({
      earnTokenPair: {
        earnToken: null,
        outputToken: mockLineaAUsdc,
      },
      getTokenSnapshot: jest.fn(),
    });

    (
      Engine.context.NetworkController.findNetworkClientIdByChainId as jest.Mock
    ).mockImplementationOnce(() => {
      throw new Error('Invalid chain ID');
    });

    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {
        // Do nothing
      });

    const { getByTestId } = renderWithProvider(
      <EarnLendingWithdrawalConfirmationView />,
      {
        state: mockInitialState,
      },
    );

    const footerConfirmationButton = getByTestId(
      CONFIRMATION_FOOTER_BUTTON_TEST_IDS.CONFIRM_BUTTON,
    );

    // Mock the subscription callback
    let subscriptionCallback:
      | ((event: { transaction: { hash: string; status: string } }) => void)
      | undefined;
    (
      Engine.controllerMessenger.subscribeOnceIf as jest.Mock
    ).mockImplementation((event, callback) => {
      if (event === 'TransactionController:transactionConfirmed') {
        subscriptionCallback = callback;
      }
      return () => {
        // Cleanup function
      };
    });

    await act(async () => {
      fireEvent.press(footerConfirmationButton);
    });

    // Simulate transaction submission
    await act(async () => {
      if (subscriptionCallback) {
        subscriptionCallback({
          transaction: {
            hash: '0x123',
            status: 'submitted',
          },
        });
      }
    });

    // Verify the transaction was executed
    expect(
      Engine.context.EarnController.executeLendingWithdraw,
    ).toHaveBeenCalledWith({
      amount: '1000000',
      chainId: '0xe708',
      gasOptions: {
        gasLimit: 'none',
      },
      protocol: LendingProtocol.AAVE,
      txOptions: {
        deviceConfirmedOn: 'metamask_mobile',
        networkClientId: 'linea-mainnet',
        origin: 'metamask',
        type: 'lendingWithdraw',
      },
      underlyingTokenAddress: '0x176211869ca2b568f2a7d4ee941e073a821ee1ff',
    });

    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);

    // Clean up the spy
    consoleErrorSpy.mockRestore();
  });

  it('should use MaxUint256 when amountTokenMinimalUnit equals balanceMinimalUnit', async () => {
    // Mock the route params to have amountTokenMinimalUnit equal to balanceMinimalUnit
    (useRoute as jest.MockedFunction<typeof useRoute>).mockReturnValue({
      ...defaultRouteParams,
      params: {
        ...defaultRouteParams.params,
        amountTokenMinimalUnit: mockLineaAUsdc.balanceMinimalUnit, // Set to balance
      },
    });

    const { getByTestId } = renderWithProvider(
      <EarnLendingWithdrawalConfirmationView />,
      {
        state: mockInitialState,
      },
    );

    const footerConfirmationButton = getByTestId(
      CONFIRMATION_FOOTER_BUTTON_TEST_IDS.CONFIRM_BUTTON,
    );

    await act(async () => {
      fireEvent.press(footerConfirmationButton);
    });

    // Verify that MaxUint256 was used instead of the actual amount
    expect(
      Engine.context.EarnController.executeLendingWithdraw,
    ).toHaveBeenCalledWith({
      amount:
        '115792089237316195423570985008687907853269984665640564039457584007913129639935', // MaxUint256
      chainId: '0xe708',
      gasOptions: {
        gasLimit: 'none',
      },
      protocol: LendingProtocol.AAVE,
      txOptions: {
        deviceConfirmedOn: 'metamask_mobile',
        networkClientId: 'linea-mainnet',
        origin: 'metamask',
        type: 'lendingWithdraw',
      },
      underlyingTokenAddress: '0x176211869ca2b568f2a7d4ee941e073a821ee1ff',
    });
  });

  it('should use actual amount when amountTokenMinimalUnit does not equal balanceMinimalUnit', async () => {
    // Mock the route params to have amountTokenMinimalUnit different from balanceMinimalUnit
    (useRoute as jest.MockedFunction<typeof useRoute>).mockReturnValue({
      ...defaultRouteParams,
      params: {
        ...defaultRouteParams.params,
        amountTokenMinimalUnit: '500000', // Different from balance
      },
    });

    const { getByTestId } = renderWithProvider(
      <EarnLendingWithdrawalConfirmationView />,
      {
        state: mockInitialState,
      },
    );

    const footerConfirmationButton = getByTestId(
      CONFIRMATION_FOOTER_BUTTON_TEST_IDS.CONFIRM_BUTTON,
    );

    await act(async () => {
      fireEvent.press(footerConfirmationButton);
    });

    // Verify that the actual amount was used
    expect(
      Engine.context.EarnController.executeLendingWithdraw,
    ).toHaveBeenCalledWith({
      amount: '500000', // Actual amount, not MaxUint256
      chainId: '0xe708',
      gasOptions: {
        gasLimit: 'none',
      },
      protocol: LendingProtocol.AAVE,
      txOptions: {
        deviceConfirmedOn: 'metamask_mobile',
        networkClientId: 'linea-mainnet',
        origin: 'metamask',
        type: 'lendingWithdraw',
      },
      underlyingTokenAddress: '0x176211869ca2b568f2a7d4ee941e073a821ee1ff',
    });
  });

  describe('Analytics', () => {
    it('should track EARN_CONFIRMATION_PAGE_VIEWED on render', () => {
      renderWithProvider(<EarnLendingWithdrawalConfirmationView />, {
        state: mockInitialState,
      });

      expect(mockTrackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Earn confirmation page viewed',
          properties: {
            action_type: 'withdrawal',
            experience: 'STABLECOIN_LENDING',
            network: 'Linea',
            token: 'USDC',
            transaction_value: '1 AUSDC',
            user_token_balance: '3.62106 AUSDC',
          },
        }),
      );
    });

    it('should track EARN_ACTION_SUBMITTED and EARN_TRANSACTION_INITIATED on confirm', async () => {
      const mockExecuteLendingWithdraw = Engine.context.EarnController
        .executeLendingWithdraw as jest.MockedFunction<
        typeof Engine.context.EarnController.executeLendingWithdraw
      >;

      mockExecuteLendingWithdraw.mockResolvedValue({
        // @ts-expect-error overriding
        transactionMeta: {
          id: '123',
          type: TransactionType.lendingWithdraw,
        },
      });

      const { getByTestId } = renderWithProvider(
        <EarnLendingWithdrawalConfirmationView />,
        { state: mockInitialState },
      );

      // Clear previous calls from the initial render
      mockTrackEvent.mockClear();

      const confirmButton = getByTestId(
        CONFIRMATION_FOOTER_BUTTON_TEST_IDS.CONFIRM_BUTTON,
      );

      await act(async () => {
        fireEvent.press(confirmButton);
      });

      // Check that EARN_ACTION_SUBMITTED was tracked
      expect(mockTrackEvent).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          name: 'Earn Action submitted',
          properties: {
            action_type: 'withdrawal',
            experience: 'STABLECOIN_LENDING',
            network: 'Linea',
            token: 'USDC',
            transaction_value: '1 AUSDC',
            user_token_balance: '3.62106 AUSDC',
          },
        }),
      );

      // Check that EARN_TRANSACTION_INITIATED was tracked
      expect(mockTrackEvent).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          name: 'Earn Transaction Initiated',
          properties: {
            action_type: 'withdrawal',
            experience: 'STABLECOIN_LENDING',
            network: 'Linea',
            token: 'USDC',
            transaction_id: '123',
            transaction_type: 'lendingWithdraw',
            transaction_value: '1 AUSDC',
            user_token_balance: '3.62106 AUSDC',
          },
        }),
      );
    });

    it('should track EARN_TRANSACTION_DROPPED when transaction is dropped', async () => {
      const mockExecuteLendingWithdraw = Engine.context.EarnController
        .executeLendingWithdraw as jest.MockedFunction<
        typeof Engine.context.EarnController.executeLendingWithdraw
      >;
      const transactionId = '123';

      mockExecuteLendingWithdraw.mockResolvedValue({
        transactionMeta: {
          id: transactionId,
          type: TransactionType.lendingWithdraw,
        } as TransactionMeta,
        result: Promise.resolve(''),
      });

      let transactionStatusCallbackDropped:
        | ((event: { transactionMeta: Partial<TransactionMeta> }) => void)
        | undefined;
      jest
        .mocked(Engine.controllerMessenger.subscribeOnceIf)
        .mockImplementation((eventName: string, callback: unknown) => {
          if (eventName === 'TransactionController:transactionDropped') {
            transactionStatusCallbackDropped = callback as (event: {
              transactionMeta: Partial<TransactionMeta>;
            }) => void;
          }
          return jest.fn();
        });

      const { getByTestId } = renderWithProvider(
        <EarnLendingWithdrawalConfirmationView />,
        { state: mockInitialState },
      );

      const confirmButton = getByTestId(
        CONFIRMATION_FOOTER_BUTTON_TEST_IDS.CONFIRM_BUTTON,
      );

      await act(async () => {
        fireEvent.press(confirmButton);
      });

      // Clear previous tracking calls
      mockTrackEvent.mockClear();

      // Simulate transaction dropped event
      await act(async () => {
        if (transactionStatusCallbackDropped) {
          transactionStatusCallbackDropped({
            transactionMeta: { id: transactionId },
          });
        }
      });

      expect(mockTrackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Earn Transaction Dropped',
          properties: {
            action_type: 'withdrawal',
            experience: 'STABLECOIN_LENDING',
            network: 'Linea',
            token: 'USDC',
            transaction_id: '123',
            transaction_type: 'lendingWithdraw',
            transaction_value: '1 AUSDC',
            user_token_balance: '3.62106 AUSDC',
          },
        }),
      );
    });

    it('should track transaction status events for withdrawal', async () => {
      const mockExecuteLendingWithdraw = Engine.context.EarnController
        .executeLendingWithdraw as jest.MockedFunction<
        typeof Engine.context.EarnController.executeLendingWithdraw
      >;
      const transactionId = '123';

      mockExecuteLendingWithdraw.mockResolvedValue({
        transactionMeta: {
          id: transactionId,
          type: TransactionType.lendingWithdraw,
        } as TransactionMeta,
        result: Promise.resolve(''),
      });

      let transactionStatusCallbackRejected:
        | ((event: { transactionMeta: Partial<TransactionMeta> }) => void)
        | undefined;
      let transactionStatusCallbackSubmitted:
        | ((event: { transactionMeta: Partial<TransactionMeta> }) => void)
        | undefined;
      let transactionStatusCallbackConfirmed1:
        | ((transactionMeta: Partial<TransactionMeta>) => void)
        | undefined;
      let transactionStatusCallbackConfirmed2:
        | ((transactionMeta: Partial<TransactionMeta>) => void)
        | undefined;
      let transactionStatusCallbackFailed:
        | ((event: { transactionMeta: Partial<TransactionMeta> }) => void)
        | undefined;
      let confirmedCallbackCount = 0;

      jest
        .mocked(Engine.controllerMessenger.subscribeOnceIf)
        .mockImplementation((eventName: string, callback: unknown) => {
          if (eventName === 'TransactionController:transactionRejected') {
            transactionStatusCallbackRejected = callback as (event: {
              transactionMeta: Partial<TransactionMeta>;
            }) => void;
          } else if (
            eventName === 'TransactionController:transactionSubmitted'
          ) {
            transactionStatusCallbackSubmitted = callback as (event: {
              transactionMeta: Partial<TransactionMeta>;
            }) => void;
          } else if (
            eventName === 'TransactionController:transactionConfirmed'
          ) {
            if (confirmedCallbackCount === 0) {
              transactionStatusCallbackConfirmed1 = callback as (
                transactionMeta: Partial<TransactionMeta>,
              ) => void;
            } else {
              transactionStatusCallbackConfirmed2 = callback as (
                transactionMeta: Partial<TransactionMeta>,
              ) => void;
            }
            confirmedCallbackCount++;
          } else if (eventName === 'TransactionController:transactionFailed') {
            transactionStatusCallbackFailed = callback as (event: {
              transactionMeta: Partial<TransactionMeta>;
            }) => void;
          }
          return jest.fn();
        });

      const { getByTestId } = renderWithProvider(
        <EarnLendingWithdrawalConfirmationView />,
        { state: mockInitialState },
      );

      const confirmButton = getByTestId(
        CONFIRMATION_FOOTER_BUTTON_TEST_IDS.CONFIRM_BUTTON,
      );

      await act(async () => {
        fireEvent.press(confirmButton);
      });

      // Clear previous tracking calls
      mockTrackEvent.mockClear();

      // Test transaction rejected
      await act(async () => {
        if (transactionStatusCallbackRejected) {
          transactionStatusCallbackRejected({
            transactionMeta: { id: transactionId },
          });
        }
      });

      expect(mockTrackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Earn Transaction Rejected',
          properties: {
            action_type: 'withdrawal',
            experience: 'STABLECOIN_LENDING',
            network: 'Linea',
            token: 'USDC',
            transaction_id: '123',
            transaction_type: 'lendingWithdraw',
            transaction_value: '1 AUSDC',
            user_token_balance: '3.62106 AUSDC',
          },
        }),
      );

      mockTrackEvent.mockClear();

      // Test transaction failed
      await act(async () => {
        if (transactionStatusCallbackFailed) {
          transactionStatusCallbackFailed({
            transactionMeta: { id: transactionId },
          });
        }
      });

      expect(mockTrackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Earn Transaction Failed',
          properties: {
            action_type: 'withdrawal',
            experience: 'STABLECOIN_LENDING',
            network: 'Linea',
            token: 'USDC',
            transaction_id: '123',
            transaction_type: 'lendingWithdraw',
            transaction_value: '1 AUSDC',
            user_token_balance: '3.62106 AUSDC',
          },
        }),
      );

      mockTrackEvent.mockClear();

      // Test transaction submitted
      await act(async () => {
        if (transactionStatusCallbackSubmitted) {
          transactionStatusCallbackSubmitted({
            transactionMeta: { id: transactionId },
          });
        }
      });

      expect(mockTrackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Earn Transaction Submitted',
          properties: {
            action_type: 'withdrawal',
            experience: 'STABLECOIN_LENDING',
            network: 'Linea',
            token: 'USDC',
            transaction_id: '123',
            transaction_type: 'lendingWithdraw',
            transaction_value: '1 AUSDC',
            user_token_balance: '3.62106 AUSDC',
          },
        }),
      );

      // Wait for the setTimeout to be called before checking for navigation
      // as the navigation is handled by a setTimeout to avoid a race condition
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.TRANSACTIONS_VIEW);

      mockTrackEvent.mockClear();

      // Test transaction confirmed (both listeners)
      await act(async () => {
        if (transactionStatusCallbackConfirmed1) {
          transactionStatusCallbackConfirmed1({ id: transactionId });
        }
        if (transactionStatusCallbackConfirmed2) {
          transactionStatusCallbackConfirmed2({ id: transactionId });
        }
      });

      expect(mockTrackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Earn Transaction Confirmed',
          properties: {
            action_type: 'withdrawal',
            experience: 'STABLECOIN_LENDING',
            network: 'Linea',
            token: 'USDC',
            transaction_id: '123',
            transaction_type: 'lendingWithdraw',
            transaction_value: '1 AUSDC',
            user_token_balance: '3.62106 AUSDC',
          },
        }),
      );
    });
  });

  describe('Tracing', () => {
    it('should call trace and endTrace with EarnWithdrawConfirmationScreen when confirm button is pressed', async () => {
      const mockExecuteLendingWithdraw = Engine.context.EarnController
        .executeLendingWithdraw as jest.MockedFunction<
        typeof Engine.context.EarnController.executeLendingWithdraw
      >;

      mockExecuteLendingWithdraw.mockResolvedValue({
        transactionMeta: {
          id: '123',
          type: TransactionType.lendingWithdraw,
        } as TransactionMeta,
        result: Promise.resolve(''),
      });

      const { getByTestId } = renderWithProvider(
        <EarnLendingWithdrawalConfirmationView />,
        { state: mockInitialState },
      );

      const confirmButton = getByTestId(
        CONFIRMATION_FOOTER_BUTTON_TEST_IDS.CONFIRM_BUTTON,
      );

      await act(async () => {
        fireEvent.press(confirmButton);
      });

      expect(mockTrace).toHaveBeenCalledWith({
        name: TraceName.EarnWithdrawConfirmationScreen,
        data: {
          chainId: mockLineaAUsdc.chainId,
          experience: EARN_EXPERIENCES.STABLECOIN_LENDING,
        },
      });

      expect(mockEndTrace).toHaveBeenCalledWith({
        name: TraceName.EarnWithdrawConfirmationScreen,
      });
    });

    it('should call trace with EarnLendingWithdrawTxConfirmed when transaction is submitted', async () => {
      const mockExecuteLendingWithdraw = Engine.context.EarnController
        .executeLendingWithdraw as jest.MockedFunction<
        typeof Engine.context.EarnController.executeLendingWithdraw
      >;
      const transactionId = '123';

      mockExecuteLendingWithdraw.mockResolvedValue({
        transactionMeta: {
          id: transactionId,
          type: TransactionType.lendingWithdraw,
        } as TransactionMeta,
        result: Promise.resolve(''),
      });

      let transactionStatusCallbackSubmitted:
        | ((event: { transactionMeta: Partial<TransactionMeta> }) => void)
        | undefined;
      jest
        .mocked(Engine.controllerMessenger.subscribeOnceIf)
        .mockImplementation((eventName: string, callback: unknown) => {
          if (eventName === 'TransactionController:transactionSubmitted') {
            transactionStatusCallbackSubmitted = callback as (event: {
              transactionMeta: Partial<TransactionMeta>;
            }) => void;
          }
          return jest.fn();
        });

      const { getByTestId } = renderWithProvider(
        <EarnLendingWithdrawalConfirmationView />,
        { state: mockInitialState },
      );

      const confirmButton = getByTestId(
        CONFIRMATION_FOOTER_BUTTON_TEST_IDS.CONFIRM_BUTTON,
      );

      await act(async () => {
        fireEvent.press(confirmButton);
      });

      mockTrace.mockClear();

      await act(async () => {
        if (transactionStatusCallbackSubmitted) {
          transactionStatusCallbackSubmitted({
            transactionMeta: { id: transactionId },
          });
        }
      });

      expect(mockTrace).toHaveBeenCalledWith({
        name: TraceName.EarnLendingWithdrawTxConfirmed,
        data: {
          chainId: mockLineaAUsdc.chainId,
          experience: EARN_EXPERIENCES.STABLECOIN_LENDING,
        },
      });
    });

    it('should call endTrace with EarnLendingWithdrawTxConfirmed when transaction is confirmed', async () => {
      const mockExecuteLendingWithdraw = Engine.context.EarnController
        .executeLendingWithdraw as jest.MockedFunction<
        typeof Engine.context.EarnController.executeLendingWithdraw
      >;
      const transactionId = '123';

      mockExecuteLendingWithdraw.mockResolvedValue({
        transactionMeta: {
          id: transactionId,
          type: TransactionType.lendingWithdraw,
        } as TransactionMeta,
        result: Promise.resolve(''),
      });

      let transactionStatusCallbackConfirmed1:
        | ((transactionMeta: Partial<TransactionMeta>) => void)
        | undefined;
      let transactionStatusCallbackConfirmed2:
        | ((transactionMeta: Partial<TransactionMeta>) => void)
        | undefined;
      let confirmedCallbackCount = 0;

      jest
        .mocked(Engine.controllerMessenger.subscribeOnceIf)
        .mockImplementation((eventName: string, callback: unknown) => {
          if (eventName === 'TransactionController:transactionConfirmed') {
            if (confirmedCallbackCount === 0) {
              transactionStatusCallbackConfirmed1 = callback as (
                transactionMeta: Partial<TransactionMeta>,
              ) => void;
            } else {
              transactionStatusCallbackConfirmed2 = callback as (
                transactionMeta: Partial<TransactionMeta>,
              ) => void;
            }
            confirmedCallbackCount++;
          }
          return jest.fn();
        });

      const { getByTestId } = renderWithProvider(
        <EarnLendingWithdrawalConfirmationView />,
        { state: mockInitialState },
      );

      const confirmButton = getByTestId(
        CONFIRMATION_FOOTER_BUTTON_TEST_IDS.CONFIRM_BUTTON,
      );

      await act(async () => {
        fireEvent.press(confirmButton);
      });

      mockEndTrace.mockClear();

      // Test transaction confirmed (both listeners)
      await act(async () => {
        if (transactionStatusCallbackConfirmed1) {
          transactionStatusCallbackConfirmed1({ id: transactionId });
        }
        if (transactionStatusCallbackConfirmed2) {
          transactionStatusCallbackConfirmed2({ id: transactionId });
        }
      });

      expect(mockEndTrace).toHaveBeenCalledWith({
        name: TraceName.EarnLendingWithdrawTxConfirmed,
      });
    });
  });
});
