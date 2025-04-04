import React from 'react';
import { Image } from 'react-native';
import Balance from '.';
import { render, fireEvent } from '@testing-library/react-native';
import { selectNetworkName } from '../../../../selectors/networkInfos';
import { selectChainId } from '../../../../selectors/networkController';
import { Provider, useSelector } from 'react-redux';
import configureMockStore from 'redux-mock-store';
import { backgroundState } from '../../../../util/test/initial-root-state';
import { NetworkBadgeSource } from './Balance';
import { isPortfolioViewEnabled } from '../../../../util/networks';
import { MOCK_VAULT_APY_AVERAGES } from '../../Stake/components/PoolStakingLearnMoreModal/mockVaultRewards';

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
  isPortfolioViewEnabled: jest.fn(),
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
  }),
}));

const mockInitialState = {
  engine: {
    backgroundState,
  },
};

describe('Balance', () => {
  const mockStore = configureMockStore();
  const store = mockStore(mockInitialState);

  Image.getSize = jest.fn((_uri, success) => {
    success(100, 100); // Mock successful response for ETH native Icon Image
  });

  beforeEach(() => {
    (useSelector as jest.Mock).mockImplementation((selector) => {
      switch (selector) {
        case selectNetworkName:
          return {};
        case selectChainId:
          return '1';
        default:
          return undefined;
      }
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  if (!isPortfolioViewEnabled()) {
    it('should render correctly with main and secondary balance', () => {
      const wrapper = render(
        <Balance asset={mockDAI} mainBalance="123" secondaryBalance="456" />,
      );
      expect(wrapper).toMatchSnapshot();
    });
  }

  if (!isPortfolioViewEnabled()) {
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
  }

  it('should fire navigation event for non native tokens', () => {
    const { queryByTestId } = render(
      <Balance asset={mockDAI} mainBalance="123" secondaryBalance="456" />,
    );
    const assetElement = queryByTestId('asset-DAI');
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
      const result = NetworkBadgeSource('0xaa36a7', 'ETH');
      expect(result).toBeDefined();
    });

    it('returns mainnet Ethereum image for mainnet chainId', () => {
      const result = NetworkBadgeSource('0x1', 'ETH');
      expect(result).toBeDefined();
    });

    it('returns Linea Mainnet image for Linea mainnet chainId', () => {
      const result = NetworkBadgeSource('0xe708', 'LINEA');
      expect(result).toBeDefined();
    });

    it('returns undefined if no image is found', () => {
      const result = NetworkBadgeSource('0x999', 'UNKNOWN');
      expect(result).toBeUndefined();
    });

    it('returns Linea Mainnet image for Linea mainnet chainId isPortfolioViewEnabled is true', () => {
      if (isPortfolioViewEnabled()) {
        const result = NetworkBadgeSource('0xe708', 'LINEA');
        expect(result).toBeDefined();
      }
    });
  });
});

describe('NetworkBadgeSource', () => {
  it('returns testnet image for a testnet chainId', () => {
    const result = NetworkBadgeSource('0xaa36a7', 'ETH');
    expect(result).toBeDefined();
  });

  it('returns mainnet Ethereum image for mainnet chainId', () => {
    const result = NetworkBadgeSource('0x1', 'ETH');
    expect(result).toBeDefined();
  });

  it('returns Linea Mainnet image for Linea mainnet chainId', () => {
    const result = NetworkBadgeSource('0xe708', 'LINEA');
    expect(result).toBeDefined();
  });

  it('returns undefined if no image is found', () => {
    const result = NetworkBadgeSource('0x999', 'UNKNOWN');
    expect(result).toBeUndefined();
  });

  it('returns Linea Mainnet image for Linea mainnet chainId isPortfolioViewEnabled is true', () => {
    if (isPortfolioViewEnabled()) {
      const result = NetworkBadgeSource('0xe708', 'LINEA');
      expect(result).toBeDefined();
    }
  });
});
