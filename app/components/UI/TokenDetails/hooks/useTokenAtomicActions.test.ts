import { act, renderHook } from '@testing-library/react-native';
import type { CaipAssetType, CaipChainId, Hex } from '@metamask/utils';
import { RpcEndpointType } from '@metamask/network-controller';
import {
  AccountGroupAssets,
  Asset,
  TokenSecurityData,
} from '@metamask/assets-controllers';
import {
  useHandleOnBuy,
  useHandleOnReceive,
  useHandleOnSend,
  useHandleOnSwap,
} from './useTokenAtomicActions';
import { getSwapDestToken } from '../../Bridge/utils/getSwapDestToken';
import { TokenI } from '../../Tokens/types';
import { SecurityDataType } from '../../Bridge/types';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import {
  ActionButtonType,
  ActionPosition,
  ActionLocation,
} from '../../../../util/analytics/actionButtonTracking';
import Routes from '../../../../constants/navigation/Routes';
import Logger from '../../../../util/Logger';
import { selectEvmChainId } from '../../../../selectors/networkController';
import { selectSelectedInternalAccount } from '../../../../selectors/accountsController';
import { selectSelectedAccountGroup } from '../../../../selectors/multichainAccounts/accountTreeController';
import { selectSelectedInternalAccountByScope } from '../../../../selectors/multichainAccounts/accounts';
import { selectAssetsBySelectedAccountGroup } from '../../../../selectors/assets/assets-list';
import {
  getDetectedGeolocation,
  getOrders,
} from '../../../../reducers/fiatOrders';
import { selectRampsOrdersForSelectedAccountGroup } from '../../../../selectors/rampsController';
import { getProviderToken } from '../../Ramp/utils/ProviderTokenVault';
import { TokenDetailsSource } from '../constants/constants';
import Engine from '../../../../core/Engine';
import {
  createMockInternalAccount,
  createMockAccountGroup,
} from '../../../../component-library/components-temp/MultichainAccounts/test-utils';

const mockStoreState = { mock: 'state' };
const mockGetState = jest.fn(() => mockStoreState);
jest.mock('react-redux', () => ({
  useStore: () => ({ getState: mockGetState }),
}));

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

jest.mock('../../../../selectors/networkController', () => ({
  selectChainId: jest.fn(),
  selectEvmChainId: jest.fn(),
  selectNetworkConfigurations: jest.fn(),
}));

