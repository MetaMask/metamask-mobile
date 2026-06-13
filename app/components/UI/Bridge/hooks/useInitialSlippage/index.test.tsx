import { useInitialSlippage } from './';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import AppConstants from '../../../../../core/AppConstants';
// eslint-disable-next-line import-x/no-namespace
import * as bridgeSlice from '../../../../../core/redux/slices/bridge';
import { mockBridgeReducerState } from '../../_mocks_/bridgeReducerState';
import { BridgeToken } from '../../types';

// --- Token fixtures --------------------------------------------------------

const SOLANA_CHAIN_ID = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';

const SOL_NATIVE: BridgeToken = {
  address: '0x0000000000000000000000000000000000000000',
  decimals: 9,
  image: '',
  name: 'Solana',
  symbol: 'SOL',
  chainId: SOLANA_CHAIN_ID,
};

const USDC_SOL: BridgeToken = {
  address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  decimals: 6,
  image: '',
  name: 'USD Coin',
  symbol: 'USDC',
  chainId: SOLANA_CHAIN_ID,
};

const ETH_NATIVE: BridgeToken = {
  address: '0x0000000000000000000000000000000000000000',
  decimals: 18,
  image: '',
  name: 'Ethereum',
  symbol: 'ETH',
  chainId: '0x1',
};

const USDC_ETH: BridgeToken = {
  address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  decimals: 6,
  image: '',
  name: 'USD Coin',
  symbol: 'USDC',
  chainId: '0x1',
};

const USDT_ETH: BridgeToken = {
  address: '0xdac17f958d2ee523a2206206994597c13d831ec7',
  decimals: 6,
  image: '',
  name: 'Tether',
  symbol: 'USDT',
  chainId: '0x1',
};

const APPLE_RWA_ETH: BridgeToken = {
  address: '0x1111111111111111111111111111111111111111',
  decimals: 18,
  image: '',
  name: 'Apple (Ondo Tokenized)',
  symbol: 'AAPLON',
  chainId: '0x1',
  rwaData: {
    ticker: 'AAPL',
    instrumentType: 'stock',
  },
};

const TESLA_RWA_ETH: BridgeToken = {
  address: '0x2222222222222222222222222222222222222222',
  decimals: 18,
  image: '',
  name: 'Tesla (Ondo Tokenized)',
  symbol: 'TSLAON',
  chainId: '0x1',
  rwaData: {
    ticker: 'TSLA',
    instrumentType: 'stock',
  },
};

const USDC_POLYGON: BridgeToken = {
  address: '0x3c499c542cef5e3811e1192ce70d8cc03d5c3359',
  decimals: 6,
  image: '',
  name: 'USD Coin',
  symbol: 'USDC',
  chainId: '0x89',
};

// --- Test helpers ----------------------------------------------------------

const renderWithTokens = (
  sourceToken: BridgeToken | undefined,
  destToken: BridgeToken | undefined,
  { rwaEnabled = true }: { rwaEnabled?: boolean } = {},
) =>
  renderHookWithProvider(() => useInitialSlippage(), {
    state: {
      bridge: {
        ...mockBridgeReducerState,
        sourceToken,
        destToken,
      },
      engine: {
        backgroundState: {
          RemoteFeatureFlagController: {
            remoteFeatureFlags: {
              rwaTokensEnabled: rwaEnabled,
            },
            cacheTimestamp: 0,
          },
        },
      },
    },
  });

describe('useInitialSlippage', () => {
  let setSlippageSpy: jest.SpyInstance;

  beforeEach(() => {
    setSlippageSpy = jest.spyOn(bridgeSlice, 'setSlippage');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('when the swap is on Solana', () => {
    it('uses the Solana default slippage (undefined → dynamic provider slippage)', () => {
      renderWithTokens(SOL_NATIVE, USDC_SOL);

      expect(setSlippageSpy).toHaveBeenCalledWith(
        AppConstants.SWAPS.DEFAULT_SLIPPAGE_SOLANA,
      );
      expect(AppConstants.SWAPS.DEFAULT_SLIPPAGE_SOLANA).toBeUndefined();
    });
  });

  describe('when the swap is an EVM same-chain swap', () => {
    it('uses the stablecoin default slippage when both tokens are stablecoins', () => {
      renderWithTokens(USDC_ETH, USDT_ETH);

      expect(setSlippageSpy).toHaveBeenCalledWith(
        AppConstants.SWAPS.DEFAULT_SLIPPAGE_STABLECOINS.toString(),
      );
    });

    it('uses the RWA default slippage when the source token is an RWA', () => {
      renderWithTokens(APPLE_RWA_ETH, ETH_NATIVE);

      expect(setSlippageSpy).toHaveBeenCalledWith(
        AppConstants.SWAPS.DEFAULT_SLIPPAGE_RWA,
      );
      expect(AppConstants.SWAPS.DEFAULT_SLIPPAGE_RWA).toBeUndefined();
    });

    it('uses the RWA default slippage when the destination token is an RWA', () => {
      renderWithTokens(ETH_NATIVE, APPLE_RWA_ETH);

      expect(setSlippageSpy).toHaveBeenCalledWith(
        AppConstants.SWAPS.DEFAULT_SLIPPAGE_RWA,
      );
    });

    it('uses the RWA default slippage when both tokens are RWAs', () => {
      renderWithTokens(APPLE_RWA_ETH, TESLA_RWA_ETH);

      expect(setSlippageSpy).toHaveBeenCalledWith(
        AppConstants.SWAPS.DEFAULT_SLIPPAGE_RWA,
      );
    });

    it('falls back to the default EVM slippage for an RWA pair when the RWA feature flag is disabled', () => {
      renderWithTokens(APPLE_RWA_ETH, ETH_NATIVE, { rwaEnabled: false });

      expect(setSlippageSpy).toHaveBeenCalledWith(
        AppConstants.SWAPS.DEFAULT_SLIPPAGE.toString(),
      );
    });

    it('uses the default EVM slippage for any other token pair', () => {
      renderWithTokens(ETH_NATIVE, {
        ...ETH_NATIVE,
        address: '0x3333333333333333333333333333333333333333',
        symbol: 'FOO',
      });

      expect(setSlippageSpy).toHaveBeenCalledWith(
        AppConstants.SWAPS.DEFAULT_SLIPPAGE.toString(),
      );
    });
  });

  describe('when the swap is a cross-chain bridge', () => {
    it('uses the bridge default slippage', () => {
      renderWithTokens(ETH_NATIVE, USDC_POLYGON);

      expect(setSlippageSpy).toHaveBeenCalledWith(
        AppConstants.SWAPS.DEFAULT_SLIPPAGE_BRIDGE.toString(),
      );
    });
  });
});
