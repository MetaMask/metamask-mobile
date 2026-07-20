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

  describe('veda token handling', () => {
    const createDelegationSettings = (
      networks: DelegationSettingsResponse['networks'],
    ): DelegationSettingsResponse => ({
      networks,
      count: networks.length,
      _links: { self: 'https://api.example.com' },
    });

    it('uses the delegation-settings address (no SDK remap) for veda even in non-production', () => {
      const VEDA_ADDRESS = '0xb4563bcD3B7764CCBf497f515585f70B6C3EA5Ae';
      const result = buildDelegationTokenList({
        delegationSettings: createDelegationSettings([
          {
            network: 'monad',
            chainId: '143',
            environment: 'staging',
            delegationContract: '0xDelegation',
            tokens: {
              veda: { symbol: 'veda', decimals: 6, address: VEDA_ADDRESS },
            },
          },
        ]),
        getSupportedTokensByChainId: () => [
          { symbol: 'veda', address: '0xSdkAddress', name: 'Veda' },
        ],
      });

      expect(result[0].address).toBe(VEDA_ADDRESS);
      expect(result[0].stagingTokenAddress).toBeUndefined();
      expect(result[0].displaySymbol).toBe('mUSD');
      expect(result[0].symbol).toBe('veda');
    });

    it('does not set displaySymbol on non-veda tokens', () => {
      const result = buildDelegationTokenList({
        delegationSettings: createDelegationSettings([
          {
            network: 'monad',
            chainId: '143',
            environment: 'staging',
            delegationContract: '0xDelegation',
            tokens: {
              usdc: { symbol: 'usdc', decimals: 6, address: '0xUsdc' },
            },
          },
        ]),
        getSupportedTokensByChainId: () => [],
      });

      expect(result[0].displaySymbol).toBeUndefined();
    });
  });

  describe('enforceSupportList', () => {
    const createDelegationSettings = (
      networks: DelegationSettingsResponse['networks'],
    ): DelegationSettingsResponse => ({
      networks,
      count: networks.length,
      _links: { self: 'https://api.example.com' },
    });

    const lineaUsdcAndFoo = createDelegationSettings([
      {
        network: 'linea',
        chainId: '59144',
        environment: 'production',
        delegationContract: '0xDelegation',
        tokens: {
          usdc: { symbol: 'usdc', decimals: 6, address: '0xUSDC' },
          foo: { symbol: 'foo', decimals: 18, address: '0xFOO' },
        },
      },
    ]);

    const vedaOnMonad = createDelegationSettings([
      {
        network: 'monad',
        chainId: '143',
        environment: 'production',
        delegationContract: '0xDelegation',
        tokens: {
          veda: { symbol: 'veda', decimals: 6, address: '0xVEDA' },
        },
      },
    ]);

    it('drops tokens absent from the support list when enforceSupportList is true', () => {
      const result = buildDelegationTokenList({
        delegationSettings: lineaUsdcAndFoo,
        enforceSupportList: true,
        getSupportedTokensByChainId: () => [
          { symbol: 'USDC', address: '0xUSDC', name: 'USD Coin' },
        ],
      });

      expect(result).toHaveLength(1);
      expect(result[0].symbol).toBe('USDC');
    });

    it('keeps unsupported tokens when enforceSupportList is false (default)', () => {
      const result = buildDelegationTokenList({
        delegationSettings: lineaUsdcAndFoo,
        getSupportedTokensByChainId: () => [],
      });

      expect(result).toHaveLength(2);
    });

    it('matches the support list by address even when the symbol differs', () => {
      const result = buildDelegationTokenList({
        delegationSettings: lineaUsdcAndFoo,
        enforceSupportList: true,
        getSupportedTokensByChainId: () => [
          { symbol: 'USD Coin', address: '0xusdc', name: 'USD Coin' },
        ],
      });

      expect(result).toHaveLength(1);
      expect(result[0].address).toBe('0xUSDC');
    });

    it('drops the veda entry when it is not in the support list', () => {
      const result = buildDelegationTokenList({
        delegationSettings: vedaOnMonad,
        enforceSupportList: true,
        getSupportedTokensByChainId: () => [],
      });

      expect(result).toHaveLength(0);
    });

    it('keeps the veda entry (as mUSD) when present in the support list by symbol', () => {
      const result = buildDelegationTokenList({
        delegationSettings: vedaOnMonad,
        enforceSupportList: true,
        getSupportedTokensByChainId: () => [
          { symbol: 'veda', address: '0xVEDA', name: 'Veda' },
        ],
      });

      expect(result).toHaveLength(1);
      expect(result[0].displaySymbol).toBe('mUSD');
    });

    it('keeps the veda entry when matched by address even if the support-list symbol differs', () => {
      const result = buildDelegationTokenList({
        delegationSettings: vedaOnMonad,
        enforceSupportList: true,
        getSupportedTokensByChainId: () => [
          { symbol: 'mUSD', address: '0xveda', name: 'MetaMask USD' },
        ],
      });

      expect(result).toHaveLength(1);
      expect(result[0].displaySymbol).toBe('mUSD');
    });
  });
});
