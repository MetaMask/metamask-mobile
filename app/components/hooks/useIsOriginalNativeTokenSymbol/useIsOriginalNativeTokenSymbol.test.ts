import { renderHook, act } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import useIsOriginalNativeTokenSymbol from './useIsOriginalNativeTokenSymbol';
import { backgroundState } from '../../../../app/util/test/initial-root-state';
import { useSafeChains } from '../useSafeChains';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

jest.mock('../useSafeChains', () => ({
  useSafeChains: jest.fn(),
}));

describe('useIsOriginalNativeTokenSymbol', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockSelectorState = (state: any) => {
    (useSelector as jest.MockedFn<typeof useSelector>).mockImplementation(
      (selector) => selector(state),
    );
  };
  it('returns true when native symbol matches the ticker', async () => {
    mockSelectorState({
      engine: {
        backgroundState: {
          ...backgroundState,
          PreferencesController: {
            useSafeChainsListValidation: true,
          },
        },
      },
    });

    const safeChainsList = [
      {
        chainId: 1,
        nativeCurrency: {
          symbol: 'ETH',
        },
        name: 'Ethereum',
        rpc: [],
      },
    ];

    (useSafeChains as jest.Mock).mockReturnValue({
      safeChains: safeChainsList,
    });

    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let result: any;

    await act(async () => {
      result = renderHook(() =>
        useIsOriginalNativeTokenSymbol('0x1', 'ETH', 'mainnet'),
      );
    });

    expect(result?.result.current).toBe(true);
  });

  it('returns false when native symbol does not match the ticker', async () => {
    mockSelectorState({
      engine: {
        backgroundState: {
          ...backgroundState,
          PreferencesController: {
            useSafeChainsListValidation: true,
          },
        },
      },
    });

    const safeChainsList = [
      {
        chainId: 314,
        nativeCurrency: {
          symbol: 'BTC',
        },
        name: 'Filecoin',
        rpc: [],
      },
    ];

    (useSafeChains as jest.Mock).mockReturnValue({
      safeChains: safeChainsList,
    });

    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let result: any;

    await act(async () => {
      result = renderHook(() =>
        useIsOriginalNativeTokenSymbol('314', 'FIL', 'mainnet'),
      );
    });

    expect(result.result.current).toBe(false);
  });

  it('returns false when fetch chain list throws an error', async () => {
    mockSelectorState({
      engine: {
        backgroundState: {
          ...backgroundState,
          PreferencesController: {
            useSafeChainsListValidation: true,
          },
        },
      },
    });

    (useSafeChains as jest.Mock).mockReturnValue({
      error: new Error('error'),
    });

    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let result: any;

    await act(async () => {
      result = renderHook(() =>
        useIsOriginalNativeTokenSymbol('314', 'FIL', 'mainnet'),
      );
    });

    expect(result.result.current).toBe(false);
  });

  it('returns true when chainId is in CURRENCY_SYMBOL_BY_CHAIN_ID', async () => {
    mockSelectorState({
      engine: {
        backgroundState: {
          ...backgroundState,
          PreferencesController: {
            useSafeChainsListValidation: true,
          },
        },
      },
    });

    const safeChainsList = [
      {
        chainId: 1,
        nativeCurrency: {
          symbol: 'BTC',
        },
        name: 'Ethereum',
        rpc: [],
      },
    ];

    (useSafeChains as jest.Mock).mockReturnValue({
      safeChains: safeChainsList,
    });

    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let result: any;

    await act(async () => {
      result = renderHook(() =>
        useIsOriginalNativeTokenSymbol('0x5', 'GoerliETH', 'goerli'),
      );
    });

    expect(result.result.current).toBe(true);
  });

  it('returns true when chainId is not in CURRENCY_SYMBOL_BY_CHAIN_ID and matches safe chains', async () => {
    mockSelectorState({
      engine: {
        backgroundState: {
          ...backgroundState,
          PreferencesController: {
            useSafeChainsListValidation: true,
          },
        },
      },
    });

    const safeChainsList = [
      {
        chainId: 314,
        nativeCurrency: {
          symbol: 'FIL',
        },
        name: 'Filecoin',
        rpc: [],
      },
    ];

    (useSafeChains as jest.Mock).mockReturnValue({
      safeChains: safeChainsList,
    });

    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let result: any;

    await act(async () => {
      result = renderHook(() =>
        useIsOriginalNativeTokenSymbol('314', 'FIL', 'mainnet'),
      );
    });

    expect(result.result.current).toBe(true);
  });

  it('returns true when chain safe validation is disabled', async () => {
    mockSelectorState({
      engine: {
        backgroundState: {
          ...backgroundState,
          PreferencesController: {
            useSafeChainsListValidation: false,
          },
        },
      },
    });

    (useSafeChains as jest.Mock).mockReturnValue({
      safeChains: [],
    });

    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let result: any;

    await act(async () => {
      result = renderHook(() =>
        useIsOriginalNativeTokenSymbol('5', 'ETH', 'goerli'),
      );
    });

    expect(result.result.current).toBe(true);
  });

  it('returns true for LineaGoerli testnet', async () => {
    mockSelectorState({
      engine: {
        backgroundState: {
          ...backgroundState,
          PreferencesController: {
            useSafeChainsListValidation: true,
          },
        },
      },
    });

    const safeChainsList = [
      {
        chainId: 1,
        nativeCurrency: {
          symbol: 'BTC',
        },
        name: 'Bitcoin',
        rpc: [],
      },
    ];

    (useSafeChains as jest.Mock).mockReturnValue({
      safeChains: safeChainsList,
    });

    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let result: any;

    await act(async () => {
      result = renderHook(() =>
        useIsOriginalNativeTokenSymbol('0xe704', 'LineaETH', 'linea'),
      );
    });

    expect(result.result.current).toBe(true);
  });

  it('returns null when safe chains list is loading', async () => {
    mockSelectorState({
      engine: {
        backgroundState: {
          ...backgroundState,
          PreferencesController: {
            useSafeChainsListValidation: true,
          },
        },
      },
    });

    (useSafeChains as jest.Mock).mockReturnValue({
      safeChains: [],
    });

    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let result: any;

    await act(async () => {
      result = renderHook(() =>
        useIsOriginalNativeTokenSymbol('314', 'FIL', 'mainnet'),
      );
    });

    expect(result.result.current).toBe(null);
  });
});
