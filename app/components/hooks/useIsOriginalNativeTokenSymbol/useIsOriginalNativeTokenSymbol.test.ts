import {
  renderHook,
  act,
  RenderHookResult,
} from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import useIsOriginalNativeTokenSymbol from './useIsOriginalNativeTokenSymbol';
import { backgroundState } from '../../../../app/util/test/initial-root-state';
import { useSafeChains } from '../useSafeChains';
import type { RootState } from '../../../reducers';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

jest.mock('../useSafeChains', () => ({
  useSafeChains: jest.fn(),
}));

jest.mock('../../../core/Multichain/utils', () => ({
  isNonEvmChainId: jest.fn().mockReturnValue(false),
}));

interface BackgroundStateWithNetworkController {
  NetworkController?: {
    networkConfigurationsByChainId?: Record<string, unknown>;
  };
  PreferencesController?: { useSafeChainsListValidation?: boolean };
}

// Build state so networkConfigurationsByChainId includes chainIds used in tests.
// Hook returns true early when chainId is non-EVM or not in this state.
const networkControllerWithChainIds = (chainIds: string[]) => {
  const networkConfigurationsByChainId = chainIds.reduce<
    Record<
      string,
      { chainId: string; nativeCurrency: string; rpcEndpoints: unknown[] }
    >
  >(
    (acc, id) => ({
      ...acc,
      [id]: { chainId: id, nativeCurrency: 'ETH', rpcEndpoints: [] },
    }),
    {},
  );
  const bg = backgroundState as BackgroundStateWithNetworkController;
  return {
    ...bg.NetworkController,
    networkConfigurationsByChainId: {
      ...bg.NetworkController?.networkConfigurationsByChainId,
      ...networkConfigurationsByChainId,
    },
  };
};

describe('useIsOriginalNativeTokenSymbol', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  const mockSelectorState = (state: Partial<RootState>) => {
    (useSelector as jest.MockedFn<typeof useSelector>).mockImplementation(
      (selector) => selector(state),
    );
  };

  const mockStateWithNetworks = (
    chainIds: string[],
    preferences: { useSafeChainsListValidation: boolean },
  ): Partial<RootState> => {
    const bg = backgroundState as BackgroundStateWithNetworkController;
    return {
      engine: {
        backgroundState: {
          ...backgroundState,
          NetworkController: networkControllerWithChainIds(
            chainIds,
          ) as RootState['engine']['backgroundState']['NetworkController'],
          PreferencesController: {
            ...bg.PreferencesController,
            ...preferences,
          } as RootState['engine']['backgroundState']['PreferencesController'],
        },
      },
    };
  };
  it('returns true when native symbol matches the ticker', async () => {
    mockSelectorState(
      mockStateWithNetworks(['0x1'], { useSafeChainsListValidation: true }),
    );

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

    let result!: RenderHookResult<boolean | null, unknown>;

    await act(async () => {
      result = renderHook(() =>
        useIsOriginalNativeTokenSymbol('0x1', 'ETH', 'mainnet'),
      );
    });

    expect(result?.result.current).toBe(true);
  });

  it('returns false when native symbol does not match the ticker', async () => {
    mockSelectorState(
      mockStateWithNetworks(['314'], { useSafeChainsListValidation: true }),
    );

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

    let result!: RenderHookResult<boolean | null, unknown>;

    await act(async () => {
      result = renderHook(() =>
        useIsOriginalNativeTokenSymbol('314', 'FIL', 'mainnet'),
      );
    });

    expect(result.result.current).toBe(false);
  });

  it('returns false when fetch chain list throws an error', async () => {
    mockSelectorState(
      mockStateWithNetworks(['314'], { useSafeChainsListValidation: true }),
    );

    (useSafeChains as jest.Mock).mockReturnValue({
      error: new Error('error'),
    });

    let result!: RenderHookResult<boolean | null, unknown>;

    await act(async () => {
      result = renderHook(() =>
        useIsOriginalNativeTokenSymbol('314', 'FIL', 'mainnet'),
      );
    });

    expect(result.result.current).toBe(false);
  });

  it('returns true when chainId is in CURRENCY_SYMBOL_BY_CHAIN_ID', async () => {
    mockSelectorState(
      mockStateWithNetworks(['0x5'], { useSafeChainsListValidation: true }),
    );

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

    let result!: RenderHookResult<boolean | null, unknown>;

    await act(async () => {
      result = renderHook(() =>
        useIsOriginalNativeTokenSymbol('0x5', 'GoerliETH', 'goerli'),
      );
    });

    expect(result.result.current).toBe(true);
  });

  it('returns true when chainId is not in CURRENCY_SYMBOL_BY_CHAIN_ID and matches safe chains', async () => {
    mockSelectorState(
      mockStateWithNetworks(['314'], { useSafeChainsListValidation: true }),
    );

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

    let result!: RenderHookResult<boolean | null, unknown>;

    await act(async () => {
      result = renderHook(() =>
        useIsOriginalNativeTokenSymbol('314', 'FIL', 'mainnet'),
      );
    });

    expect(result.result.current).toBe(true);
  });

  it('returns true when chain safe validation is disabled', async () => {
    mockSelectorState(
      mockStateWithNetworks(['5'], { useSafeChainsListValidation: false }),
    );

    (useSafeChains as jest.Mock).mockReturnValue({
      safeChains: [],
    });

    let result!: RenderHookResult<boolean | null, unknown>;

    await act(async () => {
      result = renderHook(() =>
        useIsOriginalNativeTokenSymbol('5', 'ETH', 'goerli'),
      );
    });

    expect(result.result.current).toBe(true);
  });

  it('returns true for LineaGoerli testnet', async () => {
    mockSelectorState(
      mockStateWithNetworks(['0xe704'], { useSafeChainsListValidation: true }),
    );

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

    let result!: RenderHookResult<boolean | null, unknown>;

    await act(async () => {
      result = renderHook(() =>
        useIsOriginalNativeTokenSymbol('0xe704', 'LineaETH', 'linea'),
      );
    });

    expect(result.result.current).toBe(true);
  });

  it('returns null when safe chains list is loading', async () => {
    mockSelectorState(
      mockStateWithNetworks(['314'], { useSafeChainsListValidation: true }),
    );

    (useSafeChains as jest.Mock).mockReturnValue({
      safeChains: [],
    });

    let result!: RenderHookResult<boolean | null, unknown>;

    await act(async () => {
      result = renderHook(() =>
        useIsOriginalNativeTokenSymbol('314', 'FIL', 'mainnet'),
      );
    });

    expect(result.result.current).toBe(null);
  });

  it('returns true when chainId is not in networkConfigurationsByChainId (no scam warning)', async () => {
    mockSelectorState(
      mockStateWithNetworks([], { useSafeChainsListValidation: true }),
    );

    (useSafeChains as jest.Mock).mockReturnValue({
      safeChains: [
        {
          chainId: 999,
          nativeCurrency: { symbol: 'FAKE' },
          name: 'Fake',
          rpc: [],
        },
      ],
    });

    let result!: RenderHookResult<boolean | null, unknown>;

    await act(async () => {
      result = renderHook(() =>
        useIsOriginalNativeTokenSymbol('999', 'FAKE', 'mainnet'),
      );
    });

    expect(result.result.current).toBe(true);
  });
});
