import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { waitFor } from '@testing-library/react-native';
import { useInitialSlippage } from '.';
import {
  selectIsSolanaSwap,
  selectIsRwaSwap,
  selectIsBridge,
  selectIsEvmSwap,
  selectSourceToken,
  selectDestToken,
  setSlippage,
} from '../../../../../core/redux/slices/bridge';
import AppConstants from '../../../../../core/AppConstants';
import { initialState } from '../../_mocks_/initialState';

jest.mock('../../../../../core/redux/slices/bridge', () => {
  const actual = jest.requireActual('../../../../../core/redux/slices/bridge');
  return {
    __esModule: true,
    ...actual,
    default: actual.default,
    setSlippage: jest.fn(actual.setSlippage),
    selectIsSolanaSwap: jest.fn(),
    selectIsRwaSwap: jest.fn(),
    selectIsBridge: jest.fn(),
    selectIsEvmSwap: jest.fn(),
    selectSourceToken: jest.fn(),
    selectDestToken: jest.fn(),
  };
});

const mockSelectIsSolanaSwap = selectIsSolanaSwap as jest.MockedFunction<
  typeof selectIsSolanaSwap
>;
const mockSelectIsRwaSwap = selectIsRwaSwap as jest.MockedFunction<
  typeof selectIsRwaSwap
>;
const mockSelectIsBridge = selectIsBridge as jest.MockedFunction<
  typeof selectIsBridge
>;
const mockSelectIsEvmSwap = selectIsEvmSwap as jest.MockedFunction<
  typeof selectIsEvmSwap
>;
const mockSelectSourceToken = selectSourceToken as jest.MockedFunction<
  typeof selectSourceToken
>;
const mockSelectDestToken = selectDestToken as jest.MockedFunction<
  typeof selectDestToken
>;

describe('useInitialSlippage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSelectIsSolanaSwap.mockReturnValue(false as never);
    mockSelectIsRwaSwap.mockReturnValue(false as never);
    mockSelectIsBridge.mockReturnValue(false as never);
    mockSelectIsEvmSwap.mockReturnValue(false as never);
    mockSelectSourceToken.mockReturnValue(undefined as never);
    mockSelectDestToken.mockReturnValue(undefined as never);
  });

  describe('Solana swap', () => {
    it('dispatches DEFAULT_SLIPPAGE_SOLANA when isSolanaSwap is true', async () => {
      mockSelectIsSolanaSwap.mockReturnValue(true as never);

      renderHookWithProvider(() => useInitialSlippage(), {
        state: initialState,
      });

      await waitFor(() => {
        expect(setSlippage).toHaveBeenCalledWith(
          AppConstants.SWAPS.DEFAULT_SLIPPAGE_SOLANA,
        );
      });
    });
  });

  describe('RWA swap', () => {
    it('dispatches DEFAULT_SLIPPAGE_RWA (undefined) when isRwaSwap is true', async () => {
      mockSelectIsRwaSwap.mockReturnValue(true as never);

      renderHookWithProvider(() => useInitialSlippage(), {
        state: initialState,
      });

      await waitFor(() => {
        expect(setSlippage).toHaveBeenCalledWith(
          AppConstants.SWAPS.DEFAULT_SLIPPAGE_RWA,
        );
      });
    });

    it('Solana swap takes priority over RWA swap — setSlippage called exactly once', async () => {
      mockSelectIsSolanaSwap.mockReturnValue(true as never);
      mockSelectIsRwaSwap.mockReturnValue(true as never);

      renderHookWithProvider(() => useInitialSlippage(), {
        state: initialState,
      });

      await waitFor(() => {
        // The Solana branch returns early, so the RWA branch never runs
        expect(setSlippage).toHaveBeenCalledTimes(1);
        expect(setSlippage).toHaveBeenCalledWith(
          AppConstants.SWAPS.DEFAULT_SLIPPAGE_SOLANA,
        );
      });
    });
  });

  describe('EVM swap', () => {
    it('dispatches DEFAULT_SLIPPAGE for a regular EVM swap', async () => {
      mockSelectIsEvmSwap.mockReturnValue(true as never);
      mockSelectSourceToken.mockReturnValue({
        address: '0xaaaa',
        chainId: '0x1',
        decimals: 18,
        symbol: 'TKA',
      } as never);
      mockSelectDestToken.mockReturnValue({
        address: '0xbbbb',
        chainId: '0x1',
        decimals: 6,
        symbol: 'USDC',
      } as never);

      renderHookWithProvider(() => useInitialSlippage(), {
        state: initialState,
      });

      await waitFor(() => {
        expect(setSlippage).toHaveBeenCalledWith(
          AppConstants.SWAPS.DEFAULT_SLIPPAGE.toString(),
        );
      });
    });
  });

  describe('Bridge', () => {
    it('dispatches DEFAULT_SLIPPAGE_BRIDGE when isBridge is true', async () => {
      mockSelectIsBridge.mockReturnValue(true as never);

      renderHookWithProvider(() => useInitialSlippage(), {
        state: initialState,
      });

      await waitFor(() => {
        expect(setSlippage).toHaveBeenCalledWith(
          AppConstants.SWAPS.DEFAULT_SLIPPAGE_BRIDGE.toString(),
        );
      });
    });
  });
});
