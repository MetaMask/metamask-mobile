import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { BtcScope, SolScope, TrxScope } from '@metamask/keyring-api';
import type { RootState } from '../../../../../../../reducers';
import { selectSelectedInternalAccountByScope } from '../../../../../../../selectors/multichainAccounts/accounts';
import { useReceiveTokens } from './useReceiveTokens';
import { enrichTokenBalance } from './enrichTokenBalance';
import { useNetworkEnabledPredicate } from './useNetworkEnabledPredicate';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('./useNetworkEnabledPredicate', () => ({
  useNetworkEnabledPredicate: jest.fn(),
}));

jest.mock('../../../../../../../selectors/multichainAccounts/accounts', () => ({
  selectSelectedInternalAccountByScope: jest.fn(),
}));

jest.mock('../../../../../../../selectors/accountTrackerController', () => ({
  selectAccountsByChainId: jest.fn(() => ({})),
}));

jest.mock('../../../../../../../selectors/tokenBalancesController', () => ({
  selectTokensBalances: jest.fn(() => ({})),
}));

jest.mock('../../../../../../../selectors/tokenRatesController', () => ({
  selectTokenMarketData: jest.fn(() => ({})),
}));

jest.mock('../../../../../../../selectors/currencyRateController', () => ({
  selectCurrencyRates: jest.fn(() => ({})),
  selectCurrentCurrency: jest.fn(() => 'USD'),
}));

jest.mock('../../../../../../../selectors/multichain/multichain', () => ({
  selectMultichainBalances: jest.fn(() => ({})),
  selectMultichainAssetsRates: jest.fn(() => ({})),
}));

jest.mock(
  '../../../../../../UI/Bridge/utils/getAllChainDefaultDestTokens',
  () => ({
    getAllChainDefaultDestTokens: jest.fn(() => [
      {
        symbol: 'mUSD',
        address: '0xmusd',
        chainId: '0x1',
        decimals: 6,
        name: 'MetaMask USD',
      },
      {
        symbol: 'USDC',
        address: '0xusdc_matic',
        chainId: '0x89',
        decimals: 6,
        name: 'USD Coin (Polygon)',
      },
      {
        // Intentionally non-stablecoin to verify filtering
        symbol: 'WETH',
        address: '0xweth',
        chainId: '0x1',
        decimals: 18,
        name: 'Wrapped Ether',
      },
      {
        symbol: 'USDC',
        address:
          'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
        decimals: 6,
        name: 'USD Coin',
      },
      {
        symbol: 'USDT',
        address: 'tron:728126428/trc20:TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
        chainId: 'tron:728126428',
        decimals: 6,
        name: 'Tether USD',
      },
    ]),
  }),
);

jest.mock('./enrichTokenBalance', () => ({
  enrichTokenBalance: jest.fn(),
}));

jest.mock('../../../../../../UI/Bridge/utils/tokenUtils', () => ({
  getNativeSourceToken: jest.fn((chainId: string) => {
    if (chainId === '0x1') {
      return {
        symbol: 'ETH',
        name: 'Ethereum',
        address: '0x0000000000000000000000000000000000000000',
        decimals: 18,
        chainId: '0x1',
      };
    }
    if (chainId === '0x89') {
      return {
        symbol: 'POL',
        name: 'Polygon',
        address: '0x0000000000000000000000000000000000000000',
        decimals: 18,
        chainId: '0x89',
      };
    }
    if (chainId === 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp') {
      return {
        symbol: 'SOL',
        name: 'Solana',
        address: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501',
        decimals: 9,
        chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      };
    }
    if (chainId === 'tron:728126428') {
      return {
        symbol: 'TRX',
        name: 'Tron',
        address: 'tron:728126428/slip44:195',
        decimals: 6,
        chainId: 'tron:728126428',
      };
    }
    if (chainId === 'bip122:000000000019d6689c085ae165831e93') {
      return {
        symbol: 'BTC',
        name: 'Bitcoin',
        address: 'bip122:000000000019d6689c085ae165831e93/slip44:0',
        decimals: 8,
        chainId: 'bip122:000000000019d6689c085ae165831e93',
      };
    }
    throw new Error(`unsupported chain ${chainId}`);
  }),
}));

