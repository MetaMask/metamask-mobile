/* eslint-disable @typescript-eslint/ban-ts-comment */
import { cloneDeep } from 'lodash';
import Device from '../../util/device';
import { NetworkClientType } from '@metamask/network-controller';
// eslint-disable-next-line import/no-namespace
import * as tokensControllerSelectors from '../../selectors/tokensController';
import { FeatureFlags } from '@metamask/swaps-controller/dist/types';

// Type definitions for the swaps reducer
// Note: The reducer is written in JavaScript without proper TypeScript types,
// so we need to use type assertions in some places

interface SwapsAction {
  type: string | null;
  payload?: object | null;
}

interface SetLivenessPayload {
  chainId: string;
  featureFlags: FeatureFlags | null;
}

interface SetLivenessAction {
  type: typeof SWAPS_SET_LIVENESS;
  payload: SetLivenessPayload;
}

// Define a more flexible type for the swaps state that allows dynamic chain IDs
interface SwapsState {
  isLive: boolean;
  hasOnboarded: boolean;
  featureFlags?: {
    smart_transactions?: unknown;
    smartTransactions?: unknown;
  };
  '0x1': {
    isLive: boolean;
    featureFlags?: unknown;
  };
  [chainId: string]: unknown;
}

jest.mock('../../selectors/tokensController');
jest.mock('@metamask/swaps-controller/dist/constants', () => ({
  CHAIN_ID_TO_NAME_MAP: {
    '0x1': 'ethereum',
    '0x38': 'bsc',
    '0x89': 'polygon',
  },
}));

import reducer, {
  initialState,
  SWAPS_SET_LIVENESS,
  SWAPS_SET_HAS_ONBOARDED,
  swapsSmartTxFlagEnabled,
  swapsTokensObjectSelector,
  swapsTokensMultiChainObjectSelector,
  selectSwapsChainFeatureFlags,
  getFeatureFlagChainId,
} from './index';

const emptyAction: SwapsAction = { type: null };

const DEFAULT_FEATURE_FLAGS = {
  ethereum: {
    mobile_active: true,
    extension_active: true,
    fallback_to_v1: false,
    fallbackToV1: false,
    mobileActive: true,
    extensionActive: true,
    mobileActiveIOS: true,
    mobileActiveAndroid: true,
    smartTransactions: {
      expectedDeadline: 45,
      maxDeadline: 150,
      returnTxHashAsap: false,
    },
  },
  bsc: {
    mobile_active: true,
    extension_active: true,
    fallback_to_v1: false,
    fallbackToV1: false,
    mobileActive: true,
    extensionActive: true,
    mobileActiveIOS: true,
    mobileActiveAndroid: true,
    smartTransactions: {
      expectedDeadline: 45,
      maxDeadline: 150,
      returnTxHashAsap: false,
    },
  },
  smart_transactions: {
    mobile_active: false,
    extension_active: true,
  },
  smartTransactions: {
    mobileActive: false,
    extensionActive: true,
    mobileActiveIOS: false,
    mobileActiveAndroid: false,
  },
} as unknown as FeatureFlags;

