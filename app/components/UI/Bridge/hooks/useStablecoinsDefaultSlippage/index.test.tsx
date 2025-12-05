import { useStablecoinsDefaultSlippage, handleEvmStablecoinSlippage } from './';
import { Hex } from '@metamask/utils';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import AppConstants from '../../../../../core/AppConstants';

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

  it('sets default slippage when both tokens are stablecoins on Ethereum', () => {
    renderHookWithProvider(
      () =>
        useStablecoinsDefaultSlippage({
          sourceTokenAddress: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC
          destTokenAddress: '0xdac17f958d2ee523a2206206994597c13d831ec7', // USDT
          chainId: CHAIN_IDS.MAINNET,
          setSlippage: mockSetSlippage,
        }),
      { state: initialState },
    );

    expect(mockSetSlippage).toHaveBeenCalledWith(0.5);
  });

  it('sets default slippage when both tokens are stablecoins with checksum addresses', () => {
    renderHookWithProvider(
      () =>
        useStablecoinsDefaultSlippage({
          sourceTokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC (checksum)
          destTokenAddress: '0xdAC17F958D2ee523a2206206994597C13D831ec7', // USDT (checksum)
          chainId: CHAIN_IDS.MAINNET as Hex,
          setSlippage: mockSetSlippage,
        }),
      { state: initialState },
    );

    expect(mockSetSlippage).toHaveBeenCalledWith(0.5);
  });

  it('sets default slippage when both tokens are stablecoins on Polygon', () => {
    renderHookWithProvider(
      () =>
        useStablecoinsDefaultSlippage({
          sourceTokenAddress: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', // USDC
          destTokenAddress: '0xc2132d05d31c914a87c6611c10748aeb04b58e8f', // USDT
          chainId: CHAIN_IDS.POLYGON as Hex,
          setSlippage: mockSetSlippage,
        }),
      { state: initialState },
    );

    expect(mockSetSlippage).toHaveBeenCalledWith(0.5);
  });

  it('does not set slippage when source token is not on the list of stablecoins', () => {
    renderHookWithProvider(
      () =>
        useStablecoinsDefaultSlippage({
          sourceTokenAddress: '0x123', // Non-stablecoin
          destTokenAddress: '0xdac17f958d2ee523a2206206994597c13d831ec7', // USDT
          chainId: CHAIN_IDS.MAINNET as Hex,
          setSlippage: mockSetSlippage,
        }),
      { state: initialState },
    );

    expect(mockSetSlippage).not.toHaveBeenCalled();
  });

  it('does not set slippage when destination token is not on the list of stablecoins', () => {
    renderHookWithProvider(
      () =>
        useStablecoinsDefaultSlippage({
          sourceTokenAddress: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC
          destTokenAddress: '0x123', // Non-stablecoin
          chainId: CHAIN_IDS.MAINNET as Hex,
          setSlippage: mockSetSlippage,
        }),
      { state: initialState },
    );

    expect(mockSetSlippage).not.toHaveBeenCalled();
  });

  it('does not set slippage when chain ID is not supported', () => {
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

  it('does not set slippage when source token address is missing', () => {
    renderHookWithProvider(
      () =>
        useStablecoinsDefaultSlippage({
          destTokenAddress: '0xdac17f958d2ee523a2206206994597c13d831ec7', // USDT
          chainId: CHAIN_IDS.MAINNET,
          setSlippage: mockSetSlippage,
        }),
      { state: initialState },
    );

    expect(mockSetSlippage).not.toHaveBeenCalled();
  });

  it('does not set slippage when destination token address is missing', () => {
    renderHookWithProvider(
      () =>
        useStablecoinsDefaultSlippage({
          sourceTokenAddress: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC
          chainId: CHAIN_IDS.MAINNET,
          setSlippage: mockSetSlippage,
        }),
      { state: initialState },
    );

    expect(mockSetSlippage).not.toHaveBeenCalled();
  });
});

