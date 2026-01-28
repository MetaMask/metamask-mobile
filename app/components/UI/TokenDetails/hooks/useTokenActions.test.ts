import { renderHook, act } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { useTokenActions, getSwapTokens } from './useTokenActions';
import { TokenI } from '../../Tokens/types';
import { selectSelectedInternalAccount } from '../../../../selectors/accountsController';
import { selectSelectedAccountGroup } from '../../../../selectors/multichainAccounts/accountTreeController';
import { selectSelectedInternalAccountByScope } from '../../../../selectors/multichainAccounts/accounts';
import { selectEvmChainId } from '../../../../selectors/networkController';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockDispatch = jest.fn();
const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn(() => ({
  addProperties: jest.fn().mockReturnThis(),
  build: jest.fn().mockReturnValue({}),
}));
const mockNavigateToSendPage = jest.fn();
const mockGoToBuy = jest.fn();
const mockGoToSwaps = jest.fn();

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
  useDispatch: () => mockDispatch,
}));

// Mock all the selectors
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

jest.mock('../../../../selectors/networkController', () => ({
  selectEvmChainId: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
}));

jest.mock('@metamask/bridge-controller', () => ({
  formatChainIdToCaip: jest.fn((chainId: string) => {
    if (chainId.startsWith('0x')) {
      return `eip155:${parseInt(chainId, 16)}`;
    }
    return chainId;
  }),
  isNativeAddress: jest.fn((address: string) => !address || address === '0x0'),
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
      setActiveNetwork: jest.fn().mockResolvedValue(undefined),
    },
  },
}));

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

jest.mock('../../../../actions/transaction', () => ({
  newAssetTransaction: jest.fn((asset) => ({ type: 'NEW_ASSET_TX', asset })),
}));

jest.mock('../../../../util/transactions', () => ({
  getEther: jest.fn((ticker) => ({ ticker, isNative: true })),
}));

jest.mock('../../../../util/networks', () => ({
  getDecimalChainId: jest.fn(() => 1),
}));

jest.mock('../../../../util/Logger', () => ({
  error: jest.fn(),
  log: jest.fn(),
}));

// Mock the send utils that use analytics
jest.mock('../../../Views/confirmations/utils/send', () => ({
  captureSendStartedEvent: jest.fn(),
  trackEvent: jest.fn(),
}));

// Mock useSendNonEvmAsset hook - path is relative to the source file's import
const mockSendNonEvmAsset = jest.fn().mockResolvedValue(false);
jest.mock('../../../hooks/useSendNonEvmAsset', () => ({
  useSendNonEvmAsset: () => ({
    sendNonEvmAsset: mockSendNonEvmAsset,
  }),
}));

