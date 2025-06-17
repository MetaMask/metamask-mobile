import { LendingMarketWithPosition } from '@metamask/earn-controller';
import { useRoute } from '@react-navigation/native';
import React from 'react';
import EarnLendingWithdrawalConfirmationView, {
  EarnWithdrawalConfirmationViewProps,
} from '.';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../../../util/test/accountsControllerTestUtils';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { TokenI } from '../../../Tokens/types';
import { EARN_EXPERIENCES } from '../../constants/experiences';
import { EarnTokenDetails, LendingProtocol } from '../../types/lending.types';
import { AAVE_WITHDRAWAL_RISKS } from '../../utils/tempLending';
// eslint-disable-next-line import/no-namespace
import * as NavbarUtils from '../../../Navbar';
import { strings } from '../../../../../../locales/i18n';
import {
  CONFIRMATION_FOOTER_BUTTON_TEST_IDS,
  CONFIRMATION_FOOTER_LINK_TEST_IDS,
} from '../EarnLendingDepositConfirmationView/components/ConfirmationFooter';
import { act, fireEvent } from '@testing-library/react-native';
import Engine from '../../../../../core/Engine';
import { Linking } from 'react-native';
import AppConstants from '../../../../../core/AppConstants';

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
  },
}));

jest.mock('../../hooks/useEarnTokens', () => ({
  __esModule: true,
  default: () => ({
    getPairedEarnTokens: (token: TokenI) => ({
      outputToken: token,
    }),
  }),
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
});
