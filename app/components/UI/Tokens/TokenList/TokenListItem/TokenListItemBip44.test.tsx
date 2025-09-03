import React from 'react';
import { render } from '@testing-library/react-native';
import { Provider, useSelector } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { configureStore } from '@reduxjs/toolkit';
import { TokenListItemBip44 } from './TokenListItemBip44';
import { FlashListAssetKey } from '..';
import { useTokenPricePercentageChange } from '../../hooks/useTokenPricePercentageChange';
import { isTestNet } from '../../../../../util/networks';
import { formatWithThreshold } from '../../../../../util/assets';
import AvatarToken from '../../../../../component-library/components/Avatars/Avatar/variants/AvatarToken';
import { AvatarSize } from '../../../../../component-library/components/Avatars/Avatar/Avatar.types';
import { TokenI } from '../../types';
import NetworkAssetLogo from '../../../NetworkAssetLogo';

// Mock dependencies
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: jest.fn(),
  }),
}));

jest.mock('../../../../../util/theme', () => ({
  useTheme: () => ({ colors: {} }),
}));

jest.mock('../../../../hooks/useMetrics', () => ({
  useMetrics: () => ({
    trackEvent: jest.fn(),
    createEventBuilder: jest.fn(() => ({
      build: jest.fn(),
      addProperties: jest.fn(() => ({ build: jest.fn() })),
    })),
  }),
}));

jest.mock('../../hooks/useTokenPricePercentageChange', () => ({
  useTokenPricePercentageChange: jest.fn(),
}));

jest.mock('../../../Earn/hooks/useEarnTokens', () => ({
  __esModule: true,
  default: () => ({ getEarnToken: jest.fn() }),
}));

jest.mock('../../../Stake/hooks/useStakingChain', () => ({
  useStakingChainByChainId: () => ({ isStakingSupportedChain: false }),
}));

jest.mock('../../../Earn/selectors/featureFlags', () => ({
  selectPooledStakingEnabledFlag: () => false,
  selectStablecoinLendingEnabledFlag: () => false,
}));

jest.mock('../../util/deriveBalanceFromAssetMarketDetails', () => ({
  deriveBalanceFromAssetMarketDetails: jest.fn(() => ({
    balanceFiat: '$100.00',
    balanceValueFormatted: '1.23 ETH',
  })),
}));

jest.mock('../../../../../util/assets', () => ({
  formatWithThreshold: jest.fn((value) => `${value} TEST`),
}));

jest.mock('../../../../../util/networks', () => ({
  getDefaultNetworkByChainId: jest.fn(),
  getTestNetImageByChainId: jest.fn(() => 'testnet.png'),
  isTestNet: jest.fn(),
}));

jest.mock('../../../../../util/networks/customNetworks', () => ({
  CustomNetworkImgMapping: {},
  PopularList: [],
  UnpopularNetworkList: [],
  getNonEvmNetworkImageSourceByChainId: jest.fn(),
}));

jest.mock('../../../../../constants/network', () => ({
  NETWORKS_CHAIN_ID: {
    MAINNET: '0x1',
    OPTIMISM: '0xa',
    BSC: '0x38',
    POLYGON: '0x89',
    FANTOM: '0xfa',
    BASE: '0x2105',
    ARBITRUM: '0xa4b1',
    AVAXCCHAIN: '0xa86a',
    CELO: '0xa4ec',
    HARMONY: '0x63564c40',
    SEPOLIA: '0xaa36a7',
    LINEA_GOERLI: '0xe704',
    LINEA_SEPOLIA: '0xe705',
    GOERLI: '0x5',
    LINEA_MAINNET: '0xe708',
    ZKSYNC_ERA: '0x144',
    LOCALHOST: '0x539',
    ARBITRUM_GOERLI: '0x66eed',
    OPTIMISM_GOERLI: '0x1a4',
    MUMBAI: '0x13881',
    OPBNB: '0xcc',
    SCROLL: '0x82750',
    BERACHAIN: '0x138d6',
    METACHAIN_ONE: '0x1b6a6',
    MEGAETH_TESTNET: '0x18c6',
    SEI: '0x531',
    MONAD_TESTNET: '0x279f',
  },
  NETWORK_CHAIN_ID: {
    FLARE_MAINNET: '0x13',
    SONGBIRD_TESTNET: '0x14',
    APECHAIN_TESTNET: '0x15',
    APECHAIN_MAINNET: '0x16',
  },
}));

jest.mock('../../../../../constants/popular-networks', () => ({
  POPULAR_NETWORK_CHAIN_IDS: new Set(['0x1', '0xe708']),
}));

jest.mock('./CustomNetworkNativeImgMapping', () => ({
  CustomNetworkNativeImgMapping: {
    '0x89': 'polygon-native.png',
  },
}));

// Mock all selectors
const mockStore = configureStore({
  reducer: {
    root: (state = {}) => state,
  },
  preloadedState: {
    root: {},
  },
});

const MockProvider = ({ children }: { children: React.ReactNode }) => (
  <Provider store={mockStore}>
    <NavigationContainer>{children}</NavigationContainer>
  </Provider>
);

// Mock useSelector to return controlled data
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

