import { act, renderHook, waitFor } from '@testing-library/react-native';
import { CaipChainId, Hex, isCaipAssetType } from '@metamask/utils';
import {
  AccountGroupAssets,
  Asset,
  TokenSecurityData,
} from '@metamask/assets-controllers';
import {
  computeBuySourceToken,
  useHandleOnBuy,
  useHandleOnReceive,
  useHandleOnSend,
  useHandleOnSwap,
} from './useTokenAtomicActions';
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
  getRampRoutingDecision,
} from '../../../../reducers/fiatOrders';
import { selectRampsOrdersForSelectedAccountGroup } from '../../../../selectors/rampsController';
import { getProviderToken } from '../../Ramp/Deposit/utils/ProviderTokenVault';
import { TokenDetailsSource } from '../constants/constants';
import {
  createMockInternalAccount,
  createMockAccountGroup,
} from '../../../../component-library/components-temp/MultichainAccounts/test-utils';

// Test Util - for mocking during edge case tests
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MockTestType = any;

const mockStoreState = { mock: 'state' };
const mockGetState = jest.fn(() => mockStoreState);
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useStore: () => ({ getState: mockGetState }),
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

jest.mock('../../../../selectors/assets/assets-list', () => ({
  selectAssetsBySelectedAccountGroup: jest.fn(),
}));

jest.mock('../../../../reducers/fiatOrders', () => ({
  getDetectedGeolocation: jest.fn(),
  getOrders: jest.fn(),
  getRampRoutingDecision: jest.fn(),
}));

jest.mock('../../../../selectors/rampsController', () => ({
  selectRampsOrdersForSelectedAccountGroup: jest.fn(),
}));