jest.mock('../../../../selectors/accountsController', () => ({
  selectCanSignTransactions: jest.fn(),
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

jest.mock('../../../../selectors/assets/assets-list', () => ({
  selectAssetsBySelectedAccountGroup: jest.fn(),
}));

jest.mock('../../../../reducers/fiatOrders', () => ({
  getDetectedGeolocation: jest.fn(),
  getOrders: jest.fn(),
}));

jest.mock('../../../../selectors/rampsController', () => ({
  selectRampsOrdersForSelectedAccountGroup: jest.fn(),
}));

jest.mock('../../Ramp/utils/ProviderTokenVault', () => ({
  getProviderToken: jest.fn(),
}));

jest.mock('../../Ramp/utils/determinePreferredProvider', () => ({
  completedOrdersFromFiatOrders: jest.fn(() => []),
  completedOrdersFromRampsOrders: jest.fn(() => []),
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

/**
 * Asserts `createEventBuilder` was invoked with `name` and `addProperties` was
 * called with a payload that includes the given `properties` (subset match).
 */
const assertAnalyticsEvent = (name: unknown, properties?: unknown) => {
  expect(mockCreateEventBuilder).toHaveBeenCalledWith(name);
  if (properties !== undefined) {
    expect(mockAddProperties).toHaveBeenCalledWith(
      expect.objectContaining(properties as object),
    );
  }
};

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

const mockSendNonEvmAsset = jest.fn().mockResolvedValue(false);
jest.mock('../../../hooks/useSendNonEvmAsset', () => ({
  useSendNonEvmAsset: () => ({
    sendNonEvmAsset: mockSendNonEvmAsset,
  }),
}));

const mockGetSwapDestToken = jest.mocked(getSwapDestToken);

const mockGoToSwaps = jest.fn();
const mockUseSwapBridgeNavigation = jest.fn(() => ({
  goToSwaps: mockGoToSwaps,
  networkModal: null,
}));
jest.mock('../../Bridge/hooks/useSwapBridgeNavigation', () => ({
  useSwapBridgeNavigation: (...args: unknown[]) =>
    mockUseSwapBridgeNavigation(
      ...(args as Parameters<typeof mockUseSwapBridgeNavigation>),
    ),
  SwapBridgeNavigationLocation: {
    MainView: 'MainView',
    TokenView: 'TokenView',
    TrendingExplore: 'TrendingExplore',
  },
  isAssetFromTrending: jest.fn(() => false),
}));

jest.mock('../../Bridge/utils/getSwapDestToken', () => ({
  getSwapDestToken: jest.fn(() => undefined),
}));

jest.mock('../../../../util/Logger');

jest.mock('../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      NetworkController: {
        getNetworkConfigurationByChainId: jest.fn(),
      },
      MultichainNetworkController: {
        setActiveNetwork: jest.fn(),
      },
    },
  },
}));

const mockGetNetworkConfigurationByChainId = jest.mocked(
  Engine.context.NetworkController.getNetworkConfigurationByChainId,
);
const mockSetActiveNetwork = jest.mocked(
  Engine.context.MultichainNetworkController.setActiveNetwork,
);
const mockSelectEvmChainId = jest.mocked(selectEvmChainId);
const mockSelectSelectedInternalAccount = jest.mocked(
  selectSelectedInternalAccount,
);
const mockSelectSelectedAccountGroup = jest.mocked(selectSelectedAccountGroup);
const mockSelectSelectedInternalAccountByScope = jest.mocked(
  selectSelectedInternalAccountByScope,
);
const mockSelectAssetsBySelectedAccountGroup = jest.mocked(
  selectAssetsBySelectedAccountGroup,
);
const mockGetDetectedGeolocation = jest.mocked(getDetectedGeolocation);
const mockGetOrders = jest.mocked(getOrders);
const mockSelectRampsOrdersForSelectedAccountGroup = jest.mocked(
  selectRampsOrdersForSelectedAccountGroup,
);
const mockGetProviderToken = jest.mocked(getProviderToken);
const mockLoggerError = jest.mocked(Logger.error);

const mockAccountAddress = '0x1234567890abcdef1234567890abcdef12345678';

const mockAccount = createMockInternalAccount(
  'account-1',
  mockAccountAddress,
  'Account 1',
);
const mockScopedAccount = createMockInternalAccount(
  'account-137',
  '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
  'Polygon Account',
);
mockScopedAccount.scopes = ['eip155:137' as CaipChainId];

const mockAccountGroup = createMockAccountGroup('group-1', 'Test Group', [
  mockAccountAddress,
]);

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

const setupSelectorDefaults = () => {
  mockSelectEvmChainId.mockReturnValue('0x1');
  mockSelectSelectedInternalAccount.mockReturnValue(mockAccount);
  mockSelectSelectedAccountGroup.mockReturnValue(mockAccountGroup);
  mockSelectSelectedInternalAccountByScope.mockReturnValue(() => mockAccount);
  mockSelectAssetsBySelectedAccountGroup.mockReturnValue({});
  mockGetDetectedGeolocation.mockReturnValue('US');
  mockGetOrders.mockReturnValue([]);
  mockSelectRampsOrdersForSelectedAccountGroup.mockReturnValue([]);
  mockGetNetworkConfigurationByChainId.mockReturnValue({
    blockExplorerUrls: [],
    chainId: '0x1',
    name: 'Ethereum Mainnet',
    nativeCurrency: 'ETH',
    rpcEndpoints: [
      {
        networkClientId: 'mainnet',
        type: RpcEndpointType.Custom,
        url: 'https://mainnet.example.com',
      },
    ],
    defaultRpcEndpointIndex: 0,
  });
  mockGetProviderToken.mockResolvedValue({
    success: true,
    token: { accessToken: 'access' },
  } as Awaited<ReturnType<typeof getProviderToken>>);
};

/**
 * Flushes the one-shot `getProviderToken` effect used by `useIsRampAuthenticated`
 * so dependent assertions run after `is_authenticated` resolves.
 */
const flushAuthEffect = async () => {
  await act(async () => {
    await Promise.resolve();
  });
};

beforeEach(() => {
  jest.clearAllMocks();
  setupSelectorDefaults();
  mockUseSwapBridgeNavigation.mockReturnValue({
    goToSwaps: mockGoToSwaps,
    networkModal: null,
  });
});

describe('useTokenAtomicActions - useHandleOnBuy', () => {
  /**
   * Renders the hook and flushes the one-shot `getProviderToken` effect so
   * that `is_authenticated` is resolved before assertions run.
   */
  const renderOnBuy = async (
    params: Parameters<typeof useHandleOnBuy>[0] = { token: defaultToken },
  ) => {
    const result = renderHook(() => useHandleOnBuy(params));
    await flushAuthEffect();
    return result;
  };

  it('calls goToBuy with parsed assetId and tracks ACTION_BUTTON_CLICKED', async () => {
    const { result } = await renderOnBuy();

    await act(async () => {
      await result.current();
    });

    expect(mockGoToBuy).toHaveBeenCalledTimes(1);
    expect(mockGoToBuy).toHaveBeenCalledWith(
      {
        assetId: 'eip155:1/erc20:0x6B175474E89094C44Da98b954EedeAC495271d0F',
      },
      { buyFlowOrigin: 'tokenInfo' },
    );

    assertAnalyticsEvent(MetaMetricsEvents.ACTION_BUTTON_CLICKED, {
      action_name: ActionButtonType.BUY,
      action_position: ActionPosition.FIRST_POSITION,
      location: ActionLocation.ASSET_DETAILS,
    });

    expect(mockTrackEvent).toHaveBeenCalledTimes(2);
  });

  it('uses the token address directly as the assetId when it is a CAIP asset type', async () => {
    const caipAddress = 'eip155:1/erc20:0xabc';
    const caipToken = { ...defaultToken, address: caipAddress } as TokenI;

    const { result } = await renderOnBuy({ token: caipToken });

    await act(async () => {
      await result.current();
    });

    expect(mockGoToBuy).toHaveBeenCalledWith(
      { assetId: caipAddress },
      { buyFlowOrigin: 'tokenInfo' },
    );
  });

  it('uses getCaipAssetIdForToken so Polygon native POL gets slip44 CAIP for goToBuy', async () => {
    const polToken = {
      ...defaultToken,
      address: '0x0000000000000000000000000000000000001010',
      symbol: 'POL',
      chainId: '0x89',
      isNative: true,
    } as TokenI;

    const { result } = await renderOnBuy({ token: polToken });

    await act(async () => {
      await result.current();
    });

    expect(mockGoToBuy).toHaveBeenCalledWith(
      { assetId: 'eip155:137/slip44:966' },
      { buyFlowOrigin: 'tokenInfo' },
    );
  });

  it('prefers explicit caipAssetId on the token when present', async () => {
    const caipAssetId = 'eip155:137/slip44:966' as CaipAssetType;
    const polToken = {
      ...defaultToken,
      address: '0x0000000000000000000000000000000000001010',
      symbol: 'POL',
      chainId: '0x89',
      isNative: true,
      caipAssetId,
    };

    const { result } = await renderOnBuy({ token: polToken });

    await act(async () => {
      await result.current();
    });

    expect(mockGoToBuy).toHaveBeenCalledWith(
      { assetId: caipAssetId },
      { buyFlowOrigin: 'tokenInfo' },
    );
  });

  it('includes asset_symbol and ramp analytics in RAMPS_BUTTON_CLICKED event', async () => {
    const { result } = await renderOnBuy();

    await act(async () => {
      await result.current();
    });

    assertAnalyticsEvent(MetaMetricsEvents.RAMPS_BUTTON_CLICKED, {
      location: 'TokenDetails',
      asset_symbol: 'DAI',
      is_authenticated: true,
      region: 'US',
      order_count: 0,
      ramp_type: 'UNIFIED_BUY_2',
    });
  });

  it('falls back to is_authenticated=false when ProviderTokenVault rejects', async () => {
    mockGetProviderToken.mockRejectedValueOnce(new Error('no token'));

    const { result } = await renderOnBuy();

    await act(async () => {
      await result.current();
    });

    assertAnalyticsEvent(MetaMetricsEvents.RAMPS_BUTTON_CLICKED, {
      is_authenticated: false,
    });
  });
});

describe('useTokenAtomicActions - useHandleOnSend', () => {
  beforeEach(() => {
    mockSendNonEvmAsset.mockResolvedValue(false);
  });

  it('navigates to the send page without switching the selected network', async () => {
    const { result } = renderHook(() =>
      useHandleOnSend({ token: defaultToken }),
    );

    await act(async () => {
      await result.current();
    });

    assertAnalyticsEvent(MetaMetricsEvents.ACTION_BUTTON_CLICKED, {
      action_name: ActionButtonType.SEND,
      action_position: ActionPosition.THIRD_POSITION,
      location: ActionLocation.ASSET_DETAILS,
    });

    expect(mockNavigateToSendPage).toHaveBeenCalledWith({
      location: 'asset_overview',
      asset: defaultToken,
    });
    expect(mockNavigateToSendPage).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET.HOME, {
      screen: Routes.WALLET.TAB_STACK_FLOW,
      params: {
        screen: Routes.WALLET_VIEW,
      },
    });
    expect(mockSetActiveNetwork).not.toHaveBeenCalled();
  });

  it('navigates to the wallet home before switching networks when chains differ', async () => {
    const token = {
      ...defaultToken,
      chainId: '0x89',
    } as TokenI;
    mockSelectEvmChainId.mockReturnValue('0x1');
    mockGetNetworkConfigurationByChainId.mockReturnValue({
      blockExplorerUrls: [],
      chainId: '0x89',
      name: 'Polygon',
      nativeCurrency: 'POL',
      rpcEndpoints: [
        {
          networkClientId: 'polygon-mainnet',
          type: RpcEndpointType.Custom,
          url: 'https://polygon.example.com',
        },
      ],
      defaultRpcEndpointIndex: 0,
    });

    const { result } = renderHook(() => useHandleOnSend({ token }));

    await act(async () => {
      await result.current();
    });

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET.HOME, {
      screen: Routes.WALLET.TAB_STACK_FLOW,
      params: {
        screen: Routes.WALLET_VIEW,
      },
    });
    expect(mockGetNetworkConfigurationByChainId).toHaveBeenCalledWith('0x89');
    expect(mockSetActiveNetwork).toHaveBeenCalledTimes(1);
    expect(mockSetActiveNetwork).toHaveBeenCalledWith('polygon-mainnet');
    expect(mockNavigate.mock.invocationCallOrder[0]).toBeLessThan(
      mockGetNetworkConfigurationByChainId.mock.invocationCallOrder[0],
    );
    expect(
      mockGetNetworkConfigurationByChainId.mock.invocationCallOrder[0],
    ).toBeLessThan(mockSetActiveNetwork.mock.invocationCallOrder[0]);
    expect(mockSetActiveNetwork.mock.invocationCallOrder[0]).toBeLessThan(
      mockNavigateToSendPage.mock.invocationCallOrder[0],
    );
    expect(mockNavigateToSendPage).toHaveBeenCalledTimes(1);
    expect(mockNavigateToSendPage).toHaveBeenCalledWith({
      location: 'asset_overview',
      asset: token,
    });
  });

  it('returns early when the token is handled by the non-EVM send flow', async () => {
    mockSendNonEvmAsset.mockResolvedValueOnce(true);

    const { result } = renderHook(() =>
      useHandleOnSend({ token: defaultToken }),
    );

    await act(async () => {
      await result.current();
    });

    expect(mockNavigateToSendPage).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});

describe('useTokenAtomicActions - useHandleOnReceive', () => {
  it('navigates to the share-address QR sheet and tracks analytics', () => {
    const { result } = renderHook(() =>
      useHandleOnReceive({
        token: defaultToken,
        networkName: 'Ethereum Mainnet',
      }),
    );

    result.current();

    assertAnalyticsEvent(MetaMetricsEvents.ACTION_BUTTON_CLICKED, {
      action_name: ActionButtonType.RECEIVE,
      action_position: ActionPosition.FOURTH_POSITION,
      location: ActionLocation.ASSET_DETAILS,
    });

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.MODAL.MULTICHAIN_ACCOUNT_DETAIL_ACTIONS,
      {
        screen: Routes.SHEET.MULTICHAIN_ACCOUNT_DETAILS.SHARE_ADDRESS_QR,
        params: {
          address: mockAccountAddress,
          networkName: 'Ethereum Mainnet',
          chainId: '0x1',
          groupId: 'group-1',
          location: 'asset-details',
          account: mockAccount,
        },
      },
    );
    expect(mockNavigate).toHaveBeenCalledTimes(1);
  });

  it('uses the account scoped to the token chain for QR navigation', () => {
    const getAccountByScope = jest.fn(() => mockScopedAccount);
    mockSelectSelectedInternalAccountByScope.mockReturnValue(getAccountByScope);
    const token = {
      ...defaultToken,
      chainId: '0x89',
    } as TokenI;

    const { result } = renderHook(() =>
      useHandleOnReceive({
        token,
        networkName: 'Polygon',
      }),
    );

    result.current();

    expect(getAccountByScope).toHaveBeenCalledWith('eip155:137');
    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.MODAL.MULTICHAIN_ACCOUNT_DETAIL_ACTIONS,
      {
        screen: Routes.SHEET.MULTICHAIN_ACCOUNT_DETAILS.SHARE_ADDRESS_QR,
        params: {
          address: mockScopedAccount.address,
          networkName: 'Polygon',
          chainId: '0x89',
          groupId: 'group-1',
          location: 'asset-details',
          account: mockScopedAccount,
        },
      },
    );
  });

  it('falls back to "Unknown Network" when networkName is not supplied', () => {
    const { result } = renderHook(() =>
      useHandleOnReceive({ token: defaultToken }),
    );

    result.current();

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.MODAL.MULTICHAIN_ACCOUNT_DETAIL_ACTIONS,
      {
        screen: Routes.SHEET.MULTICHAIN_ACCOUNT_DETAILS.SHARE_ADDRESS_QR,
        params: {
          address: mockAccountAddress,
          networkName: 'Unknown Network',
          chainId: '0x1',
          groupId: 'group-1',
          location: 'asset-details',
          account: mockAccount,
        },
      },
    );
  });

  it('logs an error and does not navigate when the account group is missing', () => {
    mockSelectSelectedAccountGroup.mockReturnValue(null);

    const { result } = renderHook(() =>
      useHandleOnReceive({
        token: defaultToken,
        networkName: 'Ethereum Mainnet',
      }),
    );

    result.current();

    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockLoggerError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        hasAddress: true,
        hasAccountGroup: false,
        hasChainId: true,
      }),
    );
  });

  it('throws before navigation when the token chain is missing', () => {
    const tokenWithoutChain = {
      ...defaultToken,
      chainId: undefined,
    } as unknown as TokenI;

    const { result } = renderHook(() =>
      useHandleOnReceive({
        token: tokenWithoutChain,
        networkName: 'Ethereum Mainnet',
      }),
    );

    expect(() => result.current()).toThrow(TypeError);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('logs an error and does not navigate when the address cannot be resolved', () => {
    mockSelectSelectedInternalAccount.mockReturnValue(undefined);
    mockSelectSelectedInternalAccountByScope.mockReturnValue(() => undefined);

    const { result } = renderHook(() =>
      useHandleOnReceive({
        token: defaultToken,
        networkName: 'Ethereum Mainnet',
      }),
    );

    result.current();

    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockLoggerError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        hasAddress: false,
        hasAccountGroup: true,
        hasChainId: true,
      }),
    );
  });
});

