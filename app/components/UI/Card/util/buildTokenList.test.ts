import {
  buildDelegationTokenList,
  LINEA_CAIP_CHAIN_ID,
} from './buildTokenList';
import { FundingStatus, DelegationSettingsResponse } from '../types';

describe('buildTokenList', () => {
  describe('buildDelegationTokenList', () => {
    const createDelegationSettings = (
      networks: DelegationSettingsResponse['networks'],
    ): DelegationSettingsResponse => ({
      networks,
      count: networks.length,
      _links: { self: 'https://api.example.com' },
    });

    it('returns empty array when delegationSettings is null', () => {
      const result = buildDelegationTokenList({
        delegationSettings: null,
        getSupportedTokensByChainId: () => [],
      });

      expect(result).toEqual([]);
    });

    it('returns empty array when networks is undefined', () => {
      const result = buildDelegationTokenList({
        delegationSettings: {
          networks: undefined,
          count: 0,
          _links: { self: '' },
        } as unknown as DelegationSettingsResponse,
        getSupportedTokensByChainId: () => [],
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

      const result = buildDelegationTokenList({
        delegationSettings,
        getSupportedTokensByChainId: () => [
          { symbol: 'USDC', address: '0xUSDC', name: 'USD Coin' },
        ],
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(
        expect.objectContaining({
          address: '0xUSDC',
          symbol: 'USDC',
          decimals: 6,
          caipChainId: 'eip155:59144',
          fundingStatus: FundingStatus.NotEnabled,
          spendableBalance: '0',
          delegationContract: '0xDelegation',
        }),
      );
    });

    it('uses SDK symbol casing over raw API symbol', () => {
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

      const result = buildDelegationTokenList({
        delegationSettings,
        getSupportedTokensByChainId: () => [
          { symbol: 'USDT', address: '0xUSDT', name: 'Tether' },
        ],
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

      const result = buildDelegationTokenList({
        delegationSettings,
        getSupportedTokensByChainId: () => [],
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

      const result = buildDelegationTokenList({
        delegationSettings,
        getSupportedTokensByChainId: () => [],
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

      const result = buildDelegationTokenList({
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

      const result = buildDelegationTokenList({
        delegationSettings,
        getSupportedTokensByChainId: () => [],
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

      const result = buildDelegationTokenList({
        delegationSettings,
        getSupportedTokensByChainId: () => [],
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

      const result = buildDelegationTokenList({
        delegationSettings,
        getSupportedTokensByChainId: () => [],
      });

      expect(result).toHaveLength(2);
      expect(result[0].symbol).toBe('SOL');
      expect(result[0].caipChainId).toBe(
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      );
      expect(result[1].symbol).toBe('usdc');
    });
  });

  describe('constants', () => {
    it('exports LINEA_CAIP_CHAIN_ID', () => {
      expect(LINEA_CAIP_CHAIN_ID).toBe('eip155:59144');
    });
  });
});
