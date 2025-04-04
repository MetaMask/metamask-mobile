import { renderHook, act } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import useIsOriginalNativeTokenSymbol from './useIsOriginalNativeTokenSymbol';
import { backgroundState } from '../../../../app/util/test/initial-root-state';
import axios from 'axios';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
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
  it('should return the correct value when the native symbol matches the ticker', async () => {
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

    // Mock the safeChainsList response
    const safeChainsList = [
      {
        chainId: 1,
        nativeCurrency: {
          symbol: 'ETH',
        },
      },
    ];

    // Mock the fetchWithCache function to return the safeChainsList
    const spyFetch = jest.spyOn(axios, 'get').mockImplementation(() =>
      Promise.resolve({
        data: safeChainsList,
      }),
    );

    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let result: any;

    await act(async () => {
      result = renderHook(() =>
        useIsOriginalNativeTokenSymbol('0x1', 'ETH', 'mainnet'),
      );
    });

    // Expect the hook to return true when the native symbol matches the ticker
    expect(result?.result.current).toBe(true);
    expect(spyFetch).not.toHaveBeenCalled();
  });

  it('should return the correct value when the native symbol does not match the ticker', async () => {
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
    // Mock the safeChainsList response with a different native symbol
    const safeChainsList = [
      {
        chainId: 1,
        nativeCurrency: {
          symbol: 'BTC',
        },
      },
    ];

    // Mock the fetchWithCache function to return the safeChainsList
    const spyFetch = jest.spyOn(axios, 'get').mockImplementation(() =>
      Promise.resolve({
        data: safeChainsList,
      }),
    );

    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let result: any;

    await act(async () => {
      result = renderHook(() =>
        useIsOriginalNativeTokenSymbol('314', 'FIL', 'mainnet'),
      );
    });

    // Expect the hook to return false when the native symbol does not match the ticker
    expect(result.result.current).toBe(false);
    expect(spyFetch).toHaveBeenCalled();
  });

  it('should return false if fetch chain list throw an error', async () => {
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

    // Mock the fetchWithCache function to throw an error
    const spyFetch = jest.spyOn(axios, 'get').mockImplementation(() => {
      throw new Error('error');
    });

    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let result: any;

    await act(async () => {
      result = renderHook(() =>
        useIsOriginalNativeTokenSymbol('314', 'FIL', 'mainnet'),
      );
    });

    // Expect the hook to return false when the native symbol does not match the ticker
    expect(result.result.current).toBe(false);
    expect(spyFetch).toHaveBeenCalled();
  });

  it('should return the correct value when the chainId is in the CURRENCY_SYMBOL_BY_CHAIN_ID', async () => {
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

    // Mock the safeChainsList response with a different native symbol
    const safeChainsList = [
      {
        chainId: 1,
        nativeCurrency: {
          symbol: 'BTC',
        },
      },
    ];

    // Mock the fetchWithCache function to return the safeChainsList
    const spyFetch = jest.spyOn(axios, 'get').mockImplementation(() =>
      Promise.resolve({
        data: safeChainsList,
      }),
    );

    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let result: any;

    await act(async () => {
      result = renderHook(() =>
        useIsOriginalNativeTokenSymbol('0x5', 'GoerliETH', 'goerli'),
      );
    });
    // expect this to pass because the chainId is in the CURRENCY_SYMBOL_BY_CHAIN_ID
    expect(result.result.current).toBe(true);
    // expect that the chainlist API was not called
    expect(spyFetch).not.toHaveBeenCalled();
  });

  it('should return the correct value when the chainId is not in the CURRENCY_SYMBOL_BY_CHAIN_ID', async () => {
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

    // Mock the safeChainsList response
    const safeChainsList = [
      {
        chainId: 314,
        nativeCurrency: {
          symbol: 'FIL',
        },
      },
    ];

    // Mock the fetchWithCache function to return the safeChainsList
    const spyFetch = jest.spyOn(axios, 'get').mockImplementation(() =>
      Promise.resolve({
        data: safeChainsList,
      }),
    );

    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let result: any;

    await act(async () => {
      result = renderHook(() =>
        useIsOriginalNativeTokenSymbol('314', 'FIL', 'mainnet'),
      );
    });

    // Expect the hook to return true when the native symbol matches the ticker
    expect(result.result.current).toBe(true);
    // Expect the chainslist API to have been called
    expect(spyFetch).toHaveBeenCalled();
  });

  it('should return true if chain safe validation is disabled', async () => {
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

    // Mock the safeChainsList response with a different native symbol
    const safeChainsList = [
      {
        chainId: 1,
        nativeCurrency: {
          symbol: 'ETH',
        },
      },
    ];

    // Mock the fetchWithCache function to return the safeChainsList
    const spyFetch = jest.spyOn(axios, 'get').mockImplementation(() =>
      Promise.resolve({
        data: safeChainsList,
      }),
    );

    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let result: any;

    await act(async () => {
      result = renderHook(() =>
        useIsOriginalNativeTokenSymbol('5', 'ETH', 'goerli'),
      );
    });

    expect(result.result.current).toBe(true);
    expect(spyFetch).not.toHaveBeenCalled();
  });

  it('should return the correct value for LineaGoerli testnet', async () => {
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

    // Mock the safeChainsList response with a different native symbol
    const safeChainsList = [
      {
        chainId: 1,
        nativeCurrency: {
          symbol: 'BTC',
        },
      },
    ];

    // Mock the fetchWithCache function to return the safeChainsList
    const spyFetch = jest.spyOn(axios, 'get').mockImplementation(() =>
      Promise.resolve({
        data: safeChainsList,
      }),
    );

    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let result: any;

    await act(async () => {
      result = renderHook(() =>
        useIsOriginalNativeTokenSymbol('0xe704', 'LineaETH', 'linea'),
      );
    });
    // expect this to pass because the chainId is in the CURRENCY_SYMBOL_BY_CHAIN_ID
    expect(result.result.current).toBe(true);
    // expect that the chainlist API was not called
    expect(spyFetch).not.toHaveBeenCalled();
  });
});
