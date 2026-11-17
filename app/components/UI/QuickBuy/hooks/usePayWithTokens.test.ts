import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { useTokensWithBalance } from '../../Bridge/hooks/useTokensWithBalance';
import type { BridgeToken } from '../../Bridge/types';
import { getTokensControllerAllIgnoredTokens } from '../../../../selectors/assets/assets-migration';
import { selectMultichainAssetsAllIgnoredAssets } from '../../../../selectors/multichain/multichain';
import { selectSelectedInternalAccountByScope } from '../../../../selectors/multichainAccounts/accounts';
import { TrxScope, BtcScope } from '@metamask/keyring-api';
import { EVM_SCOPE } from '../../Earn/constants/networks';
import { enrichTokenBalance } from './enrichTokenBalance';
import { usePayWithTokens } from './usePayWithTokens';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(() => undefined),
}));

jest.mock('../../Bridge/hooks/useTokensWithBalance', () => ({
  useTokensWithBalance: jest.fn(),
}));

jest.mock('../../../../selectors/assets/assets-migration', () => ({
  getTokensControllerAllIgnoredTokens: jest.fn(),
}));

jest.mock('../../../../selectors/multichain/multichain', () => ({
  selectMultichainBalances: jest.fn(),
  selectMultichainAssetsRates: jest.fn(),
  selectMultichainAssetsAllIgnoredAssets: jest.fn(),
}));

jest.mock('../../../../selectors/multichainAccounts/accounts', () => ({
  selectSelectedInternalAccountByScope: jest.fn(),
}));

jest.mock('../../../../selectors/accountTrackerController', () => ({
  selectAccountsByChainId: jest.fn(),
}));

jest.mock('../../../../selectors/tokenBalancesController', () => ({
  selectTokensBalances: jest.fn(),
}));

jest.mock('../../../../selectors/tokenRatesController', () => ({
  selectTokenMarketData: jest.fn(),
}));

jest.mock('../../../../selectors/currencyRateController', () => ({
  selectCurrencyRates: jest.fn(),
  selectCurrentCurrency: jest.fn(() => 'USD'),
}));

jest.mock('../../../../core/redux/slices/bridge', () => ({
  selectSelectedSourceChainIds: jest.fn(),
}));

jest.mock('./enrichTokenBalance', () => ({
  enrichTokenBalance: jest.fn(),
}));

const mockUseSelector = useSelector as jest.Mock;
const mockUseTokensWithBalance = useTokensWithBalance as jest.Mock;
const mockEnrich = enrichTokenBalance as jest.Mock;
const mockGetIgnoredTokens =
  getTokensControllerAllIgnoredTokens as unknown as jest.Mock;
const mockGetIgnoredAssets =
  selectMultichainAssetsAllIgnoredAssets as unknown as jest.Mock;
const mockAccountByScope =
  selectSelectedInternalAccountByScope as unknown as jest.Mock;

const FAKE_STATE = {
  engine: {
    backgroundState: {
      NetworkController: { networkConfigurationsByChainId: {} },
    },
  },
} as never;

/**
 * Resolves `useSelector` by invoking each selector against a minimal fake
 * state. The mocked leaf selectors return whatever they are configured to,
 * which lets the hook's inline `accountAddress` / `solanaAccount` selectors
 * resolve through the mocked `selectSelectedInternalAccountByScope`.
 */
const setupSelectors = ({
  allIgnoredTokens = {},
  allIgnoredAssets = {},
  evmAddress = '0xAccount',
  solAccountId,
}: {
  allIgnoredTokens?: Record<string, Record<string, string[]>>;
  allIgnoredAssets?: Record<string, string[]>;
  evmAddress?: string;
  solAccountId?: string;
}) => {
  mockGetIgnoredTokens.mockReturnValue(allIgnoredTokens);
  mockGetIgnoredAssets.mockReturnValue(allIgnoredAssets);
  mockAccountByScope.mockReturnValue((scope: string) => {
    if (scope === EVM_SCOPE) return { address: evmAddress, id: 'evm' };
    return solAccountId ? { id: solAccountId } : undefined;
  });
  mockUseSelector.mockImplementation((selector: (state: never) => unknown) =>
    selector(FAKE_STATE),
  );
};

const token = (symbol: string, chainId = '0x1'): BridgeToken =>
  ({
    address: `0x${symbol.toLowerCase()}`,
    chainId,
    symbol,
    name: symbol,
    decimals: 18,
  }) as BridgeToken;

