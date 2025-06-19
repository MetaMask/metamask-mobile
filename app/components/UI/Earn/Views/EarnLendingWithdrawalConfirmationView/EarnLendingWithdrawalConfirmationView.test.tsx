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
// eslint-disable-next-line import/no-namespace
import * as NavbarUtils from '../../../Navbar';
import { MOCK_USDC_MAINNET_ASSET } from '../../../Stake/__mocks__/stakeMockData';
import useEarnToken from '../../hooks/useEarnToken';
import {
  CONFIRMATION_FOOTER_BUTTON_TEST_IDS,
  CONFIRMATION_FOOTER_LINK_TEST_IDS,
} from '../EarnLendingDepositConfirmationView/components/ConfirmationFooter';

expect.addSnapshotSerializer({
  // any is the expected type for the val parameter
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  test: (val: any) => val && val?.type === 'Image',
  print: () => `<Image />`,
});

const getStakingNavbarSpy = jest.spyOn(NavbarUtils, 'getStakingNavbar');

jest.mock('react-native', () => {
  const actual = jest.requireActual('react-native');
  return {
    ...actual,
    Linking: {
      ...actual.Linking,
      openUrl: jest.fn(),
    },
  };
});

const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useRoute: jest.fn(),
    useNavigation: () => ({
      navigate: jest.fn(),
      goBack: mockGoBack,
      setOptions: jest.fn(),
    }),
  };
});

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
      executeLendingWithdraw: jest.fn(),
    },
    TokensController: {
      addToken: jest.fn().mockResolvedValue([]),
    },
  },
}));

jest.mock('../../../../../hooks/useMetrics', () => ({
  useMetrics: jest.fn(),
  MetaMetricsEvents: {
    EARN_CONFIRMATION_PAGE_VIEWED: 'Earn confirmation page viewed',
    EARN_ACTION_SUBMITTED: 'Earn action submitted',
    EARN_TRANSACTION_INITIATED: 'Earn transaction initiated',
    EARN_TRANSACTION_REJECTED: 'Earn transaction rejected',
    EARN_TRANSACTION_SUBMITTED: 'Earn transaction submitted',
    EARN_TRANSACTION_CONFIRMED: 'Earn transaction confirmed',
    EARN_TRANSACTION_FAILED: 'Earn transaction failed',
    EARN_TRANSACTION_DROPPED: 'Earn transaction dropped',
  },
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
    outputToken: mockLineaAUsdc,
    earnToken: MOCK_USDC_MAINNET_ASSET,
    getTokenSnapshot: jest.fn(),
  })),
}));

