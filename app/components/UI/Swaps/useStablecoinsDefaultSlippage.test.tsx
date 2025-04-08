import { renderHookWithProvider } from '../../../util/test/renderWithProvider';
import { useStablecoinsDefaultSlippage } from './useStablecoinsDefaultSlippage';
import { Hex } from '@metamask/utils';
import { swapsUtils } from '@metamask/swaps-controller';

describe('useStablecoinsDefaultSlippage', () => {
  const mockSetSlippage = jest.fn();

  const initialState = {
    engine: {
      backgroundState: {
        NetworkController: {
          selectedNetworkClientId: '1',
          networkConfigurations: {
            '0x1': {
              chainId: '0x1',
              ticker: 'ETH',
              nickname: 'Ethereum Mainnet',
            },
          },
          providerConfig: {
            chainId: '0x1',
          },
        },
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should set default slippage when both tokens are stablecoins on Ethereum', () => {
    renderHookWithProvider(
      () =>
        useStablecoinsDefaultSlippage({
          sourceTokenAddress: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC
          destTokenAddress: '0xdac17f958d2ee523a2206206994597c13d831ec7', // USDT
          chainId: swapsUtils.ETH_CHAIN_ID as Hex,
          setSlippage: mockSetSlippage,
        }),
      { state: initialState },
    );

    expect(mockSetSlippage).toHaveBeenCalledWith(0.5);
  });

  it('should set default slippage when both tokens are stablecoins with checksum addresses', () => {
    renderHookWithProvider(
      () =>
        useStablecoinsDefaultSlippage({
          sourceTokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC (checksum)
          destTokenAddress: '0xdAC17F958D2ee523a2206206994597C13D831ec7', // USDT (checksum)
          chainId: swapsUtils.ETH_CHAIN_ID as Hex,
          setSlippage: mockSetSlippage,
        }),
      { state: initialState },
    );

    expect(mockSetSlippage).toHaveBeenCalledWith(0.5);
  });

  it('should set default slippage when both tokens are stablecoins on Polygon', () => {
    renderHookWithProvider(
      () =>
        useStablecoinsDefaultSlippage({
          sourceTokenAddress: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', // USDC
          destTokenAddress: '0xc2132d05d31c914a87c6611c10748aeb04b58e8f', // USDT
          chainId: swapsUtils.POLYGON_CHAIN_ID as Hex,
          setSlippage: mockSetSlippage,
        }),
      { state: initialState },
    );

    expect(mockSetSlippage).toHaveBeenCalledWith(0.5);
  });

  it('should not set slippage when source token is not on the list of stablecoins', () => {
    renderHookWithProvider(
      () =>
        useStablecoinsDefaultSlippage({
          sourceTokenAddress: '0x6b175474e89094c44da98b954eedeac495271d0f', // DAI (not in the list)
          destTokenAddress: '0xdac17f958d2ee523a2206206994597c13d831ec7', // USDT
          chainId: swapsUtils.ETH_CHAIN_ID as Hex,
          setSlippage: mockSetSlippage,
        }),
      { state: initialState },
    );

    expect(mockSetSlippage).not.toHaveBeenCalled();
  });

  it('should not set slippage when destination token is not on the list of stablecoins', () => {
    renderHookWithProvider(
      () =>
        useStablecoinsDefaultSlippage({
          sourceTokenAddress: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC
          destTokenAddress: '0x6b175474e89094c44da98b954eedeac495271d0f', // DAI (not in the list)
          chainId: swapsUtils.ETH_CHAIN_ID as Hex,
          setSlippage: mockSetSlippage,
        }),
      { state: initialState },
    );

    expect(mockSetSlippage).not.toHaveBeenCalled();
  });

  it('should not set slippage when chain ID is not supported', () => {
    renderHookWithProvider(
      () =>
        useStablecoinsDefaultSlippage({
          sourceTokenAddress: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC
          destTokenAddress: '0xdac17f958d2ee523a2206206994597c13d831ec7', // USDT
          chainId: '0x9999' as Hex, // Unsupported chain ID
          setSlippage: mockSetSlippage,
        }),
      { state: initialState },
    );

    expect(mockSetSlippage).not.toHaveBeenCalled();
  });

  it('should not set slippage when source token address is missing', () => {
    renderHookWithProvider(
      () =>
        useStablecoinsDefaultSlippage({
          destTokenAddress: '0xdac17f958d2ee523a2206206994597c13d831ec7', // USDT
          chainId: swapsUtils.ETH_CHAIN_ID as Hex,
          setSlippage: mockSetSlippage,
        }),
      { state: initialState },
    );

    expect(mockSetSlippage).not.toHaveBeenCalled();
  });

  it('should not set slippage when destination token address is missing', () => {
    renderHookWithProvider(
      () =>
        useStablecoinsDefaultSlippage({
          sourceTokenAddress: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC
          chainId: swapsUtils.ETH_CHAIN_ID as Hex,
          setSlippage: mockSetSlippage,
        }),
      { state: initialState },
    );

    expect(mockSetSlippage).not.toHaveBeenCalled();
  });

  it('should call setSlippage only once when dependencies change', () => {
    // First render with stablecoins
    const { rerender } = renderHookWithProvider(
      () =>
        useStablecoinsDefaultSlippage({
          sourceTokenAddress: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC
          destTokenAddress: '0xdac17f958d2ee523a2206206994597c13d831ec7', // USDT
          chainId: swapsUtils.ETH_CHAIN_ID as Hex,
          setSlippage: mockSetSlippage,
        }),
      { state: initialState },
    );

    // First render should call setSlippage
    expect(mockSetSlippage).toHaveBeenCalledTimes(1);

    // Clear the mock to track subsequent calls
    mockSetSlippage.mockClear();

    // Rerender with the same props should not call setSlippage again
    rerender({});

    expect(mockSetSlippage).not.toHaveBeenCalled();

    // Create a new hook instance with different props
    renderHookWithProvider(
      () =>
        useStablecoinsDefaultSlippage({
          sourceTokenAddress: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC
          destTokenAddress: '0x2791bca1f2de4661ed88a30c99a7a9449aa84174', // USDC.e on Polygon
          chainId: swapsUtils.ETH_CHAIN_ID as Hex,
          setSlippage: mockSetSlippage,
        }),
      { state: initialState },
    );

    // Should not call setSlippage because tokens are on different chains
    expect(mockSetSlippage).not.toHaveBeenCalled();
  });
});
