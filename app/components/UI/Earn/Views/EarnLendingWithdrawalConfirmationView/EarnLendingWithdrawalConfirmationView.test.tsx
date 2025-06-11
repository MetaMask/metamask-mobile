import React from 'react';
import EarnLendingWithdrawalConfirmationView, {
  EarnWithdrawalConfirmationViewProps,
} from '.';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { LendingProtocol } from '@metamask/stake-sdk';
import { AAVE_WITHDRAWAL_RISKS } from '../../utils/tempLending';
import { EARN_EXPERIENCES } from '../../constants/experiences';
import { LendingMarketWithPosition } from '@metamask/earn-controller';
import { EarnTokenDetails } from '../../types/lending.types';
import { useRoute } from '@react-navigation/native';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../../../util/test/accountsControllerTestUtils';
import { TokenI } from '../../../Tokens/types';
// eslint-disable-next-line import/no-namespace
import * as NavbarUtils from '../../../Navbar';
import { strings } from '../../../../../../locales/i18n';

const getStakingNavbarSpy = jest.spyOn(NavbarUtils, 'getStakingNavbar');

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useRoute: jest.fn(),
    useNavigation: () => ({
      navigate: jest.fn(),
      goBack: jest.fn(),
      setOptions: jest.fn(),
    }),
  };
});

const mockLineaMainnetNetworkConfig = {
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
};

const mockLineaMainnetClientId = 'linea-mainnet';

jest.mock('../../../../../core/Engine', () => ({
  context: {
    NetworkController: {
      getNetworkConfigurationByChainId: jest
        .fn()
        .mockReturnValue(mockLineaMainnetNetworkConfig),
      findNetworkClientIdByChainId: jest
        .fn()
        .mockReturnValue(mockLineaMainnetClientId),
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
    market: [
      {
        protocol: 'aave',
        underlying: {
          address: '0x176211869ca2b568f2a7d4ee941e073a821ee1ff',
          chainId: 59144,
        },
      },
    ] as unknown as LendingMarketWithPosition,
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

  it('renders correctly', () => {
    const { toJSON } = renderWithProvider(
      <EarnLendingWithdrawalConfirmationView />,
      {
        state: mockInitialState,
      },
    );

    expect(toJSON()).toMatchSnapshot();

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
  });

  it.todo('navigates back to input screen when cancel button is pressed');
  it.todo('navigates back to input screen when back arrow is pressed');
  it.todo(
    'executed lending withdrawal transaction when confirm button is pressed',
  );
  it.todo('Redirects to terms of use when footer terms of use is pressed');
  it.todo('Redirect to risk disclosure when footer risk disclosure is pressed');
  it.todo('display transaction submission toast');
});
