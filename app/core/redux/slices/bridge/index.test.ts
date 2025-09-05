import { initialState as mockRootState } from '../../../../components/UI/Bridge/_mocks_/initialState';
import reducer, {
  initialState,
  setSourceAmount,
  setDestAmount,
  resetBridgeState,
  setSlippage,
  setBridgeViewMode,
  selectBridgeViewMode,
  selectIsUnifiedSwapsEnabled,
  setDestToken,
} from '.';
import {
  BridgeToken,
  BridgeViewMode,
} from '../../../../components/UI/Bridge/types';
import { Hex } from '@metamask/utils';
import { RootState } from '../../../../reducers';
import { isUnifiedSwapsEnvVarEnabled } from './utils/isUnifiedSwapsEnvVarEnabled';
import { formatChainIdToCaip } from '@metamask/bridge-controller';
import { cloneDeep } from 'lodash';

jest.mock('./utils/isUnifiedSwapsEnvVarEnabled', () => ({
  isUnifiedSwapsEnvVarEnabled: jest.fn(),
}));

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
        destAddress: undefined,
        selectedSourceChainIds: undefined,
        selectedDestChainId: undefined,
        slippage: '0.5',
        isSubmittingTx: false,
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

  describe('selectIsUnifiedSwapsEnabled', () => {
    const mockChainId = '0x1' as Hex;
    const mockIsUnifiedSwapsEnvVarEnabled =
      isUnifiedSwapsEnvVarEnabled as jest.MockedFunction<
        typeof isUnifiedSwapsEnvVarEnabled
      >;

    beforeEach(() => {
      jest.clearAllMocks();
    });

    const createMockState = (
      isUnifiedUIEnabled: boolean,
      chainId = mockChainId,
    ): RootState => {
      const state = cloneDeep(mockRootState);
      const caipChainId = formatChainIdToCaip(chainId);

      // Directly modify the field we need
      const chain =
        state.engine.backgroundState.RemoteFeatureFlagController
          .remoteFeatureFlags.bridgeConfigV2.chains[caipChainId];
      if (chain) {
        chain.isUnifiedUIEnabled = isUnifiedUIEnabled;
      }

      return state as unknown as RootState;
    };

    it('should return true when MM_UNIFIED_SWAPS_ENABLED is true and isUnifiedUIEnabled is true', () => {
      mockIsUnifiedSwapsEnvVarEnabled.mockReturnValue(true);
      const mockState = createMockState(true);

      const result = selectIsUnifiedSwapsEnabled(mockState);
      expect(result).toBe(true);
    });

    it('should return false when MM_UNIFIED_SWAPS_ENABLED is true but isUnifiedUIEnabled is false', () => {
      mockIsUnifiedSwapsEnvVarEnabled.mockReturnValue(true);
      const mockState = createMockState(false);

      const result = selectIsUnifiedSwapsEnabled(mockState);
      expect(result).toBe(false);
    });

    it('should return false when MM_UNIFIED_SWAPS_ENABLED is false even if isUnifiedUIEnabled is true', () => {
      mockIsUnifiedSwapsEnvVarEnabled.mockReturnValue(false);
      const mockState = createMockState(true);

      const result = selectIsUnifiedSwapsEnabled(mockState);
      expect(result).toBe(false);
    });

    it('should return false when MM_UNIFIED_SWAPS_ENABLED is false and isUnifiedUIEnabled is false', () => {
      mockIsUnifiedSwapsEnvVarEnabled.mockReturnValue(false);
      const mockState = createMockState(false);

      const result = selectIsUnifiedSwapsEnabled(mockState);
      expect(result).toBe(false);
    });

    it('should return false when MM_UNIFIED_SWAPS_ENABLED is undefined', () => {
      mockIsUnifiedSwapsEnvVarEnabled.mockReturnValue(false);
      const mockState = createMockState(true);

      const result = selectIsUnifiedSwapsEnabled(mockState);
      expect(result).toBe(false);
    });

    it('should return false when chain is not configured in bridge feature flags', () => {
      mockIsUnifiedSwapsEnvVarEnabled.mockReturnValue(true);
      const mockState = cloneDeep(mockRootState);
      // @ts-expect-error - we want to test the case where the chain is not configured
      mockState.engine.backgroundState.RemoteFeatureFlagController.remoteFeatureFlags.bridgeConfigV2.chains[
        formatChainIdToCaip('0x1')
      ] = undefined;

      const result = selectIsUnifiedSwapsEnabled(
        mockState as unknown as RootState,
      );
      expect(result).toBe(false);
    });

    it('should return false when bridge feature flags are missing', () => {
      mockIsUnifiedSwapsEnvVarEnabled.mockReturnValue(true);
      const mockState = JSON.parse(JSON.stringify(mockRootState));

      // Directly modify to remove bridge config
      mockState.engine.backgroundState.RemoteFeatureFlagController.remoteFeatureFlags.bridgeConfigV2 =
        undefined;

      const result = selectIsUnifiedSwapsEnabled(mockState as RootState);
      expect(result).toBe(false);
    });
  });
});