describe('handleStablecoinSlippage', () => {
  const mockSetSlippage = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sets stablecoin slippage when both tokens are stablecoins', () => {
    handleEvmStablecoinSlippage({
      sourceTokenAddress: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC
      destTokenAddress: '0xdac17f958d2ee523a2206206994597c13d831ec7', // USDT
      chainId: CHAIN_IDS.MAINNET,
      setSlippage: mockSetSlippage,
    });

    expect(mockSetSlippage).toHaveBeenCalledWith(
      AppConstants.SWAPS.DEFAULT_SLIPPAGE_STABLECOINS,
    );
  });

  it('does not set slippage when source token is not on the list of stablecoins', () => {
    handleEvmStablecoinSlippage({
      sourceTokenAddress: '0x123', // Non-stablecoin
      destTokenAddress: '0xdac17f958d2ee523a2206206994597c13d831ec7', // USDT
      chainId: CHAIN_IDS.MAINNET,
      setSlippage: mockSetSlippage,
    });

    expect(mockSetSlippage).not.toHaveBeenCalled();
  });

  it('does not set slippage when destination token is not on the list of stablecoins', () => {
    handleEvmStablecoinSlippage({
      sourceTokenAddress: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC
      destTokenAddress: '0x123', // Non-stablecoin
      chainId: CHAIN_IDS.MAINNET,
      setSlippage: mockSetSlippage,
    });

    expect(mockSetSlippage).not.toHaveBeenCalled();
  });

  it('does not set slippage when chain ID is not supported', () => {
    handleEvmStablecoinSlippage({
      sourceTokenAddress: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC
      destTokenAddress: '0xdac17f958d2ee523a2206206994597c13d831ec7', // USDT
      chainId: '0x9999' as Hex, // Unsupported chain ID
      setSlippage: mockSetSlippage,
    });

    expect(mockSetSlippage).not.toHaveBeenCalled();
  });

  it('does not set slippage when source token address is missing', () => {
    handleEvmStablecoinSlippage({
      destTokenAddress: '0xdac17f958d2ee523a2206206994597c13d831ec7', // USDT
      chainId: CHAIN_IDS.MAINNET,
      setSlippage: mockSetSlippage,
    });

    expect(mockSetSlippage).not.toHaveBeenCalled();
  });

  it('does not set slippage when destination token address is missing', () => {
    handleEvmStablecoinSlippage({
      sourceTokenAddress: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC
      chainId: CHAIN_IDS.MAINNET,
      setSlippage: mockSetSlippage,
    });

    expect(mockSetSlippage).not.toHaveBeenCalled();
  });

  it('resets slippage to default when transitioning from stablecoin pair to non-stablecoin pair', () => {
    handleEvmStablecoinSlippage({
      sourceTokenAddress: '0x123', // Non-stablecoin
      destTokenAddress: '0x456', // Non-stablecoin
      chainId: CHAIN_IDS.MAINNET,
      setSlippage: mockSetSlippage,
      prevSourceTokenAddress: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC
      prevDestTokenAddress: '0xdac17f958d2ee523a2206206994597c13d831ec7', // USDT
    });

    expect(mockSetSlippage).toHaveBeenCalledWith(
      AppConstants.SWAPS.DEFAULT_SLIPPAGE,
    );
  });

  it('does not reset slippage when transitioning from non-stablecoin pair to another non-stablecoin pair', () => {
    handleEvmStablecoinSlippage({
      sourceTokenAddress: '0x6b175474e89094c44da98b954eedeac495271d0f', // DAI
      destTokenAddress: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599', // WBTC
      chainId: CHAIN_IDS.MAINNET,
      setSlippage: mockSetSlippage,
      prevSourceTokenAddress: '0x123', // Non-stablecoin
      prevDestTokenAddress: '0xdac17f958d2ee523a2206206994597c13d831ec7', // USDT
    });

    expect(mockSetSlippage).not.toHaveBeenCalled();
  });

  it('sets default slippage when transitioning from non-stablecoin pair to stablecoin pair', () => {
    handleEvmStablecoinSlippage({
      sourceTokenAddress: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC
      destTokenAddress: '0xdac17f958d2ee523a2206206994597c13d831ec7', // USDT
      chainId: CHAIN_IDS.MAINNET,
      setSlippage: mockSetSlippage,
      prevSourceTokenAddress: '0x123', // Non-stablecoin
      prevDestTokenAddress: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599', // WBTC
    });

    expect(mockSetSlippage).toHaveBeenCalledWith(
      AppConstants.SWAPS.DEFAULT_SLIPPAGE_STABLECOINS,
    );
  });

  it('handles transition from stablecoin pair to missing token addresses', () => {
    handleEvmStablecoinSlippage({
      sourceTokenAddress: undefined,
      destTokenAddress: undefined,
      chainId: CHAIN_IDS.MAINNET,
      setSlippage: mockSetSlippage,
      prevSourceTokenAddress: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC
      prevDestTokenAddress: '0xdac17f958d2ee523a2206206994597c13d831ec7', // USDT
    });

    expect(mockSetSlippage).not.toHaveBeenCalled();
  });

  it('does not reset slippage when previous token addresses are missing', () => {
    handleEvmStablecoinSlippage({
      sourceTokenAddress: '0x123', // Non-stablecoin
      destTokenAddress: '0x456', // Non-stablecoin
      chainId: CHAIN_IDS.MAINNET,
      setSlippage: mockSetSlippage,
      prevSourceTokenAddress: undefined,
      prevDestTokenAddress: undefined,
    });

    expect(mockSetSlippage).not.toHaveBeenCalled();
  });
});
