import { initialState } from '../../_mocks_/initialState';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { useSwitchTokens } from '.';
import { waitFor } from '@testing-library/react-native';
import { BridgeToken } from '../../types';
import { Hex } from '@metamask/utils';
import { SolScope } from '@metamask/keyring-api';
// eslint-disable-next-line import/no-namespace
import * as bridgeSlice from '../../../../../core/redux/slices/bridge';
import Engine from '../../../../../core/Engine';

// Mock useSwitchNetworks
const mockOnSetRpcTarget = jest.fn();
const mockOnNonEvmNetworkChange = jest.fn();
jest.mock('../../../../Views/NetworkSelector/useSwitchNetworks', () => ({
  useSwitchNetworks: jest.fn(() => ({
    onSetRpcTarget: mockOnSetRpcTarget,
    onNonEvmNetworkChange: mockOnNonEvmNetworkChange,
  })),
}));

describe('useSwitchTokens', () => {
  const mockEvmChainId = '0x1' as Hex;
  const mockSolanaChainId = SolScope.Mainnet;
  const mockEvmToken: BridgeToken = {
    address: '0x0000000000000000000000000000000000000001',
    symbol: 'TOKEN',
    name: 'Test Token',
    decimals: 18,
    chainId: mockEvmChainId,
  };
  const mockSolanaToken: BridgeToken = {
    address: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501',
    symbol: 'SOL',
    name: 'Solana',
    decimals: 9,
    chainId: mockSolanaChainId,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock BridgeController with resetState
    Engine.context.BridgeController = {
      resetState: jest.fn(),
    } as unknown as typeof Engine.context.BridgeController;
  });

  it('handles EVM to EVM chain switching', async () => {
    const differentEvmChainId = '0xa' as Hex;
    const differentEvmToken: BridgeToken = {
      ...mockEvmToken,
      chainId: differentEvmChainId,
    };
    const setSourceTokenSpy = jest.spyOn(bridgeSlice, 'setSourceToken');
    const setDestTokenSpy = jest.spyOn(bridgeSlice, 'setDestToken');
    const setSourceAmountSpy = jest.spyOn(bridgeSlice, 'setSourceAmount');

    const { result } = renderHookWithProvider(() => useSwitchTokens(), {
      state: {
        ...initialState,
        bridge: {
          ...initialState.bridge,
          sourceToken: mockEvmToken,
          destToken: differentEvmToken,
        },
      },
    });

    await result.current.handleSwitchTokens()();

    expect(setSourceTokenSpy).toHaveBeenCalledWith(differentEvmToken);
    expect(setDestTokenSpy).toHaveBeenCalledWith(mockEvmToken);
    expect(setSourceAmountSpy).toHaveBeenCalledWith(undefined);

    await waitFor(() => {
      expect(mockOnSetRpcTarget).toHaveBeenCalledWith({
        rpcEndpoints: [
          {
            networkClientId: 'optimismNetworkClientId',
          },
        ],
        chainId: '0xa',
        defaultRpcEndpointIndex: 0,
        name: 'Optimism',
        nativeCurrency: 'ETH',
      });
    });
  });

  it('handles EVM to Solana chain switching', async () => {
    const setSourceTokenSpy = jest.spyOn(bridgeSlice, 'setSourceToken');
    const setDestTokenSpy = jest.spyOn(bridgeSlice, 'setDestToken');
    const setSourceAmountSpy = jest.spyOn(bridgeSlice, 'setSourceAmount');
    const { result } = renderHookWithProvider(() => useSwitchTokens(), {
      state: {
        ...initialState,
        bridge: {
          ...initialState.bridge,
          sourceToken: mockEvmToken,
          destToken: mockSolanaToken,
        },
      },
    });

    await result.current.handleSwitchTokens()();

    expect(setSourceTokenSpy).toHaveBeenCalledWith(mockSolanaToken);
    expect(setDestTokenSpy).toHaveBeenCalledWith(mockEvmToken);
    expect(setSourceAmountSpy).toHaveBeenCalledWith(undefined);

    await waitFor(() => {
      expect(mockOnNonEvmNetworkChange).toHaveBeenCalledWith(mockSolanaChainId);
    });
  });

  it('handles Solana to EVM chain switching', async () => {
    const setSourceTokenSpy = jest.spyOn(bridgeSlice, 'setSourceToken');
    const setDestTokenSpy = jest.spyOn(bridgeSlice, 'setDestToken');
    const setSourceAmountSpy = jest.spyOn(bridgeSlice, 'setSourceAmount');
    const { result } = renderHookWithProvider(() => useSwitchTokens(), {
      state: {
        ...initialState,
        bridge: {
          ...initialState.bridge,
          sourceToken: mockSolanaToken,
          destToken: mockEvmToken,
        },
      },
    });

    await result.current.handleSwitchTokens()();

    expect(setSourceTokenSpy).toHaveBeenCalledWith(mockEvmToken);
    expect(setDestTokenSpy).toHaveBeenCalledWith(mockSolanaToken);
    expect(setSourceAmountSpy).toHaveBeenCalledWith(undefined);

    await waitFor(() => {
      expect(mockOnSetRpcTarget).toHaveBeenCalledWith({
        rpcEndpoints: [
          {
            networkClientId: 'mainnet',
          },
        ],
        chainId: '0x1',
        defaultRpcEndpointIndex: 0,
        name: 'Ethereum Mainnet',
        nativeCurrency: 'ETH',
      });
    });
  });

  it('does not switch networks when tokens are on the same chain', async () => {
    const setSourceTokenSpy = jest.spyOn(bridgeSlice, 'setSourceToken');
    const setDestTokenSpy = jest.spyOn(bridgeSlice, 'setDestToken');
    const setSourceAmountSpy = jest.spyOn(bridgeSlice, 'setSourceAmount');
    const sameChainToken: BridgeToken = {
      ...mockEvmToken,
      address: '0x0000000000000000000000000000000000000002',
    };

    const { result } = renderHookWithProvider(() => useSwitchTokens(), {
      state: {
        ...initialState,
        bridge: {
          ...initialState.bridge,
          sourceToken: mockEvmToken,
          destToken: sameChainToken,
        },
      },
    });

    await result.current.handleSwitchTokens()();

    expect(setSourceTokenSpy).toHaveBeenCalledWith(sameChainToken);
    expect(setDestTokenSpy).toHaveBeenCalledWith(mockEvmToken);
    expect(setSourceAmountSpy).toHaveBeenCalledWith(undefined);

    await waitFor(() => {
      expect(mockOnSetRpcTarget).not.toHaveBeenCalled();
      expect(mockOnNonEvmNetworkChange).not.toHaveBeenCalled();
    });
  });

  it('calls BridgeController.resetState when switching tokens', async () => {
    const setSourceTokenSpy = jest.spyOn(bridgeSlice, 'setSourceToken');
    const setDestTokenSpy = jest.spyOn(bridgeSlice, 'setDestToken');
    const setSourceAmountSpy = jest.spyOn(bridgeSlice, 'setSourceAmount');
    const { result } = renderHookWithProvider(() => useSwitchTokens(), {
      state: {
        ...initialState,
        bridge: {
          ...initialState.bridge,
          sourceToken: mockEvmToken,
          destToken: mockSolanaToken,
        },
      },
    });

    await result.current.handleSwitchTokens()();

    expect(Engine.context.BridgeController.resetState).toHaveBeenCalled();
    expect(setSourceTokenSpy).toHaveBeenCalledWith(mockSolanaToken);
    expect(setDestTokenSpy).toHaveBeenCalledWith(mockEvmToken);
    expect(setSourceAmountSpy).toHaveBeenCalledWith(undefined);
  });

  it('sets source amount to destination amount when provided', async () => {
    const destTokenAmount = '10.5';
    const setSourceTokenSpy = jest.spyOn(bridgeSlice, 'setSourceToken');
    const setDestTokenSpy = jest.spyOn(bridgeSlice, 'setDestToken');
    const setSourceAmountSpy = jest.spyOn(bridgeSlice, 'setSourceAmount');

    const { result } = renderHookWithProvider(() => useSwitchTokens(), {
      state: {
        ...initialState,
        bridge: {
          ...initialState.bridge,
          sourceToken: mockEvmToken,
          destToken: mockSolanaToken,
        },
      },
    });

    await result.current.handleSwitchTokens(destTokenAmount)();

    expect(setSourceTokenSpy).toHaveBeenCalledWith(mockSolanaToken);
    expect(setDestTokenSpy).toHaveBeenCalledWith(mockEvmToken);
    expect(setSourceAmountSpy).toHaveBeenCalledWith(destTokenAmount);
  });

  it('clears source amount when destination amount is not provided', async () => {
    const setSourceTokenSpy = jest.spyOn(bridgeSlice, 'setSourceToken');
    const setDestTokenSpy = jest.spyOn(bridgeSlice, 'setDestToken');
    const setSourceAmountSpy = jest.spyOn(bridgeSlice, 'setSourceAmount');

    const { result } = renderHookWithProvider(() => useSwitchTokens(), {
      state: {
        ...initialState,
        bridge: {
          ...initialState.bridge,
          sourceToken: mockEvmToken,
          destToken: mockSolanaToken,
          sourceAmount: '5.0',
        },
      },
    });

    await result.current.handleSwitchTokens()();

    expect(setSourceTokenSpy).toHaveBeenCalledWith(mockSolanaToken);
    expect(setDestTokenSpy).toHaveBeenCalledWith(mockEvmToken);
    expect(setSourceAmountSpy).toHaveBeenCalledWith(undefined);
  });
});