describe('TokenListItem - Component Rendering Tests for Coverage', () => {
  const mockUseSelector = useSelector as jest.MockedFunction<
    typeof useSelector
  >;
  const mockUseTokenPricePercentageChange =
    useTokenPricePercentageChange as jest.MockedFunction<
      typeof useTokenPricePercentageChange
    >;
  const mockIsTestNet = isTestNet as jest.MockedFunction<typeof isTestNet>;
  const mockFormatWithThreshold = formatWithThreshold as jest.MockedFunction<
    typeof formatWithThreshold
  >;

  function prepareMocks({ asset }: { asset?: TokenI } = {}) {
    jest.clearAllMocks();

    // Default mock setup
    mockUseSelector.mockImplementation(
      (selector: (state: unknown) => unknown) => {
        if (selector.toString().includes('selectAsset')) {
          return asset;
        }

        if (selector.toString().includes('selectShowFiatInTestnets')) {
          return false;
        }

        return {};
      },
    );

    mockUseTokenPricePercentageChange.mockReturnValue(5.67);
    mockIsTestNet.mockReturnValue(false);
    mockFormatWithThreshold.mockImplementation((value) => `${value} FORMATTED`);
  }

  describe('Render asset information', () => {
    it('renders asset name, balance, fiat amount and percentage change', () => {
      prepareMocks({
        asset: {
          decimals: 18,
          address: '0x456',
          chainId: '0x1',
          symbol: 'TEST',
          name: 'Test Token',
          balance: '1.23',
          balanceFiat: '$123.00',
          isNative: false,
          isETH: false,
          image: 'https://example.com/image.png',
          logo: 'https://example.com/logo.png',
          aggregators: [],
        },
      });

      const assetKey: FlashListAssetKey = {
        address: '0x456',
        chainId: '0x1',
        isStaked: false,
      };

      const { getByText } = render(
        <MockProvider>
          <TokenListItemBip44
            assetKey={assetKey}
            showRemoveMenu={jest.fn()}
            setShowScamWarningModal={jest.fn()}
            privacyMode={false}
          />
        </MockProvider>,
      );

      expect(getByText('Test Token')).toBeDefined();
      expect(getByText('$123.00')).toBeDefined();
      expect(getByText('1.23 TEST')).toBeDefined();
      expect(getByText('+5.67%')).toBeDefined();
    });
  });

  describe('Render Asset Logo', () => {
    it('renders asset logo for non-native assets', () => {
      prepareMocks({
        asset: {
          decimals: 18,
          address: '0x456',
          chainId: '0x1',
          symbol: 'TEST',
          name: 'Test Token',
          balance: '1.23',
          balanceFiat: '$123.00',
          isNative: false,
          isETH: false,
          image: 'https://example.com/image.png',
          logo: 'https://example.com/logo.png',
          aggregators: [],
        },
      });

      const assetKey: FlashListAssetKey = {
        address: '0x456',
        chainId: '0x1',
        isStaked: false,
      };

      const { UNSAFE_getByType } = render(
        <MockProvider>
          <TokenListItemBip44
            assetKey={assetKey}
            showRemoveMenu={jest.fn()}
            setShowScamWarningModal={jest.fn()}
            privacyMode={false}
          />
        </MockProvider>,
      );

      const assetAvatar = UNSAFE_getByType(AvatarToken);
      expect(assetAvatar.props).toStrictEqual({
        name: 'TEST',
        imageSource: {
          uri: 'https://example.com/image.png',
        },
        size: AvatarSize.Lg,
      });
    });

    it('renders asset logo for native asset', () => {
      prepareMocks({
        asset: {
          decimals: 18,
          address: '0x000',
          chainId: '0x1',
          symbol: 'ETH',
          ticker: 'ETH',
          name: 'Ethereum',
          balance: '1.23',
          balanceFiat: '$123.00',
          isNative: true,
          isETH: false,
          image: 'https://example.com/image.png',
          logo: '',
          aggregators: [],
        },
      });

      const assetKey: FlashListAssetKey = {
        address: '0x000',
        chainId: '0x1',
        isStaked: false,
      };

      const { UNSAFE_getByType } = render(
        <MockProvider>
          <TokenListItemBip44
            assetKey={assetKey}
            showRemoveMenu={jest.fn()}
            setShowScamWarningModal={jest.fn()}
            privacyMode={false}
          />
        </MockProvider>,
      );

      const assetAvatar = UNSAFE_getByType(NetworkAssetLogo);
      expect(assetAvatar.props).toStrictEqual(
        expect.objectContaining({
          chainId: '0x1',
          ticker: 'ETH',
          big: false,
          biggest: false,
          testID: 'Ethereum',
        }),
      );
    });

    it('renders asset logo for custom network', () => {
      prepareMocks({
        asset: {
          decimals: 18,
          address: '0x000',
          chainId: '0x89',
          symbol: 'POL',
          ticker: 'POL',
          name: 'POL',
          balance: '1.23',
          balanceFiat: '$123.00',
          isNative: true,
          isETH: false,
          image: 'https://example.com/image.png',
          logo: '',
          aggregators: [],
        },
      });

      const assetKey: FlashListAssetKey = {
        address: '0x000',
        chainId: '0x89',
        isStaked: false,
      };

      const { UNSAFE_getByType } = render(
        <MockProvider>
          <TokenListItemBip44
            assetKey={assetKey}
            showRemoveMenu={jest.fn()}
            setShowScamWarningModal={jest.fn()}
            privacyMode={false}
          />
        </MockProvider>,
      );

      const assetAvatar = UNSAFE_getByType(AvatarToken);
      expect(assetAvatar.props).toStrictEqual({
        name: 'POL',
        imageSource: 'polygon-native.png',
        size: AvatarSize.Lg,
      });
    });
  });
});
