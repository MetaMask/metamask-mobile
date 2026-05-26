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
  setSourceToken,
  setDestToken,
  setIsDestTokenManuallySet,
  selectIsDestTokenManuallySet,
  selectBip44DefaultPair,
  selectIsBridgeEnabledSource,
  selectAllowedChainRanking,
  setTokenSelectorNetworkFilter,
  selectTokenSelectorNetworkFilter,
  setVisiblePillChainIds,
  selectVisiblePillChainIds,
  setSelectedQuoteRequestId,
  selectSelectedQuoteRequestId,
  selectIsRwaSwap,
  setBatchSellSourceTokens,
  selectBatchSellSourceTokens,
  setBatchSellDestToken,
  selectBatchSellDestToken,
  selectBatchSellDestStablecoins,
  selectBatchSellDestStablecoinsByChain,
  selectHardwareWalletsSwaps,
  updateHardwareWalletsSwaps,
  selectBatchSellSlippages,
  setBatchSellTokenSlippage,
  setBatchSellTokenSlippages,
} from '.';
import { FEATURE_FLAG_NAME } from '../../../../selectors/featureFlagController/rwa';
import {
  BridgeToken,
  BridgeViewMode,
} from '../../../../components/UI/Bridge/types';
import { CaipAssetType, CaipChainId, Hex } from '@metamask/utils';
import { RootState } from '../../../../reducers';
import { cloneDeep } from 'lodash';
import { BridgeTokenMetadata } from '../../../../components/UI/Bridge/constants/tokens';
import {
  HardwareWalletsSwapsEventType,
  HardwareWalletsSwapsStatus,
  initialHardwareWalletsSwapsState,
} from '../../../../components/UI/HardwareWallet/Swaps/HardwareWalletsSwaps.state';

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

  const polygonNativeToken: BridgeToken = {
    address: '0x0000000000000000000000000000000000001010',
    symbol: 'POL',
    decimals: 18,
    image: '',
    chainId: '0x89' as Hex,
    name: 'POL',
  };

  describe('initial state', () => {
    it('has correct initial state', () => {
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
        isSelectingToken: false,
        isMaxSourceAmount: false,
        isDestTokenManuallySet: false,
        tokenSelectorNetworkFilter: undefined,
        visiblePillChainIds: undefined,
        selectedQuoteRequestId: undefined,
        abTestContext: undefined,
        hardwareWalletsSwaps: initialHardwareWalletsSwapsState,
        batchSellSourceTokens: [],
        batchSellDestToken: undefined,
        batchSellSlippages: {},
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
    it('normalizes Polygon native token address', () => {
      const state = reducer(initialState, setDestToken(polygonNativeToken));

      expect(state.destToken?.address).toBe(
        '0x0000000000000000000000000000000000000000',
      );
    });

    it('sets the destination token and updates selectedDestChainId', () => {
      const action = setDestToken(mockDestToken);
      const state = reducer(initialState, action);

      expect(state.destToken).toBe(mockDestToken);
      expect(state.selectedDestChainId).toBe(mockDestToken.chainId);
    });

    it('does not modify isDestTokenManuallySet flag', () => {
      const stateWithManualFlag = {
        ...initialState,
        isDestTokenManuallySet: true,
      };

      const action = setDestToken(mockDestToken);
      const state = reducer(stateWithManualFlag, action);

      expect(state.isDestTokenManuallySet).toBe(true);
    });
  });

  describe('setSourceToken', () => {
    it('normalizes Polygon native token address', () => {
      const state = reducer(initialState, setSourceToken(polygonNativeToken));

      expect(state.sourceToken?.address).toBe(
        '0x0000000000000000000000000000000000000000',
      );
    });
  });

  describe('batch sell state', () => {
    it('sets final Batch Sell source tokens for handoff', () => {
      const state = reducer(
        initialState,
        setBatchSellSourceTokens([mockToken]),
      );

      expect(state.batchSellSourceTokens).toEqual([mockToken]);
    });

    it('normalizes Batch Sell source token addresses', () => {
      const state = reducer(
        initialState,
        setBatchSellSourceTokens([polygonNativeToken]),
      );

      expect(state.batchSellSourceTokens[0].address).toBe(
        '0x0000000000000000000000000000000000000000',
      );
    });

    it('selects final Batch Sell source tokens', () => {
      const mockState = {
        bridge: {
          ...initialState,
          batchSellSourceTokens: [mockToken],
        },
      } as RootState;

      expect(selectBatchSellSourceTokens(mockState)).toEqual([mockToken]);
    });

    it('sets Batch Sell destination token metadata', () => {
      const state = reducer(initialState, setBatchSellDestToken(mockToken));

      expect(state.batchSellDestToken).toEqual(mockToken);
    });

    it('normalizes Batch Sell destination token addresses', () => {
      const state = reducer(
        initialState,
        setBatchSellDestToken(polygonNativeToken),
      );

      expect(state.batchSellDestToken?.address).toBe(
        '0x0000000000000000000000000000000000000000',
      );
    });

    it('selects Batch Sell destination token metadata', () => {
      const mockState = {
        bridge: {
          ...initialState,
          batchSellDestToken: mockToken,
        },
      } as RootState;

      expect(selectBatchSellDestToken(mockState)).toEqual(mockToken);
    });

    it('sets Batch Sell token slippage by asset ID', () => {
      const assetId =
        'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' as CaipAssetType;

      const state = reducer(
        initialState,
        setBatchSellTokenSlippage({ assetId, slippage: '2' }),
      );

      expect(state.batchSellSlippages[assetId]).toBe('2');
    });

    it('stores undefined Batch Sell token slippage for Auto', () => {
      const assetId =
        'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' as CaipAssetType;

      const state = reducer(
        initialState,
        setBatchSellTokenSlippage({ assetId, slippage: undefined }),
      );

      expect(state.batchSellSlippages).toHaveProperty(assetId, undefined);
    });

    it('replaces Batch Sell token slippage map', () => {
      const assetId =
        'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' as CaipAssetType;

      const state = reducer(
        {
          ...initialState,
          batchSellSlippages: {
            'eip155:1/erc20:0xdac17f958d2ee523a2206206994597c13d831ec7': '0.5',
          },
        },
        setBatchSellTokenSlippages({ [assetId]: '3' }),
      );

      expect(state.batchSellSlippages).toEqual({ [assetId]: '3' });
    });

    it('selects Batch Sell token slippage map', () => {
      const assetId =
        'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' as CaipAssetType;
      const mockState = {
        bridge: {
          ...initialState,
          batchSellSlippages: { [assetId]: '2' },
        },
      } as RootState;

      expect(selectBatchSellSlippages(mockState)).toEqual({ [assetId]: '2' });
    });
  });

  describe('setIsDestTokenManuallySet', () => {
    it('sets the flag to true', () => {
      const action = setIsDestTokenManuallySet(true);
      const state = reducer(initialState, action);

      expect(state.isDestTokenManuallySet).toBe(true);
    });

    it('sets the flag to false', () => {
      const stateWithManualFlag = {
        ...initialState,
        isDestTokenManuallySet: true,
      };

      const action = setIsDestTokenManuallySet(false);
      const state = reducer(stateWithManualFlag, action);

      expect(state.isDestTokenManuallySet).toBe(false);
    });
  });

  describe('selectIsDestTokenManuallySet', () => {
    it('returns false from initial state', () => {
      const mockState = {
        bridge: initialState,
      } as RootState;

      const result = selectIsDestTokenManuallySet(mockState);

      expect(result).toBe(false);
    });

    it('returns true when flag is set', () => {
      const mockState = {
        bridge: {
          ...initialState,
          isDestTokenManuallySet: true,
        },
      } as RootState;

      const result = selectIsDestTokenManuallySet(mockState);

      expect(result).toBe(true);
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

    it('resets visible pill chain IDs when bridge state resets', () => {
      const stateWithVisiblePills = {
        ...initialState,
        visiblePillChainIds: ['eip155:137', 'eip155:1'] as CaipChainId[],
      };

      const newState = reducer(stateWithVisiblePills, resetBridgeState());

      expect(newState.visiblePillChainIds).toBeUndefined();
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

  describe('selectIsBridgeEnabledSource', () => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore - Mock state structure causes TypeScript warnings but tests are valid
    it('returns true when bridge is enabled as source for the chain', () => {
      const result = selectIsBridgeEnabledSource(
        mockRootState as unknown as RootState,
        '0x1',
      );

      expect(result).toBe(true);
    });

    it('returns false when bridge is not enabled as source for the chain', () => {
      const mockState = cloneDeep(mockRootState);
      // Remove chain from chainRanking to disable it (chainRanking presence = enabled)
      mockState.engine.backgroundState.RemoteFeatureFlagController.remoteFeatureFlags.bridgeConfigV2.chainRanking =
        mockState.engine.backgroundState.RemoteFeatureFlagController.remoteFeatureFlags.bridgeConfigV2.chainRanking.filter(
          (chain) => chain.chainId !== 'eip155:1',
        );

      const result = selectIsBridgeEnabledSource(
        mockState as unknown as RootState,
        '0x1',
      );

      expect(result).toBe(false);
    });

    it('returns false when chain is not in bridge config', () => {
      const result = selectIsBridgeEnabledSource(
        mockRootState as unknown as RootState,
        '0x999' as Hex,
      );

      expect(result).toBe(false);
    });
  });

  describe('selectAllowedChainRanking', () => {
    it('returns all supported chains from feature flags', () => {
      const result = selectAllowedChainRanking(
        mockRootState as unknown as RootState,
      );

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);

      result.forEach((chain) => {
        expect(chain).toHaveProperty('chainId');
        expect(chain).toHaveProperty('name');
        expect(typeof chain.chainId).toBe('string');
        expect(typeof chain.name).toBe('string');
      });

      expect(
        result.some(
          (chain) => chain.chainId === 'eip155:1' && chain.name === 'Ethereum',
        ),
      ).toBe(true);
    });

    it('filters out unsupported EVM chains not in ALLOWED_BRIDGE_CHAIN_IDS', () => {
      const mockState = cloneDeep(mockRootState);
      mockState.engine.backgroundState.RemoteFeatureFlagController.remoteFeatureFlags.bridgeConfigV2.chainRanking =
        [
          ...mockState.engine.backgroundState.RemoteFeatureFlagController
            .remoteFeatureFlags.bridgeConfigV2.chainRanking,
          { chainId: 'eip155:99999', name: 'Unsupported EVM Chain' },
        ];

      const result = selectAllowedChainRanking(
        mockState as unknown as RootState,
      );

      expect(result.some((chain) => chain.chainId === 'eip155:99999')).toBe(
        false,
      );
      expect(result.some((chain) => chain.chainId === 'eip155:1')).toBe(true);
    });

    it('filters out unsupported non-EVM chains not in ALLOWED_BRIDGE_CHAIN_IDS', () => {
      const mockState = cloneDeep(mockRootState);
      mockState.engine.backgroundState.RemoteFeatureFlagController.remoteFeatureFlags.bridgeConfigV2.chainRanking =
        [
          ...mockState.engine.backgroundState.RemoteFeatureFlagController
            .remoteFeatureFlags.bridgeConfigV2.chainRanking,
          { chainId: 'cosmos:cosmoshub-4', name: 'Unsupported Cosmos Chain' },
        ];

      const result = selectAllowedChainRanking(
        mockState as unknown as RootState,
      );

      expect(
        result.some((chain) => chain.chainId === 'cosmos:cosmoshub-4'),
      ).toBe(false);
      expect(
        result.some(
          (chain) =>
            chain.chainId === 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
        ),
      ).toBe(true);
    });
  });

  describe('selectBatchSellDestStablecoins', () => {
    it('returns configured stablecoins with local metadata', () => {
      const mockState = cloneDeep(mockRootState);
      const ethUsdc =
        'eip155:1/erc20:0xA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48' as CaipAssetType;
      const unknownStablecoin =
        'eip155:1/erc20:0x0000000000000000000000000000000000000001' as CaipAssetType;

      mockState.engine.backgroundState.RemoteFeatureFlagController.remoteFeatureFlags.bridgeConfigV2.chains[
        'eip155:1'
      ] = {
        ...mockState.engine.backgroundState.RemoteFeatureFlagController
          .remoteFeatureFlags.bridgeConfigV2.chains['eip155:1'],
        batchSellDestStablecoins: [unknownStablecoin, ethUsdc],
      } as unknown as any;

      expect(
        selectBatchSellDestStablecoins(
          mockState as unknown as RootState,
          '0x1',
        ),
      ).toEqual([
        {
          symbol: 'USDC',
          name: 'USD Coin',
          address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
          decimals: 6,
          image:
            'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/erc20/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.png',
          chainId: '0x1',
        },
      ]);
    });

    it('returns configured stablecoins by chain with local metadata', () => {
      const mockState = cloneDeep(mockRootState);
      const ethUsdc =
        'eip155:1/erc20:0xA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48' as CaipAssetType;
      const baseUsdc =
        'eip155:8453/erc20:0x833589fcd6edb6e08f4c7c32d4f71b54bda02913' as CaipAssetType;
      const unknownStablecoin =
        'eip155:1/erc20:0x0000000000000000000000000000000000000001' as CaipAssetType;

      mockState.engine.backgroundState.RemoteFeatureFlagController.remoteFeatureFlags.bridgeConfigV2.chains[
        'eip155:1'
      ] = {
        ...mockState.engine.backgroundState.RemoteFeatureFlagController
          .remoteFeatureFlags.bridgeConfigV2.chains['eip155:1'],
        batchSellDestStablecoins: [unknownStablecoin, ethUsdc],
      } as unknown as any;
      mockState.engine.backgroundState.RemoteFeatureFlagController.remoteFeatureFlags.bridgeConfigV2.chains[
        'eip155:8453'
      ] = {
        ...mockState.engine.backgroundState.RemoteFeatureFlagController
          .remoteFeatureFlags.bridgeConfigV2.chains['eip155:8453'],
        isActiveSrc: true,
        isActiveDest: true,
        isGaslessSwapEnabled: false,
        batchSellDestStablecoins: [baseUsdc],
      } as unknown as any;

      const expectedEthUsdc =
        BridgeTokenMetadata[
          'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' as CaipAssetType
        ];
      const expectedBaseUsdc =
        BridgeTokenMetadata[
          'eip155:8453/erc20:0x833589fcd6edb6e08f4c7c32d4f71b54bda02913' as CaipAssetType
        ];

      const result = selectBatchSellDestStablecoinsByChain(
        mockState as unknown as RootState,
      );

      expect(result).toEqual(
        expect.objectContaining({
          'eip155:1': [expectedEthUsdc],
          'eip155:8453': [expectedBaseUsdc],
        }),
      );
    });

    it('returns an empty array when no chain is selected', () => {
      const result = selectBatchSellDestStablecoins(
        mockRootState as unknown as RootState,
        undefined,
      );

      expect(result).toEqual([]);
    });
  });

  describe('setTokenSelectorNetworkFilter', () => {
    it('should set the network filter to a chain ID', () => {
      const chainId = 'eip155:1';
      const action = setTokenSelectorNetworkFilter(chainId as CaipChainId);
      const state = reducer(initialState, action);

      expect(state.tokenSelectorNetworkFilter).toBe(chainId);
    });

    it('should clear the network filter when set to undefined', () => {
      const stateWithFilter = {
        ...initialState,
        tokenSelectorNetworkFilter: 'eip155:1' as CaipChainId,
      };
      const action = setTokenSelectorNetworkFilter(undefined);
      const state = reducer(stateWithFilter, action);

      expect(state.tokenSelectorNetworkFilter).toBeUndefined();
    });

    it('should update the network filter from one chain to another', () => {
      const stateWithFilter = {
        ...initialState,
        tokenSelectorNetworkFilter: 'eip155:1' as CaipChainId,
      };
      const action = setTokenSelectorNetworkFilter('eip155:137' as CaipChainId);
      const state = reducer(stateWithFilter, action);

      expect(state.tokenSelectorNetworkFilter).toBe('eip155:137');
    });
  });

  describe('selectTokenSelectorNetworkFilter', () => {
    it('should return undefined when no filter is set', () => {
      const mockState = cloneDeep(mockRootState);
      (mockState as any).bridge = { ...initialState };

      const result = selectTokenSelectorNetworkFilter(
        mockState as unknown as RootState,
      );

      expect(result).toBeUndefined();
    });

    it('should return the set chain ID', () => {
      const mockState = cloneDeep(mockRootState);
      (mockState as any).bridge = {
        ...initialState,
        tokenSelectorNetworkFilter: 'eip155:10',
      };

      const result = selectTokenSelectorNetworkFilter(
        mockState as unknown as RootState,
      );

      expect(result).toBe('eip155:10');
    });
  });

  describe('setVisiblePillChainIds', () => {
    it('sets the visible pill chain IDs', () => {
      const chainIds = ['eip155:1', 'eip155:137'] as CaipChainId[];
      const action = setVisiblePillChainIds(chainIds);
      const state = reducer(initialState, action);

      expect(state.visiblePillChainIds).toEqual(chainIds);
    });

    it('clears visible pill chain IDs when set to undefined', () => {
      const stateWithPills = {
        ...initialState,
        visiblePillChainIds: ['eip155:1'] as CaipChainId[],
      };
      const action = setVisiblePillChainIds(undefined);
      const state = reducer(stateWithPills, action);

      expect(state.visiblePillChainIds).toBeUndefined();
    });
  });

  describe('selectVisiblePillChainIds', () => {
    it('returns undefined when no pills are set', () => {
      const mockState = cloneDeep(mockRootState);
      (mockState as any).bridge = { ...initialState };

      const result = selectVisiblePillChainIds(
        mockState as unknown as RootState,
      );

      expect(result).toBeUndefined();
    });

    it('returns the set chain IDs', () => {
      const mockState = cloneDeep(mockRootState);
      (mockState as any).bridge = {
        ...initialState,
        visiblePillChainIds: ['eip155:1', 'eip155:10'],
      };

      const result = selectVisiblePillChainIds(
        mockState as unknown as RootState,
      );

      expect(result).toEqual(['eip155:1', 'eip155:10']);
    });
  });

  describe('setSelectedQuoteRequestId', () => {
    it('sets the selected quote request ID', () => {
      const requestId = 'quote-request-123';
      const action = setSelectedQuoteRequestId(requestId);
      const state = reducer(initialState, action);

      expect(state.selectedQuoteRequestId).toBe(requestId);
    });

    it('clears the selected quote request ID when set to undefined', () => {
      const stateWithSelection = {
        ...initialState,
        selectedQuoteRequestId: 'quote-request-123',
      };
      const action = setSelectedQuoteRequestId(undefined);
      const state = reducer(stateWithSelection, action);

      expect(state.selectedQuoteRequestId).toBeUndefined();
    });

    it('updates the selected quote request ID from one to another', () => {
      const stateWithSelection = {
        ...initialState,
        selectedQuoteRequestId: 'quote-request-123',
      };
      const action = setSelectedQuoteRequestId('quote-request-456');
      const state = reducer(stateWithSelection, action);

      expect(state.selectedQuoteRequestId).toBe('quote-request-456');
    });
  });

  describe('selectSelectedQuoteRequestId', () => {
    it('returns undefined when no quote is selected', () => {
      const mockState = {
        bridge: initialState,
      } as RootState;

      const result = selectSelectedQuoteRequestId(mockState);

      expect(result).toBeUndefined();
    });

    it('returns the selected quote request ID', () => {
      const mockState = {
        bridge: {
          ...initialState,
          selectedQuoteRequestId: 'quote-request-789',
        },
      } as RootState;

      const result = selectSelectedQuoteRequestId(mockState);

      expect(result).toBe('quote-request-789');
    });
  });

  describe('selectHardwareWalletsSwaps', () => {
    it('returns initial hardware wallet swaps state from bridge state', () => {
      const mockState = {
        bridge: initialState,
      } as RootState;

      expect(selectHardwareWalletsSwaps(mockState)).toEqual(
        initialHardwareWalletsSwapsState,
      );
    });

    it('returns updated hardware wallet swaps state after reducer action', () => {
      const bridgeState = reducer(
        initialState,
        updateHardwareWalletsSwaps({
          type: HardwareWalletsSwapsEventType.Start,
          payload: { totalSteps: 1 },
        }),
      );
      const mockState = {
        bridge: bridgeState,
      } as RootState;

      expect(selectHardwareWalletsSwaps(mockState)).toEqual({
        ...initialHardwareWalletsSwapsState,
        status: HardwareWalletsSwapsStatus.Waiting,
        currentStep: 1,
        totalSteps: 1,
        steps: expect.any(Array),
      });
    });
  });

  describe('resetBridgeState with selectedQuoteRequestId', () => {
    it('resets selectedQuoteRequestId when bridge state resets', () => {
      const stateWithSelection = {
        ...initialState,
        selectedQuoteRequestId: 'quote-request-123',
        sourceAmount: '1.5',
      };

      const newState = reducer(stateWithSelection, resetBridgeState());

      expect(newState.selectedQuoteRequestId).toBeUndefined();
    });
  });

  describe('selectIsRwaSwap', () => {
    const stockToken: BridgeToken = {
      address: '0xstock',
      symbol: 'STOCK',
      decimals: 18,
      image: '',
      chainId: '0x1' as Hex,
      name: 'Stock Token',
      rwaData: { instrumentType: 'stock' } as BridgeToken['rwaData'],
    };

    const nonRwaToken: BridgeToken = {
      address: '0xusdc',
      symbol: 'USDC',
      decimals: 6,
      image: '',
      chainId: '0x1' as Hex,
      name: 'USDC',
    };

    const buildState = (
      sourceToken: BridgeToken | undefined,
      destToken: BridgeToken | undefined,
      rwaEnabled: boolean,
    ) => {
      const mockState = cloneDeep(mockRootState);
      (mockState as any).bridge = {
        ...initialState,
        sourceToken,
        destToken,
      };
      (
        mockState as any
      ).engine.backgroundState.RemoteFeatureFlagController.remoteFeatureFlags[
        FEATURE_FLAG_NAME
      ] = rwaEnabled;
      return mockState as unknown as RootState;
    };

    it('returns false when source and dest chains differ (bridge, not a swap)', () => {
      const state = buildState(
        { ...stockToken, chainId: '0x1' as Hex },
        { ...nonRwaToken, chainId: '0xa' as Hex },
        true,
      );
      expect(selectIsRwaSwap(state)).toBe(false);
    });

    it('returns false when it is an EVM swap but no token has RWA data', () => {
      const state = buildState(nonRwaToken, nonRwaToken, true);
      expect(selectIsRwaSwap(state)).toBe(false);
    });

    it('returns false when source token is a stock RWA but the RWA flag is disabled', () => {
      const state = buildState(stockToken, nonRwaToken, false);
      expect(selectIsRwaSwap(state)).toBe(false);
    });

    it('returns true when source token is a stock RWA and the RWA flag is enabled', () => {
      const state = buildState(stockToken, nonRwaToken, true);
      expect(selectIsRwaSwap(state)).toBe(true);
    });

    it('returns true when dest token is a stock RWA and the RWA flag is enabled', () => {
      const state = buildState(nonRwaToken, stockToken, true);
      expect(selectIsRwaSwap(state)).toBe(true);
    });

    it('returns true when both tokens are stock RWA and the RWA flag is enabled', () => {
      const state = buildState(stockToken, stockToken, true);
      expect(selectIsRwaSwap(state)).toBe(true);
    });

    it('returns false when source token instrument type is not stock', () => {
      const bondToken: BridgeToken = {
        ...stockToken,
        rwaData: { instrumentType: 'bond' } as BridgeToken['rwaData'],
      };
      const state = buildState(bondToken, nonRwaToken, true);
      expect(selectIsRwaSwap(state)).toBe(false);
    });
  });

  describe('selectIsBridgeEnabledSource - ALLOWED_BRIDGE_CHAIN_IDS filtering', () => {
    it('returns false for a chain in chainRanking but not in ALLOWED_BRIDGE_CHAIN_IDS', () => {
      const mockState = cloneDeep(mockRootState);
      // Add an unsupported chain to chainRanking
      mockState.engine.backgroundState.RemoteFeatureFlagController.remoteFeatureFlags.bridgeConfigV2.chainRanking =
        [
          ...mockState.engine.backgroundState.RemoteFeatureFlagController
            .remoteFeatureFlags.bridgeConfigV2.chainRanking,
          { chainId: 'eip155:99999', name: 'Unsupported Future Chain' },
        ];

      const result = selectIsBridgeEnabledSource(
        mockState as unknown as RootState,
        '0x1869F' as Hex, // hex for 99999
      );

      expect(result).toBe(false);
    });
  });
});
