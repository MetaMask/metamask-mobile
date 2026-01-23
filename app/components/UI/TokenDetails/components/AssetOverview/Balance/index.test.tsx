import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { Image } from 'react-native';
import { Provider, useSelector } from 'react-redux';
import configureMockStore from 'redux-mock-store';
import Balance from '.';
import { selectIsEvmNetworkSelected } from '../../../../../../selectors/multichainNetworkController';
import { selectChainId } from '../../../../../../selectors/networkController';
import { selectNetworkName } from '../../../../../../selectors/networkInfos';
import { selectPricePercentChange1d } from '../../../../../../selectors/tokenRatesController';
import { selectMultichainAssetsRates } from '../../../../../../selectors/multichain';

// Create a mock function we can control in individual tests
const mockSelectPricePercentChange1d = jest.fn();
import { backgroundState } from '../../../../../../util/test/initial-root-state';
import { EARN_EXPERIENCES } from '../../../../Earn/constants/experiences';
import { EarnTokenDetails } from '../../../../Earn/types/lending.types';
import { MOCK_STAKED_ETH_MAINNET_ASSET } from '../../../../Stake/__mocks__/stakeMockData';
import { MOCK_VAULT_APY_AVERAGES } from '../../../../Stake/components/PoolStakingLearnMoreModal/mockVaultRewards';
import { TokenI } from '../../../../Tokens/types';
import { NetworkBadgeSource } from './Balance';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { ACCOUNT_TYPE_LABEL_TEST_ID } from '../../../../Tokens/TokenList/TokenListItem/TokenListItem';
import { BtcAccountType } from '@metamask/keyring-api';

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string) =>
    key === 'asset_overview.your_balance' ? 'Your balance' : key,
}));

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

jest.mock('../../Earn/hooks/useMusdConversionTokens', () => ({
  __esModule: true,
  useMusdConversionTokens: () => ({
    isConversionToken: jest.fn().mockReturnValue(false),
    tokenFilter: jest.fn().mockReturnValue([]),
    isMusdSupportedOnChain: jest.fn().mockReturnValue(false),
    getMusdOutputChainId: jest.fn().mockReturnValue('0x1'),
    tokens: [],
  }),
}));

