/* eslint-disable @typescript-eslint/no-explicit-any */
import { initialState as mockRootState } from '../../../../components/UI/Bridge/_mocks_/initialState';
import reducer, {
  initialState,
  setSourceAmount,
  setDestAmount,
  resetBridgeState,
  setSlippage,
  setBridgeViewMode,
  selectBridgeViewMode,
  setDestToken,
  selectBip44DefaultPair,
  selectGasIncludedQuoteParams,
} from '.';
import {
  BridgeToken,
  BridgeViewMode,
} from '../../../../components/UI/Bridge/types';
import { Hex } from '@metamask/utils';
import { RootState } from '../../../../reducers';
import { cloneDeep } from 'lodash';

describe('bridge slice', () => {
  const mockToken: BridgeToken = {
    address: '0x123',
    symbol: 'ETH',
    decimals: 18,
    image: 'https://example.com/eth.png',
    chainId: '0x1' as Hex,
    name: 'Ethereum',
    balance: '100',
    balanceFiat: '100',
  };

  const mockDestToken: BridgeToken = {
    address: '0x456',
    symbol: 'USDC',
    decimals: 6,
    image: 'https://example.com/usdc.png',
    chainId: '0x2' as Hex,
    name: 'USDC',
    balance: '100',
    balanceFiat: '100',
  };

  describe('initial state', () => {
    it('should have the correct initial state', () => {
      expect(initialState).toEqual({
        bridgeViewMode: undefined,
        sourceAmount: undefined,
        destAmount: undefined,
        sourceToken: undefined,
        destToken: undefined,
        isGasIncludedSTXSendBundleSupported: false,
        isGasIncluded7702Supported: false,
        destAddress: undefined,
        selectedSourceChainIds: undefined,
        selectedDestChainId: undefined,
        slippage: '0.5',
        isSubmittingTx: false,
        isSelectingRecipient: false,
        isMaxSourceAmount: false,
      });
    });
  });

  describe('setBridgeViewMode', () => {
    it('should set the bridge view mode to Bridge', () => {
      const viewMode = BridgeViewMode.Bridge;
      const action = setBridgeViewMode(viewMode);
      const state = reducer(initialState, action);

      expect(state.bridgeViewMode).toBe(viewMode);
    });

    it('should set the bridge view mode to Swap', () => {
      const viewMode = BridgeViewMode.Swap;
      const action = setBridgeViewMode(viewMode);
      const state = reducer(initialState, action);

      expect(state.bridgeViewMode).toBe(viewMode);
    });

    it('should set the bridge view mode to Unified', () => {
      const viewMode = BridgeViewMode.Unified;
      const action = setBridgeViewMode(viewMode);
      const state = reducer(initialState, action);

      expect(state.bridgeViewMode).toBe(viewMode);
    });

    it('should update bridge view mode from existing state', () => {
      const currentState = {
        ...initialState,
        bridgeViewMode: BridgeViewMode.Bridge,
      };
      const newViewMode = BridgeViewMode.Swap;
      const action = setBridgeViewMode(newViewMode);
      const state = reducer(currentState, action);

      expect(state.bridgeViewMode).toBe(newViewMode);
    });
  });

  describe('selectBridgeViewMode', () => {
    it('should select bridge view mode from state', () => {
      const mockState = {
        bridge: {
          ...initialState,
          bridgeViewMode: BridgeViewMode.Bridge,
        },
      } as RootState;

      const result = selectBridgeViewMode(mockState);
      expect(result).toBe(BridgeViewMode.Bridge);
    });

    it('should select undefined bridge view mode from initial state', () => {
      const mockState = {
        bridge: initialState,
      } as RootState;

      const result = selectBridgeViewMode(mockState);
      expect(result).toBeUndefined();
    });
  });

  describe('setSourceAmount', () => {
    it('should set the source amount', () => {
      const amount = '1.5';
      const action = setSourceAmount(amount);
      const state = reducer(initialState, action);

      expect(state.sourceAmount).toBe(amount);
    });

    it('should set source amount to undefined', () => {
      const action = setSourceAmount(undefined);
      const state = reducer(initialState, action);

      expect(state.sourceAmount).toBeUndefined();
    });
  });

  describe('setSlippage', () => {
    it('should set the slippage', () => {
      const slippage = '0.5';
      const action = setSlippage(slippage);
      const state = reducer(initialState, action);

      expect(state.slippage).toBe(slippage);
    });
  });

  describe('setDestAmount', () => {
    it('should set the destination amount', () => {
      const amount = '100';
      const action = setDestAmount(amount);
      const state = reducer(initialState, action);

      expect(state.destAmount).toBe(amount);
    });

    it('should set dest amount to undefined', () => {
      const action = setDestAmount(undefined);
      const state = reducer(initialState, action);

      expect(state.destAmount).toBeUndefined();
    });
  });

  describe('setDestToken', () => {
    it('should set the destination token and update selectedDestChainId', () => {
      const action = setDestToken(mockDestToken);
      const state = reducer(initialState, action);

      expect(state.destToken).toBe(mockDestToken);
      expect(state.selectedDestChainId).toBe(mockDestToken.chainId);
    });
  });

  describe('resetBridgeState', () => {
    it('should reset the state to initial state', () => {
      const state = {
        ...initialState,
        sourceAmount: '1.5',
        destAmount: '100',
        sourceToken: mockToken,
        destToken: mockDestToken,
        bridgeViewMode: BridgeViewMode.Bridge,
      };

      const action = resetBridgeState();
      const newState = reducer(state, action);

      expect(newState).toEqual(initialState);
    });
  });

  describe('selectBip44DefaultPair', () => {
    it('should return sourceAsset and destAsset when valid bip44DefaultPairs exist for eip155', () => {
      const result = selectBip44DefaultPair(
        mockRootState as unknown as RootState,
      );

      expect(result).toEqual({
        sourceAsset: {
          symbol: 'ETH',
          name: 'Ethereum',
          address: '0x0000000000000000000000000000000000000000',
          decimals: 18,
          image:
            'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/slip44/60.png',
          chainId: '0x1',
        },
        destAsset: {
          symbol: 'mUSD',
          name: 'MetaMask USD',
          address: '0xaca92e438df0b2401ff60da7e4337b687a2435da',
          decimals: 6,
          image:
            'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/erc20/0xaca92e438df0b2401ff60da7e4337b687a2435da.png',
          chainId: '0x1',
        },
      });
    });

    it('should return sourceAsset and destAsset for solana namespace', () => {
      const mockState = cloneDeep(mockRootState);
      mockState.engine.backgroundState.MultichainNetworkController.selectedMultichainNetworkChainId =
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp' as unknown as any;
      mockState.engine.backgroundState.MultichainNetworkController.isEvmSelected = false;
      const result = selectBip44DefaultPair(mockState as unknown as RootState);

      expect(result).toEqual({
        sourceAsset: {
          address: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501',
          symbol: 'SOL',
          decimals: 9,
          image:
            'https://static.cx.metamask.io/api/v2/tokenIcons/assets/solana/5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44/501.png',
          chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
          name: 'Solana',
        },
        destAsset: {
          address:
            'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
          symbol: 'USDC',
          decimals: 6,
          image:
            'https://static.cx.metamask.io/api/v2/tokenIcons/assets/solana/5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v.png',
          chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
          name: 'USD Coin',
        },
      });
    });

    it('should return sourceAsset and destAsset for bip122 namespace', () => {
      const mockState = cloneDeep(mockRootState);
      mockState.engine.backgroundState.MultichainNetworkController.selectedMultichainNetworkChainId =
        'bip122:000000000019d6689c085ae165831e93' as unknown as any;
      mockState.engine.backgroundState.MultichainNetworkController.isEvmSelected = false;
      const result = selectBip44DefaultPair(mockState as unknown as RootState);

      expect(result).toEqual({
        sourceAsset: {
          symbol: 'BTC',
          name: 'Bitcoin',
          address: '0x0000000000000000000000000000000000000000',
          decimals: 8,
          image:
            'https://static.cx.metamask.io/api/v2/tokenIcons/assets/bip122/000000000019d6689c085ae165831e93/slip44/0.png',
          chainId: 'bip122:000000000019d6689c085ae165831e93',
        },
        destAsset: {
          symbol: 'ETH',
          name: 'Ethereum',
          address: '0x0000000000000000000000000000000000000000',
          decimals: 18,
          image:
            'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/slip44/60.png',
          chainId: '0x1',
        },
      });
    });

    it('should return undefined when bip44DefaultPairs is undefined', () => {
      const mockState = cloneDeep(mockRootState);
      mockState.engine.backgroundState.RemoteFeatureFlagController.remoteFeatureFlags.bridgeConfigV2.bip44DefaultPairs =
        undefined as unknown as any;

      const result = selectBip44DefaultPair(mockState as unknown as RootState);

      expect(result).toBeUndefined();
    });

    it('should return undefined when namespace does not exist in bip44DefaultPairs', () => {
      const mockState = cloneDeep(mockRootState);
      mockState.engine.backgroundState.MultichainNetworkController.selectedMultichainNetworkChainId =
        'bip122:000000000019d6689c085ae165831e93' as unknown as any;
      mockState.engine.backgroundState.MultichainNetworkController.isEvmSelected = false;
      mockState.engine.backgroundState.RemoteFeatureFlagController.remoteFeatureFlags.bridgeConfigV2.bip44DefaultPairs =
        {
          eip155: {
            other: {},
            standard: {
              'eip155:1/slip44:60':
                'eip155:1/erc20:0xaca92e438df0b2401ff60da7e4337b687a2435da',
            },
          },
          solana: {
            other: {},
            standard: {
              'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501':
                'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
            },
          },
        } as unknown as any;

      const result = selectBip44DefaultPair(mockState as unknown as RootState);

      expect(result).toBeUndefined();
    });

    it('should return undefined when standard property does not exist for namespace', () => {
      const bip44DefaultPairs = {
        eip155: {
          // missing standard property
        },
      };
      const mockState = cloneDeep(mockRootState);
      mockState.engine.backgroundState.RemoteFeatureFlagController.remoteFeatureFlags.bridgeConfigV2.bip44DefaultPairs =
        bip44DefaultPairs as unknown as any;

      const result = selectBip44DefaultPair(mockState as unknown as RootState);

      expect(result).toBeUndefined();
    });

    it('should return undefined when standard object is empty', () => {
      const bip44DefaultPairs = {
        eip155: {
          standard: {},
        },
      };
      const mockState = cloneDeep(mockRootState);
      mockState.engine.backgroundState.RemoteFeatureFlagController.remoteFeatureFlags.bridgeConfigV2.bip44DefaultPairs =
        bip44DefaultPairs as unknown as any;

      const result = selectBip44DefaultPair(mockState as unknown as RootState);

      expect(result).toBeUndefined();
    });

    it('should return undefined when sourceAsset is not found in Bip44TokensForDefaultPairs', () => {
      const bip44DefaultPairs = {
        eip155: {
          standard: {
            'eip155:1/invalid:source':
              'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
          },
        },
      };
      const mockState = cloneDeep(mockRootState);
      mockState.engine.backgroundState.RemoteFeatureFlagController.remoteFeatureFlags.bridgeConfigV2.bip44DefaultPairs =
        bip44DefaultPairs as unknown as any;

      const result = selectBip44DefaultPair(mockState as unknown as RootState);

      expect(result).toBeUndefined();
    });

    it('should return undefined when destAsset is not found in Bip44TokensForDefaultPairs', () => {
      const bip44DefaultPairs = {
        eip155: {
          standard: {
            'eip155:1/slip44:60': 'eip155:1/invalid:dest',
          },
        },
      };
      const mockState = cloneDeep(mockRootState);
      mockState.engine.backgroundState.RemoteFeatureFlagController.remoteFeatureFlags.bridgeConfigV2.bip44DefaultPairs =
        bip44DefaultPairs as unknown as any;

      const result = selectBip44DefaultPair(mockState as unknown as RootState);

      expect(result).toBeUndefined();
    });
  });

  describe('selectGasIncludedQuoteParams', () => {
    it('returns gasIncluded true with 7702 false when STX send bundle is supported', () => {
      const mockState = {
        bridge: {
          ...initialState,
          isGasIncludedSTXSendBundleSupported: true,
          isGasIncluded7702Supported: true,
        },
      } as RootState;

      const result = selectGasIncludedQuoteParams(mockState);

      expect(result).toEqual({ gasIncluded: true, gasIncluded7702: false });
    });

    it('returns gasIncluded true with 7702 true for swap when 7702 is supported', () => {
      const mockState = {
        bridge: {
          ...initialState,
          sourceToken: mockToken,
          destToken: { ...mockDestToken, chainId: mockToken.chainId },
          isGasIncludedSTXSendBundleSupported: false,
          isGasIncluded7702Supported: true,
        },
      } as RootState;

      const result = selectGasIncludedQuoteParams(mockState);

      expect(result).toEqual({ gasIncluded: true, gasIncluded7702: true });
    });

    it('returns gasIncluded false with 7702 false for swap without 7702 support', () => {
      const mockState = {
        bridge: {
          ...initialState,
          sourceToken: mockToken,
          destToken: { ...mockDestToken, chainId: mockToken.chainId },
          isGasIncludedSTXSendBundleSupported: false,
          isGasIncluded7702Supported: false,
        },
      } as RootState;

      const result = selectGasIncludedQuoteParams(mockState);

      expect(result).toEqual({ gasIncluded: false, gasIncluded7702: false });
    });

    it('returns gasIncluded false with 7702 false for bridge mode', () => {
      const mockState = {
        bridge: {
          ...initialState,
          sourceToken: mockToken,
          destToken: mockDestToken,
          isGasIncludedSTXSendBundleSupported: false,
          isGasIncluded7702Supported: true,
        },
      } as RootState;

      const result = selectGasIncludedQuoteParams(mockState);

      expect(result).toEqual({ gasIncluded: false, gasIncluded7702: false });
    });
  });
});
