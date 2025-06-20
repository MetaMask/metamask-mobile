import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { Image } from 'react-native';
import { Provider, useSelector } from 'react-redux';
import configureMockStore from 'redux-mock-store';
import Balance from '.';
import { selectIsEvmNetworkSelected } from '../../../../selectors/multichainNetworkController';
import { selectChainId } from '../../../../selectors/networkController';
import { selectNetworkName } from '../../../../selectors/networkInfos';
import { backgroundState } from '../../../../util/test/initial-root-state';
import { EARN_EXPERIENCES } from '../../Earn/constants/experiences';
import { EarnTokenDetails } from '../../Earn/types/lending.types';
import { MOCK_STAKED_ETH_MAINNET_ASSET } from '../../Stake/__mocks__/stakeMockData';
import { MOCK_VAULT_APY_AVERAGES } from '../../Stake/components/PoolStakingLearnMoreModal/mockVaultRewards';
import { TokenI } from '../../Tokens/types';
import { NetworkBadgeSource } from './Balance';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

jest.mock('../../Stake/hooks/useBalance', () => ({
  __esModule: true,
  default: () => ({
    currentCurrency: 'usd',
    conversionRate: 1,
  }),
}));

const mockDAI = {
  address: '0x6b175474e89094c44da98b954eedeac495271d0f',
  aggregators: ['Metamask', 'Coinmarketcap'],
  hasBalanceError: false,
  balance: '6.49757',
  balanceFiat: '$6.49',
  decimals: 18,
  image:
    'https://static.cx.metamask.io/api/v1/tokenIcons/1/0x6b175474e89094c44da98b954eedeac495271d0f.png',
  name: 'Dai Stablecoin',
  symbol: 'DAI',
  isETH: false,
  logo: 'image-path',
  chainId: '0x1',
  isNative: false,
};

const mockETH = {
  address: '0x0000000000000000000000000000',
  aggregators: [],
  balanceError: null,
  balance: '100',
  balanceFiat: '$10000',
  decimals: 18,
  image:
    'https://static.cx.metamask.io/api/v1/tokenIcons/1/0x6b175474e89094c44da98b954eedeac495271d0f.png',
  name: 'Ethereum',
  symbol: 'ETH',
  isETH: true,
  logo: 'image-path',
  chainId: '0x1',
  isNative: true,
};

jest.mock('../../../../core/Engine', () => ({
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
  },
}));

jest.mock('../../../../util/networks', () => ({
  ...jest.requireActual('../../../../util/networks'),
  getTestNetImageByChainId: jest.fn((chainId) => `testnet-image-${chainId}`),
}));

jest.mock('../../../../util/networks', () => ({
  ...jest.requireActual('../../../../util/networks'),
}));

jest.mock('../../Stake/hooks/usePooledStakes', () => ({
  __esModule: true,
  default: () => ({
    pooledStakesData: {
      account: '0xabc',
      assets: '10000000000000000',
      exitRequests: [],
      lifetimeRewards: '100000000000000',
    },
    exchangeRate: 1.018,
    hasStakedPositions: true,
    hasEthToUnstake: true,
    isLoadingPooledStakesData: false,
  }),
}));

jest.mock('../../Stake/hooks/useVaultApyAverages', () => ({
  __esModule: true,
  default: () => ({
    vaultApyAverages: MOCK_VAULT_APY_AVERAGES,
    isLoadingVaultApyAverages: false,
    refreshVaultApyAverages: jest.fn(),
  }),
}));

jest.mock('../../Stake/hooks/useStakingEligibility', () => ({
  __esModule: true,
  default: () => ({
    isEligible: true,
    isLoadingEligibility: false,
  }),
}));

jest.mock('../../../../selectors/earnController', () => ({
  ...jest.requireActual('../../../../selectors/earnController'),
  earnSelectors: {
    selectEarnTokenPair: jest.fn().mockImplementation((token: TokenI) => ({
      earnToken: token,
      outputToken: token,
    })),
    selectEarnToken: jest.fn(),
    selectOutputToken: jest.fn(),
  },
}));
jest.mock('../../../../selectors/networkInfos', () => ({
  ...jest.requireActual('../../../../selectors/networkInfos'),
  selectNetworkName: jest.fn().mockReturnValue({}),
}));

jest.mock('../../../../selectors/networkController', () => ({
  ...jest.requireActual('../../../../selectors/networkController'),
  selectChainId: jest.fn().mockReturnValue('1'),
}));

