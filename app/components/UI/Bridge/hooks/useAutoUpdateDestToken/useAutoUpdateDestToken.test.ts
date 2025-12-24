import {
  initialState,
  ethChainId,
  optimismChainId,
} from '../../_mocks_/initialState';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { useAutoUpdateDestToken } from '.';
import { BridgeToken } from '../../types';
import { Hex } from '@metamask/utils';
import { BtcScope, SolScope } from '@metamask/keyring-api';
// eslint-disable-next-line import/no-namespace
import * as bridgeSlice from '../../../../../core/redux/slices/bridge';
// eslint-disable-next-line import/no-namespace
import * as tokenUtils from '../../utils/tokenUtils';

describe('useAutoUpdateDestToken', () => {
  const mockEthToken: BridgeToken = {
    address: '0x0000000000000000000000000000000000000001',
    symbol: 'TOKEN',
    name: 'Test Token',
    decimals: 18,
    chainId: ethChainId,
  };

  const mockOptimismToken: BridgeToken = {
    address: '0x0000000000000000000000000000000000000002',
    symbol: 'OP_TOKEN',
    name: 'Optimism Token',
    decimals: 18,
    chainId: optimismChainId,
  };

  const mockPolygonToken: BridgeToken = {
    address: '0x0000000000000000000000000000000000000003',
    symbol: 'MATIC_TOKEN',
    name: 'Polygon Token',
    decimals: 18,
    chainId: '0x89' as Hex,
  };

  const mockBtcToken: BridgeToken = {
    address: '0x0000000000000000000000000000000000000000',
    symbol: 'BTC',
    name: 'Bitcoin',
    decimals: 8,
    chainId: BtcScope.Mainnet,
  };

  const mockSolToken: BridgeToken = {
    address: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501',
    symbol: 'SOL',
    name: 'Solana',
    decimals: 9,
    chainId: SolScope.Mainnet,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when source chain changes and dest was not manually set', () => {
    it('updates dest token to default for new source chain', () => {
      const setDestTokenSpy = jest.spyOn(bridgeSlice, 'setDestToken');

      const { result } = renderHookWithProvider(
        () => useAutoUpdateDestToken(),
        {
          state: {
            ...initialState,
            bridge: {
              ...initialState.bridge,
              destToken: mockEthToken,
              isDestTokenManuallySet: false,
            },
          },
        },
      );

      // Change source to Optimism (different chain from dest)
      result.current.autoUpdateDestToken(mockOptimismToken);

      // Dest should be updated to Optimism's default (USDC)
      expect(setDestTokenSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          chainId: optimismChainId,
        }),
      );
    });

    it('sets ETH on Ethereum as dest when source is Bitcoin', () => {
      const setDestTokenSpy = jest.spyOn(bridgeSlice, 'setDestToken');

      const { result } = renderHookWithProvider(
        () => useAutoUpdateDestToken(),
        {
          state: {
            ...initialState,
            bridge: {
              ...initialState.bridge,
              destToken: mockSolToken, // Currently on Solana
              isDestTokenManuallySet: false,
            },
          },
        },
      );

      // Change source to Bitcoin
      result.current.autoUpdateDestToken(mockBtcToken);

      // Dest should be ETH on Ethereum (0x1)
      expect(setDestTokenSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          symbol: 'ETH',
          chainId: '0x1',
          address: '0x0000000000000000000000000000000000000000',
        }),
      );
    });
  });

  describe('when dest was manually set', () => {
    it('does not update dest token when source chain changes', () => {
      const setDestTokenSpy = jest.spyOn(bridgeSlice, 'setDestToken');

      const { result } = renderHookWithProvider(
        () => useAutoUpdateDestToken(),
        {
          state: {
            ...initialState,
            bridge: {
              ...initialState.bridge,
              destToken: mockEthToken,
              isDestTokenManuallySet: true, // User manually selected dest
            },
          },
        },
      );

      // Change source to Optimism (different chain from dest)
      result.current.autoUpdateDestToken(mockOptimismToken);

      // Dest should NOT be updated because it was manually set
      expect(setDestTokenSpy).not.toHaveBeenCalled();
    });
  });

  describe('same-chain source token changes', () => {
    it('does not update dest when current dest already matches expected dest', () => {
      const setDestTokenSpy = jest.spyOn(bridgeSlice, 'setDestToken');

      // Dest is already the default (mUSD for Ethereum)
      const mUsdToken: BridgeToken = {
        address: '0xaca92e438df0b2401ff60da7e4337b687a2435da',
        symbol: 'mUSD',
        name: 'MetaMask USD',
        decimals: 6,
        chainId: ethChainId,
      };

      const anotherEthToken: BridgeToken = {
        ...mockEthToken,
        address: '0x0000000000000000000000000000000000000099',
        symbol: 'ANOTHER',
      };

      const { result } = renderHookWithProvider(
        () => useAutoUpdateDestToken(),
        {
          state: {
            ...initialState,
            bridge: {
              ...initialState.bridge,
              destToken: mUsdToken, // Already the expected default
              isDestTokenManuallySet: false,
            },
          },
        },
      );

      // Change source to another token on same chain (Ethereum)
      result.current.autoUpdateDestToken(anotherEthToken);

      // Dest should NOT be updated because it already matches expected (mUSD)
      expect(setDestTokenSpy).not.toHaveBeenCalled();
    });

    it('updates dest from native fallback to default when source no longer conflicts', () => {
      const setDestTokenSpy = jest.spyOn(bridgeSlice, 'setDestToken');

      // Current dest is native ETH (set as fallback because source was mUSD)
      const nativeEthToken: BridgeToken = {
        address: '0x0000000000000000000000000000000000000000',
        symbol: 'ETH',
        name: 'Ethereum',
        decimals: 18,
        chainId: ethChainId,
      };

      // New source is a different token that doesn't conflict with default (mUSD)
      const nonConflictingSource: BridgeToken = {
        address: '0x0000000000000000000000000000000000000099',
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6,
        chainId: ethChainId,
      };

      const { result } = renderHookWithProvider(
        () => useAutoUpdateDestToken(),
        {
          state: {
            ...initialState,
            bridge: {
              ...initialState.bridge,
              destToken: nativeEthToken, // Native fallback
              isDestTokenManuallySet: false,
            },
          },
        },
      );

      // Change source to a non-conflicting token on same chain
      result.current.autoUpdateDestToken(nonConflictingSource);

      // Dest should update to the default (mUSD) since source no longer conflicts
      expect(setDestTokenSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          symbol: 'mUSD',
          chainId: ethChainId,
          address: '0xaca92e438df0b2401ff60da7e4337b687a2435da',
        }),
      );
    });

    it('updates dest to native when source changes to match default dest', () => {
      const setDestTokenSpy = jest.spyOn(bridgeSlice, 'setDestToken');

      // Current dest is the default mUSD
      const mUsdToken: BridgeToken = {
        address: '0xaca92e438df0b2401ff60da7e4337b687a2435da',
        symbol: 'mUSD',
        name: 'MetaMask USD',
        decimals: 6,
        chainId: ethChainId,
      };

      // New source is also mUSD (conflicts with dest)
      const mUsdSourceToken: BridgeToken = {
        address: '0xaca92e438df0b2401ff60da7e4337b687a2435da',
        symbol: 'mUSD',
        name: 'MetaMask USD',
        decimals: 6,
        chainId: ethChainId,
      };

      const { result } = renderHookWithProvider(
        () => useAutoUpdateDestToken(),
        {
          state: {
            ...initialState,
            bridge: {
              ...initialState.bridge,
              destToken: mUsdToken,
              isDestTokenManuallySet: false,
            },
          },
        },
      );

      // Change source to mUSD (same as current dest)
      result.current.autoUpdateDestToken(mUsdSourceToken);

      // Dest should update to native ETH since source now conflicts with default
      expect(setDestTokenSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          symbol: 'ETH',
          chainId: ethChainId,
          address: '0x0000000000000000000000000000000000000000',
        }),
      );
    });
  });

  describe('when there is no current dest token', () => {
    it('does not update dest token when destToken is undefined', () => {
      const setDestTokenSpy = jest.spyOn(bridgeSlice, 'setDestToken');

      const { result } = renderHookWithProvider(
        () => useAutoUpdateDestToken(),
        {
          state: {
            ...initialState,
            bridge: {
              ...initialState.bridge,
              destToken: undefined,
              isDestTokenManuallySet: false,
            },
          },
        },
      );

      result.current.autoUpdateDestToken(mockOptimismToken);

      // Dest should NOT be updated because there's no current dest to compare
      expect(setDestTokenSpy).not.toHaveBeenCalled();
    });
  });

  describe('when default dest token equals source token', () => {
    it('falls back to native token for the chain', () => {
      const setDestTokenSpy = jest.spyOn(bridgeSlice, 'setDestToken');

      // Mock a source token that matches the default dest token address
      // For Ethereum mainnet, the default dest is mUSD at 0xaca92e438df0b2401ff60da7e4337b687a2435da
      const sourceTokenMatchingDefault: BridgeToken = {
        address: '0xaca92e438df0b2401ff60da7e4337b687a2435da',
        symbol: 'mUSD',
        name: 'MetaMask USD',
        decimals: 6,
        chainId: ethChainId,
      };

      const { result } = renderHookWithProvider(
        () => useAutoUpdateDestToken(),
        {
          state: {
            ...initialState,
            bridge: {
              ...initialState.bridge,
              destToken: mockPolygonToken, // Currently on Polygon
              isDestTokenManuallySet: false,
            },
          },
        },
      );

      // Change source to Ethereum with a token that matches default dest
      result.current.autoUpdateDestToken(sourceTokenMatchingDefault);

      // Should fall back to native ETH since default dest (mUSD) matches source
      expect(setDestTokenSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          symbol: 'ETH',
          chainId: ethChainId,
          address: '0x0000000000000000000000000000000000000000',
        }),
      );
    });
  });

  describe('when chain has no default dest token configured', () => {
    it('falls back to native token when getDefaultDestToken returns undefined', () => {
      const setDestTokenSpy = jest.spyOn(bridgeSlice, 'setDestToken');

      // Mock getDefaultDestToken to return undefined
      const getDefaultDestTokenSpy = jest
        .spyOn(tokenUtils, 'getDefaultDestToken')
        .mockReturnValue(undefined);

      // Mock getNativeSourceToken to return a predictable native token
      const mockNativeToken: BridgeToken = {
        address: '0x0000000000000000000000000000000000000000',
        symbol: 'NATIVE',
        name: 'Native Token',
        decimals: 18,
        chainId: optimismChainId,
      };
      const getNativeSourceTokenSpy = jest
        .spyOn(tokenUtils, 'getNativeSourceToken')
        .mockReturnValue(mockNativeToken);

      const mockSourceToken: BridgeToken = {
        address: '0x0000000000000000000000000000000000000001',
        symbol: 'SOME_TOKEN',
        name: 'Some Token',
        decimals: 18,
        chainId: optimismChainId,
      };

      const { result } = renderHookWithProvider(
        () => useAutoUpdateDestToken(),
        {
          state: {
            ...initialState,
            bridge: {
              ...initialState.bridge,
              destToken: mockEthToken, // Currently on Ethereum (different chain)
              isDestTokenManuallySet: false,
            },
          },
        },
      );

      // Change source to Optimism where default returns undefined
      result.current.autoUpdateDestToken(mockSourceToken);

      // Should fall back to native token since no default exists
      expect(setDestTokenSpy).toHaveBeenCalledWith(mockNativeToken);

      // Cleanup
      getDefaultDestTokenSpy.mockRestore();
      getNativeSourceTokenSpy.mockRestore();
    });
  });

  describe('cross-chain scenarios', () => {
    it('updates dest when switching from EVM to Solana source', () => {
      const setDestTokenSpy = jest.spyOn(bridgeSlice, 'setDestToken');

      const { result } = renderHookWithProvider(
        () => useAutoUpdateDestToken(),
        {
          state: {
            ...initialState,
            bridge: {
              ...initialState.bridge,
              destToken: mockEthToken, // Currently on Ethereum
              isDestTokenManuallySet: false,
            },
          },
        },
      );

      // Change source to Solana
      result.current.autoUpdateDestToken(mockSolToken);

      // Dest should be updated to Solana's default (USDC)
      expect(setDestTokenSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          chainId: SolScope.Mainnet,
        }),
      );
    });

    it('updates dest when switching from Solana to EVM source', () => {
      const setDestTokenSpy = jest.spyOn(bridgeSlice, 'setDestToken');

      const { result } = renderHookWithProvider(
        () => useAutoUpdateDestToken(),
        {
          state: {
            ...initialState,
            bridge: {
              ...initialState.bridge,
              destToken: mockSolToken, // Currently on Solana
              isDestTokenManuallySet: false,
            },
          },
        },
      );

      // Change source to Ethereum
      result.current.autoUpdateDestToken(mockEthToken);

      // Dest should be updated to Ethereum's default (mUSD)
      expect(setDestTokenSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          chainId: ethChainId,
        }),
      );
    });
  });
});