jest.mock('../../Ramp/Deposit/utils/ProviderTokenVault', () => ({
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

const mockRampsUnifiedV1Enabled = jest.fn(() => false);
jest.mock('../../Ramp/hooks/useRampsUnifiedV1Enabled', () => ({
  __esModule: true,
  default: () => mockRampsUnifiedV1Enabled(),
}));

const mockSendNonEvmAsset = jest.fn().mockResolvedValue(false);
jest.mock('../../../hooks/useSendNonEvmAsset', () => ({
  useSendNonEvmAsset: () => ({
    sendNonEvmAsset: mockSendNonEvmAsset,
  }),
}));

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

jest.mock('../../Bridge/utils/tokenUtils', () => ({
  getDefaultDestToken: jest.fn(),
  getNativeSourceToken: jest.fn(),
}));

jest.mock('@metamask/utils', () => ({
  ...jest.requireActual('@metamask/utils'),
  isCaipAssetType: jest.fn(),
}));

jest.mock('../../../../util/Logger');

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

const mockIsCaipAssetType = jest.mocked(isCaipAssetType);
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
const mockGetRampRoutingDecision = jest.mocked(getRampRoutingDecision);
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
  mockGetRampRoutingDecision.mockReturnValue(null);
  mockSelectRampsOrdersForSelectedAccountGroup.mockReturnValue([]);
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
  mockRampsUnifiedV1Enabled.mockReturnValue(false);
});

/**
 * `computeBuySourceToken` is the pure ranking helper used by `useHandleOnSwap`
 * to pick a source token when the current token has no balance.
 *
 * Priority order tested:
 * 1. Same-chain token with highest fiat (excluding current token)
 * 2. Native token cross-chain with highest fiat
 * 3. Fallback: any cross-chain token with highest fiat
 * 4. Returns `null` when nothing eligible exists
 */
describe('useTokenAtomicActions - computeBuySourceToken', () => {
  const WETH_ADDRESS = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
  const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
  const POLYGON_USDC_ADDRESS = '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359';
  const POL_NATIVE_ADDRESS = '0x0000000000000000000000000000000000001010';
  const ETH_NATIVE_ADDRESS = '0x0000000000000000000000000000000000000000';

  const userAsset = (params: {
    assetId: string;
    chainId?: string;
    symbol?: string;
    decimals?: number;
    fiatBalance?: number;
    isNative?: boolean;
  }) => ({
    assetId: params.assetId,
    chainId: params.chainId ?? '0x1',
    decimals: params.decimals ?? 18,
    symbol: params.symbol ?? 'SYM',
    name: params.symbol ?? 'SYM',
    image: '',
    isNative: params.isNative ?? false,
    ...(params.fiatBalance !== undefined
      ? { fiat: { balance: params.fiatBalance } }
      : {}),
  });

  it('Priority 1: picks the highest-fiat same-chain token excluding the current token', () => {
    const result = computeBuySourceToken(
      {
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
      },
      defaultToken.chainId,
      defaultToken.address,
    );

    expect(result?.address).toBe(USDC_ADDRESS);
  });

  it('Priority 1: excludes the current asset on the same chain', () => {
    const result = computeBuySourceToken(
      {
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
      },
      defaultToken.chainId,
      defaultToken.address,
    );

    expect(result?.address).toBe(WETH_ADDRESS);
  });

  it('Priority 2: prefers the native cross-chain token over a higher-fiat non-native', () => {
    const result = computeBuySourceToken(
      {
        '0x89': [
          userAsset({
            assetId: POLYGON_USDC_ADDRESS,
            chainId: '0x89',
            symbol: 'USDC',
            decimals: 6,
            fiatBalance: 5000,
          }),
          userAsset({
            assetId: POL_NATIVE_ADDRESS,
            chainId: '0x89',
            symbol: 'POL',
            fiatBalance: 200,
            isNative: true,
          }),
        ],
      },
      defaultToken.chainId,
      defaultToken.address,
    );

    expect(result?.address).toBe(POL_NATIVE_ADDRESS);
  });

  it('Priority 2: picks the native token with the highest fiat across chains', () => {
    const result = computeBuySourceToken(
      {
        '0x89': [
          userAsset({
            assetId: POL_NATIVE_ADDRESS,
            chainId: '0x89',
            symbol: 'POL',
            fiatBalance: 200,
            isNative: true,
          }),
        ],
        '0xa': [
          userAsset({
            assetId: ETH_NATIVE_ADDRESS,
            chainId: '0xa',
            symbol: 'ETH',
            fiatBalance: 3000,
            isNative: true,
          }),
        ],
      },
      defaultToken.chainId,
      defaultToken.address,
    );

    expect(result?.address).toBe(ETH_NATIVE_ADDRESS);
  });

  it('falls back to the highest-fiat non-native cross-chain token when no natives are eligible', () => {
    const result = computeBuySourceToken(
      {
        '0x89': [
          userAsset({
            assetId: POLYGON_USDC_ADDRESS,
            chainId: '0x89',
            symbol: 'USDC',
            decimals: 6,
            fiatBalance: 800,
          }),
        ],
      },
      defaultToken.chainId,
      defaultToken.address,
    );

    expect(result?.address).toBe(POLYGON_USDC_ADDRESS);
  });

  it('returns null when only the current token has a positive fiat balance', () => {
    const result = computeBuySourceToken(
      {
        '0x1': [
          userAsset({
            assetId: defaultToken.address,
            symbol: defaultToken.symbol,
            fiatBalance: 100,
          }),
        ],
      },
      defaultToken.chainId,
      defaultToken.address,
    );

    expect(result).toBeNull();
  });

  it('returns null when no asset has a positive fiat balance', () => {
    const result = computeBuySourceToken(
      {
        '0x1': [
          userAsset({ assetId: WETH_ADDRESS, symbol: 'WETH' }),
          userAsset({
            assetId: USDC_ADDRESS,
            symbol: 'USDC',
            decimals: 6,
            fiatBalance: 0,
          }),
        ],
      },
      defaultToken.chainId,
      defaultToken.address,
    );

    expect(result).toBeNull();
  });

  it('returns null for an undefined assets map', () => {
    expect(
      computeBuySourceToken(
        undefined,
        defaultToken.chainId,
        defaultToken.address,
      ),
    ).toBeNull();
  });
});

describe('useTokenAtomicActions - useHandleOnBuy', () => {
  beforeEach(() => {
    mockIsCaipAssetType.mockReturnValue(false);
  });

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

    result.current();

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
    mockIsCaipAssetType.mockReturnValue(true);
    const caipToken = { ...defaultToken, address: caipAddress } as TokenI;

    const { result } = await renderOnBuy({ token: caipToken });

    result.current();

    expect(mockGoToBuy).toHaveBeenCalledWith(
      { assetId: caipAddress },
      { buyFlowOrigin: 'tokenInfo' },
    );
  });

  it('includes asset_symbol and ramp analytics in RAMPS_BUTTON_CLICKED event', async () => {
    const { result } = await renderOnBuy();

    result.current();

    assertAnalyticsEvent(MetaMetricsEvents.RAMPS_BUTTON_CLICKED, {
      location: 'TokenDetails',
      asset_symbol: 'DAI',
      is_authenticated: true,
      region: 'US',
      order_count: 0,
      ramp_type: 'BUY',
    });
  });

  it('switches ramp_type to UNIFIED_BUY when the unified-v1 flag is enabled', async () => {
    mockRampsUnifiedV1Enabled.mockReturnValue(true);

    const { result } = await renderOnBuy();
    result.current();

    assertAnalyticsEvent(MetaMetricsEvents.RAMPS_BUTTON_CLICKED, {
      ramp_type: 'UNIFIED_BUY',
    });
  });

  it('falls back to is_authenticated=false when ProviderTokenVault rejects', async () => {
    mockGetProviderToken.mockRejectedValueOnce(new Error('no token'));

    const { result } = await renderOnBuy();

    await waitFor(() => {
      result.current();
      assertAnalyticsEvent(MetaMetricsEvents.RAMPS_BUTTON_CLICKED, {
        is_authenticated: false,
      });
    });
  });
});