jest.mock('../../../../selectors/multichainNetworkController', () => ({
  ...jest.requireActual('../../../../selectors/multichainNetworkController'),
  selectIsEvmNetworkSelected: jest.fn().mockReturnValue(true),
}));

jest.mock('../../../../selectors/multichain/multichain', () => ({
  ...jest.requireActual('../../../../selectors/multichain/multichain'),
  selectMultichainAssetsRates: jest.fn().mockReturnValue({
    '0x6b175474e89094c44da98b954eedeac495271d0f': {
      marketData: {
        pricePercentChange: { P1D: 10 },
      },
    },
  }),
}));

const mockInitialState = {
  engine: {
    backgroundState: {
      ...backgroundState,
      MultichainNetworkController: {
        ...backgroundState.MultichainNetworkController,
        isEvmSelected: true,
      },
    },
  },
};

describe('Balance', () => {
  const mockStore = configureMockStore();
  const store = mockStore(mockInitialState);

  interface ImageSize {
    width: number;
    height: number;
  }
  Image.getSize = jest.fn(
    (
      _uri: string,
      success?: (width: number, height: number) => void,
      _failure?: (error: Error) => void,
    ) => {
      if (success) {
        success(100, 100);
      }
      return Promise.resolve<ImageSize>({ width: 100, height: 100 });
    },
  );

  beforeEach(() => {
    (useSelector as jest.Mock).mockImplementation((selector) => {
      // Try to match by function name or string contents
      if (selector === selectNetworkName) return {};
      if (selector === selectChainId) return '1';
      if (selector === selectIsEvmNetworkSelected) return true;
      if (selector.toString().includes('selectEarnTokenPair')) {
        return {
          earnToken: mockETH,
          outputToken: {
            ...MOCK_STAKED_ETH_MAINNET_ASSET,
            experience: {
              type: EARN_EXPERIENCES.POOLED_STAKING,
            } as EarnTokenDetails['experience'],
          },
        };
      }

      return undefined;
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render correctly with main and secondary balance', () => {
    const wrapper = render(
      <Balance asset={mockDAI} mainBalance="123" secondaryBalance="456" />,
    );
    expect(wrapper).toMatchSnapshot();
  });

  it('should render correctly without a secondary balance', () => {
    const wrapper = render(
      <Balance
        asset={mockDAI}
        mainBalance="123"
        secondaryBalance={undefined}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });

  it('should fire navigation event for non native tokens', () => {
    const { getByTestId } = render(
      <Balance asset={mockDAI} mainBalance="123" secondaryBalance="456" />,
    );
    const assetElement = getByTestId('asset-DAI');
    fireEvent.press(assetElement);
    expect(mockNavigate).toHaveBeenCalledTimes(1);
  });

  it('should not fire navigation event for native tokens', () => {
    const { queryAllByTestId } = render(
      <Provider store={store}>
        <Balance asset={mockETH} mainBalance="100" secondaryBalance="200" />,
      </Provider>,
    );

    // Includes native ETH and staked ETH
    const ethElements = queryAllByTestId('asset-ETH');

    ethElements.forEach((ethElement) => {
      fireEvent.press(ethElement);
    });

    expect(mockNavigate).toHaveBeenCalledTimes(0);
  });

  describe('NetworkBadgeSource', () => {
    it('returns testnet image for a testnet chainId', () => {
      const result = NetworkBadgeSource('0xaa36a7');
      expect(result).toBeDefined();
    });

    it('returns mainnet Ethereum image for mainnet chainId', () => {
      const result = NetworkBadgeSource('0x1');
      expect(result).toBeDefined();
    });

    it('returns Linea Mainnet image for Linea mainnet chainId', () => {
      const result = NetworkBadgeSource('0xe708');
      expect(result).toBeDefined();
    });

    it('returns undefined if no image is found', () => {
      const result = NetworkBadgeSource('0x999');
      expect(result).toBeUndefined();
    });
  });
});

describe('NetworkBadgeSource', () => {
  it('returns testnet image for a testnet chainId', () => {
    const result = NetworkBadgeSource('0xaa36a7');
    expect(result).toBeDefined();
  });

  it('returns mainnet Ethereum image for mainnet chainId', () => {
    const result = NetworkBadgeSource('0x1');
    expect(result).toBeDefined();
  });

  it('returns undefined if no image is found', () => {
    const result = NetworkBadgeSource('0x999');
    expect(result).toBeUndefined();
  });

  it('returns Linea Mainnet image for Linea mainnet chainId', () => {
    const result = NetworkBadgeSource('0xe708');
    expect(result).toBeDefined();
  });
});
