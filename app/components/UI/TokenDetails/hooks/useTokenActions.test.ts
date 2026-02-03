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
  selectEvmChainId: jest.fn(),
}));

jest.mock('../../../../selectors/accountsController', () => ({
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

jest.mock('../../../hooks/useMetrics', () => ({
  useMetrics: () => ({
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
      expect(result.current).toHaveProperty('networkModal');

      expect(typeof result.current.onBuy).toBe('function');
      expect(typeof result.current.onSend).toBe('function');
      expect(typeof result.current.onReceive).toBe('function');
      expect(typeof result.current.goToSwaps).toBe('function');
      expect(typeof result.current.handleBuyPress).toBe('function');
      expect(typeof result.current.handleSellPress).toBe('function');
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
      expect(mockGoToBuy).toHaveBeenCalledWith({
        assetId: expectedAssetId,
      });

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
      );
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
      );
    });
  });
});