describe('useTokenAtomicActions - useHandleOnSend', () => {
  beforeEach(() => {
    mockSendNonEvmAsset.mockResolvedValue(false);
  });

  it('navigates to the send page and tracks analytics', async () => {
    const { result } = renderHook(() =>
      useHandleOnSend({ token: defaultToken }),
    );

    await result.current();

    assertAnalyticsEvent(MetaMetricsEvents.ACTION_BUTTON_CLICKED, {
      action_name: ActionButtonType.SEND,
      action_position: ActionPosition.THIRD_POSITION,
      location: ActionLocation.ASSET_DETAILS,
    });

    expect(mockNavigateToSendPage).toHaveBeenCalledWith({
      location: 'asset_overview',
      asset: defaultToken,
    });
  });

  it('skips the network switch when the token chain matches the selected evm chain', async () => {
    mockSelectEvmChainId.mockReturnValue(defaultToken.chainId as `0x${string}`);

    const { result } = renderHook(() =>
      useHandleOnSend({ token: defaultToken }),
    );

    await result.current();

    expect(mockNavigateToSendPage).toHaveBeenCalled();
  });

  it('returns early when the token is handled by the non-EVM send flow', async () => {
    mockSendNonEvmAsset.mockResolvedValueOnce(true);

    const { result } = renderHook(() =>
      useHandleOnSend({ token: defaultToken }),
    );

    await result.current();

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
        },
      },
    );
  });

  it('falls back to "Unknown Network" when networkName is not supplied', () => {
    const { result } = renderHook(() =>
      useHandleOnReceive({ token: defaultToken }),
    );

    result.current();

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.MODAL.MULTICHAIN_ACCOUNT_DETAIL_ACTIONS,
      expect.objectContaining({
        params: expect.objectContaining({ networkName: 'Unknown Network' }),
      }),
    );
  });

  it('logs an error and does not navigate when the address cannot be resolved', () => {
    mockSelectSelectedInternalAccount.mockReturnValue(null as MockTestType);
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
      goToSwaps: undefined as MockTestType,
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
    expect(mockGoToSwaps).toHaveBeenCalled();

    const [sourceToken, destToken] = mockGoToSwaps.mock.lastCall ?? [];
    assertSwapCall(sourceToken, destToken);
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
