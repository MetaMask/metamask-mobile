/* eslint-disable @typescript-eslint/ban-ts-comment */
import { cloneDeep } from 'lodash';
import Device from '../../util/device';
import reducer, {
  initialState,
  SWAPS_SET_LIVENESS,
  SWAPS_SET_HAS_ONBOARDED,
  swapsSmartTxFlagEnabled,
  swapsTokensObjectSelector,
} from './index';
import { NetworkClientType } from '@metamask/network-controller';
// eslint-disable-next-line import/no-namespace
import * as tokensControllerSelectors from '../../selectors/tokensController';

jest.mock('../../selectors/tokensController');

const emptyAction = { type: null };

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
      mobileReturnTxHashAsap: false,
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
    smartTransactions: {},
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
};

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
      // @ts-ignore
      const liveState = reducer(initalState, {
        type: SWAPS_SET_LIVENESS,
        payload: {
          featureFlags: DEFAULT_FEATURE_FLAGS,
          chainId: '0x1',
        },
      });
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
          mobileReturnTxHashAsap: false,
        },
      };

      // @ts-ignore
      const liveState = reducer(initalState, {
        type: SWAPS_SET_LIVENESS,
        payload: {
          featureFlags,
          chainId: '0x1',
        },
      });
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
          mobileReturnTxHashAsap: false,
        },
      };

      // @ts-ignore
      const liveState = reducer(initalState, {
        type: SWAPS_SET_LIVENESS,
        payload: {
          featureFlags,
          chainId: '0x1',
        },
      });
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
          mobileReturnTxHashAsap: false,
        },
      };

      // @ts-ignore
      const liveState = reducer(initalState, {
        type: SWAPS_SET_LIVENESS,
        payload: {
          featureFlags,
          chainId: '0x1',
        },
      });
      expect(liveState['0x1'].isLive).toBe(false);
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
        // @ts-ignore
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
          // @ts-ignore
          featureFlags: {
            smartTransactions: {
              expectedDeadline: 45,
              maxDeadline: 150,
              mobileReturnTxHashAsap: false,
            },
          },
        },
      };

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
        // @ts-ignore
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
          // @ts-ignore
          featureFlags: {
            smartTransactions: {
              expectedDeadline: 45,
              maxDeadline: 150,
              mobileReturnTxHashAsap: false,
            },
          },
        },
      };

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

  it('should set has onboarded', () => {
    const initalState = reducer(undefined, emptyAction);
    // @ts-ignore
    const notOnboardedState = reducer(initalState, {
      type: SWAPS_SET_HAS_ONBOARDED,
      payload: false,
    });
    expect(notOnboardedState.hasOnboarded).toBe(false);
    // @ts-ignore
    const liveState = reducer(initalState, {
      type: SWAPS_SET_HAS_ONBOARDED,
      payload: true,
    });
    expect(liveState.hasOnboarded).toBe(true);
  });
});
