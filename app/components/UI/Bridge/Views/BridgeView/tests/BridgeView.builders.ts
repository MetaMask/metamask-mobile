import { DeepPartial } from '../../../../../../util/test/renderWithProvider';
import { RootState } from '../../../../../../reducers';
import { initialState as baseInitialState } from '../../../_mocks_/initialState';
import { MOCK_ENTROPY_SOURCE } from '../../../../../../util/test/keyringControllerTestUtils';
import { Hex } from '@metamask/utils';
import {
  QuoteResponse,
  type BridgeControllerState,
} from '@metamask/bridge-controller';
import { useBridgeQuoteData } from '../../../hooks/useBridgeQuoteData';
import { mockQuoteWithMetadata } from '../../../_mocks_/bridgeQuoteWithMetadata';
import { createBridgeTestState } from '../../../testUtils';

export const buildDefaultState = (): DeepPartial<RootState> => {
  const state: DeepPartial<RootState> = {
    ...baseInitialState,
    engine: {
      ...baseInitialState.engine,
      backgroundState: {
        ...baseInitialState.engine.backgroundState,
        KeyringController: {
          keyrings: [
            {
              accounts: ['0x1234567890123456789012345678901234567890'],
              type: 'HD Key Tree',
              metadata: {
                id: MOCK_ENTROPY_SOURCE,
                name: '',
              },
            },
          ],
        },
        AccountsController: {
          internalAccounts: {
            selectedAccount: '30786334-3935-4563-b064-363339643939',
            accounts: {
              '30786334-3935-4563-b064-363339643939': {
                id: '30786334-3935-4563-b064-363339643939',
                address: '0x1234567890123456789012345678901234567890',
                name: 'Account 1',
                type: 'eip155:eoa',
                scopes: ['eip155:0'],
                metadata: {
                  lastSelected: 0,
                  keyring: {
                    type: 'HD Key Tree',
                  },
                },
              },
            },
          },
        },
      },
    },
  } as DeepPartial<RootState>;
  return state;
};

export const withSourceToken = (
  state: DeepPartial<RootState>,
  token: {
    address: string;
    chainId: Hex;
    decimals: number;
    symbol: string;
    name?: string;
    image?: string;
  },
) => ({
  ...state,
  bridge: {
    ...state.bridge,
    sourceToken: token,
  },
});

export const withDestToken = (
  state: DeepPartial<RootState>,
  token: {
    address: string;
    chainId: Hex;
    decimals: number;
    symbol: string;
    name?: string;
    image?: string;
  },
) => ({
  ...state,
  bridge: {
    ...state.bridge,
    destToken: token,
  },
});

export const withSourceAmount = (
  state: DeepPartial<RootState>,
  amount: string,
) => ({
  ...state,
  bridge: {
    ...state.bridge,
    sourceAmount: amount,
  },
});

export const markNoFeeDestAsset = (
  state: DeepPartial<RootState>,
  destChainIdCaip: string,
  assetAddress: Hex,
) => {
  const chains =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (state as any).engine?.backgroundState?.RemoteFeatureFlagController
      ?.remoteFeatureFlags?.bridgeConfigV2?.chains ?? {};
  const current = chains[destChainIdCaip] ?? {};
  return {
    ...state,
    engine: {
      ...state.engine,
      backgroundState: {
        ...state.engine?.backgroundState,
        RemoteFeatureFlagController: {
          ...state.engine?.backgroundState?.RemoteFeatureFlagController,
          remoteFeatureFlags: {
            ...state.engine?.backgroundState?.RemoteFeatureFlagController
              ?.remoteFeatureFlags,
            bridgeConfigV2: {
              chains: {
                ...chains,
                [destChainIdCaip]: {
                  ...current,
                  noFeeAssets: [assetAddress],
                },
              },
            },
          },
        },
      },
    },
  } as DeepPartial<RootState>;
};

// Quote scenarios via useBridgeQuoteData mocking (loosened types for test flexibility)
type QuoteScenarioOptions = Record<string, unknown>;

export const scenarioQuotes = (options: QuoteScenarioOptions = {}) => {
  const defaults: QuoteScenarioOptions = {
    isLoading: false,
    activeQuote: mockQuoteWithMetadata as unknown as QuoteResponse,
    willRefresh: false,
    isExpired: false,
  };

  const merged: Record<string, unknown> = { ...defaults, ...options };
  jest
    .mocked(useBridgeQuoteData as unknown as jest.Mock)
    .mockImplementation(
      () => merged as unknown as ReturnType<typeof useBridgeQuoteData>,
    );
};

