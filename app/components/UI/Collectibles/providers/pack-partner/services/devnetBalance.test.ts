import { apiClient } from '../../../../../../core/apiClient';
import { PACK_PARTNER_ENVIRONMENTS } from '../constants/environment';
import { readDevnetUsdcBalance } from './devnetBalance';

jest.mock('../../../../../../core/apiClient', () => ({
  apiClient: { accounts: { fetchV6MultiAccountBalances: jest.fn() } },
}));

const { devnet, mainnet } = PACK_PARTNER_ENVIRONMENTS;
const ADDRESS = 'test-solana-address';
const ACCOUNT_ID = `${devnet.scope}:${ADDRESS}`;
const fetchBalances = jest.mocked(
  apiClient.accounts.fetchV6MultiAccountBalances,
);
const tokenBalance = {
  accountId: ACCOUNT_ID,
  object: 'token' as const,
  type: 'spl',
  assetId: `${mainnet.scope}/token:${devnet.usdcMint}`,
  name: 'USDC-Dev',
  symbol: 'USDC',
  decimals: 6,
  balance: '25.123456',
};
const response = {
  balances: [tokenBalance],
  unprocessedNetworks: [],
  unprocessedIncludeAssetIds: [],
};

describe('readDevnetUsdcBalance', () => {
  beforeEach(() => {
    fetchBalances.mockReset().mockResolvedValue(response);
  });

  it.each([mainnet.scope, devnet.scope])(
    'reads the exact Devnet mint with asset prefix %s in base units',
    async (assetScope) => {
      fetchBalances.mockResolvedValue({
        ...response,
        balances: [
          {
            ...tokenBalance,
            assetId: `${assetScope}/token:${devnet.usdcMint}`,
          },
        ],
      });

      await expect(readDevnetUsdcBalance(ADDRESS)).resolves.toBe('25123456');
      expect(fetchBalances).toHaveBeenCalledWith(
        [ACCOUNT_ID],
        {
          networks: [devnet.scope],
          filterSupportedTokens: false,
          includeDeFiBalances: false,
          includePrices: false,
        },
        { staleTime: 0, gcTime: 0, bypassServerCache: true },
      );
    },
  );

  it('does not confuse another USDC mint or a DeFi position with the settlement token', async () => {
    fetchBalances.mockResolvedValue({
      ...response,
      balances: [
        {
          ...tokenBalance,
          assetId: `${mainnet.scope}/token:${mainnet.usdcMint}`,
        },
        { ...tokenBalance, object: 'defi' },
      ],
    });

    await expect(readDevnetUsdcBalance(ADDRESS)).resolves.toBe('0');
  });

  it('returns zero for a successful response without this mint', async () => {
    fetchBalances.mockResolvedValue({ ...response, balances: [] });

    await expect(readDevnetUsdcBalance(ADDRESS)).resolves.toBe('0');
  });

  it('preserves base units beyond Number safe integer precision', async () => {
    fetchBalances.mockResolvedValue({
      ...response,
      balances: [{ ...tokenBalance, balance: '9007199254.740993' }],
    });

    await expect(readDevnetUsdcBalance(ADDRESS)).resolves.toBe(
      '9007199254740993',
    );
  });

  it('rejects another account instead of reporting its balance or zero', async () => {
    fetchBalances.mockResolvedValue({
      ...response,
      balances: [{ ...tokenBalance, accountId: `${mainnet.scope}:${ADDRESS}` }],
    });

    await expect(readDevnetUsdcBalance(ADDRESS)).rejects.toThrow('unavailable');
  });

  it('rejects an unprocessed network instead of reporting zero', async () => {
    fetchBalances.mockResolvedValue({
      ...response,
      balances: [],
      unprocessedNetworks: [devnet.scope],
    });

    await expect(readDevnetUsdcBalance(ADDRESS)).rejects.toThrow('unavailable');
  });

  it('propagates a failed read instead of reporting zero', async () => {
    const error = new Error('offline');
    fetchBalances.mockRejectedValue(error);

    await expect(readDevnetUsdcBalance(ADDRESS)).rejects.toBe(error);
  });

  it.each(['-1', 'NaN', '', '1e6', '0.0000001'])(
    'rejects the malformed amount %s instead of rounding or reporting zero',
    async (balance) => {
      fetchBalances.mockResolvedValue({
        ...response,
        balances: [{ ...tokenBalance, balance }],
      });

      await expect(readDevnetUsdcBalance(ADDRESS)).rejects.toThrow('Malformed');
    },
  );

  it('rejects token decimals inconsistent with USDC', async () => {
    fetchBalances.mockResolvedValue({
      ...response,
      balances: [{ ...tokenBalance, decimals: 9 }],
    });

    await expect(readDevnetUsdcBalance(ADDRESS)).rejects.toThrow('Malformed');
  });
});
