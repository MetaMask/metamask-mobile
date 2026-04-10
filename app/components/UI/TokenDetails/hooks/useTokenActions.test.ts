import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { useTokenActions, getSwapTokens } from './useTokenActions';
import { TokenI } from '../../Tokens/types';
import { selectEvmChainId } from '../../../../selectors/networkController';
import { selectSelectedInternalAccount } from '../../../../selectors/accountsController';
import { selectSelectedAccountGroup } from '../../../../selectors/multichainAccounts/accountTreeController';
import { selectSelectedInternalAccountByScope } from '../../../../selectors/multichainAccounts/accounts';
import { getDetectedGeolocation } from '../../../../reducers/fiatOrders';
import { selectAssetsBySelectedAccountGroup } from '../../../../selectors/assets/assets-list';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import {
  ActionButtonType,
  ActionPosition,
  ActionLocation,
} from '../../../../util/analytics/actionButtonTracking';
import Routes from '../../../../constants/navigation/Routes';
import { isCaipAssetType } from '@metamask/utils';
import { formatAddressToAssetId } from '@metamask/bridge-controller';

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

jest.mock('../../../../selectors/networkController', () => ({
  ...jest.requireActual<
    typeof import('../../../../selectors/networkController')
  >('../../../../selectors/networkController'),
  selectEvmChainId: jest.fn(),
}));

jest.mock('../../../../selectors/accountsController', () => ({
  ...jest.requireActual<
    typeof import('../../../../selectors/accountsController')
  >('../../../../selectors/accountsController'),
  selectSelectedInternalAccount: jest.fn(),
}));

jest.mock(
  '../../../../selectors/multichainAccounts/accountTreeController',
  () => ({
    selectSelectedAccountGroup: jest.fn(),
  }),
);

jest.mock('../../../../selectors/multichainAccounts/accounts', () => ({
  selectSelectedInternalAccountByScope: jest.fn(),
}));

jest.mock('../../../../reducers/fiatOrders', () => ({
  getDetectedGeolocation: jest.fn(),
}));

jest.mock('../../../../selectors/assets/assets-list', () => ({
  selectAssetsBySelectedAccountGroup: jest.fn(),
}));

const mockTrackEvent = jest.fn();
const mockAddProperties = jest.fn().mockReturnThis();
const mockBuild = jest.fn().mockReturnValue({});
const createMockEventBuilder = () => ({
  addProperties: mockAddProperties,
  build: mockBuild,
});
const mockCreateEventBuilder = jest.fn(() => createMockEventBuilder());