describe('EarnLendingWithdrawalConfirmationView', () => {
  const mockTrackEvent = jest.fn();
  const mockCreateEventBuilder = jest.fn();

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

  beforeEach(() => {
    jest.clearAllMocks();

    (useRoute as jest.MockedFunction<typeof useRoute>).mockReturnValue(
      defaultRouteParams,
    );

    // Mock useMetrics hook
    const useMetricsMock = jest.mocked(
      require('../../../../../hooks/useMetrics').useMetrics,
    );
    mockCreateEventBuilder.mockReturnValue({
      addProperties: jest.fn().mockReturnThis(),
      build: jest.fn().mockReturnValue({ name: 'test-event', properties: {} }),
    });
    useMetricsMock.mockReturnValue({
      trackEvent: mockTrackEvent,
      createEventBuilder: mockCreateEventBuilder,
    });
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
    );

    expect(toJSON()).toMatchSnapshot();
  });

  it('displays advanced details section when user has detected borrow positions', () => {
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
      gasOptions: {},
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
      outputToken: mockLineaAUsdc,
      earnToken: null,
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
      gasOptions: {},
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

  describe('Analytics', () => {
    it('should track EARN_CONFIRMATION_PAGE_VIEWED on render', () => {
      renderWithProvider(<EarnLendingWithdrawalConfirmationView />, {
        state: mockInitialState,
      });

      expect(mockTrackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Earn confirmation page viewed',
          properties: expect.objectContaining({
            action_type: 'withdrawal',
            token: 'AUSDC',
            network: 'Linea',
            user_token_balance: expect.any(String),
            transaction_value: '0.99',
          }),
        }),
      );
    });

    it('should track EARN_ACTION_SUBMITTED and EARN_TRANSACTION_INITIATED on confirm', async () => {
      const mockExecuteLendingWithdraw = Engine.context.EarnController
        .executeLendingWithdraw as jest.MockedFunction<
        typeof Engine.context.EarnController.executeLendingWithdraw
      >;

      mockExecuteLendingWithdraw.mockResolvedValue({
        transactionMeta: {
          id: '123',
          type: 'lendingWithdraw' as any,
        },
      } as any);

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
      expect(mockTrackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Earn action submitted',
          properties: expect.objectContaining({
            action_type: 'withdrawal',
            token: 'AUSDC',
            network: 'Linea',
            user_token_balance: expect.any(String),
            transaction_value: '0.99',
          }),
        }),
      );

      // Check that EARN_TRANSACTION_INITIATED was tracked
      expect(mockTrackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Earn transaction initiated',
          properties: expect.objectContaining({
            action_type: 'withdrawal',
            token: 'AUSDC',
            network: 'Linea',
            user_token_balance: expect.any(String),
            transaction_value: '0.99',
            transaction_id: '123',
          }),
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
          type: 'lendingWithdraw' as any,
        },
      } as any);

      // Create a spy to capture the callback functions
      const subscribeCallbacks: { [key: string]: any } = {};
      jest
        .mocked(Engine.controllerMessenger.subscribeOnceIf)
        .mockImplementation((eventName: string, callback: any) => {
          subscribeCallbacks[eventName] = callback;
          return undefined as any;
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
      const transactionDroppedCallback =
        subscribeCallbacks['TransactionController:transactionDropped'];
      expect(transactionDroppedCallback).toBeDefined();

      await act(async () => {
        transactionDroppedCallback({ transactionMeta: { id: transactionId } });
      });

      expect(mockTrackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Earn transaction dropped',
          properties: expect.objectContaining({
            action_type: 'withdrawal',
            token: 'AUSDC',
            network: 'Linea',
            user_token_balance: expect.any(String),
            transaction_value: '0.99',
            transaction_id: transactionId,
          }),
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
          type: 'lendingWithdraw' as any,
        },
      } as any);

      // Create a spy to capture the callback functions
      const subscribeCallbacks: { [key: string]: any } = {};
      jest
        .mocked(Engine.controllerMessenger.subscribeOnceIf)
        .mockImplementation((eventName: string, callback: any) => {
          subscribeCallbacks[eventName] = callback;
          return undefined as any;
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
      const transactionRejectedCallback =
        subscribeCallbacks['TransactionController:transactionRejected'];
      await act(async () => {
        transactionRejectedCallback({ transactionMeta: { id: transactionId } });
      });

      expect(mockTrackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Earn transaction rejected',
          properties: expect.objectContaining({
            action_type: 'withdrawal',
            transaction_id: transactionId,
          }),
        }),
      );

      mockTrackEvent.mockClear();

      // Test transaction failed
      const transactionFailedCallback =
        subscribeCallbacks['TransactionController:transactionFailed'];
      await act(async () => {
        transactionFailedCallback({ transactionMeta: { id: transactionId } });
      });

      expect(mockTrackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Earn transaction failed',
          properties: expect.objectContaining({
            action_type: 'withdrawal',
            transaction_id: transactionId,
          }),
        }),
      );

      mockTrackEvent.mockClear();

      // Test transaction submitted
      const transactionSubmittedCallback =
        subscribeCallbacks['TransactionController:transactionSubmitted'];
      await act(async () => {
        transactionSubmittedCallback({
          transactionMeta: { id: transactionId },
        });
      });

      expect(mockTrackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Earn transaction submitted',
          properties: expect.objectContaining({
            action_type: 'withdrawal',
            transaction_id: transactionId,
          }),
        }),
      );

      mockTrackEvent.mockClear();

      // Test transaction confirmed
      const transactionConfirmedCallback =
        subscribeCallbacks['TransactionController:transactionConfirmed'];
      await act(async () => {
        transactionConfirmedCallback({ id: transactionId });
      });

      expect(mockTrackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Earn transaction confirmed',
          properties: expect.objectContaining({
            action_type: 'withdrawal',
            transaction_id: transactionId,
          }),
        }),
      );
    });
  });
});