const mockEnrich = enrichTokenBalance as jest.Mock;
const mockUseNetworkEnabledPredicate = useNetworkEnabledPredicate as jest.Mock;
const mockUseSelector = useSelector as unknown as jest.Mock;
const mockSelectSelectedInternalAccountByScope =
  selectSelectedInternalAccountByScope as unknown as jest.Mock;

const SOLANA_CHAIN_ID = SolScope.Mainnet;
const TRON_CHAIN_ID = TrxScope.Mainnet;
const BITCOIN_CHAIN_ID = BtcScope.Mainnet;

const MOCK_STATE = {
  engine: {
    backgroundState: {
      NetworkController: { networkConfigurationsByChainId: {} },
    },
  },
} as unknown as RootState;

const NON_EVM_ACCOUNTS: Record<string, { id: string; address: string }> = {
  [SOLANA_CHAIN_ID]: {
    id: 'solana-account-id',
    address: 'So1anaAddre55111111111111111111111111111111',
  },
  [TRON_CHAIN_ID]: {
    id: 'tron-account-id',
    address: 'TTronAddre55xxxxxxxxxxxxxxxxxxxxxx',
  },
  [BITCOIN_CHAIN_ID]: {
    id: 'bitcoin-account-id',
    address: 'bc1qbitcoinaddre55xxxxxxxxxxxxxxxxxxxxx',
  },
};

/** Makes the selected account group expose addresses for the given scopes. */
const givenAccountsForScopes = (scopes: string[]) => {
  mockSelectSelectedInternalAccountByScope.mockReturnValue((scope: string) =>
    scopes.includes(scope) ? NON_EVM_ACCOUNTS[scope] : undefined,
  );
};

/** Makes the selected account group expose a Solana address. */
const givenSolanaAccount = () => givenAccountsForScopes([SOLANA_CHAIN_ID]);