export const scenarioLoadingNoQuote = () =>
  scenarioQuotes({ isLoading: true, activeQuote: null });
export const scenarioFetchedWithQuote = (quote?: unknown) =>
  scenarioQuotes({
    isLoading: false,
    activeQuote: quote ?? (mockQuoteWithMetadata as unknown as QuoteResponse),
  });
export const scenarioInsufficientFunds = () =>
  scenarioQuotes({
    // express via controller background state in the test using createBridgeTestState too
  });

export const scenarioMetabridgeBpsFee = (bps: number) => {
  const active: Record<string, unknown> = {
    ...(mockQuoteWithMetadata as unknown as Record<string, unknown>),
  };
  const currentQuote = (active.quote as Record<string, unknown>) ?? {};
  active.quote = {
    ...currentQuote,
    feeData: { metabridge: { quoteBpsFee: bps } },
  };
  scenarioQuotes({
    isLoading: false,
    activeQuote: active as unknown as QuoteResponse,
  });
};

export const minimalUsdc = (chainId: Hex = '0x1' as Hex) => ({
  address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  chainId,
  decimals: 6,
  image: '',
  name: 'USD Coin',
  symbol: 'USDC',
});

export const nativeEth = (chainId: Hex = '0x1' as Hex) => ({
  address: '0x0000000000000000000000000000000000000000',
  chainId,
  decimals: 18,
  image: '',
  name: 'Ether',
  symbol: 'ETH',
});

export const minimalMusd = (chainId: Hex = '0x1' as Hex) => ({
  address: '0xaca92e438df0b2401ff60da7e4337b687a2435da' as Hex,
  chainId,
  decimals: 6,
  image: '',
  name: 'MetaMask USD',
  symbol: 'mUSD',
});

interface MinimalToken {
  address: string;
  chainId: Hex;
  decimals: number;
  symbol: string;
  name?: string;
  image?: string;
}

type TokenFactoryOverrides = Partial<MinimalToken> & { chainId?: Hex };

const isHexAddress = (value: string) => /^0x[a-fA-F0-9]{40}$/.test(value);

export const tokenFactory = (
  symbolOrAddress: string,
  overrides: TokenFactoryOverrides = {},
): MinimalToken => {
  const chainId = overrides.chainId ?? ('0x1' as Hex);

  const id = symbolOrAddress.trim();
  let base: MinimalToken | undefined;

  if (isHexAddress(id)) {
    base = {
      address: id as Hex,
      chainId,
      decimals: 18,
      image: '',
      name: id,
      symbol: 'TKN',
    };
  } else {
    const key = id.toLowerCase();
    const baseById: Record<string, MinimalToken> = {
      eth: nativeEth(chainId),
      'native-eth': nativeEth(chainId),
      musd: minimalMusd(chainId),
      usdc: minimalUsdc(chainId),
    };
    base = baseById[key];
  }

  const result: MinimalToken = {
    ...(base ?? nativeEth(chainId)),
    ...overrides,
    chainId,
  };

  return result;
};

export const buildStateWith = (
  params: {
    controllerOverrides?: Partial<BridgeControllerState>;
    sourceAmount?: string;
    sourceToken?: MinimalToken;
    destToken?: MinimalToken;
    baseState?: DeepPartial<RootState>;
  } = {},
): DeepPartial<RootState> => {
  const {
    controllerOverrides,
    sourceAmount,
    sourceToken,
    destToken,
    baseState,
  } = params;

  const buildBridgeReducerOverrides = () => {
    const overrides: Record<string, unknown> = {};
    if (typeof sourceAmount === 'string') overrides.sourceAmount = sourceAmount;
    if (sourceToken) overrides.sourceToken = sourceToken;
    if (destToken) overrides.destToken = destToken;
    return overrides;
  };

  return createBridgeTestState(
    {
      bridgeControllerOverrides: controllerOverrides,
      // bridge reducer overrides are shaped by the provided token/amount params
      bridgeReducerOverrides: buildBridgeReducerOverrides(),
    },
    baseState ?? buildDefaultState(),
  );
};