jest.mock('../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

const mockNavigateToSendPage = jest.fn();
jest.mock('../../../Views/confirmations/hooks/useSendNavigation', () => ({
  useSendNavigation: () => ({
    navigateToSendPage: mockNavigateToSendPage,
  }),
}));

const mockGoToBuy = jest.fn();
jest.mock('../../Ramp/hooks/useRampNavigation', () => ({
  useRampNavigation: () => ({
    goToBuy: mockGoToBuy,
  }),
}));

jest.mock('../../Ramp/hooks/useRampsButtonClickData', () => ({
  useRampsButtonClickData: () => ({
    ramp_routing: 'test-routing',
    is_authenticated: true,
    preferred_provider: 'test-provider',
    order_count: 0,
  }),
}));

jest.mock('../../Ramp/hooks/useRampsUnifiedV1Enabled', () =>
  jest.fn(() => false),
);

jest.mock('../../../hooks/useSendNonEvmAsset', () => ({
  useSendNonEvmAsset: () => ({
    sendNonEvmAsset: jest.fn().mockResolvedValue(false),
  }),
}));

const mockGoToSwaps = jest.fn();
const mockNetworkModal = null;
jest.mock('../../Bridge/hooks/useSwapBridgeNavigation', () => ({
  useSwapBridgeNavigation: () => ({
    goToSwaps: mockGoToSwaps,
    networkModal: mockNetworkModal,
  }),
  SwapBridgeNavigationLocation: {
    TokenView: 'TokenView',
  },
  isAssetFromTrending: jest.fn(() => false),
}));

jest.mock('../../Bridge/utils/tokenUtils', () => ({
  getDefaultDestToken: jest.fn(),
  getNativeSourceToken: jest.fn(),
}));

jest.mock('@metamask/utils', () => ({
  ...jest.requireActual('@metamask/utils'),
  isCaipAssetType: jest.fn(),
}));

jest.mock('@metamask/bridge-controller', () => ({
  ...jest.requireActual('@metamask/bridge-controller'),
  formatAddressToAssetId: jest.fn(),
}));

const mockIsCaipAssetType = jest.mocked(isCaipAssetType);
const mockFormatAddressToAssetId = jest.mocked(formatAddressToAssetId);

jest.mock('../../../../core/Engine', () => ({
  context: {
    NetworkController: {
      getNetworkConfigurationByChainId: jest.fn(() => ({
        rpcEndpoints: [{ networkClientId: 'mainnet' }],
        defaultRpcEndpointIndex: 0,
      })),
    },
    MultichainNetworkController: {
      setActiveNetwork: jest.fn(),
    },
  },
}));

const mockUseSelector = jest.mocked(useSelector);

describe('useTokenActions', () => {
  const mockAccountAddress = '0x1234567890abcdef1234567890abcdef12345678';

  const mockAccount = {
    id: 'account-1',
    address: mockAccountAddress,
    metadata: { name: 'Account 1', keyring: { type: 'HD Key Tree' } },
    type: 'eip155:eoa',
  };

  const mockAccountGroup = {
    id: 'group-1',
    name: 'Test Group',
  };

  const defaultToken: TokenI = {
    address: '0x6b175474e89094c44da98b954eedeac495271d0f',
    chainId: '0x1',
    symbol: 'DAI',
    decimals: 18,
    name: 'Dai Stablecoin',
    image: 'https://example.com/dai.png',
    isETH: false,
    isNative: false,
  } as TokenI;

  /**
   * Sets up default selector mocks and returns individual mock functions
   * that can be overridden in specific tests.
   *
   * @example
   * // Override a specific selector in a test:
   * const mocks = setupDefaultMocks();
   * mocks.mockSelectAssetsBySelectedAccountGroup.mockReturnValue({ '0x1': [...] });
   */
  const setupDefaultMocks = () => {
    const mockSelectEvmChainId = jest.fn().mockReturnValue('0x1');
    const mockSelectSelectedInternalAccount = jest
      .fn()
      .mockReturnValue(mockAccount);
    const mockSelectSelectedAccountGroup = jest
      .fn()
      .mockReturnValue(mockAccountGroup);
    const mockSelectSelectedInternalAccountByScope = jest
      .fn()
      .mockReturnValue(() => mockAccount);
    const mockGetDetectedGeolocation = jest.fn().mockReturnValue('US');
    const mockSelectAssetsBySelectedAccountGroup = jest
      .fn()
      .mockReturnValue({}); // Empty object of user assets (keyed by chainId)

    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectEvmChainId) {
        return mockSelectEvmChainId();
      }
      if (selector === selectSelectedInternalAccount) {
        return mockSelectSelectedInternalAccount();
      }
      if (selector === selectSelectedAccountGroup) {
        return mockSelectSelectedAccountGroup();
      }
      if (selector === selectSelectedInternalAccountByScope) {
        return mockSelectSelectedInternalAccountByScope();
      }
      if (selector === getDetectedGeolocation) {
        return mockGetDetectedGeolocation();
      }
      if (selector === selectAssetsBySelectedAccountGroup) {
        return mockSelectAssetsBySelectedAccountGroup();
      }
      if (typeof selector === 'function') {
        return 'ETH';
      }
      return undefined;
    });

    return {
      mockSelectEvmChainId,
      mockSelectSelectedInternalAccount,
      mockSelectSelectedAccountGroup,
      mockSelectSelectedInternalAccountByScope,
      mockGetDetectedGeolocation,
      mockSelectAssetsBySelectedAccountGroup,
    };
  };

  // Store mocks returned from setupDefaultMocks for per-test overrides
  let selectorMocks: ReturnType<typeof setupDefaultMocks>;

  beforeEach(() => {
    jest.clearAllMocks();
    selectorMocks = setupDefaultMocks();
  });

  describe('getSwapTokens', () => {
    it('returns sourceToken as the token and destToken as undefined for regular tokens', () => {
      const result = getSwapTokens(defaultToken);

      expect(result.sourceToken).toMatchObject({
        address: defaultToken.address,
        chainId: defaultToken.chainId,
        symbol: defaultToken.symbol,
      });
      expect(result.destToken).toBeUndefined();
    });
  });

  describe('hook return value', () => {
    it('returns all action handlers and networkModal', () => {
      const { result } = renderHook(() =>
        useTokenActions({
          token: defaultToken,
          networkName: 'Ethereum Mainnet',
        }),
      );

      expect(result.current).toHaveProperty('onBuy');
      expect(result.current).toHaveProperty('onSend');
      expect(result.current).toHaveProperty('onReceive');
      expect(result.current).toHaveProperty('goToSwaps');
      expect(result.current).toHaveProperty('handleBuyPress');
      expect(result.current).toHaveProperty('handleSellPress');
      expect(result.current).toHaveProperty('handleStickySwapPress');
      expect(result.current).toHaveProperty('networkModal');

      expect(typeof result.current.onBuy).toBe('function');
      expect(typeof result.current.onSend).toBe('function');
      expect(typeof result.current.onReceive).toBe('function');
      expect(typeof result.current.goToSwaps).toBe('function');
      expect(typeof result.current.handleBuyPress).toBe('function');
      expect(typeof result.current.handleSellPress).toBe('function');
      expect(typeof result.current.handleStickySwapPress).toBe('function');
    });
  });

  describe('onBuy', () => {
    it('calls goToBuy with parsed assetId and tracks analytics', () => {
      const { result } = renderHook(() =>
        useTokenActions({
          token: defaultToken,
          networkName: 'Ethereum Mainnet',
        }),
      );

      result.current.onBuy();

      const expectedAssetId =
        'eip155:1/erc20:0x6B175474E89094C44Da98b954EedeAC495271d0F';
      expect(mockGoToBuy).toHaveBeenCalledTimes(1);
      expect(mockGoToBuy).toHaveBeenCalledWith(
        { assetId: expectedAssetId },
        { buyFlowOrigin: 'tokenInfo' },
      );

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.ACTION_BUTTON_CLICKED,
      );

      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          action_name: ActionButtonType.BUY,
          action_position: ActionPosition.FIRST_POSITION,
          location: ActionLocation.ASSET_DETAILS,
        }),
      );

      expect(mockTrackEvent).toHaveBeenCalledTimes(2);
    });
  });

  describe('onSend', () => {
    it('navigates to send page and tracks analytics', async () => {
      const { result } = renderHook(() =>
        useTokenActions({
          token: defaultToken,
          networkName: 'Ethereum Mainnet',
        }),
      );

      await result.current.onSend();

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.ACTION_BUTTON_CLICKED,
      );
      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          action_name: ActionButtonType.SEND,
          action_position: ActionPosition.THIRD_POSITION,
          location: ActionLocation.ASSET_DETAILS,
        }),
      );

      expect(mockNavigateToSendPage).toHaveBeenCalledWith({
        location: 'asset_overview',
        asset: defaultToken,
      });
    });
  });

  describe('onReceive', () => {
    it('navigates to share address QR and tracks analytics', () => {
      const { result } = renderHook(() =>
        useTokenActions({
          token: defaultToken,
          networkName: 'Ethereum Mainnet',
        }),
      );

      result.current.onReceive();

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.ACTION_BUTTON_CLICKED,
      );
      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          action_name: ActionButtonType.RECEIVE,
          action_position: ActionPosition.FOURTH_POSITION,
          location: ActionLocation.ASSET_DETAILS,
        }),
      );

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.MODAL.MULTICHAIN_ACCOUNT_DETAIL_ACTIONS,
        {
          screen: Routes.SHEET.MULTICHAIN_ACCOUNT_DETAILS.SHARE_ADDRESS_QR,
          params: {
            address: mockAccountAddress,
            networkName: 'Ethereum Mainnet',
            chainId: '0x1',
            groupId: 'group-1',
          },
        },
      );
    });
  });

  describe('handleBuyPress', () => {
    beforeEach(() => {
      // Default mock behavior for assetId generation
      mockIsCaipAssetType.mockReturnValue(false);
      mockFormatAddressToAssetId.mockImplementation(
        (address: string, chainId?: string | number) => {
          // Simulate the real behavior for EVM tokens
          const numericChainId =
            typeof chainId === 'string' ? parseInt(chainId, 16) : chainId;
          const checksumAddress =
            address.slice(0, 2) + address.slice(2).toUpperCase();
          return `eip155:${numericChainId}/erc20:${checksumAddress}`;
        },
      );
    });

    it('routes to on-ramp when no eligible tokens exist', () => {
      // Empty user assets (no tokens with balance) - uses default from setupDefaultMocks
      const { result } = renderHook(() =>
        useTokenActions({
          token: defaultToken,
          networkName: 'Ethereum Mainnet',
        }),
      );

      result.current.handleBuyPress();

      expect(mockGoToBuy).toHaveBeenCalledTimes(1);
      expect(mockGoToSwaps).not.toHaveBeenCalled();
    });

    describe('assetId generation for on-ramp', () => {
      it('uses token.address directly for non-EVM tokens with CAIP address (Solana)', () => {
        // Real Solana token structure - address is already a CAIP asset type
        const solanaToken = {
          address:
            'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:AUSD1jCcCyPLybk1YnvPWsHQSrZ46dxwoMniN4N2UEB9',
          aggregators: [],
          decimals: 6,
          image:
            'https://static.cx.metamask.io/api/v2/tokenIcons/assets/solana/5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token/AUSD1jCcCyPLybk1YnvPWsHQSrZ46dxwoMniN4N2UEB9.png',
          name: 'AUSD',
          symbol: 'AUSD',
          balance: '0',
          balanceFiat: '$0.00',
          isETH: false,
          isStaked: false,
          chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
          isNative: false,
          ticker: 'AUSD',
          accountType: 'solana:data-account',
        } as unknown as TokenI;

        mockIsCaipAssetType.mockReturnValue(true);

        const { result } = renderHook(() =>
          useTokenActions({
            token: solanaToken,
            networkName: 'Solana',
          }),
        );

        result.current.handleBuyPress();

        expect(mockIsCaipAssetType).toHaveBeenCalledWith(solanaToken.address);
        expect(mockFormatAddressToAssetId).not.toHaveBeenCalled();
        expect(mockGoToBuy).toHaveBeenCalledWith(
          { assetId: solanaToken.address },
          { buyFlowOrigin: 'tokenInfo' },
        );
      });

      it('uses token.address directly for trending non-EVM tokens with CAIP address', () => {
        // Real trending Solana token structure
        const trendingSolanaToken = {
          chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
          address:
            'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:4j1B6dZn9s4nmf8yZhResvSrTA3nmMhDnfNYY2Q5N7c1',
          decimals: 6,
          image:
            'https://static.cx.metamask.io/api/v2/tokenIcons/assets/solana/5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token/4j1B6dZn9s4nmf8yZhResvSrTA3nmMhDnfNYY2Q5N7c1.png',
          pricePercentChange1d: 358.639,
          isNative: false,
          isETH: false,
          isFromTrending: true,
        } as unknown as TokenI;

        mockIsCaipAssetType.mockReturnValue(true);

        const { result } = renderHook(() =>
          useTokenActions({
            token: trendingSolanaToken,
            networkName: 'Solana',
          }),
        );

        result.current.handleBuyPress();

        expect(mockIsCaipAssetType).toHaveBeenCalledWith(
          trendingSolanaToken.address,
        );
        expect(mockFormatAddressToAssetId).not.toHaveBeenCalled();
        expect(mockGoToBuy).toHaveBeenCalledWith(
          { assetId: trendingSolanaToken.address },
          { buyFlowOrigin: 'tokenInfo' },
        );
      });

      it('uses formatAddressToAssetId for EVM tokens with hex address', () => {
        // Real EVM token structure - address is hex, chainId is hex
        const evmToken = {
          address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
          aggregators: [],
          decimals: 18,
          image:
            'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/erc20/0x6b175474e89094c44da98b954eedeac495271d0f.png',
          name: 'Dai Stablecoin',
          symbol: 'DAI',
          balance: '0',
          balanceFiat: '$0.00',
          isETH: false,
          isStaked: false,
          chainId: '0x1',
          isNative: false,
          ticker: 'DAI',
          accountType: 'eip155:eoa',
        } as unknown as TokenI;

        const expectedAssetId =
          'eip155:1/erc20:0x6B175474E89094C44Da98b954EedeAC495271d0F';
        mockIsCaipAssetType.mockReturnValue(false);
        mockFormatAddressToAssetId.mockReturnValue(expectedAssetId);

        const { result } = renderHook(() =>
          useTokenActions({
            token: evmToken,
            networkName: 'Ethereum Mainnet',
          }),
        );

        result.current.handleBuyPress();

        expect(mockIsCaipAssetType).toHaveBeenCalledWith(evmToken.address);
        expect(mockFormatAddressToAssetId).toHaveBeenCalledWith(
          evmToken.address,
          evmToken.chainId,
        );
        expect(mockGoToBuy).toHaveBeenCalledWith(
          { assetId: expectedAssetId },
          { buyFlowOrigin: 'tokenInfo' },
        );
      });

      it('uses formatAddressToAssetId for trending EVM tokens', () => {
        // Real trending EVM token structure
        const trendingEvmToken = {
          chainId: '0x2105',
          address: '0x852df602530532fb356adf25fbf0f6511b764b07',
          symbol: 'Dave',
          name: 'Dave the Minion',
          decimals: 18,
          image:
            'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/8453/erc20/0x852df602530532fb356adf25fbf0f6511b764b07.png',
          pricePercentChange1d: 3203.891,
          isNative: false,
          isETH: false,
          isFromTrending: true,
        } as unknown as TokenI;

        const expectedAssetId =
          'eip155:8453/erc20:0x852df602530532fb356adf25fbf0f6511b764b07';
        mockIsCaipAssetType.mockReturnValue(false);
        mockFormatAddressToAssetId.mockReturnValue(expectedAssetId);

        const { result } = renderHook(() =>
          useTokenActions({
            token: trendingEvmToken,
            networkName: 'Base',
          }),
        );

        result.current.handleBuyPress();

        expect(mockIsCaipAssetType).toHaveBeenCalledWith(
          trendingEvmToken.address,
        );
        expect(mockFormatAddressToAssetId).toHaveBeenCalledWith(
          trendingEvmToken.address,
          trendingEvmToken.chainId,
        );
        expect(mockGoToBuy).toHaveBeenCalledWith(
          { assetId: expectedAssetId },
          { buyFlowOrigin: 'tokenInfo' },
        );
      });

      it('passes undefined assetId when formatAddressToAssetId throws an error', () => {
        mockIsCaipAssetType.mockReturnValue(false);
        mockFormatAddressToAssetId.mockImplementation(() => {
          throw new Error('Invalid address format');
        });

        const { result } = renderHook(() =>
          useTokenActions({
            token: defaultToken,
            networkName: 'Ethereum Mainnet',
          }),
        );

        result.current.handleBuyPress();

        expect(mockGoToBuy).toHaveBeenCalledWith(
          { assetId: undefined },
          { buyFlowOrigin: 'tokenInfo' },
        );
      });

      it('passes undefined assetId when formatAddressToAssetId returns null', () => {
        mockIsCaipAssetType.mockReturnValue(false);
        mockFormatAddressToAssetId.mockReturnValue(undefined);

        const { result } = renderHook(() =>
          useTokenActions({
            token: defaultToken,
            networkName: 'Ethereum Mainnet',
          }),
        );

        result.current.handleBuyPress();

        expect(mockGoToBuy).toHaveBeenCalledWith(
          { assetId: undefined },
          { buyFlowOrigin: 'tokenInfo' },
        );
      });
    });

    it('calls goToSwaps with source and dest tokens when user has eligible tokens on same chain', () => {
      // Override selectAssetsBySelectedAccountGroup with tokens that have balance
      selectorMocks.mockSelectAssetsBySelectedAccountGroup.mockReturnValue({
        '0x1': [
          {
            assetId: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
            chainId: '0x1',
            decimals: 18,
            symbol: 'WETH',
            name: 'Wrapped Ether',
            image: '',
            fiat: { balance: 1000 },
          },
        ],
      });

      const { result } = renderHook(() =>
        useTokenActions({
          token: defaultToken,
          networkName: 'Ethereum Mainnet',
        }),
      );

      result.current.handleBuyPress();

      expect(mockGoToSwaps).toHaveBeenCalledTimes(1);
      expect(mockGoToSwaps).toHaveBeenCalledWith(
        expect.objectContaining({
          address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
          chainId: '0x1',
          symbol: 'WETH',
        }),
        expect.objectContaining({
          address: defaultToken.address,
          chainId: defaultToken.chainId,
          symbol: defaultToken.symbol,
        }),
        'Buy',
        true,
      );
      expect(mockGoToBuy).not.toHaveBeenCalled();
    });

    it('uses highest USD value token from any chain when no tokens on same chain', () => {
      // Override selectAssetsBySelectedAccountGroup with tokens on a different chain
      selectorMocks.mockSelectAssetsBySelectedAccountGroup.mockReturnValue({
        '0xa': [
          {
            assetId: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607',
            chainId: '0xa',
            decimals: 6,
            symbol: 'USDC',
            name: 'USD Coin',
            image: '',
            fiat: { balance: 500 },
          },
        ],
      });

      const { result } = renderHook(() =>
        useTokenActions({
          token: defaultToken,
          networkName: 'Ethereum Mainnet',
        }),
      );

      result.current.handleBuyPress();

      expect(mockGoToSwaps).toHaveBeenCalledWith(
        expect.objectContaining({
          chainId: '0xa',
          symbol: 'USDC',
        }),
        expect.objectContaining({
          address: defaultToken.address,
        }),
        'Buy',
        true,
      );
    });

    it('allows cross-chain bridging of native tokens with same zero address', () => {
      // Native token on Ethereum (zero address)
      const nativeEthToken = {
        ...defaultToken,
        address: '0x0000000000000000000000000000000000000000',
        chainId: '0x1',
        symbol: 'ETH',
        name: 'Ethereum',
        isNative: true,
      } as TokenI;

      // User has native ETH on Optimism (same zero address, different chain)
      selectorMocks.mockSelectAssetsBySelectedAccountGroup.mockReturnValue({
        '0xa': [
          {
            assetId: '0x0000000000000000000000000000000000000000',
            chainId: '0xa',
            decimals: 18,
            symbol: 'ETH',
            name: 'Ethereum',
            image: '',
            isNative: true,
            fiat: { balance: 2000 },
          },
        ],
      });

      const { result } = renderHook(() =>
        useTokenActions({
          token: nativeEthToken,
          networkName: 'Ethereum Mainnet',
        }),
      );

      result.current.handleBuyPress();

      // Should use Optimism ETH as source for cross-chain bridge
      expect(mockGoToSwaps).toHaveBeenCalledTimes(1);
      expect(mockGoToSwaps).toHaveBeenCalledWith(
        expect.objectContaining({
          address: '0x0000000000000000000000000000000000000000',
          chainId: '0xa',
          symbol: 'ETH',
        }),
        expect.objectContaining({
          address: '0x0000000000000000000000000000000000000000',
          chainId: '0x1',
          symbol: 'ETH',
        }),
        'Buy',
        true,
      );
      expect(mockGoToBuy).not.toHaveBeenCalled();
    });
  });

  describe('handleSellPress', () => {
    it('calls goToSwaps with current token as source and undefined dest (swap UI handles dest selection)', () => {
      const { result } = renderHook(() =>
        useTokenActions({
          token: defaultToken,
          networkName: 'Ethereum Mainnet',
        }),
      );

      result.current.handleSellPress();

      expect(mockGoToSwaps).toHaveBeenCalledTimes(1);
      expect(mockGoToSwaps).toHaveBeenCalledWith(
        expect.objectContaining({
          address: defaultToken.address,
          chainId: defaultToken.chainId,
          symbol: defaultToken.symbol,
        }),
        undefined,
        'Sell',
        true,
      );
    });
  });

  /**
   * Swap entry from Token Details sticky CTA (`handleStickySwapPress`):
   * - Has Balance:
   * -- from: current token
   * -- to: undefined (swap UI picks default dest -- e.g. mUSD / last used)
   *
   * - No Balance:
   * -- from: `buySourceToken` (best available)
   * -- to: current token
   *
   * `buySourceToken` priority:
   * 1. Same chain token (not current) with highest fiat balance
   * 2. Native token (ETH, POL, etc.) on any chain with highest fiat balance
   * 3. Last swapped token (Not supported — needs data source)
   * 4. Most used token (Not supported — needs data source)
   * 5. Fallback: any token on any chain with highest fiat balance
   */
  describe('handleStickySwapPress', () => {
    const WETH_ADDRESS = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
    const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
    const POLYGON_USDC_ADDRESS = '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359';

    interface StickySwapUserAsset {
      assetId: string;
      chainId: string;
      decimals: number;
      symbol: string;
      name: string;
      image: string;
      isNative?: boolean;
      fiat?: { balance: number };
    }

    const arrangeToken = (balance: string): TokenI =>
      ({ ...defaultToken, balance }) as TokenI;

    /** Mirrors `selectAssetsBySelectedAccountGroup` shape (values flattened in hook). */
    const arrangeUserAssets = (
      assetsByChain: Record<string, StickySwapUserAsset[]> = {},
    ) => assetsByChain;

    const userAsset = (params: {
      assetId: string;
      chainId?: string;
      symbol: string;
      name?: string;
      decimals?: number;
      fiatBalance?: number;
      isNative?: boolean;
    }): StickySwapUserAsset => ({
      assetId: params.assetId,
      chainId: params.chainId ?? '0x1',
      decimals: params.decimals ?? 18,
      symbol: params.symbol,
      name: params.name ?? params.symbol,
      image: '',
      isNative: params.isNative ?? false,
      ...(params.fiatBalance !== undefined
        ? { fiat: { balance: params.fiatBalance } }
        : {}),
    });

    const hasBalanceCases = [
      {
        name: 'from current token, to default (undefined dest for swap UI)',
        token: arrangeToken('1'),
        userAssets: arrangeUserAssets(),
        expectedDestinationAddress: undefined,
      },
      {
        name: 'currentTokenBalance overrides token.balance when positive',
        token: arrangeToken('0'),
        currentTokenBalance: '0.5',
        userAssets: arrangeUserAssets({
          '0x1': [
            userAsset({
              assetId: WETH_ADDRESS,
              symbol: 'WETH',
              fiatBalance: 9000,
            }),
          ],
        }),
        expectedDestinationAddress: undefined,
      },
    ];

    it.each(hasBalanceCases)(
      'has balance — $name',
      ({
        token,
        currentTokenBalance,
        userAssets,
        expectedDestinationAddress,
      }) => {
        selectorMocks.mockSelectAssetsBySelectedAccountGroup.mockReturnValue(
          userAssets,
        );

        const { result } = renderHook(() =>
          useTokenActions({
            token,
            networkName: 'Ethereum Mainnet',
            ...(currentTokenBalance !== undefined && { currentTokenBalance }),
          }),
        );

        result.current.handleStickySwapPress();

        expect(mockGoToSwaps).toHaveBeenCalledTimes(1);
        expect(mockGoToSwaps).toHaveBeenCalledWith(
          expect.objectContaining({ address: defaultToken.address }),
          expectedDestinationAddress !== undefined
            ? expect.objectContaining({ address: expectedDestinationAddress })
            : undefined,
          undefined,
          true,
        );
      },
    );

    const noBalanceCases = [
      {
        name: 'Priority 1: same chain: best token by fiat to current token',
        token: arrangeToken('0'),
        userAssets: arrangeUserAssets({
          '0x1': [
            userAsset({
              assetId: WETH_ADDRESS,
              symbol: 'WETH',
              fiatBalance: 1000,
            }),
            userAsset({
              assetId: USDC_ADDRESS,
              symbol: 'USDC',
              decimals: 6,
              fiatBalance: 5000,
            }),
          ],
        }),
        expectedSourceAddress: USDC_ADDRESS, // USDC has higher fiat balance than WETH
        expectedDestinationAddress: defaultToken.address,
      },
      {
        name: 'Priority 1: same chain: excludes current asset on same chain; next-best same-chain wins',
        token: arrangeToken('0'),
        userAssets: arrangeUserAssets({
          '0x1': [
            userAsset({
              assetId: defaultToken.address,
              symbol: defaultToken.symbol,
              fiatBalance: 9999,
            }),
            userAsset({
              assetId: WETH_ADDRESS,
              symbol: 'WETH',
              fiatBalance: 100,
            }),
          ],
        }),
        expectedSourceAddress: WETH_ADDRESS,
        expectedDestinationAddress: defaultToken.address,
      },
      {
        name: 'Priority 2: cross chain: native token with highest fiat',
        token: arrangeToken('0'),
        userAssets: arrangeUserAssets({
          '0x89': [
            userAsset({
              assetId: POLYGON_USDC_ADDRESS,
              chainId: '0x89',
              symbol: 'USDC',
              decimals: 6,
              fiatBalance: 5000,
            }),
            userAsset({
              assetId: '0x0000000000000000000000000000000000001010',
              chainId: '0x89',
              symbol: 'POL',
              name: 'POL',
              decimals: 18,
              fiatBalance: 200,
              isNative: true,
            }),
          ],
        }),
        expectedSourceAddress: '0x0000000000000000000000000000000000001010', // cross chain swap, we prefer the native token
        expectedDestinationAddress: defaultToken.address,
      },
      {
        name: 'Priority 2: cross chain: picks native token with highest fiat among multiple native tokens',
        token: arrangeToken('0'),
        userAssets: arrangeUserAssets({
          '0x89': [
            userAsset({
              assetId: '0x0000000000000000000000000000000000001010',
              chainId: '0x89',
              symbol: 'POL',
              name: 'POL',
              decimals: 18,
              fiatBalance: 200,
              isNative: true,
            }),
          ],
          '0xa': [
            userAsset({
              assetId: '0x0000000000000000000000000000000000000000',
              chainId: '0xa',
              symbol: 'ETH',
              name: 'Ethereum',
              decimals: 18,
              fiatBalance: 3000,
              isNative: true,
            }),
          ],
        }),
        expectedSourceAddress: '0x0000000000000000000000000000000000000000', // 0xa native token has the highest native balance
        expectedDestinationAddress: defaultToken.address,
      },
      {
        name: 'Priority 2: no native tokens available: falls back to highest fiat non-native cross-chain token',
        token: arrangeToken('0'),
        userAssets: arrangeUserAssets({
          '0x89': [
            userAsset({
              assetId: POLYGON_USDC_ADDRESS,
              chainId: '0x89',
              symbol: 'USDC',
              decimals: 6,
              fiatBalance: 800,
            }),
          ],
        }),
        expectedSourceAddress: POLYGON_USDC_ADDRESS,
        expectedDestinationAddress: defaultToken.address,
      },

      {
        name: 'Edge case: no eligible source: only current token with fiat — falls back to current, undefined dest',
        token: arrangeToken('0'),
        userAssets: arrangeUserAssets({
          '0x1': [
            userAsset({
              assetId: defaultToken.address,
              symbol: defaultToken.symbol,
              fiatBalance: 100,
            }),
          ],
        }),
        expectedSourceAddress: defaultToken.address,
        expectedDestinationAddress: undefined,
      },
      {
        name: 'Edge case: no eligible source: other tokens have zero or missing fiat — falls back to current, undefined dest',
        token: arrangeToken('0'),
        userAssets: arrangeUserAssets({
          '0x1': [
            userAsset({
              assetId: WETH_ADDRESS,
              symbol: 'WETH',
              fiatBalance: 0,
            }),
            userAsset({
              assetId: USDC_ADDRESS,
              symbol: 'USDC',
              decimals: 6,
            }),
          ],
        }),
        expectedSourceAddress: defaultToken.address,
        expectedDestinationAddress: undefined,
      },
    ];

    it.each(noBalanceCases)(
      'no balance — $name',
      ({
        token,
        userAssets,
        expectedSourceAddress,
        expectedDestinationAddress,
      }) => {
        selectorMocks.mockSelectAssetsBySelectedAccountGroup.mockReturnValue(
          userAssets,
        );

        const { result } = renderHook(() =>
          useTokenActions({
            token,
            networkName: 'Ethereum Mainnet',
          }),
        );

        result.current.handleStickySwapPress();

        expect(mockGoToSwaps).toHaveBeenCalledTimes(1);
        expect(mockGoToSwaps).toHaveBeenCalledWith(
          expect.objectContaining({ address: expectedSourceAddress }),
          expectedDestinationAddress !== undefined
            ? expect.objectContaining({ address: expectedDestinationAddress })
            : undefined,
          undefined,
          true,
        );
      },
    );
  });
});