// useHandleOnSwap decides between three flows at click time:
// 1. Has balance = Swap out of current token: goToSwaps(currentToken, undefined)
// 2. No balance + eligible source = Swap into current token: swap INTO the current token -> goToSwaps(buySource, currentToken)
// 3. No balance + no eligible source = Fall back to option 1 (swap out of current token): goToSwaps(currentToken, undefined)
// Source priority is documented under `computeBuySourceToken`.
describe('useTokenAtomicActions - useHandleOnSwap', () => {
  const WETH_ADDRESS = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';

  const arrangeToken = (balance: string): TokenI =>
    ({ ...defaultToken, balance }) as TokenI;

  const userAsset = (params: {
    assetId: Hex;
    chainId?: Hex;
    symbol: string;
    decimals?: number;
    fiatBalance?: number;
    isNative?: boolean;
  }): Asset => ({
    accountType: 'eip155:eoa',
    assetId: params.assetId,
    chainId: params.chainId ?? '0x1',
    accountId: 'account-1',
    address: params.assetId,
    balance: `${params.fiatBalance ?? '0'}`,
    rawBalance: '0x0',
    fiat: {
      balance: params.fiatBalance ?? 0,
      currency: 'usd',
      conversionRate: 1,
    },
    decimals: params.decimals ?? 18,
    symbol: params.symbol,
    name: params.symbol,
    image: '',
    isNative: params.isNative ?? false,
  });

  it('returns early when goToSwaps is not provided by the navigation hook', () => {
    mockUseSwapBridgeNavigation.mockReturnValueOnce({
      goToSwaps: undefined as never,
      networkModal: null,
    });

    const { result } = renderHook(() =>
      useHandleOnSwap({ token: arrangeToken('1') }),
    );

    expect(() => result.current()).not.toThrow();
    expect(mockGoToSwaps).not.toHaveBeenCalled();
  });

  // Cases where the current token has balance, so is indicated as a source token (swap out of the current token)
  const swapOutOfCurrentTokenRoutingCases = [
    {
      description:
        'swaps from the current token when token.balance is positive',
      assetsByGroup: {},
      getHookParams: () => ({ token: arrangeToken('1') }),
      assertSwapCall: (sourceToken: unknown, destToken: unknown) => {
        expect(sourceToken).toStrictEqual(
          expect.objectContaining({ address: defaultToken.address }),
        );
        expect(destToken).toBeUndefined();
      },
    },
    {
      description:
        'treats comma-formatted token.balance as positive when routing swap',
      assetsByGroup: {},
      getHookParams: () => ({ token: arrangeToken('1,000.50') }),
      assertSwapCall: (sourceToken: unknown, destToken: unknown) => {
        expect(sourceToken).toStrictEqual(
          expect.objectContaining({ address: defaultToken.address }),
        );
        expect(destToken).toBeUndefined();
      },
    },
    {
      description:
        'prefers currentTokenBalance over token.balance when checking positivity',
      assetsByGroup: {
        '0x1': [
          userAsset({
            assetId: WETH_ADDRESS,
            symbol: 'WETH',
            fiatBalance: 9000,
          }),
        ],
      },
      getHookParams: () => ({
        token: arrangeToken('0'),
        currentTokenBalance: '0.5',
      }),
      assertSwapCall: (sourceToken: unknown, destToken: unknown) => {
        expect(sourceToken).toStrictEqual(
          expect.objectContaining({ address: defaultToken.address }),
        );
        expect(destToken).toBeUndefined();
      },
    },
  ];

  // Cases where the current token has no balance, so is indicated as a destination token (swap into the current token)
  const swapIntoCurrentTokenRoutingCases = [
    {
      description:
        'swaps into the current token when balance is zero and an eligible buy source exists',
      assetsByGroup: {
        '0x1': [
          userAsset({
            assetId: WETH_ADDRESS,
            symbol: 'WETH',
            fiatBalance: 1000,
          }),
        ],
      },
      getHookParams: () => ({ token: arrangeToken('0') }),
      assertSwapCall: (sourceToken: unknown, destToken: unknown) => {
        expect(sourceToken).toStrictEqual(
          expect.objectContaining({ address: WETH_ADDRESS }),
        );
        expect(destToken).toStrictEqual(
          expect.objectContaining({ address: defaultToken.address }),
        );
      },
    },
  ];

  // Cases where the logic is not able to determine source or destination tokens, so falls back to "swap out of the current token"
  const swapFallbackRoutingCases = [
    {
      description:
        'falls back to the current token as source when no eligible buy source exists',
      assetsByGroup: {},
      getHookParams: () => ({ token: arrangeToken('0') }),
      assertSwapCall: (sourceToken: unknown, destToken: unknown) => {
        expect(sourceToken).toStrictEqual(
          expect.objectContaining({ address: defaultToken.address }),
        );
        expect(destToken).toBeUndefined();
      },
    },
  ];

  it.each([
    ...swapOutOfCurrentTokenRoutingCases,
    ...swapIntoCurrentTokenRoutingCases,
    ...swapFallbackRoutingCases,
  ])('$description', ({ assetsByGroup, getHookParams, assertSwapCall }) => {
    mockSelectAssetsBySelectedAccountGroup.mockReturnValue(
      assetsByGroup as AccountGroupAssets,
    );

    const { result } = renderHook(() => useHandleOnSwap(getHookParams()));

    result.current();
    expect(mockGoToSwaps).toHaveBeenCalledTimes(1);

    const [sourceToken, destToken] = mockGoToSwaps.mock.lastCall ?? [];
    assertSwapCall(sourceToken, destToken);
  });

  // Regression tests: verify that the per-source destToken override is forwarded
  // correctly to goToSwaps, and that a chain-wide default is NOT used as an
  // override when the source token has no explicit entry (the original bug).
  describe('destTokenOverride regression', () => {
    const MOCK_OVERRIDE_TOKEN = {
      address: '0x3600000000000000000000000000000000000000',
      chainId: '0x13b2',
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
    };

    it('passes the per-source override as destToken when goToSwaps fires (has balance → swap-out path)', () => {
      mockGetSwapDestToken.mockReturnValueOnce(MOCK_OVERRIDE_TOKEN as never);

      const { result } = renderHook(() =>
        useHandleOnSwap({ token: arrangeToken('1') }),
      );

      result.current();

      const [, destToken] = mockGoToSwaps.mock.lastCall ?? [];
      expect(destToken).toStrictEqual(
        expect.objectContaining({ address: MOCK_OVERRIDE_TOKEN.address }),
      );
    });

    it('passes the per-source override as destToken on the swap-into path (zero balance, buy source available)', () => {
      mockSelectAssetsBySelectedAccountGroup.mockReturnValue({
        '0x1': [
          userAsset({
            assetId: WETH_ADDRESS,
            symbol: 'WETH',
            fiatBalance: 500,
          }),
        ],
      } as AccountGroupAssets);
      mockGetSwapDestToken.mockReturnValueOnce(MOCK_OVERRIDE_TOKEN as never);

      const { result } = renderHook(() =>
        useHandleOnSwap({ token: arrangeToken('0') }),
      );

      result.current();

      const [, destToken] = mockGoToSwaps.mock.lastCall ?? [];
      expect(destToken).toStrictEqual(
        expect.objectContaining({ address: MOCK_OVERRIDE_TOKEN.address }),
      );
    });

    it('passes undefined as destToken when getSwapDestToken returns undefined (no override configured)', () => {
      mockGetSwapDestToken.mockReturnValueOnce(undefined);

      const { result } = renderHook(() =>
        useHandleOnSwap({ token: arrangeToken('1') }),
      );

      result.current();

      const [, destToken] = mockGoToSwaps.mock.lastCall ?? [];
      expect(destToken).toBeUndefined();
    });
  });
});