jest.mock('../../Earn/hooks/useMusdConversionEligibility', () => ({
  useMusdConversionEligibility: () => ({
    isEligible: true,
    isLoading: false,
    geolocation: 'US',
    blockedCountries: [],
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

jest.mock('../../Earn/hooks/useEarnLendingPosition', () => ({
  __esModule: true,
  default: () => ({
    hasEarnLendingPositions: false,
    error: null,
  }),
}));

jest.mock('../../Earn/hooks/useEarnings', () => ({
  __esModule: true,
  default: () => ({
    totalFiat: '$0',
    totalCrypto: '0 ETH',
    isLoading: false,
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

jest.mock('../../../../selectors/tokenRatesController', () => ({
  ...jest.requireActual('../../../../selectors/tokenRatesController'),
  selectPricePercentChange1d: mockSelectPricePercentChange1d,
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
    // Reset and set default mock behavior
    mockSelectPricePercentChange1d.mockReturnValue(null);

    (useSelector as jest.Mock).mockImplementation((selector) => {
      // Try to match by function name or string contents
      if (selector === selectNetworkName) return {};
      if (selector === selectChainId) return '1';
      if (selector === selectIsEvmNetworkSelected) return true;
      if (selector === selectMultichainAssetsRates)
        return {
          '0x6b175474e89094c44da98b954eedeac495271d0f': {
            marketData: {
              pricePercentChange: { P1D: 10 },
            },
          },
        };
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
      if (selector.toString().includes('selectNetworkConfigurationByChainId')) {
        return { name: 'Ethereum Mainnet' };
      }
      if (selector.toString().includes('selectPrivacyMode')) {
        return false;
      }
      // Mock selectPricePercentChange1d directly in case the jest.mock isn't working
      if (
        selector === selectPricePercentChange1d ||
        selector.toString().includes('selectPricePercentChange1d')
      ) {
        return mockSelectPricePercentChange1d();
      }

      return undefined;
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render correctly with main and secondary balance', () => {
    const wrapper = render(
      <Provider store={store}>
        <Balance asset={mockDAI} mainBalance="123" secondaryBalance="456" />
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });

  it('should render correctly without a secondary balance', () => {
    const wrapper = render(
      <Provider store={store}>
        <Balance
          asset={mockDAI}
          mainBalance="123"
          secondaryBalance={undefined}
        />
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });

  it('should fire navigation event for non native tokens', () => {
    const { getByTestId } = render(
      <Provider store={store}>
        <Balance asset={mockDAI} mainBalance="123" secondaryBalance="456" />
      </Provider>,
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

  describe('Percentage Change Color Logic', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should display positive percentage change in success color', () => {
      // Mock the percentage selector to return a positive value
      mockSelectPricePercentChange1d.mockReturnValue(5.67);

      const { getByTestId } = render(
        <Provider store={store}>
          <Balance
            asset={mockDAI}
            mainBalance="$100"
            secondaryBalance="5 DAI"
          />
        </Provider>,
      );

      // Percentage is now displayed in AssetElement's secondary balance area
      const percentageElement = getByTestId('secondary-balance-test-id');
      expect(percentageElement.props.children).toBe('+5.67%');
    });

    it('should display negative percentage change in error color', () => {
      // Mock the percentage selector to return a negative value
      mockSelectPricePercentChange1d.mockReturnValue(-3.45);

      const { getByTestId } = render(
        <Provider store={store}>
          <Balance
            asset={mockDAI}
            mainBalance="$100"
            secondaryBalance="5 DAI"
          />
        </Provider>,
      );

      // Percentage is now displayed in AssetElement's secondary balance area
      const percentageElement = getByTestId('secondary-balance-test-id');
      expect(percentageElement.props.children).toBe('-3.45%');
    });

    it('should display zero percentage change in alternative color', () => {
      // Mock the percentage selector to return zero
      mockSelectPricePercentChange1d.mockReturnValue(0);

      const { getByTestId } = render(
        <Provider store={store}>
          <Balance
            asset={mockDAI}
            mainBalance="$100"
            secondaryBalance="5 DAI"
          />
        </Provider>,
      );

      // Percentage is now displayed in AssetElement's secondary balance area
      const percentageElement = getByTestId('secondary-balance-test-id');
      expect(percentageElement.props.children).toBe('+0.00%');
    });

    it('should not display percentage when no data is available', () => {
      // Mock the percentage selector to return null (default behavior)
      mockSelectPricePercentChange1d.mockReturnValue(null);

      const { queryByText } = render(
        <Provider store={store}>
          <Balance
            asset={mockDAI}
            mainBalance="$100"
            secondaryBalance="5 DAI"
          />
        </Provider>,
      );

      // Should not display any percentage text when no data is available
      expect(queryByText(/\+.*%/)).toBeNull();
      expect(queryByText(/-.*%/)).toBeNull();
    });

    it('should not display percentage for Infinity values (prevents crash)', () => {
      // Mock the percentage selector to return Infinity
      mockSelectPricePercentChange1d.mockReturnValue(Infinity);

      const { queryByText } = render(
        <Provider store={store}>
          <Balance
            asset={mockDAI}
            mainBalance="$100"
            secondaryBalance="5 DAI"
          />
        </Provider>,
      );

      // Should not display any percentage text when value is Infinity
      expect(queryByText(/\+.*%/)).toBeNull();
      expect(queryByText(/-.*%/)).toBeNull();
    });

    it('should not display percentage for NaN values (prevents crash)', () => {
      // Mock the percentage selector to return NaN
      mockSelectPricePercentChange1d.mockReturnValue(NaN);

      const { queryByText } = render(
        <Provider store={store}>
          <Balance
            asset={mockDAI}
            mainBalance="$100"
            secondaryBalance="5 DAI"
          />
        </Provider>,
      );

      // Should not display any percentage text when value is NaN
      expect(queryByText(/\+.*%/)).toBeNull();
      expect(queryByText(/-.*%/)).toBeNull();
    });

    it('should not display percentage for negative Infinity values (prevents crash)', () => {
      // Mock the percentage selector to return negative Infinity
      mockSelectPricePercentChange1d.mockReturnValue(-Infinity);

      const { queryByText } = render(
        <Provider store={store}>
          <Balance
            asset={mockDAI}
            mainBalance="$100"
            secondaryBalance="5 DAI"
          />
        </Provider>,
      );

      // Should not display any percentage text when value is negative Infinity
      expect(queryByText(/\+.*%/)).toBeNull();
      expect(queryByText(/-.*%/)).toBeNull();
    });

    it('should display token amount below token name', () => {
      const { getByText } = render(
        <Provider store={store}>
          <Balance
            asset={mockDAI}
            mainBalance="$100"
            secondaryBalance="5 DAI"
          />
        </Provider>,
      );

      expect(getByText('Dai Stablecoin')).toBeTruthy();
      expect(getByText('5 DAI')).toBeTruthy();
    });
  });

  describe('Visibility controls', () => {
    it('hides heading when hideTitleHeading is true', () => {
      const { queryByText } = render(
        <Provider store={store}>
          <Balance
            asset={mockDAI}
            mainBalance="300"
            secondaryBalance="300"
            hideTitleHeading
          />
        </Provider>,
      );

      expect(queryByText('Your balance')).toBeNull();
      expect(queryByText('asset_overview.your_balance')).toBeNull();
    });

    it('renders custom secondary balance and hides percentage when hidePercentageChange is true', () => {
      mockSelectPricePercentChange1d.mockReturnValue(5.67);

      const { getByTestId, queryByText, queryByTestId } = render(
        <Provider store={store}>
          <Balance
            asset={mockDAI}
            mainBalance="$100"
            secondaryBalance="100 DAI"
            hidePercentageChange
          />
        </Provider>,
      );

      const tokenAmount = getByTestId('token-amount-balance-test-id');
      expect(tokenAmount.props.children).toBe('100 DAI');

      expect(queryByTestId('secondary-balance-test-id')).toBeNull();
      expect(queryByText(/\+.*%/)).toBeNull();
      expect(queryByText(/-.*%/)).toBeNull();
    });
  });

  describe('Account Type Label', () => {
    it('renders the correct account type label', () => {
      const { queryByTestId } = renderWithProvider(
        <Balance
          asset={{ ...mockETH, accountType: BtcAccountType.P2wpkh }}
          mainBalance="123"
          secondaryBalance="456"
        />,
        { state: mockInitialState },
      );

      expect(queryByTestId(ACCOUNT_TYPE_LABEL_TEST_ID)).toBeOnTheScreen();
      expect(queryByTestId(ACCOUNT_TYPE_LABEL_TEST_ID)).toHaveTextContent(
        'Native SegWit',
      );
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