describe('swaps reducer', () => {
  it('should return initial state', () => {
    const state = reducer(undefined, emptyAction);
    expect(state).toEqual(initialState);
  });

  describe('liveness', () => {
    it('should set isLive to true for iOS when flag is true', () => {
      Device.isIos = jest.fn().mockReturnValue(true);
      Device.isAndroid = jest.fn().mockReturnValue(false);

      const initalState = reducer(undefined, emptyAction);
      const action: SetLivenessAction = {
        type: SWAPS_SET_LIVENESS,
        payload: {
          featureFlags: DEFAULT_FEATURE_FLAGS,
          chainId: '0x1',
        },
      };
      // Note: Using 'as any' because the reducer is JavaScript without proper types
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const liveState = reducer(initalState as any, action) as SwapsState;
      expect(liveState['0x1'].isLive).toBe(true);
    });
    it('should set isLive to false for iOS when flag is false', () => {
      Device.isIos = jest.fn().mockReturnValue(true);
      Device.isAndroid = jest.fn().mockReturnValue(false);

      const initalState = reducer(undefined, emptyAction);
      const featureFlags = cloneDeep(DEFAULT_FEATURE_FLAGS);
      featureFlags.ethereum = {
        mobile_active: false,
        extension_active: true,
        fallback_to_v1: false,
        fallbackToV1: false,
        mobileActive: false,
        extensionActive: true,
        mobileActiveIOS: false,
        mobileActiveAndroid: true,
        smartTransactions: {
          expectedDeadline: 45,
          maxDeadline: 150,
          returnTxHashAsap: false,
        },
      };

      const action: SetLivenessAction = {
        type: SWAPS_SET_LIVENESS,
        payload: {
          featureFlags,
          chainId: '0x1',
        },
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const liveState = reducer(initalState as any, action) as SwapsState;
      expect(liveState['0x1'].isLive).toBe(false);
    });
    it('should set isLive to true for Android when flag is true', () => {
      Device.isIos = jest.fn().mockReturnValue(false);
      Device.isAndroid = jest.fn().mockReturnValue(true);

      const initalState = reducer(undefined, emptyAction);
      const featureFlags = cloneDeep(DEFAULT_FEATURE_FLAGS);
      featureFlags.ethereum = {
        mobile_active: true,
        extension_active: true,
        fallback_to_v1: false,
        fallbackToV1: false,
        mobileActive: true,
        extensionActive: true,
        mobileActiveIOS: true,
        mobileActiveAndroid: true,
        smartTransactions: {
          expectedDeadline: 45,
          maxDeadline: 150,
          returnTxHashAsap: false,
        },
      };

      const action: SetLivenessAction = {
        type: SWAPS_SET_LIVENESS,
        payload: {
          featureFlags,
          chainId: '0x1',
        },
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const liveState = reducer(initalState as any, action) as SwapsState;
      expect(liveState['0x1'].isLive).toBe(true);
    });
    it('should set isLive to false for Android when flag is false', () => {
      Device.isIos = jest.fn().mockReturnValue(false);
      Device.isAndroid = jest.fn().mockReturnValue(true);

      const initalState = reducer(undefined, emptyAction);
      const featureFlags = cloneDeep(DEFAULT_FEATURE_FLAGS);
      featureFlags.ethereum = {
        mobile_active: false,
        extension_active: true,
        fallback_to_v1: false,
        fallbackToV1: false,
        mobileActive: false,
        extensionActive: true,
        mobileActiveIOS: false,
        mobileActiveAndroid: false,
        smartTransactions: {
          expectedDeadline: 45,
          maxDeadline: 150,
          returnTxHashAsap: false,
        },
      };

      const action: SetLivenessAction = {
        type: SWAPS_SET_LIVENESS,
        payload: {
          featureFlags,
          chainId: '0x1',
        },
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const liveState = reducer(initalState as any, action) as SwapsState;
      expect(liveState['0x1'].isLive).toBe(false);
    });

    it('should handle missing feature flags by setting isLive to false', () => {
      const initalState = reducer(undefined, emptyAction);
      const action: SetLivenessAction = {
        type: SWAPS_SET_LIVENESS,
        payload: {
          featureFlags: null,
          chainId: '0x1',
        },
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const liveState = reducer(initalState as any, action) as SwapsState;
      expect(liveState['0x1'].isLive).toBe(false);
      expect(liveState['0x1'].featureFlags).toBeUndefined();
      expect(liveState.featureFlags).toBeUndefined();
    });

    it('should set global smart transactions feature flags', () => {
      const initalState = reducer(undefined, emptyAction);
      const action: SetLivenessAction = {
        type: SWAPS_SET_LIVENESS,
        payload: {
          featureFlags: DEFAULT_FEATURE_FLAGS,
          chainId: '0x1',
        },
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const liveState = reducer(initalState as any, action) as SwapsState;
      expect(liveState.featureFlags).toEqual({
        smart_transactions: DEFAULT_FEATURE_FLAGS.smart_transactions,
        smartTransactions: DEFAULT_FEATURE_FLAGS.smartTransactions,
      });
    });

    it('should handle multiple chains from feature flags', () => {
      const initalState = reducer(undefined, emptyAction);
      const action: SetLivenessAction = {
        type: SWAPS_SET_LIVENESS,
        payload: {
          featureFlags: DEFAULT_FEATURE_FLAGS,
          chainId: '0x1',
        },
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const liveState = reducer(initalState as any, action) as SwapsState;

      // Should set flags for ethereum (0x1)
      expect(liveState['0x1'].featureFlags).toEqual(
        DEFAULT_FEATURE_FLAGS.ethereum,
      );
      // Should set flags for bsc (0x38)
      expect(
        (liveState['0x38'] as { featureFlags?: unknown }).featureFlags,
      ).toEqual(DEFAULT_FEATURE_FLAGS.bsc);
    });

    it('should preserve existing state when updating feature flags', () => {
      const existingState = {
        ...initialState,
        '0x1': {
          isLive: true,
          featureFlags: { oldFlag: true },
          someOtherProperty: 'value',
        },
      };

      const action: SetLivenessAction = {
        type: SWAPS_SET_LIVENESS,
        payload: {
          featureFlags: DEFAULT_FEATURE_FLAGS,
          chainId: '0x1',
        },
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const newState = reducer(existingState as any, action) as SwapsState;

      // Should update feature flags but preserve other properties
      expect(newState['0x1'].featureFlags).toEqual(
        DEFAULT_FEATURE_FLAGS.ethereum,
      );
      expect(
        (newState['0x1'] as { someOtherProperty?: string }).someOtherProperty,
      ).toBe('value');
    });

    it('should skip chains without valid chain IDs in name mapping', () => {
      const featureFlagsWithInvalidChain = {
        ...DEFAULT_FEATURE_FLAGS,
        invalidChain: {
          mobileActive: true,
        },
      } as unknown as FeatureFlags;

      const initalState = reducer(undefined, emptyAction);
      const action: SetLivenessAction = {
        type: SWAPS_SET_LIVENESS,
        payload: {
          featureFlags: featureFlagsWithInvalidChain,
          chainId: '0x1',
        },
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const liveState = reducer(initalState as any, action) as SwapsState;

      // Should process valid chains
      expect(liveState['0x1'].featureFlags).toEqual(
        DEFAULT_FEATURE_FLAGS.ethereum,
      );
      // Should not create entry for invalid chain
      expect(
        (liveState as Record<string, unknown>).invalidChain,
      ).toBeUndefined();
    });

    it('should skip non-object feature flag values', () => {
      const featureFlagsWithNonObject = {
        ...DEFAULT_FEATURE_FLAGS,
        ethereum: 'not-an-object', // Invalid value
      } as unknown as FeatureFlags;

      const initalState = reducer(undefined, emptyAction);
      const action: SetLivenessAction = {
        type: SWAPS_SET_LIVENESS,
        payload: {
          featureFlags: featureFlagsWithNonObject,
          chainId: '0x1',
        },
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const liveState = reducer(initalState as any, action) as SwapsState;

      // Should skip the invalid ethereum entry
      expect(liveState['0x1'].featureFlags).toBeUndefined();
    });
  });

  describe('getFeatureFlagChainId', () => {
    it('returns the same chain ID without modification', () => {
      const result = getFeatureFlagChainId('0x1');

      expect(result).toBe('0x1');
    });

    it('returns the same chain ID for any input', () => {
      const result = getFeatureFlagChainId('0x38');

      expect(result).toBe('0x38');
    });
  });

  describe('swapsSmartTxFlagEnabled', () => {
    it('should return true if smart transactions are enabled', () => {
      const rootState = {
        engine: {
          backgroundState: {
            NetworkController: {
              getNetworkClientById: () => ({
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                configuration: {
                  rpcUrl: 'https://mainnet.infura.io/v3',
                  chainId: '0x1',
                  ticker: 'ETH',
                  type: NetworkClientType.Custom,
                },
              }),
              networkConfigurations: {
                mainnet: {
                  id: 'mainnet',
                  rpcUrl: 'https://mainnet.infura.io/v3',
                  chainId: '0x1',
                  ticker: 'ETH',
                  nickname: 'Ethereum mainnet',
                  rpcPrefs: {
                    blockExplorerUrl: 'https://etherscan.com',
                  },
                },
              },
              selectedNetworkClientId: 'mainnet',
              networksMetadata: {},
            },
          },
        },
        swaps: cloneDeep(initialState),
      };

      rootState.swaps = {
        featureFlags: {
          smart_transactions: {
            mobile_active: true,
            extension_active: true,
          },
          smartTransactions: {
            mobileActive: true,
            extensionActive: true,
            mobileActiveIOS: true,
            mobileActiveAndroid: true,
          },
        },
        '0x1': {
          featureFlags: {
            smartTransactions: {
              expectedDeadline: 45,
              maxDeadline: 150,
              mobileReturnTxHashAsap: false,
            },
          },
        },
      } as unknown as typeof rootState.swaps;

      const enabled = swapsSmartTxFlagEnabled(rootState);
      expect(enabled).toEqual(true);
    });

    it('should return false if smart transactions flags are disabled', () => {
      const rootState = {
        engine: {
          backgroundState: {
            NetworkController: {
              selectedNetworkClientId: 'mainnet',
              networksMetadata: {},
              networkConfigurations: {
                mainnet: {
                  id: 'mainnet',
                  rpcUrl: 'https://mainnet.infura.io/v3',
                  chainId: '0x36bbbe6d',
                  ticker: 'ETH',
                  nickname: 'Sepolia network',
                  rpcPrefs: {
                    blockExplorerUrl: 'https://etherscan.com',
                  },
                },
              },
            },
          },
        },
        swaps: cloneDeep(initialState),
      };

      rootState.swaps = {
        featureFlags: {
          smart_transactions: {
            mobile_active: false,
            extension_active: true,
          },
          smartTransactions: {
            mobileActive: false,
            extensionActive: true,
            mobileActiveIOS: false,
            mobileActiveAndroid: false,
          },
        },
        '0x1': {
          featureFlags: {
            smartTransactions: {
              expectedDeadline: 45,
              maxDeadline: 150,
              mobileReturnTxHashAsap: false,
            },
          },
        },
      } as unknown as typeof rootState.swaps;

      const enabled = swapsSmartTxFlagEnabled(rootState);
      expect(enabled).toEqual(false);
    });

    it('should return false if smart transactions flags are undefined', () => {
      const rootState = {
        engine: {
          backgroundState: {
            NetworkController: {
              selectedNetworkClientId: 'mainnet',
              networksMetadata: {},
              networkConfigurations: {
                mainnet: {
                  id: 'mainnet',
                  rpcUrl: 'https://mainnet.infura.io/v3',
                  chainId: '0x36bbbe6d',
                  ticker: 'ETH',
                  nickname: 'Sepolia network',
                  rpcPrefs: {
                    blockExplorerUrl: 'https://etherscan.com',
                  },
                },
              },
            },
          },
        },
        swaps: initialState,
      };

      const enabled = swapsSmartTxFlagEnabled(rootState);
      expect(enabled).toEqual(false);
    });
  });

  describe('selectSwapsChainFeatureFlags', () => {
    const createTestState = ({
      selectedChainId = '0x1',
      globalFeatureFlags = {},
      chainFeatureFlags = {},
    } = {}) => ({
      engine: {
        backgroundState: {
          NetworkController: {
            selectedNetworkClientId: 'mainnet',
            networkConfigurations: {
              mainnet: {
                id: 'mainnet',
                chainId: selectedChainId,
              },
            },
            getNetworkClientById: () => ({
              configuration: {
                chainId: selectedChainId,
              },
            }),
          },
        },
      },
      swaps: {
        featureFlags: globalFeatureFlags,
        ...Object.entries(chainFeatureFlags).reduce(
          (acc, [chainId, flags]) => ({
            ...acc,
            [chainId]: { featureFlags: flags },
          }),
          {},
        ),
      },
    });

    it('should return chain feature flags with merged smartTransactions from global flags', () => {
      const globalFlags = {
        smartTransactions: {
          mobileActive: true,
          extensionActive: true,
          globalSetting: true,
        },
      };

      const chainFlags = {
        '0x1': {
          fallbackToV1: false,
          mobileActive: true,
          smartTransactions: {
            chainSpecificSetting: true,
          },
        },
      };

      const rootState = createTestState({
        globalFeatureFlags: globalFlags,
        chainFeatureFlags: chainFlags,
      });

      const result = selectSwapsChainFeatureFlags(rootState);
      expect(result).toEqual({
        fallbackToV1: false,
        mobileActive: true,
        smartTransactions: {
          chainSpecificSetting: true,
          globalSetting: true,
          mobileActive: true,
          extensionActive: true,
        },
      });
    });

    it('should use provided transactionChainId instead of current chainId', () => {
      const rootState = createTestState({
        globalFeatureFlags: {
          smartTransactions: {
            globalSetting: true,
          },
        },
        chainFeatureFlags: {
          '0x1': {
            mainnetFlag: true,
          },
          '0x5': {
            goerliFlag: true,
            smartTransactions: {
              goerliSetting: true,
            },
          },
        },
      });

      const chainFlags = selectSwapsChainFeatureFlags(rootState, '0x5');
      expect(chainFlags).toEqual({
        goerliFlag: true,
        smartTransactions: {
          goerliSetting: true,
          globalSetting: true,
        },
      });
    });

    it('should handle missing feature flags gracefully', () => {
      const rootState = createTestState({
        globalFeatureFlags: {
          smartTransactions: {
            globalSetting: true,
          },
        },
        chainFeatureFlags: {
          '0x1': {}, // Empty feature flags
        },
      });

      const chainFlags = selectSwapsChainFeatureFlags(rootState);
      expect(chainFlags).toEqual({
        smartTransactions: {
          globalSetting: true,
        },
      });
    });

    it('should return empty object when no chain entry exists', () => {
      const rootState = createTestState({
        selectedChainId: '0x89', // Chain ID not in swaps state
        globalFeatureFlags: {
          smartTransactions: {
            globalSetting: true,
          },
        },
        // No chain feature flags for 0x89
      });

      const chainFlags = selectSwapsChainFeatureFlags(rootState);
      expect(chainFlags).toEqual({
        smartTransactions: {
          globalSetting: true,
        },
      });
    });
  });

  describe('swapsTokensObjectSelector', () => {
    it('should return a object that returns an object combining TokensController and SwapsController tokens where each key is an address and each value is undefined', () => {
      jest.spyOn(tokensControllerSelectors, 'selectTokens').mockReturnValue([
        {
          address: '0x0000000000000000000000000000000000000010',
          symbol: 'TOKEN1',
          decimals: 1,
          aggregators: [],
        },
        {
          address: '0x0000000000000000000000000000000000000011',
          symbol: 'TOKEN2',
          decimals: 2,
          aggregators: [],
        },
      ]);
      const state = {
        engine: {
          backgroundState: {
            SwapsController: {
              tokens: [
                {
                  address: '0x0000000000000000000000000000000000000000',
                  symbol: 'SWAPS-TOKEN1',
                  decimals: 1,
                  occurrences: 10,
                  iconUrl: 'https://some.token.icon.url/1',
                },
                {
                  address: '0x0000000000000000000000000000000000000001',
                  symbol: 'SWAPS-TOKEN2',
                  decimals: 2,
                  occurrences: 20,
                  iconUrl: 'https://some.token.icon.url/2',
                },
              ],
            },
          },
        },
      };
      expect(swapsTokensObjectSelector(state)).toStrictEqual({
        '0x0000000000000000000000000000000000000000': undefined,
        '0x0000000000000000000000000000000000000001': undefined,
        '0x0000000000000000000000000000000000000010': undefined,
        '0x0000000000000000000000000000000000000011': undefined,
      });
    });

    it('should return an empty object if there are no Swaps tokens or user tokens', () => {
      jest.spyOn(tokensControllerSelectors, 'selectTokens').mockReturnValue([]);
      const state = {
        engine: {
          backgroundState: {
            SwapsController: {
              tokens: [],
            },
          },
        },
      };
      expect(swapsTokensObjectSelector(state)).toStrictEqual({});
    });
  });

  describe('swapsTokensMultiChainObjectSelector', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('returns combined tokens from all sources', () => {
      // Given tokens exist in SwapsController and across multiple chains
      jest.spyOn(tokensControllerSelectors, 'selectAllTokens').mockReturnValue({
        '0x1': {
          '0xUserAddress123': [
            {
              address: '0x0000000000000000000000000000000000000010',
              symbol: 'USER-TOKEN1',
              decimals: 18,
              hasBalanceError: false,
              image: 'user1.png',
            },
            {
              address: '0x0000000000000000000000000000000000000011',
              symbol: 'USER-TOKEN2',
              decimals: 6,
              hasBalanceError: false,
              image: 'user2.png',
            },
          ],
        },
        '0x89': {
          '0xUserAddress123': [
            {
              address: '0x0000000000000000000000000000000000000012',
              symbol: 'POLYGON-TOKEN',
              decimals: 18,
              hasBalanceError: false,
              image: 'polygon.png',
            },
          ],
        },
      });

      const mockState = {
        engine: {
          backgroundState: {
            SwapsController: {
              tokens: [
                {
                  address: '0x0000000000000000000000000000000000000020',
                  symbol: 'SWAPS-TOKEN1',
                  decimals: 18,
                  occurrences: 5,
                  iconUrl: 'https://swaps1.url',
                },
                {
                  address: '0x0000000000000000000000000000000000000021',
                  symbol: 'SWAPS-TOKEN2',
                  decimals: 6,
                  occurrences: 3,
                  iconUrl: 'https://swaps2.url',
                },
              ],
            },
            AccountsController: {
              internalAccounts: {
                selectedAccount: 'account-1',
                accounts: {
                  'account-1': {
                    address: '0xUserAddress123',
                  },
                },
              },
            },
          },
        },
      };

      // When the selector is called
      const result = swapsTokensMultiChainObjectSelector(mockState);

      // Then it returns all unique token addresses with undefined values
      expect(result).toStrictEqual({
        '0x0000000000000000000000000000000000000020': undefined,
        '0x0000000000000000000000000000000000000021': undefined,
        '0x0000000000000000000000000000000000000010': undefined,
        '0x0000000000000000000000000000000000000011': undefined,
        '0x0000000000000000000000000000000000000012': undefined,
      });
    });

    it('returns user tokens when SwapsController is empty', () => {
      // Given no SwapsController tokens exist
      jest.spyOn(tokensControllerSelectors, 'selectAllTokens').mockReturnValue({
        '0x1': {
          '0xUserAddress123': [
            {
              address: '0x0000000000000000000000000000000000000030',
              symbol: 'ONLY-USER-TOKEN',
              decimals: 18,
              hasBalanceError: false,
              image: 'onlyuser.png',
            },
          ],
        },
      });

      const mockState = {
        engine: {
          backgroundState: {
            SwapsController: {
              tokens: [], // Empty SwapsController tokens
            },
            AccountsController: {
              internalAccounts: {
                selectedAccount: 'account-1',
                accounts: {
                  'account-1': {
                    address: '0xUserAddress123',
                  },
                },
              },
            },
          },
        },
      };

      // When the selector is called
      const result = swapsTokensMultiChainObjectSelector(mockState);

      // Then it returns only the user tokens
      expect(result).toStrictEqual({
        '0x0000000000000000000000000000000000000030': undefined,
      });
    });

    it('returns SwapsController tokens when user tokens are empty', () => {
      // Given no user tokens exist across chains
      jest
        .spyOn(tokensControllerSelectors, 'selectAllTokens')
        .mockReturnValue({});

      const mockState = {
        engine: {
          backgroundState: {
            SwapsController: {
              tokens: [
                {
                  address: '0x0000000000000000000000000000000000000040',
                  symbol: 'ONLY-SWAPS-TOKEN',
                  decimals: 18,
                  occurrences: 1,
                  iconUrl: 'https://onlyswaps.url',
                },
              ],
            },
            AccountsController: {
              internalAccounts: {
                selectedAccount: 'account-1',
                accounts: {
                  'account-1': {
                    address: '0xUserAddress123',
                  },
                },
              },
            },
          },
        },
      };

      // When the selector is called
      const result = swapsTokensMultiChainObjectSelector(mockState);

      // Then it returns only the SwapsController tokens
      expect(result).toStrictEqual({
        '0x0000000000000000000000000000000000000040': undefined,
      });
    });

    it('removes duplicate tokens when same address exists in both sources', () => {
      // Given the same token address exists in both SwapsController and user tokens
      jest.spyOn(tokensControllerSelectors, 'selectAllTokens').mockReturnValue({
        '0x1': {
          '0xUserAddress123': [
            {
              address: '0x0000000000000000000000000000000000000050',
              symbol: 'USER-VERSION',
              decimals: 18,
              hasBalanceError: false,
              image: 'user.png',
            },
          ],
        },
      });

      const mockState = {
        engine: {
          backgroundState: {
            SwapsController: {
              tokens: [
                {
                  address: '0x0000000000000000000000000000000000000050', // Same address
                  symbol: 'SWAPS-VERSION',
                  decimals: 18,
                  occurrences: 10,
                  iconUrl: 'https://swaps.url',
                },
              ],
            },
            AccountsController: {
              internalAccounts: {
                selectedAccount: 'account-1',
                accounts: {
                  'account-1': {
                    address: '0xUserAddress123',
                  },
                },
              },
            },
          },
        },
      };

      // When the selector is called
      const result = swapsTokensMultiChainObjectSelector(mockState);

      // Then it returns only one entry for the duplicated address
      expect(result).toStrictEqual({
        '0x0000000000000000000000000000000000000050': undefined,
      });
      expect(Object.keys(result)).toHaveLength(1);
    });

    it('converts addresses to lowercase', () => {
      // Given addresses with mixed case formatting
      jest.spyOn(tokensControllerSelectors, 'selectAllTokens').mockReturnValue({
        '0x1': {
          '0xUserAddress123': [
            {
              address: '0X0000000000000000000000000000000000000060', // Uppercase
              symbol: 'UPPER-TOKEN',
              decimals: 18,
              hasBalanceError: false,
              image: 'upper.png',
            },
          ],
        },
      });

      const mockState = {
        engine: {
          backgroundState: {
            SwapsController: {
              tokens: [
                {
                  address: '0X0000000000000000000000000000000000000070', // Uppercase
                  symbol: 'SWAPS-UPPER',
                  decimals: 18,
                  occurrences: 1,
                },
              ],
            },
            AccountsController: {
              internalAccounts: {
                selectedAccount: 'account-1',
                accounts: {
                  'account-1': {
                    address: '0xUserAddress123',
                  },
                },
              },
            },
          },
        },
      };

      // When the selector is called
      const result = swapsTokensMultiChainObjectSelector(mockState);

      // Then addresses are normalized to lowercase
      expect(result).toStrictEqual({
        '0x0000000000000000000000000000000000000070': undefined,
        '0x0000000000000000000000000000000000000060': undefined,
      });
    });

    it('returns empty object when no tokens exist', () => {
      // Given no tokens exist in any source
      jest
        .spyOn(tokensControllerSelectors, 'selectAllTokens')
        .mockReturnValue({});

      const mockState = {
        engine: {
          backgroundState: {
            SwapsController: {
              tokens: [],
            },
            AccountsController: {
              internalAccounts: {
                selectedAccount: 'account-1',
                accounts: {
                  'account-1': {
                    address: '0xUserAddress123',
                  },
                },
              },
            },
          },
        },
      };

      // When the selector is called
      const result = swapsTokensMultiChainObjectSelector(mockState);

      // Then it returns an empty object
      expect(result).toStrictEqual({});
    });

    it('returns tokens from multiple blockchains', () => {
      // Given tokens exist across Ethereum, Polygon, and BSC
      jest.spyOn(tokensControllerSelectors, 'selectAllTokens').mockReturnValue({
        '0x1': {
          '0xUserAddress123': [
            {
              address: '0x0000000000000000000000000000000000000090',
              symbol: 'ETH-TOKEN',
              decimals: 18,
              hasBalanceError: false,
              image: 'eth.png',
            },
          ],
        },
        '0x89': {
          '0xUserAddress123': [
            {
              address: '0x0000000000000000000000000000000000000091',
              symbol: 'MATIC-TOKEN',
              decimals: 18,
              hasBalanceError: false,
              image: 'matic.png',
            },
          ],
        },
        '0x38': {
          '0xUserAddress123': [
            {
              address: '0x0000000000000000000000000000000000000092',
              symbol: 'BSC-TOKEN',
              decimals: 18,
              hasBalanceError: false,
              image: 'bsc.png',
            },
          ],
        },
      });

      const mockState = {
        engine: {
          backgroundState: {
            SwapsController: {
              tokens: [
                {
                  address: '0x0000000000000000000000000000000000000080',
                  symbol: 'SWAPS-TOKEN',
                  decimals: 18,
                  occurrences: 1,
                },
              ],
            },
            AccountsController: {
              internalAccounts: {
                selectedAccount: 'account-1',
                accounts: {
                  'account-1': {
                    address: '0xUserAddress123',
                  },
                },
              },
            },
          },
        },
      };

      // When the selector is called
      const result = swapsTokensMultiChainObjectSelector(mockState);

      // Then it returns tokens from all chains plus SwapsController
      expect(result).toStrictEqual({
        '0x0000000000000000000000000000000000000080': undefined, // SwapsController
        '0x0000000000000000000000000000000000000090': undefined, // Ethereum
        '0x0000000000000000000000000000000000000091': undefined, // Polygon
        '0x0000000000000000000000000000000000000092': undefined, // BSC
      });
      expect(Object.keys(result)).toHaveLength(4);
    });
  });

  it('should set has onboarded', () => {
    const initalState = reducer(undefined, emptyAction);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const notOnboardedState = reducer(initalState as any, {
      type: SWAPS_SET_HAS_ONBOARDED,
      payload: false,
    }) as SwapsState;
    expect(notOnboardedState.hasOnboarded).toBe(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const liveState = reducer(initalState as any, {
      type: SWAPS_SET_HAS_ONBOARDED,
      payload: true,
    }) as SwapsState;
    expect(liveState.hasOnboarded).toBe(true);
  });
});