describe('useTokenAtomicActions - useHandleOnSwap explore swap location', () => {
  it('uses TrendingExplore location when token.source is an Explore tab source', () => {
    renderHook(() =>
      useHandleOnSwap({
        token: {
          ...defaultToken,
          balance: '1',
          source: TokenDetailsSource.ExploreCryptoTrending,
        },
      }),
    );

    expect(mockUseSwapBridgeNavigation).toHaveBeenCalledWith(
      expect.objectContaining({
        location: 'TrendingExplore',
        skipLocationUpdate: false,
      }),
    );
  });

  it('uses TrendingExplore location when token.source is ExploreSearch', () => {
    renderHook(() =>
      useHandleOnSwap({
        token: {
          ...defaultToken,
          balance: '1',
          source: TokenDetailsSource.ExploreSearch,
        },
      }),
    );

    expect(mockUseSwapBridgeNavigation).toHaveBeenCalledWith(
      expect.objectContaining({
        location: 'TrendingExplore',
        skipLocationUpdate: false,
      }),
    );
  });

  it('uses TokenView location when token.source is not from Explore', () => {
    renderHook(() =>
      useHandleOnSwap({
        token: {
          ...defaultToken,
          balance: '1',
          source: TokenDetailsSource.MobileTokenList,
        },
      }),
    );

    expect(mockUseSwapBridgeNavigation).toHaveBeenCalledWith(
      expect.objectContaining({
        location: 'TokenView',
        skipLocationUpdate: false,
      }),
    );
  });

  it('skips location update when opened from the bridge asset picker', () => {
    renderHook(() =>
      useHandleOnSwap({
        token: {
          ...defaultToken,
          balance: '1',
          source: TokenDetailsSource.Swap,
        },
      }),
    );

    expect(mockUseSwapBridgeNavigation).toHaveBeenCalledWith(
      expect.objectContaining({
        location: 'TokenView',
        skipLocationUpdate: true,
      }),
    );
  });
});