describe('useReceiveTokens', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseNetworkEnabledPredicate.mockReturnValue(() => true);
    // No account in the selected group resolves for any scope by default.
    mockSelectSelectedInternalAccountByScope.mockReturnValue(() => undefined);
    mockUseSelector.mockImplementation(
      (selector: (state: RootState) => unknown) => selector(MOCK_STATE),
    );
    mockEnrich.mockReturnValue({
      balance: '0',
      balanceFiat: '$0.00',
      tokenFiatAmount: 0,
      currencyExchangeRate: 1,
    });
  });

  it('returns stablecoin and native candidates (filters out non-stable non-native tokens like WETH)', () => {
    const { result } = renderHook(() => useReceiveTokens(undefined));

    const symbols = result.current.map((t) => t.symbol);
    expect(symbols).toContain('mUSD');
    expect(symbols).toContain('USDC');
    expect(symbols).toContain('USDT');
    expect(symbols).toContain('ETH');
    expect(symbols).toContain('POL');
    expect(symbols).not.toContain('WETH');
  });

  it('includes one native token per supported chain using the zero address', () => {
    const { result } = renderHook(() => useReceiveTokens(undefined));

    const natives = result.current.filter(
      (t) => t.symbol === 'ETH' || t.symbol === 'POL',
    );
    expect(natives).toHaveLength(2);
    natives.forEach((token) => {
      expect(token.address).toBe('0x0000000000000000000000000000000000000000');
    });
  });

  it('sorts candidates on the preferred chain to the front', () => {
    const { result } = renderHook(() => useReceiveTokens('0x89'));

    expect(result.current[0].chainId).toBe('0x89');
  });

  it('keeps a stablecoin first within the preferred chain group', () => {
    const { result } = renderHook(() => useReceiveTokens('0x89'));

    expect(result.current[0].symbol).toBe('USDC');
    expect(result.current.map((t) => t.symbol)).toContain('POL');
  });

  it('enriches every candidate leniently (include zero balances)', () => {
    renderHook(() => useReceiveTokens('0x1'));

    expect(mockEnrich).toHaveBeenCalledWith(
      expect.objectContaining({ symbol: expect.any(String) }),
      expect.any(Object),
      { includeZeroBalance: true },
    );
  });

  it('offers both USDC and USDT on every chain with a canonical deployment (e.g. Optimism)', () => {
    const { result } = renderHook(() => useReceiveTokens(undefined));

    const optimismSymbols = result.current
      .filter((t) => t.chainId === '0xa')
      .map((t) => t.symbol);
    expect(optimismSymbols).toContain('USDC');
    expect(optimismSymbols).toContain('USDT');
  });

  it('does not list the same token identity twice when merging the curated set', () => {
    const { result } = renderHook(() => useReceiveTokens(undefined));

    const keys = result.current.map(
      (t) => `${t.address.toLowerCase()}:${t.chainId}`,
    );
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('drops candidates on networks the user has not enabled', () => {
    mockUseNetworkEnabledPredicate.mockReturnValue(
      (chainId: string | undefined) => chainId === '0x1',
    );

    const { result } = renderHook(() => useReceiveTokens(undefined));

    const chainIds = result.current.map((t) => t.chainId);
    expect(chainIds).toContain('0x1');
    expect(chainIds).not.toContain('0x89');
  });

  describe('Solana candidates', () => {
    it('includes Solana stablecoin and native candidates when the account has a Solana address', () => {
      givenSolanaAccount();

      const { result } = renderHook(() => useReceiveTokens(undefined));

      const solanaTokens = result.current.filter(
        (t) => t.chainId === SOLANA_CHAIN_ID,
      );
      expect(solanaTokens.map((t) => t.symbol)).toEqual(
        expect.arrayContaining(['USDC', 'SOL']),
      );
    });

    it('omits Solana candidates when the account has no Solana address', () => {
      const { result } = renderHook(() => useReceiveTokens(undefined));

      const chainIds = result.current.map((t) => t.chainId);
      expect(chainIds).not.toContain(SOLANA_CHAIN_ID);
    });

    it('drops Solana candidates when the Solana network is not enabled', () => {
      givenSolanaAccount();
      mockUseNetworkEnabledPredicate.mockReturnValue(
        (chainId: string | undefined) => chainId !== SOLANA_CHAIN_ID,
      );

      const { result } = renderHook(() => useReceiveTokens(undefined));

      const chainIds = result.current.map((t) => t.chainId);
      expect(chainIds).not.toContain(SOLANA_CHAIN_ID);
      expect(chainIds).toContain('0x1');
    });

    it('sorts Solana candidates to the front when the preferred chain is Solana', () => {
      givenSolanaAccount();

      const { result } = renderHook(() => useReceiveTokens(SOLANA_CHAIN_ID));

      expect(result.current[0].chainId).toBe(SOLANA_CHAIN_ID);
      expect(result.current[0].symbol).toBe('USDC');
    });

    it('passes the Solana account to balance enrichment so Solana holdings are priced', () => {
      givenSolanaAccount();

      renderHook(() => useReceiveTokens(undefined));

      expect(mockEnrich).toHaveBeenCalledWith(
        expect.objectContaining({ chainId: SOLANA_CHAIN_ID }),
        expect.objectContaining({
          solanaAccount: expect.objectContaining({
            id: NON_EVM_ACCOUNTS[SOLANA_CHAIN_ID].id,
          }),
        }),
        { includeZeroBalance: true },
      );
    });
  });

  describe('Tron and Bitcoin candidates', () => {
    it('offers the curated USDT stablecoin and native TRX when the account has a Tron address', () => {
      givenAccountsForScopes([TRON_CHAIN_ID]);

      const { result } = renderHook(() => useReceiveTokens(undefined));

      const tronTokens = result.current.filter(
        (t) => t.chainId === TRON_CHAIN_ID,
      );
      // The curated TRC-20 USDT (from DefaultSwapDestTokens) is admitted as a
      // same-chain receive destination, with the stablecoin ordered ahead of
      // the native asset.
      expect(tronTokens.map((t) => t.symbol)).toEqual(['USDT', 'TRX']);
    });

    it('passes the Tron account to balance enrichment so the USDT holding is priced', () => {
      givenAccountsForScopes([TRON_CHAIN_ID]);

      renderHook(() => useReceiveTokens(undefined));

      expect(mockEnrich).toHaveBeenCalledWith(
        expect.objectContaining({ symbol: 'USDT', chainId: TRON_CHAIN_ID }),
        expect.objectContaining({
          tronAccount: expect.objectContaining({
            id: NON_EVM_ACCOUNTS[TRON_CHAIN_ID].id,
          }),
        }),
        { includeZeroBalance: true },
      );
    });

    it('sorts the Tron USDT stablecoin first when the preferred chain is Tron', () => {
      givenAccountsForScopes([TRON_CHAIN_ID]);

      const { result } = renderHook(() => useReceiveTokens(TRON_CHAIN_ID));

      expect(result.current[0].chainId).toBe(TRON_CHAIN_ID);
      expect(result.current[0].symbol).toBe('USDT');
    });

    it('offers native BTC when the account has a Bitcoin address', () => {
      givenAccountsForScopes([BITCOIN_CHAIN_ID]);

      const { result } = renderHook(() => useReceiveTokens(undefined));

      const bitcoinTokens = result.current.filter(
        (t) => t.chainId === BITCOIN_CHAIN_ID,
      );
      expect(bitcoinTokens.map((t) => t.symbol)).toEqual(['BTC']);
    });

    it('omits Tron and Bitcoin candidates when the account lacks those addresses', () => {
      givenSolanaAccount();

      const { result } = renderHook(() => useReceiveTokens(undefined));

      const chainIds = result.current.map((t) => t.chainId);
      expect(chainIds).toContain(SOLANA_CHAIN_ID);
      expect(chainIds).not.toContain(TRON_CHAIN_ID);
      expect(chainIds).not.toContain(BITCOIN_CHAIN_ID);
    });

    it('drops Tron and Bitcoin candidates when those networks are not enabled', () => {
      givenAccountsForScopes([TRON_CHAIN_ID, BITCOIN_CHAIN_ID]);
      mockUseNetworkEnabledPredicate.mockReturnValue(
        (chainId: string | undefined) =>
          chainId !== TRON_CHAIN_ID && chainId !== BITCOIN_CHAIN_ID,
      );

      const { result } = renderHook(() => useReceiveTokens(undefined));

      const chainIds = result.current.map((t) => t.chainId);
      expect(chainIds).not.toContain(TRON_CHAIN_ID);
      expect(chainIds).not.toContain(BITCOIN_CHAIN_ID);
      expect(chainIds).toContain('0x1');
    });

    it('passes the Tron and Bitcoin accounts to balance enrichment so their holdings are priced', () => {
      givenAccountsForScopes([TRON_CHAIN_ID, BITCOIN_CHAIN_ID]);

      renderHook(() => useReceiveTokens(undefined));

      expect(mockEnrich).toHaveBeenCalledWith(
        expect.objectContaining({ chainId: TRON_CHAIN_ID }),
        expect.objectContaining({
          tronAccount: expect.objectContaining({
            id: NON_EVM_ACCOUNTS[TRON_CHAIN_ID].id,
          }),
          bitcoinAccount: expect.objectContaining({
            id: NON_EVM_ACCOUNTS[BITCOIN_CHAIN_ID].id,
          }),
        }),
        { includeZeroBalance: true },
      );
    });
  });
});