jest.mock('../../../../components/hooks/useMetrics', () => ({
  useMetrics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

jest.mock('../../../../util/analytics/actionButtonTracking', () => ({
  trackActionButtonClick: jest.fn(),
  ActionButtonType: {
    BUY: 'BUY',
    SEND: 'SEND',
    RECEIVE: 'RECEIVE',
    SWAP: 'SWAP',
  },
  ActionLocation: {
    ASSET_DETAILS: 'ASSET_DETAILS',
  },
  ActionPosition: {
    FIRST_POSITION: 1,
    SECOND_POSITION: 2,
    THIRD_POSITION: 3,
    FOURTH_POSITION: 4,
  },
}));

jest.mock('../../../Views/confirmations/hooks/useSendNavigation', () => ({
  useSendNavigation: () => ({
    navigateToSendPage: mockNavigateToSendPage,
  }),
}));

jest.mock('../../Ramp/hooks/useRampNavigation', () => ({
  useRampNavigation: () => ({
    goToBuy: mockGoToBuy,
  }),
}));

jest.mock('../../Ramp/hooks/useRampsButtonClickData', () => ({
  useRampsButtonClickData: () => ({
    ramp_routing: 'default',
    is_authenticated: true,
    preferred_provider: null,
    order_count: 0,
  }),
}));

jest.mock('../../Ramp/hooks/useRampsUnifiedV1Enabled', () => ({
  __esModule: true,
  default: jest.fn(() => false),
}));

jest.mock('../../Bridge/hooks/useSwapBridgeNavigation', () => ({
  useSwapBridgeNavigation: () => ({
    goToSwaps: mockGoToSwaps,
    networkModal: null,
  }),
  SwapBridgeNavigationLocation: {
    TokenView: 'TokenView',
  },
  isAssetFromTrending: jest.fn(() => false),
}));

jest.mock('../../Bridge/utils/tokenUtils', () => ({
  getNativeSourceToken: jest.fn(() => ({ symbol: 'ETH' })),
  getDefaultDestToken: jest.fn(() => ({ symbol: 'USDC' })),
}));

jest.mock('../../Ramp/utils/parseRampIntent', () => ({
  __esModule: true,
  default: jest.fn(() => ({ assetId: 'test-asset-id' })),
}));

jest.mock('../../../../reducers/fiatOrders', () => ({
  getDetectedGeolocation: jest.fn(() => 'US'),
}));

jest.mock('../../../../constants/bridge', () => ({
  NATIVE_SWAPS_TOKEN_ADDRESS: '0x0000000000000000000000000000000000000000',
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

describe('useTokenActions', () => {
  const mockToken: TokenI = {
    address: '0x6b175474e89094c44da98b954eedeac495271d0f',
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    decimals: 18,
    chainId: '0x1',
    balance: '100',
    balanceFiat: '$100',
    image: '',
    logo: '',
    aggregators: [],
    isETH: false,
    isNative: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelector.mockImplementation((selector) => {
      // Match selectors by reference
      if (selector === selectSelectedInternalAccount) {
        return { address: '0xuser123' };
      }
      if (selector === selectSelectedAccountGroup) {
        return { id: 'group-1' };
      }
      if (selector === selectSelectedInternalAccountByScope) {
        return () => ({ address: '0xuser123' });
      }
      if (selector === selectEvmChainId) {
        return '0x1';
      }
      // Handle inline selectors (like nativeCurrency)
      if (typeof selector === 'function') {
        const mockState = {
          engine: {
            backgroundState: {
              NetworkController: {
                providerConfig: { ticker: 'ETH' },
              },
            },
          },
        };
        try {
          return selector(mockState);
        } catch {
          return undefined;
        }
      }
      return undefined;
    });
  });

  describe('hook initialization', () => {
    it('returns all action handlers', () => {
      const { result } = renderHook(() =>
        useTokenActions({ token: mockToken, networkName: 'Ethereum Mainnet' }),
      );

      expect(result.current.onBuy).toBeDefined();
      expect(result.current.onSend).toBeDefined();
      expect(result.current.onReceive).toBeDefined();
      expect(result.current.goToSwaps).toBeDefined();
      expect(result.current.networkModal).toBeDefined();
    });
  });

  describe('onBuy', () => {
    it('calls goToBuy with asset id', () => {
      const { result } = renderHook(() =>
        useTokenActions({ token: mockToken, networkName: 'Ethereum Mainnet' }),
      );

      act(() => {
        result.current.onBuy();
      });

      expect(mockGoToBuy).toHaveBeenCalled();
    });

    it('tracks buy button click event', () => {
      const { result } = renderHook(() =>
        useTokenActions({ token: mockToken, networkName: 'Ethereum Mainnet' }),
      );

      act(() => {
        result.current.onBuy();
      });

      expect(mockTrackEvent).toHaveBeenCalled();
    });
  });

  describe('onSend', () => {
    it('navigates to wallet and calls navigateToSendPage', async () => {
      const { result } = renderHook(() =>
        useTokenActions({ token: mockToken, networkName: 'Ethereum Mainnet' }),
      );

      await act(async () => {
        await result.current.onSend();
      });

      expect(mockNavigate).toHaveBeenCalled();
      expect(mockNavigateToSendPage).toHaveBeenCalled();
    });

    it('dispatches newAssetTransaction', async () => {
      const { result } = renderHook(() =>
        useTokenActions({ token: mockToken, networkName: 'Ethereum Mainnet' }),
      );

      await act(async () => {
        await result.current.onSend();
      });

      expect(mockDispatch).toHaveBeenCalled();
    });
  });

  describe('onReceive', () => {
    it('navigates to share address QR modal when all required data is available', () => {
      // Default beforeEach setup provides all required data
      const { result } = renderHook(() =>
        useTokenActions({ token: mockToken, networkName: 'Ethereum Mainnet' }),
      );

      act(() => {
        result.current.onReceive();
      });

      expect(mockNavigate).toHaveBeenCalled();
    });

    it('does not navigate when selectedAccountGroup is missing', () => {
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectSelectedInternalAccount) {
          return { address: '0xuser123' };
        }
        if (selector === selectSelectedAccountGroup) {
          return undefined; // Missing account group
        }
        if (selector === selectSelectedInternalAccountByScope) {
          return () => ({ address: '0xuser123' });
        }
        if (selector === selectEvmChainId) {
          return '0x1';
        }
        return undefined;
      });

      const { result } = renderHook(() =>
        useTokenActions({ token: mockToken, networkName: 'Ethereum Mainnet' }),
      );

      act(() => {
        result.current.onReceive();
      });

      // Should not navigate when account group is missing
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('goToSwaps', () => {
    it('calls goToSwaps from useSwapBridgeNavigation', () => {
      const { result } = renderHook(() =>
        useTokenActions({ token: mockToken, networkName: 'Ethereum Mainnet' }),
      );

      act(() => {
        result.current.goToSwaps();
      });

      expect(mockGoToSwaps).toHaveBeenCalled();
    });
  });
});

describe('getSwapTokens', () => {
  const mockToken: TokenI = {
    address: '0x6b175474e89094c44da98b954eedeac495271d0f',
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    decimals: 18,
    chainId: '0x1',
    balance: '100',
    balanceFiat: '$100',
    image: '',
    logo: '',
    aggregators: [],
    isETH: false,
    isNative: false,
  };

  it('returns source token with asset data for non-trending tokens', () => {
    const { sourceToken, destToken } = getSwapTokens(mockToken);

    expect(sourceToken).toBeDefined();
    expect(sourceToken?.symbol).toBe('DAI');
    expect(destToken).toBeUndefined();
  });

  it('returns bridge token with NATIVE_SWAPS_TOKEN_ADDRESS for tokens without address', () => {
    const tokenWithoutAddress: TokenI = {
      ...mockToken,
      address: undefined as unknown as string,
    };

    const { sourceToken } = getSwapTokens(tokenWithoutAddress);

    expect(sourceToken?.address).toBe(
      '0x0000000000000000000000000000000000000000',
    );
  });
});