describe('useTokenAtomicActions - useHandleOnSwap securityData adaptation', () => {
  const buildTrendingSecurityData = (
    overrides: Partial<TokenSecurityData> = {},
  ): TokenSecurityData =>
    ({
      resultType: 'Warning',
      maliciousScore: '50',
      fees: {
        transfer: 0,
        transferFeeMaxAmount: null,
        buy: 0,
        sell: null,
      },
      features: [
        {
          featureId: 'HONEYPOT',
          type: 'Warning',
          description: 'Honeypot risk',
        },
      ],
      financialStats: {
        supply: 0,
        topHolders: [],
        holdersCount: 0,
        tradeVolume24h: null,
        lockedLiquidityPct: null,
        markets: [],
      },
      metadata: {
        externalLinks: {
          homepage: null,
          twitterPage: null,
          telegramChannelId: null,
        },
      },
      created: '2025-01-01T00:00:00Z',
      ...overrides,
    }) as TokenSecurityData;

  it("adapts trending-shape securityData to the bridge's legacy shape", () => {
    const tokenWithSecurity = {
      ...defaultToken,
      balance: '1',
      securityData: buildTrendingSecurityData(),
    } as TokenI;

    const { result } = renderHook(() =>
      useHandleOnSwap({ token: tokenWithSecurity }),
    );

    result.current();

    expect(mockGoToSwaps).toHaveBeenCalledWith(
      expect.objectContaining({
        address: defaultToken.address,
        securityData: {
          type: SecurityDataType.Warning,
          metadata: {
            features: [
              {
                featureId: 'HONEYPOT',
                type: SecurityDataType.Warning,
                description: 'Honeypot risk',
              },
            ],
          },
        },
      }),
      undefined,
      undefined,
      true,
    );
  });

  it('passes securityData as undefined when the token has no security data', () => {
    const tokenWithBalance = {
      ...defaultToken,
      balance: '1',
    } as TokenI;

    const { result } = renderHook(() =>
      useHandleOnSwap({ token: tokenWithBalance }),
    );

    result.current();

    expect(mockGoToSwaps).toHaveBeenCalledWith(
      expect.objectContaining({
        address: defaultToken.address,
        securityData: undefined,
      }),
      undefined,
      undefined,
      true,
    );
  });

  it('forwards rwaData so selectIsRwaSwap can detect the convert flow', () => {
    const rwaToken = {
      ...defaultToken,
      balance: '1',
      rwaData: { instrumentType: 'stock' } as TokenI['rwaData'],
    } as TokenI;

    const { result } = renderHook(() => useHandleOnSwap({ token: rwaToken }));

    result.current();

    expect(mockGoToSwaps).toHaveBeenCalledWith(
      expect.objectContaining({
        address: defaultToken.address,
        rwaData: { instrumentType: 'stock' },
      }),
      undefined,
      undefined,
      true,
    );
  });
});