describe('usePayWithTokens', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Resolve `useSelector` by invoking each (mocked) selector. `accountByScope`
    // defaults to a resolver that finds no account, so tests that don't set up
    // accounts behave as "nothing hidden" rather than crashing.
    mockUseSelector.mockImplementation((selector: (state: never) => unknown) =>
      selector(FAKE_STATE),
    );
    mockAccountByScope.mockReturnValue(() => undefined);
  });

  it('returns the held tokens enriched with priced balances', () => {
    mockUseTokensWithBalance.mockReturnValue([token('CAKE'), token('USDC')]);
    mockEnrich.mockImplementation((t: BridgeToken) => ({
      balance: '10',
      balanceFiat: '$10.00',
      tokenFiatAmount: t.symbol === 'CAKE' ? 30 : 10,
      currencyExchangeRate: 1,
    }));

    const { result } = renderHook(() => usePayWithTokens());

    expect(result.current.options.map((o) => o.symbol)).toEqual([
      'CAKE',
      'USDC',
    ]);
    expect(result.current.isLoading).toBe(false);
  });

  it('drops held tokens that cannot be priced', () => {
    mockUseTokensWithBalance.mockReturnValue([token('CAKE'), token('SCAM')]);
    mockEnrich.mockImplementation((t: BridgeToken) =>
      t.symbol === 'SCAM'
        ? null
        : {
            balance: '10',
            balanceFiat: '$10.00',
            tokenFiatAmount: 10,
            currencyExchangeRate: 1,
          },
    );

    const { result } = renderHook(() => usePayWithTokens());

    expect(result.current.options.map((o) => o.symbol)).toEqual(['CAKE']);
  });

  it('sorts options by fiat value descending', () => {
    mockUseTokensWithBalance.mockReturnValue([
      token('LOW'),
      token('HIGH'),
      token('MID'),
    ]);
    const fiatBySymbol: Record<string, number> = { LOW: 5, HIGH: 100, MID: 50 };
    mockEnrich.mockImplementation((t: BridgeToken) => ({
      balance: '1',
      balanceFiat: '$1.00',
      tokenFiatAmount: fiatBySymbol[t.symbol],
      currencyExchangeRate: 1,
    }));

    const { result } = renderHook(() => usePayWithTokens());

    expect(result.current.options.map((o) => o.symbol)).toEqual([
      'HIGH',
      'MID',
      'LOW',
    ]);
  });

  it('returns an empty list when the user holds no tokens', () => {
    mockUseTokensWithBalance.mockReturnValue([]);

    const { result } = renderHook(() => usePayWithTokens());

    expect(result.current.options).toEqual([]);
    expect(mockEnrich).not.toHaveBeenCalled();
  });

  it('keeps cross-chain holdings regardless of the wallet enabled-networks filter (TSA-921)', () => {
    // Regression: an exclusive `enableNetwork('eip155:4663')` (Robinhood)
    // used to collapse the wallet's enabled-map to Robinhood-only via
    // `useNetworkEnabledPredicate`, dropping every held token on other
    // chains. `usePayWithTokens` no longer consults that filter, so the
    // caller sees every bridge-reachable holding.
    mockUseTokensWithBalance.mockReturnValue([
      token('ETH', '0x1237'),
      token('MUSD', '0xe708'),
      token('USDT', '0x89'),
    ]);
    mockEnrich.mockImplementation((t: BridgeToken) => ({
      balance: '10',
      balanceFiat: '$10.00',
      tokenFiatAmount: 10,
      currencyExchangeRate: 1,
    }));

    const { result } = renderHook(() => usePayWithTokens());

    expect(result.current.options.map((o) => o.symbol)).toEqual([
      'ETH',
      'MUSD',
      'USDT',
    ]);
  });

  it('enriches held tokens without a price fallback', () => {
    mockUseTokensWithBalance.mockReturnValue([token('USDC'), token('CAKE')]);
    mockEnrich.mockReturnValue({
      balance: '10',
      balanceFiat: '$10.00',
      tokenFiatAmount: 10,
      currencyExchangeRate: 1,
    });

    renderHook(() => usePayWithTokens());

    expect(mockEnrich).toHaveBeenCalledWith(
      expect.objectContaining({ symbol: 'USDC' }),
      expect.anything(),
    );
    expect(mockEnrich).toHaveBeenCalledWith(
      expect.objectContaining({ symbol: 'CAKE' }),
      expect.anything(),
    );
  });

  it('excludes tokens the user has hidden while keeping visible holdings', () => {
    const posi = token('POSI');
    const usdc = token('USDC');
    mockUseTokensWithBalance.mockReturnValue([posi, usdc]);
    setupSelectors({
      allIgnoredTokens: {
        '0x1': { '0xaccount': [posi.address.toUpperCase()] },
      },
    });
    mockEnrich.mockImplementation((t: BridgeToken) => ({
      balance: '10',
      balanceFiat: '$10.00',
      tokenFiatAmount: 10,
      currencyExchangeRate: 1,
    }));

    const { result } = renderHook(() => usePayWithTokens());

    expect(result.current.options.map((o) => o.symbol)).toEqual(['USDC']);
    expect(mockEnrich).not.toHaveBeenCalledWith(
      expect.objectContaining({ symbol: 'POSI' }),
      expect.anything(),
    );
  });

  it('wires the Tron and Bitcoin accounts into the enrichment deps', () => {
    mockUseTokensWithBalance.mockReturnValue([
      token('TRX', 'tron:728126428'),
      token('BTC', 'bip122:000000000019d6689c085ae165831e93'),
    ]);
    mockAccountByScope.mockReturnValue((scope: string) => {
      if (scope === EVM_SCOPE) return { address: '0xAccount', id: 'evm' };
      if (scope === TrxScope.Mainnet) return { id: 'tron-account-id' };
      if (scope === BtcScope.Mainnet) return { id: 'bitcoin-account-id' };
      return undefined;
    });
    mockEnrich.mockReturnValue({
      balance: '10',
      balanceFiat: '$10.00',
      tokenFiatAmount: 10,
      currencyExchangeRate: 1,
    });

    renderHook(() => usePayWithTokens());

    expect(mockEnrich).toHaveBeenCalledWith(
      expect.objectContaining({ symbol: 'TRX' }),
      expect.objectContaining({
        tronAccount: { id: 'tron-account-id' },
        bitcoinAccount: { id: 'bitcoin-account-id' },
      }),
    );
  });

  it('keeps all holdings when nothing is hidden', () => {
    mockUseTokensWithBalance.mockReturnValue([token('POSI'), token('USDC')]);
    setupSelectors({ allIgnoredTokens: {} });
    mockEnrich.mockImplementation(() => ({
      balance: '10',
      balanceFiat: '$10.00',
      tokenFiatAmount: 10,
      currencyExchangeRate: 1,
    }));

    const { result } = renderHook(() => usePayWithTokens());

    expect(result.current.options.map((o) => o.symbol)).toEqual([
      'POSI',
      'USDC',
    ]);
  });
});
