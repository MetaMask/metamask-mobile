import {
  Result,
  TransactionStatus,
  TransactionType,
  type TransactionMeta,
} from '@metamask/transaction-controller';
import { useRoute } from '@react-navigation/native';
import { act, fireEvent } from '@testing-library/react-native';
import React, { ReactNode } from 'react';
import EarnLendingDepositConfirmationView, {
  EarnLendingDepositConfirmationViewProps,
} from '.';
import { strings } from '../../../../../../locales/i18n';
import Engine from '../../../../../core/Engine';
import { MOCK_ADDRESS_2 } from '../../../../../util/test/accountsControllerTestUtils';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { MetaMetricsEvents } from '../../../../hooks/useMetrics';
import { getStakingNavbar } from '../../../Navbar';
import {
  MOCK_AUSDT_MAINNET_ASSET,
  MOCK_USDC_MAINNET_ASSET,
  MOCK_USDT_MAINNET_ASSET,
} from '../../../Stake/__mocks__/stakeMockData';
import { EARN_EXPERIENCES } from '../../constants/experiences';
import useEarnToken from '../../hooks/useEarnToken';
import { selectStablecoinLendingEnabledFlag } from '../../selectors/featureFlags';
import { EARN_LENDING_ACTIONS } from '../../types/lending.types';
import { CHAIN_ID_TO_AAVE_V3_POOL_CONTRACT_ADDRESS } from '../../utils/tempLending';
import {
  CONFIRMATION_FOOTER_BUTTON_TEST_IDS,
  CONFIRMATION_FOOTER_TEST_ID,
} from './components/ConfirmationFooter';
import { DEPOSIT_DETAILS_SECTION_TEST_ID } from './components/DepositInfoSection';
import { DEPOSIT_RECEIVE_SECTION_TEST_ID } from './components/DepositReceiveSection';
import Routes from '../../../../../constants/navigation/Routes';
import { PROGRESS_STEPPER_TEST_IDS } from './components/ProgressStepper';
import { endTrace, trace, TraceName } from '../../../../../util/trace';
import Logger from '../../../../../util/Logger';

type TxCallback = (event: {
  transactionMeta: Partial<TransactionMeta>;
}) => void;

jest.mock('../../../../../selectors/multichainAccounts/accounts', () => ({
  selectSelectedInternalAccountByScope: jest.fn(() => () => ({
    address: MOCK_ADDRESS_2,
  })),
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

jest.mock('../../hooks/useEarnToken', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
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
    earnTokenPair: {
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
    },
    getTokenSnapshot: jest.fn(),
    getEstimatedAnnualRewardsForAmount: () => ({
      estimatedAnnualRewardsFormatted: '$45.00',
      estimatedAnnualRewardsFiatNumber: 45,
      estimatedAnnualRewardsTokenMinimalUnit: '45000000',
      estimatedAnnualRewardsTokenFormatted: '45 USDC',
    }),
  })),
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
      findNetworkClientIdByChainId: jest.fn(() => 'mainnet'),
    },
    TransactionController: {
      addTransaction: jest.fn(),
    },
    EarnController: {
      executeLendingDeposit: jest.fn(),
      executeLendingTokenApprove: jest.fn(),
    },
    TokensController: {
      addToken: jest.fn().mockResolvedValue([]),
    },
  },
  controllerMessenger: {
    subscribeOnceIf: jest.fn(),
  },
}));

const mockTrackEvent = jest.fn();

const mockCreateEventBuilder = jest.fn((eventName) => {
  let properties = {};
  return {
    addProperties(props: Record<string, unknown>) {
      properties = { ...properties, ...props };
      return this;
    },
    build() {
      return {
        name: eventName,
        properties,
      };
    },
  };
});

jest.mock('../../../../hooks/useMetrics', () => {
  const actual = jest.requireActual('../../../../hooks/useMetrics');
  return {
    ...actual,
    useMetrics: () => ({
      trackEvent: mockTrackEvent,
      createEventBuilder: mockCreateEventBuilder,
    }),
    withMetricsAwareness: (Component: ReactNode) => Component,
  };
});

jest.mock('../../../../../util/trace', () => ({
  ...jest.requireActual('../../../../../util/trace'),
  endTrace: jest.fn(),
  trace: jest.fn(),
}));

