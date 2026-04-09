import { CaipChainId } from '@metamask/utils';
import { SolScope } from '@metamask/keyring-api';
import {
  normalizeSymbol,
  getCaipChainId,
  shouldProcessNetwork,
  buildTokenListFromSettings,
  buildQuickSelectTokens,
  QUICK_SELECT_TOKENS,
  LINEA_CAIP_CHAIN_ID,
} from './buildTokenList';
import {
  AllowanceState,
  CardTokenAllowance,
  DelegationSettingsResponse,
} from '../types';

describe('buildTokenList utilities', () => {
  describe('normalizeSymbol', () => {
    it('uppercases USDT', () => {
      expect(normalizeSymbol('usdt')).toBe('USDT');
      expect(normalizeSymbol('Usdt')).toBe('USDT');
      expect(normalizeSymbol('USDT')).toBe('USDT');
    });

    it('uppercases USDC', () => {
      expect(normalizeSymbol('usdc')).toBe('USDC');
      expect(normalizeSymbol('Usdc')).toBe('USDC');
      expect(normalizeSymbol('USDC')).toBe('USDC');
    });

    it('uppercases DAI', () => {
      expect(normalizeSymbol('dai')).toBe('DAI');
      expect(normalizeSymbol('Dai')).toBe('DAI');
    });

    it('uppercases WETH', () => {
      expect(normalizeSymbol('weth')).toBe('WETH');
    });

    it('uppercases WBTC', () => {
      expect(normalizeSymbol('wbtc')).toBe('WBTC');
    });

    it('preserves casing for non-stablecoin symbols', () => {
      expect(normalizeSymbol('mUSD')).toBe('mUSD');
      expect(normalizeSymbol('ETH')).toBe('ETH');
      expect(normalizeSymbol('btc')).toBe('btc');
    });
  });

  describe('getCaipChainId', () => {
    it('returns Solana mainnet scope for solana network', () => {
      const network = {
        network: 'solana',
        chainId: '1',
        environment: 'production',
        delegationContract: '0x123',
        tokens: {},
      };

      const result = getCaipChainId(network);

      expect(result).toBe(SolScope.Mainnet);
    });

    it('converts decimal chainId to CAIP format', () => {
      const network = {
        network: 'linea',
        chainId: '59144',
        environment: 'production',
        delegationContract: '0x123',
        tokens: {},
      };

      const result = getCaipChainId(network);

      expect(result).toBe('eip155:59144');
    });

    it('converts hex chainId to CAIP format', () => {
      const network = {
        network: 'base',
        chainId: '0x2105',
        environment: 'production',
        delegationContract: '0x123',
        tokens: {},
      };

      const result = getCaipChainId(network);

      expect(result).toBe('eip155:8453');
    });
  });

  describe('shouldProcessNetwork', () => {
    const createNetwork = (
      network: string,
      environment = 'production',
    ): DelegationSettingsResponse['networks'][0] => ({
      network,
      chainId: '59144',
      environment,
      delegationContract: '0x123',
      tokens: {},
    });

    it('returns false for unsupported networks', () => {
      const network = createNetwork('ethereum');

      const result = shouldProcessNetwork(network);

      expect(result).toBe(false);
    });

    it('returns false for networks with no network name', () => {
      const network = createNetwork('');

      const result = shouldProcessNetwork(network);

      expect(result).toBe(false);
    });

    it('returns true for solana network', () => {
      const network = createNetwork('solana');

      const result = shouldProcessNetwork(network);

      expect(result).toBe(true);
    });

    it('returns true for linea when user is international', () => {
      const network = createNetwork('linea');

      const result = shouldProcessNetwork(network);

      expect(result).toBe(true);
    });

    it('returns true for base network', () => {
      const network = createNetwork('base');

      const result = shouldProcessNetwork(network);

      expect(result).toBe(true);
    });
  });

  describe('buildTokenListFromSettings', () => {
    const createDelegationSettings = (
      networks: DelegationSettingsResponse['networks'],
    ): DelegationSettingsResponse => ({
      networks,
      count: networks.length,
      _links: { self: 'https://api.example.com' },
    });

    it('returns empty array when delegationSettings is null', () => {
      const result = buildTokenListFromSettings({
        delegationSettings: null,
      });

      expect(result).toEqual([]);
    });

    it('returns empty array when networks is undefined', () => {
      const result = buildTokenListFromSettings({
        delegationSettings: {
          networks: undefined,
          count: 0,
          _links: { self: '' },
        } as unknown as DelegationSettingsResponse,
      });

      expect(result).toEqual([]);
    });

    it('builds tokens from delegation settings', () => {
      const delegationSettings = createDelegationSettings([
        {
          network: 'linea',
          chainId: '59144',
          environment: 'production',
          delegationContract: '0xDelegation',
          tokens: {
            usdc: { symbol: 'usdc', decimals: 6, address: '0xUSDC' },
          },
        },
      ]);

      const result = buildTokenListFromSettings({
        delegationSettings,
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(
        expect.objectContaining({
          address: '0xUSDC',
          symbol: 'USDC',
          decimals: 6,
          caipChainId: 'eip155:59144',
          allowanceState: AllowanceState.NotEnabled,
          allowance: '0',
          delegationContract: '0xDelegation',
        }),
      );
    });

    it('normalizes stablecoin symbols', () => {
      const delegationSettings = createDelegationSettings([
        {
          network: 'linea',
          chainId: '59144',
          environment: 'production',
          delegationContract: '0xDelegation',
          tokens: {
            usdt: { symbol: 'usdt', decimals: 6, address: '0xUSDT' },
          },
        },
      ]);

      const result = buildTokenListFromSettings({
        delegationSettings,
      });

      expect(result[0].symbol).toBe('USDT');
    });

    it('skips tokens without address', () => {
      const delegationSettings = createDelegationSettings([
        {
          network: 'linea',
          chainId: '59144',
          environment: 'production',
          delegationContract: '0xDelegation',
          tokens: {
            usdc: { symbol: 'usdc', decimals: 6, address: '' },
          },
        },
      ]);

      const result = buildTokenListFromSettings({
        delegationSettings,
      });

      expect(result).toHaveLength(0);
    });

    it('skips duplicate tokens', () => {
      const delegationSettings = createDelegationSettings([
        {
          network: 'linea',
          chainId: '59144',
          environment: 'production',
          delegationContract: '0xDelegation',
          tokens: {
            usdc: { symbol: 'usdc', decimals: 6, address: '0xUSDC' },
            usdc2: { symbol: 'usdc', decimals: 6, address: '0xUSDC' },
          },
        },
      ]);

      const result = buildTokenListFromSettings({
        delegationSettings,
      });

      expect(result).toHaveLength(1);
    });

    it('uses SDK address for non-production environments', () => {
      const delegationSettings = createDelegationSettings([
        {
          network: 'linea',
          chainId: '59144',
          environment: 'staging',
          delegationContract: '0xDelegation',
          tokens: {
            usdc: { symbol: 'usdc', decimals: 6, address: '0xStagingUSDC' },
          },
        },
      ]);

      const mockGetSupportedTokens = jest
        .fn()
        .mockReturnValue([
          { symbol: 'USDC', address: '0xProductionUSDC', name: 'USD Coin' },
        ]);

      const result = buildTokenListFromSettings({
        delegationSettings,
        getSupportedTokensByChainId: mockGetSupportedTokens,
      });

      expect(result[0].address).toBe('0xProductionUSDC');
      expect(result[0].stagingTokenAddress).toBe('0xStagingUSDC');
    });

    it('sets stagingTokenAddress for non-production environments', () => {
      const delegationSettings = createDelegationSettings([
        {
          network: 'linea',
          chainId: '59144',
          environment: 'staging',
          delegationContract: '0xDelegation',
          tokens: {
            usdc: { symbol: 'usdc', decimals: 6, address: '0xStagingUSDC' },
          },
        },
      ]);

      const result = buildTokenListFromSettings({
        delegationSettings,
      });

      expect(result[0].stagingTokenAddress).toBe('0xStagingUSDC');
    });

    it('does not set stagingTokenAddress for production environments', () => {
      const delegationSettings = createDelegationSettings([
        {
          network: 'linea',
          chainId: '59144',
          environment: 'production',
          delegationContract: '0xDelegation',
          tokens: {
            usdc: { symbol: 'usdc', decimals: 6, address: '0xUSDC' },
          },
        },
      ]);

      const result = buildTokenListFromSettings({
        delegationSettings,
      });

      expect(result[0].stagingTokenAddress).toBeUndefined();
    });

    it('includes Solana tokens', () => {
      const delegationSettings = createDelegationSettings([
        {
          network: 'solana',
          chainId: '1',
          environment: 'production',
          delegationContract: '0xDelegation',
          tokens: {
            sol: { symbol: 'SOL', decimals: 9, address: 'SolAddress' },
          },
        },
        {
          network: 'linea',
          chainId: '59144',
          environment: 'production',
          delegationContract: '0xDelegation',
          tokens: {
            usdc: { symbol: 'usdc', decimals: 6, address: '0xUSDC' },
          },
        },
      ]);

      const result = buildTokenListFromSettings({
        delegationSettings,
      });

      expect(result).toHaveLength(2);
      expect(result[0].symbol).toBe('SOL');
      expect(result[0].caipChainId).toBe(
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      );
      expect(result[1].symbol).toBe('USDC');
    });
  });

  describe('buildQuickSelectTokens', () => {
    const createMockToken = (
      symbol: string,
      caipChainId: CaipChainId = LINEA_CAIP_CHAIN_ID,
    ): CardTokenAllowance => ({
      address: `0x${symbol}`,
      symbol,
      name: symbol,
      decimals: 18,
      caipChainId,
      walletAddress: undefined,
      allowanceState: AllowanceState.NotEnabled,
      allowance: '0',
      delegationContract: '0xDelegation',
    });

    it('returns quick select tokens with correct symbols', () => {
      const allTokens = [createMockToken('mUSD'), createMockToken('USDC')];

      const result = buildQuickSelectTokens(allTokens, null);

      expect(result).toHaveLength(2);
      expect(result[0].symbol).toBe('mUSD');
      expect(result[1].symbol).toBe('USDC');
    });

    it('finds tokens case-insensitively', () => {
      const allTokens = [createMockToken('musd'), createMockToken('usdc')];

      const result = buildQuickSelectTokens(allTokens, null);

      expect(result[0].token).not.toBeNull();
      expect(result[1].token).not.toBeNull();
    });

    it('returns null for missing tokens', () => {
      const allTokens: CardTokenAllowance[] = [];

      const result = buildQuickSelectTokens(allTokens, null);

      expect(result[0].token).toBeNull();
      expect(result[1].token).toBeNull();
    });

    it('only matches tokens on Linea chain', () => {
      const baseToken = createMockToken('USDC', 'eip155:8453' as CaipChainId);
      const allTokens = [baseToken];

      const result = buildQuickSelectTokens(allTokens, null);

      expect(result[1].token).toBeNull();
    });

    it('uses delegation settings as fallback for Linea tokens', () => {
      const delegationSettings: DelegationSettingsResponse = {
        networks: [
          {
            network: 'linea',
            chainId: '59144',
            environment: 'production',
            delegationContract: '0xDelegation',
            tokens: {
              musd: { symbol: 'mUSD', decimals: 18, address: '0xmUSD' },
            },
          },
        ],
        count: 1,
        _links: { self: 'https://api.example.com' },
      };

      const result = buildQuickSelectTokens([], delegationSettings);

      expect(result[0].token).not.toBeNull();
      expect(result[0].token?.address).toBe('0xmUSD');
    });

    it('preserves display symbol casing from QUICK_SELECT_TOKENS', () => {
      const allTokens = [createMockToken('MUSD'), createMockToken('usdc')];

      const result = buildQuickSelectTokens(allTokens, null);

      expect(result[0].symbol).toBe('mUSD');
      expect(result[1].symbol).toBe('USDC');
    });
  });

  describe('constants', () => {
    it('exports QUICK_SELECT_TOKENS with mUSD and USDC', () => {
      expect(QUICK_SELECT_TOKENS).toContain('mUSD');
      expect(QUICK_SELECT_TOKENS).toContain('USDC');
      expect(QUICK_SELECT_TOKENS).toHaveLength(2);
    });

    it('exports LINEA_CAIP_CHAIN_ID', () => {
      expect(LINEA_CAIP_CHAIN_ID).toBe('eip155:59144');
    });
  });
});