describe('EarnLendingDepositConfirmationView', () => {
  jest.mocked(getStakingNavbar);

  const mockExecuteLendingDeposit = jest.mocked(
    Engine.context.EarnController.executeLendingDeposit,
  );

  const mockExecuteLendingTokenApprove = jest.mocked(
    Engine.context.EarnController.executeLendingTokenApprove,
  );

  const mockFindNetworkClientIdByChainId = jest.mocked(
    Engine.context.NetworkController.findNetworkClientIdByChainId,
  );

  const mockEndTrace = jest.mocked(endTrace);
  const mockTrace = jest.mocked(trace);

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
  });

  it('matches snapshot', () => {
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
    expect(getByTestId(CONFIRMATION_FOOTER_TEST_ID)).toBeDefined();
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

  describe('USDT token allowance reset edge case', () => {
    beforeEach(() => {
      jest.clearAllMocks();

      const routeParamsWithApproveAction = {
        ...defaultRouteParams,
        params: {
          ...defaultRouteParams.params,
          action: EARN_LENDING_ACTIONS.ALLOWANCE_INCREASE,
          token: MOCK_USDT_MAINNET_ASSET,
          amountTokenMinimalUnit: '5000000',
          // Existing non-zero allowance will need reset
          allowanceMinimalTokenUnit: '1000000',
        },
      };

      (useRoute as jest.Mock).mockReturnValue(routeParamsWithApproveAction);

      (useEarnToken as jest.Mock).mockReturnValueOnce({
        earnTokenPair: {
          outputToken: undefined,
          earnToken: {
            ...MOCK_USDT_MAINNET_ASSET,
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
                  address: MOCK_USDT_MAINNET_ASSET.address,
                },
                outputToken: {
                  address: MOCK_AUSDT_MAINNET_ASSET.address,
                },
              },
            },
          },
        },
        getTokenSnapshot: jest.fn(),
      });
    });

    it('renders allowance reset step for USDT on Ethereum mainnet', () => {
      const { getByText, getAllByTestId } = renderWithProvider(
        <EarnLendingDepositConfirmationView />,
        {
          state: mockInitialState,
        },
      );

      expect(getByText(strings('earn.allowance_reset'))).toBeDefined();
      // 3 Pending Steps
      expect(
        getAllByTestId(PROGRESS_STEPPER_TEST_IDS.STEP_ICON.PENDING),
      ).toHaveLength(3);
    });

    it('initiates token allowance reset on confirm', async () => {
      const { getByTestId } = renderWithProvider(
        <EarnLendingDepositConfirmationView />,
        {
          state: mockInitialState,
        },
      );

      const resetAllowanceButton = getByTestId(
        CONFIRMATION_FOOTER_BUTTON_TEST_IDS.CONFIRM_BUTTON,
      );

      await act(async () => {
        fireEvent.press(resetAllowanceButton);
      });

      expect(
        Engine.context.EarnController.executeLendingTokenApprove,
      ).toHaveBeenCalledWith({
        amount: '0',
        chainId: '0x1',
        gasOptions: {
          gasLimit: 'none',
        },
        protocol: 'AAVE v3',
        txOptions: {
          deviceConfirmedOn: 'metamask_mobile',
          networkClientId: 'mainnet',
          origin: 'metamask',
          type: 'increaseAllowance',
        },
        underlyingTokenAddress: '0xaBc',
      });
    });

    it("does not render allowance reset step for USDT on Ethereum mainnet when reset isn't required", () => {
      const routeParamsWithApproveAction = {
        ...defaultRouteParams,
        params: {
          ...defaultRouteParams.params,
          action: EARN_LENDING_ACTIONS.ALLOWANCE_INCREASE,
          token: MOCK_USDT_MAINNET_ASSET,
          amountTokenMinimalUnit: '5000000',
          // Allowance is already zero, no reset needed
          allowanceMinimalTokenUnit: '0',
        },
      };

      (useRoute as jest.Mock).mockReturnValue(routeParamsWithApproveAction);

      const { queryByText, getAllByTestId } = renderWithProvider(
        <EarnLendingDepositConfirmationView />,
        {
          state: mockInitialState,
        },
      );

      expect(queryByText(strings('earn.allowance_reset'))).toBeNull();
      // 2 Pending Steps
      expect(
        getAllByTestId(PROGRESS_STEPPER_TEST_IDS.STEP_ICON.PENDING),
      ).toHaveLength(2);
    });

    it('isAllowanceReset event property true', async () => {
      renderWithProvider(<EarnLendingDepositConfirmationView />, {
        state: mockInitialState,
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(mockTrackEvent).toHaveBeenCalledWith(
        mockCreateEventBuilder(MetaMetricsEvents.EARN_CONFIRMATION_PAGE_VIEWED)
          .addProperties({
            action_type: 'deposit',
            experience: 'STABLECOIN_LENDING',
            network: 'Ethereum Mainnet',
            token: 'USDT',
            transaction_value: '5 USDT',
            user_token_balance: undefined,
            isAllowanceReset: true,
          })
          .build(),
      );
    });

    it('tracks transaction allowance reset status events', async () => {
      const transactionMeta = {
        id: '123',
        type: TransactionType.tokenMethodIncreaseAllowance,
      };

      mockExecuteLendingTokenApprove.mockResolvedValue({
        transactionMeta,
      } as Result);

      // Mock the subscribeOnceIf to simulate transaction status callbacks
      let transactionStatusCallbackRejected: TxCallback | undefined;
      let transactionStatusCallbackSubmitted: TxCallback | undefined;
      let transactionStatusCallbackConfirmed:
        | ((transactionMeta: Partial<TransactionMeta>) => void)
        | undefined;
      let transactionStatusCallbackFailed: TxCallback | undefined;

      jest
        .mocked(Engine.controllerMessenger.subscribeOnceIf)
        .mockImplementation((_eventFilter, callback) => {
          if (_eventFilter === 'TransactionController:transactionSubmitted') {
            transactionStatusCallbackSubmitted = callback as (event: {
              transactionMeta: Partial<TransactionMeta>;
            }) => void;
          } else if (
            _eventFilter === 'TransactionController:transactionRejected'
          ) {
            transactionStatusCallbackRejected = callback as (event: {
              transactionMeta: Partial<TransactionMeta>;
            }) => void;
          } else if (
            _eventFilter === 'TransactionController:transactionConfirmed'
          ) {
            transactionStatusCallbackConfirmed = callback as (
              transactionMeta: Partial<TransactionMeta>,
            ) => void;
          } else if (
            _eventFilter === 'TransactionController:transactionFailed'
          ) {
            transactionStatusCallbackFailed = callback as (event: {
              transactionMeta: Partial<TransactionMeta>;
            }) => void;
          }

          return () => {
            // Cleanup function
          };
        });

      const { getByTestId } = renderWithProvider(
        <EarnLendingDepositConfirmationView />,
        { state: mockInitialState },
      );

      const allowanceResetButton = getByTestId(
        CONFIRMATION_FOOTER_BUTTON_TEST_IDS.CONFIRM_BUTTON,
      );

      await act(async () => {
        fireEvent.press(allowanceResetButton);
      });

      expect(mockExecuteLendingTokenApprove).toHaveBeenCalled();

      // Clear previous calls
      mockTrackEvent.mockClear();

      // Simulate transaction rejected
      await act(async () => {
        if (transactionStatusCallbackRejected) {
          transactionStatusCallbackRejected({
            transactionMeta: {
              ...transactionMeta,
              status: TransactionStatus.rejected,
            } as Partial<TransactionMeta>,
          });
        }
      });

      expect(mockTrackEvent).toHaveBeenCalledWith(
        mockCreateEventBuilder(MetaMetricsEvents.EARN_TRANSACTION_REJECTED)
          .addProperties({
            action_type: 'deposit',
            token: 'USDT',
            network: 'Ethereum Mainnet',
            user_token_balance: undefined,
            experience: EARN_EXPERIENCES.STABLECOIN_LENDING,
            transaction_value: '5 USDT',
            transaction_id: '123',
            transaction_type: TransactionType.tokenMethodIncreaseAllowance,
            isAllowanceReset: true,
          })
          .build(),
      );

      // Clear and test submitted status
      mockTrackEvent.mockClear();

      await act(async () => {
        if (transactionStatusCallbackSubmitted) {
          transactionStatusCallbackSubmitted({
            transactionMeta: {
              ...transactionMeta,
              status: TransactionStatus.submitted,
            } as Partial<TransactionMeta>,
          });
        }
      });

      expect(mockTrackEvent).toHaveBeenCalledWith(
        mockCreateEventBuilder(MetaMetricsEvents.EARN_TRANSACTION_SUBMITTED)
          .addProperties({
            action_type: 'deposit',
            token: 'USDT',
            network: 'Ethereum Mainnet',
            user_token_balance: undefined,
            transaction_value: '5 USDT',
            experience: EARN_EXPERIENCES.STABLECOIN_LENDING,
            transaction_id: '123',
            transaction_type: TransactionType.tokenMethodIncreaseAllowance,
            isAllowanceReset: true,
          })
          .build(),
      );

      // Clear and test confirmed status
      mockTrackEvent.mockClear();

      await act(async () => {
        if (transactionStatusCallbackConfirmed) {
          transactionStatusCallbackConfirmed({
            ...transactionMeta,
            status: TransactionStatus.confirmed,
          } as Partial<TransactionMeta>);
        }
      });

      expect(mockTrackEvent).toHaveBeenCalledWith(
        mockCreateEventBuilder(MetaMetricsEvents.EARN_TRANSACTION_CONFIRMED)
          .addProperties({
            action_type: 'deposit',
            token: 'USDT',
            network: 'Ethereum Mainnet',
            user_token_balance: undefined,
            experience: EARN_EXPERIENCES.STABLECOIN_LENDING,
            transaction_value: '5 USDT',
            transaction_id: '123',
            transaction_type: TransactionType.tokenMethodIncreaseAllowance,
            isAllowanceReset: true,
          })
          .build(),
      );

      // Clear and test failed status
      mockTrackEvent.mockClear();

      await act(async () => {
        if (transactionStatusCallbackFailed) {
          transactionStatusCallbackFailed({
            transactionMeta: {
              ...transactionMeta,
              status: TransactionStatus.failed,
            } as Partial<TransactionMeta>,
          });
        }
      });

      expect(mockTrackEvent).toHaveBeenCalledWith(
        mockCreateEventBuilder(MetaMetricsEvents.EARN_TRANSACTION_FAILED)
          .addProperties({
            action_type: 'deposit',
            token: 'USDT',
            network: 'Ethereum Mainnet',
            user_token_balance: undefined,
            experience: EARN_EXPERIENCES.STABLECOIN_LENDING,
            transaction_value: '5 USDT',
            transaction_id: '123',
            transaction_type: TransactionType.tokenMethodIncreaseAllowance,
            isAllowanceReset: true,
          })
          .build(),
      );
    });
  });

  describe('Analytics', () => {
    it('tracks EARN_CONFIRMATION_PAGE_VIEWED on render', async () => {
      renderWithProvider(<EarnLendingDepositConfirmationView />, {
        state: mockInitialState,
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(mockTrackEvent).toHaveBeenCalledWith(
        mockCreateEventBuilder(MetaMetricsEvents.EARN_CONFIRMATION_PAGE_VIEWED)
          .addProperties({
            action_type: 'deposit',
            experience: 'STABLECOIN_LENDING',
            network: 'Ethereum Mainnet',
            token: 'USDC',
            transaction_value: '5 USDC',
            user_token_balance: undefined,
            isAllowanceReset: false,
          })
          .build(),
      );
    });

    it('tracks EARN_DEPOSIT_REVIEW_CONFIRM_CLICKED and EARN_TRANSACTION_INITIATED on confirm', async () => {
      mockExecuteLendingDeposit.mockResolvedValue({
        transactionMeta: {
          id: '123',
          type: TransactionType.lendingDeposit,
        },
      } as Result);

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

      expect(mockExecuteLendingDeposit).toHaveBeenCalled();

      // Verify the correct sequence of events
      expect(mockCreateEventBuilder).toHaveBeenNthCalledWith(
        1,
        MetaMetricsEvents.EARN_CONFIRMATION_PAGE_VIEWED,
      );
      expect(mockCreateEventBuilder).toHaveBeenNthCalledWith(
        2,
        MetaMetricsEvents.EARN_DEPOSIT_REVIEW_CONFIRM_CLICKED,
      );
      expect(mockCreateEventBuilder).toHaveBeenNthCalledWith(
        3,
        MetaMetricsEvents.EARN_TRANSACTION_INITIATED,
      );
    });

    it('tracks transaction status events', async () => {
      const transactionMeta = {
        id: '123',
        type: TransactionType.lendingDeposit as TransactionType,
      };

      mockExecuteLendingDeposit.mockResolvedValue({
        transactionMeta,
      } as Result);

      // Mock the subscribeOnceIf to simulate transaction status callbacks
      let transactionStatusCallbackRejected: TxCallback | undefined;
      let transactionStatusCallbackSubmitted: TxCallback | undefined;
      let transactionStatusCallbackConfirmed:
        | ((transactionMeta: Partial<TransactionMeta>) => void)
        | undefined;
      let transactionStatusCallbackFailed: TxCallback | undefined;

      jest
        .mocked(Engine.controllerMessenger.subscribeOnceIf)
        .mockImplementation((_eventFilter, callback) => {
          if (_eventFilter === 'TransactionController:transactionSubmitted') {
            transactionStatusCallbackSubmitted = callback as (event: {
              transactionMeta: Partial<TransactionMeta>;
            }) => void;
          } else if (
            _eventFilter === 'TransactionController:transactionRejected'
          ) {
            transactionStatusCallbackRejected = callback as (event: {
              transactionMeta: Partial<TransactionMeta>;
            }) => void;
          } else if (
            _eventFilter === 'TransactionController:transactionConfirmed'
          ) {
            transactionStatusCallbackConfirmed = callback as (
              transactionMeta: Partial<TransactionMeta>,
            ) => void;
          } else if (
            _eventFilter === 'TransactionController:transactionFailed'
          ) {
            transactionStatusCallbackFailed = callback as (event: {
              transactionMeta: Partial<TransactionMeta>;
            }) => void;
          }

          return () => {
            // Cleanup function
          };
        });

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

      expect(mockExecuteLendingDeposit).toHaveBeenCalled();

      // Clear previous calls
      mockTrackEvent.mockClear();

      // Simulate transaction rejected
      await act(async () => {
        if (transactionStatusCallbackRejected) {
          transactionStatusCallbackRejected({
            transactionMeta: {
              ...transactionMeta,
              status: TransactionStatus.rejected,
            } as Partial<TransactionMeta>,
          });
        }
      });

      expect(mockTrackEvent).toHaveBeenCalledWith(
        mockCreateEventBuilder(MetaMetricsEvents.EARN_TRANSACTION_REJECTED)
          .addProperties({
            action_type: 'deposit',
            token: 'USDC',
            network: 'Ethereum Mainnet',
            user_token_balance: undefined,
            experience: EARN_EXPERIENCES.STABLECOIN_LENDING,
            transaction_value: '5 USDC',
            transaction_id: '123',
            transaction_type: TransactionType.lendingDeposit,
            isAllowanceReset: false,
          })
          .build(),
      );

      // Clear and test submitted status
      mockTrackEvent.mockClear();

      await act(async () => {
        if (transactionStatusCallbackSubmitted) {
          transactionStatusCallbackSubmitted({
            transactionMeta: {
              ...transactionMeta,
              status: TransactionStatus.submitted,
            } as Partial<TransactionMeta>,
          });
        }
      });

      expect(mockTrackEvent).toHaveBeenCalledWith(
        mockCreateEventBuilder(MetaMetricsEvents.EARN_TRANSACTION_SUBMITTED)
          .addProperties({
            action_type: 'deposit',
            token: 'USDC',
            network: 'Ethereum Mainnet',
            user_token_balance: undefined,
            transaction_value: '5 USDC',
            experience: EARN_EXPERIENCES.STABLECOIN_LENDING,
            transaction_id: '123',
            transaction_type: TransactionType.lendingDeposit,
            isAllowanceReset: false,
          })
          .build(),
      );

      // Wait for setTimeout to complete before checking navigation
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.TRANSACTIONS_VIEW);

      // Clear and test confirmed status
      mockTrackEvent.mockClear();

      await act(async () => {
        if (transactionStatusCallbackConfirmed) {
          transactionStatusCallbackConfirmed({
            ...transactionMeta,
            status: TransactionStatus.confirmed,
          } as Partial<TransactionMeta>);
        }
      });

      expect(mockTrackEvent).toHaveBeenCalledWith(
        mockCreateEventBuilder(MetaMetricsEvents.EARN_TRANSACTION_CONFIRMED)
          .addProperties({
            action_type: 'deposit',
            token: 'USDC',
            network: 'Ethereum Mainnet',
            user_token_balance: undefined,
            experience: EARN_EXPERIENCES.STABLECOIN_LENDING,
            transaction_value: '5 USDC',
            transaction_id: '123',
            transaction_type: TransactionType.lendingDeposit,
            isAllowanceReset: false,
          })
          .build(),
      );

      // Clear and test failed status
      mockTrackEvent.mockClear();

      await act(async () => {
        if (transactionStatusCallbackFailed) {
          transactionStatusCallbackFailed({
            transactionMeta: {
              ...transactionMeta,
              status: TransactionStatus.failed,
            } as Partial<TransactionMeta>,
          });
        }
      });

      expect(mockTrackEvent).toHaveBeenCalledWith(
        mockCreateEventBuilder(MetaMetricsEvents.EARN_TRANSACTION_FAILED)
          .addProperties({
            action_type: 'deposit',
            token: 'USDC',
            network: 'Ethereum Mainnet',
            user_token_balance: undefined,
            experience: EARN_EXPERIENCES.STABLECOIN_LENDING,
            transaction_value: '5 USDC',
            transaction_id: '123',
            transaction_type: TransactionType.lendingDeposit,
            isAllowanceReset: false,
          })
          .build(),
      );
    });

    it('tracks EARN_TRANSACTION_CONFIRMED on allowance increase confirmation', async () => {
      const routeParamsWithApproveAction = {
        ...defaultRouteParams,
        params: {
          ...defaultRouteParams.params,
          action: EARN_LENDING_ACTIONS.ALLOWANCE_INCREASE,
        },
      };

      (useRoute as jest.Mock).mockReturnValue(routeParamsWithApproveAction);

      mockExecuteLendingTokenApprove.mockResolvedValue({
        transactionMeta: {
          id: '456',
          type: TransactionType.tokenMethodIncreaseAllowance,
        },
      } as Result);

      // Mock the subscribeOnceIf to simulate transaction confirmed callback
      let transactionStatusCallback:
        | ((transaction: { transactionMeta: Partial<TransactionMeta> }) => void)
        | undefined;
      jest
        .mocked(Engine.controllerMessenger.subscribeOnceIf)
        .mockImplementation((_eventFilter, callback) => {
          transactionStatusCallback = callback as (transaction: {
            transactionMeta: Partial<TransactionMeta>;
          }) => void;
          return () => {
            // Cleanup function
          };
        });

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

      expect(mockExecuteLendingTokenApprove).toHaveBeenCalled();

      // Clear previous calls
      mockTrackEvent.mockClear();

      // Simulate transaction confirmed
      await act(async () => {
        if (transactionStatusCallback) {
          transactionStatusCallback({
            transactionMeta: {
              id: '456',
              type: TransactionType.tokenMethodIncreaseAllowance,
              status: TransactionStatus.confirmed,
            } as Partial<TransactionMeta>,
          });
        }
      });

      expect(mockTrackEvent).toHaveBeenCalledWith(
        mockCreateEventBuilder(MetaMetricsEvents.EARN_TRANSACTION_CONFIRMED)
          .addProperties({
            action_type: 'deposit',
            token: 'USDC',
            network: 'Ethereum Mainnet',
            user_token_balance: undefined,
            transaction_value: '5 USDC',
            transaction_id: '456',
            experience: EARN_EXPERIENCES.STABLECOIN_LENDING,
            transaction_type: 'increaseAllowance',
            isAllowanceReset: false,
          })
          .build(),
      );
    });

    it('tracks EARN_DEPOSIT_REVIEW_CANCEL_CLICKED on cancel', async () => {
      const { getByTestId } = renderWithProvider(
        <EarnLendingDepositConfirmationView />,
        { state: mockInitialState },
      );

      const cancelButton = getByTestId(
        CONFIRMATION_FOOTER_BUTTON_TEST_IDS.CANCEL_BUTTON,
      );

      // Clear previous calls
      mockTrackEvent.mockClear();

      await act(async () => {
        fireEvent.press(cancelButton);
      });

      expect(mockTrackEvent).toHaveBeenCalledWith(
        mockCreateEventBuilder(
          MetaMetricsEvents.EARN_DEPOSIT_REVIEW_CANCEL_CLICKED,
        )
          .addProperties({
            selected_provider: 'consensys',
            text: 'Cancel',
            location: 'EarnLendingDepositConfirmationView',
            network: 'Ethereum Mainnet',
            step: 'Deposit',
          })
          .build(),
      );
    });
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
    mockExecuteLendingTokenApprove.mockResolvedValue({
      transactionMeta: {
        id: '123',
        type: TransactionType.tokenMethodIncreaseAllowance,
      },
    } as Result);

    // Clear previous calls to subscribeOnceIf
    jest.mocked(Engine.controllerMessenger.subscribeOnceIf).mockClear();

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
      chainId: '0x1',
      protocol: 'AAVE v3',
      underlyingTokenAddress: MOCK_USDC_MAINNET_ASSET.address,
      gasOptions: {
        gasLimit: 'none',
      },
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
    mockExecuteLendingDeposit.mockResolvedValue({
      transactionMeta: {
        id: '123',
        type: TransactionType.lendingDeposit as TransactionType,
      },
    } as Result);

    // Clear previous calls to subscribeOnceIf
    jest.mocked(Engine.controllerMessenger.subscribeOnceIf).mockClear();

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
      chainId: '0x1',
      protocol: 'AAVE v3',
      underlyingTokenAddress: MOCK_USDC_MAINNET_ASSET.address,
      gasOptions: {
        gasLimit: 'none',
      },
      txOptions: {
        deviceConfirmedOn: 'metamask_mobile',
        networkClientId: 'mainnet',
        origin: 'metamask',
        type: TransactionType.lendingDeposit,
      },
    });
  });

  it('enables retries after transaction error during approval flow', async () => {
    const routeParamsWithApproveAction = {
      ...defaultRouteParams,
      params: {
        ...defaultRouteParams.params,
        action: EARN_LENDING_ACTIONS.ALLOWANCE_INCREASE,
      },
    };

    (useRoute as jest.Mock).mockReturnValue(routeParamsWithApproveAction);

    mockExecuteLendingTokenApprove.mockRejectedValue(
      new Error('Transaction failed'),
    );

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
    ).toHaveBeenCalledWith({
      amount: '5000000',
      chainId: '0x1',
      protocol: 'AAVE v3',
      underlyingTokenAddress: MOCK_USDC_MAINNET_ASSET.address,
      gasOptions: {
        gasLimit: 'none',
      },
      txOptions: {
        deviceConfirmedOn: 'metamask_mobile',
        networkClientId: 'mainnet',
        origin: 'metamask',
        type: 'increaseAllowance',
      },
    });

    // Wait for the error to be handled and button to be re-enabled
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    // The button should be re-enabled after the error
    expect(approveButton.props.disabled).toBe(false);
  });

  it('enables retries after transaction error during deposit flow', async () => {
    mockExecuteLendingDeposit.mockRejectedValue(
      new Error('Transaction failed'),
    );

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
    ).toHaveBeenCalledWith({
      amount: '5000000',
      chainId: '0x1',
      protocol: 'AAVE v3',
      underlyingTokenAddress: MOCK_USDC_MAINNET_ASSET.address,
      gasOptions: {
        gasLimit: 'none',
      },
      txOptions: {
        deviceConfirmedOn: 'metamask_mobile',
        networkClientId: 'mainnet',
        origin: 'metamask',
        type: TransactionType.lendingDeposit,
      },
    });

    // Wait for the error to be handled and button to be re-enabled
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    // The button should be re-enabled after the error
    expect(depositButton.props.disabled).toBe(false);
  });

  it('displays token information', () => {
    const { getByText } = renderWithProvider(
      <EarnLendingDepositConfirmationView />,
      { state: mockInitialState },
    );

    expect(getByText('45 USDC')).toBeDefined();
    expect(getByText('5 aUSDC')).toBeDefined();
    expect(getByText('4.5%')).toBeDefined();
  });

  it('displays amount information', () => {
    const { getByText, getAllByText } = renderWithProvider(
      <EarnLendingDepositConfirmationView />,
      { state: mockInitialState },
    );

    expect(getAllByText('$4.99')).toBeDefined();
    expect(getByText('5 aUSDC')).toBeDefined();
    expect(getByText('5 USDC')).toBeDefined();
  });

  it('displays nothing when missing route params', () => {
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

  it('handles token import and confirmation via subscription listener when no outputToken is present', async () => {
    // Update the mock to return earnToken but no outputToken
    (useEarnToken as jest.Mock).mockReturnValueOnce({
      earnTokenPair: {
        outputToken: undefined,
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
      },
      getTokenSnapshot: jest.fn(),
      tokenSnapshot: {
        token: {
          address: '0x91a9948b5002846b9fa5200a58291d46c30d6fe1',
          symbol: 'aUSDC',
          name: 'aUSDC TOKEN',
          decimals: 6,
        },
        chainId: '0x1',
      },
    });

    const { getByTestId } = renderWithProvider(
      <EarnLendingDepositConfirmationView />,
      {
        state: mockInitialState,
      },
    );

    const footerConfirmationButton = getByTestId(
      CONFIRMATION_FOOTER_BUTTON_TEST_IDS.CONFIRM_BUTTON,
    );

    // mock executeLendingDeposit to return a transaction
    (
      Engine.context.EarnController.executeLendingDeposit as jest.Mock
    ).mockResolvedValueOnce({
      transactionMeta: {
        id: '123',
        type: TransactionType.lendingDeposit as TransactionType,
      },
    } as Result);

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
      Engine.context.EarnController.executeLendingDeposit,
    ).toHaveBeenCalledWith({
      amount: '5000000',
      chainId: '0x1',
      protocol: 'AAVE v3',
      underlyingTokenAddress: MOCK_USDC_MAINNET_ASSET.address,
      gasOptions: {
        gasLimit: 'none',
      },
      txOptions: {
        deviceConfirmedOn: 'metamask_mobile',
        networkClientId: 'mainnet',
        origin: 'metamask',
        type: TransactionType.lendingDeposit,
      },
    });

    expect(Engine.context.TokensController.addToken).toHaveBeenCalledTimes(1);
  });

  it('should handle error adding counter-token on confirmation', async () => {
    // Update the mock to return earnToken but no outputToken
    (useEarnToken as jest.Mock).mockReturnValueOnce({
      earnTokenPair: {
        outputToken: undefined,
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
      },
      getTokenSnapshot: jest.fn(),
      tokenSnapshot: {
        token: {
          address: '0x91a9948b5002846b9fa5200a58291d46c30d6fe1',
          symbol: 'aUSDC',
          name: 'aUSDC TOKEN',
          decimals: 6,
        },
        chainId: '0x1',
      },
    });

    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {
        // Do nothing
      });

    // Mock the findNetworkClientIdByChainId to throw an error
    mockFindNetworkClientIdByChainId.mockImplementationOnce(() => 'mainnet');
    mockFindNetworkClientIdByChainId.mockImplementationOnce(() => {
      throw new Error('Invalid chain ID');
    });

    const { getByTestId } = renderWithProvider(
      <EarnLendingDepositConfirmationView />,
      {
        state: mockInitialState,
      },
    );

    const footerConfirmationButton = getByTestId(
      CONFIRMATION_FOOTER_BUTTON_TEST_IDS.CONFIRM_BUTTON,
    );

    // mock executeLendingDeposit to return a transaction
    (
      Engine.context.EarnController.executeLendingDeposit as jest.Mock
    ).mockResolvedValueOnce({
      transactionMeta: {
        id: '123',
        type: TransactionType.lendingDeposit as TransactionType,
      },
    } as Result);

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
      Engine.context.EarnController.executeLendingDeposit,
    ).toHaveBeenCalledWith({
      amount: '5000000',
      chainId: '0x1',
      protocol: 'AAVE v3',
      underlyingTokenAddress: MOCK_USDC_MAINNET_ASSET.address,
      gasOptions: {
        gasLimit: 'none',
      },
      txOptions: {
        deviceConfirmedOn: 'metamask_mobile',
        networkClientId: 'mainnet',
        origin: 'metamask',
        type: TransactionType.lendingDeposit,
      },
    });

    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);

    // Clean up the spy
    consoleErrorSpy.mockRestore();
  });

  it('calls depositTokens and handles success', async () => {
    mockExecuteLendingDeposit.mockResolvedValue({
      transactionMeta: { id: '123', type: TransactionType.lendingDeposit },
    } as Result);

    const { getByTestId } = renderWithProvider(
      <EarnLendingDepositConfirmationView />,
      { state: mockInitialState },
    );
    const confirmButton = getByTestId(
      CONFIRMATION_FOOTER_BUTTON_TEST_IDS.CONFIRM_BUTTON,
    );

    await act(async () => {
      fireEvent.press(confirmButton);
    });

    expect(mockExecuteLendingDeposit).toHaveBeenCalled();
  });

  it('calls depositTokens and handles error with catch', async () => {
    const errorMocked = new Error('Deposit Failed');
    mockExecuteLendingDeposit.mockRejectedValue(errorMocked);
    const errorSpy = jest.spyOn(Logger, 'error').mockImplementation(() => {
      // intentionally empty
    });

    const { getByTestId } = renderWithProvider(
      <EarnLendingDepositConfirmationView />,
      { state: mockInitialState },
    );
    const confirmButton = getByTestId(
      CONFIRMATION_FOOTER_BUTTON_TEST_IDS.CONFIRM_BUTTON,
    );

    await act(async () => {
      fireEvent.press(confirmButton);
    });

    expect(mockExecuteLendingDeposit).toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith(
      errorMocked,
      '[depositTokens] Lending deposit failed',
    );
    expect(confirmButton.props.disabled).toBe(false);

    errorSpy.mockRestore();
  });

  describe('Tracing', () => {
    it('calls endTrace for EarnDepositReviewScreen when action is DEPOSIT', () => {
      renderWithProvider(<EarnLendingDepositConfirmationView />, {
        state: mockInitialState,
      });

      expect(mockEndTrace).toHaveBeenCalledWith({
        name: TraceName.EarnDepositReviewScreen,
      });
      expect(mockEndTrace).toHaveBeenCalledTimes(1);
    });

    it('calls endTrace for EarnDepositSpendingCapScreen when action is ALLOWANCE_INCREASE', () => {
      const routeParamsWithAllowanceIncrease = {
        ...defaultRouteParams,
        params: {
          ...defaultRouteParams.params,
          action: EARN_LENDING_ACTIONS.ALLOWANCE_INCREASE,
        },
      };
      (useRoute as jest.Mock).mockReturnValue(routeParamsWithAllowanceIncrease);

      renderWithProvider(<EarnLendingDepositConfirmationView />, {
        state: mockInitialState,
      });

      expect(mockEndTrace).toHaveBeenCalledWith({
        name: TraceName.EarnDepositSpendingCapScreen,
      });
      expect(mockEndTrace).not.toHaveBeenCalledWith({
        name: TraceName.EarnDepositReviewScreen,
      });
      expect(mockEndTrace).toHaveBeenCalledTimes(1);
    });

    it('should call trace and endTrace with EarnDepositConfirmationScreen when confirm button is pressed', async () => {
      mockExecuteLendingDeposit.mockResolvedValue({
        transactionMeta: {
          id: '123',
          type: TransactionType.lendingDeposit,
        } as TransactionMeta,
        result: Promise.resolve(''),
      });

      const { getByTestId } = renderWithProvider(
        <EarnLendingDepositConfirmationView />,
        { state: mockInitialState },
      );

      const confirmButton = getByTestId(
        CONFIRMATION_FOOTER_BUTTON_TEST_IDS.CONFIRM_BUTTON,
      );

      await act(async () => {
        fireEvent.press(confirmButton);
      });

      expect(mockTrace).toHaveBeenCalledWith({
        name: TraceName.EarnDepositConfirmationScreen,
        data: {
          chainId: MOCK_USDC_MAINNET_ASSET.chainId,
          experience: EARN_EXPERIENCES.STABLECOIN_LENDING,
        },
      });

      expect(mockEndTrace).toHaveBeenCalledWith({
        name: TraceName.EarnDepositConfirmationScreen,
      });
    });

    it('should call trace with EarnLendingDepositTxConfirmed when transaction is submitted', async () => {
      const transactionId = '123';

      mockExecuteLendingDeposit.mockResolvedValue({
        transactionMeta: {
          id: transactionId,
          type: TransactionType.lendingDeposit,
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
        <EarnLendingDepositConfirmationView />,
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
        name: TraceName.EarnLendingDepositTxConfirmed,
        data: {
          chainId: MOCK_USDC_MAINNET_ASSET.chainId,
          experience: EARN_EXPERIENCES.STABLECOIN_LENDING,
        },
      });
    });

    it('should call endTrace with EarnLendingDepositTxConfirmed when transaction is confirmed', async () => {
      const transactionId = '123';

      mockExecuteLendingDeposit.mockResolvedValue({
        transactionMeta: {
          id: transactionId,
          type: TransactionType.lendingDeposit,
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
        <EarnLendingDepositConfirmationView />,
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
        name: TraceName.EarnLendingDepositTxConfirmed,
      });
    });
  });
});
