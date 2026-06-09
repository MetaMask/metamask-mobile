import type { CaipChainId } from '@metamask/utils';
import type { DelegationSettingsResponse } from '../types';
import {
  getVedaTokenConfig,
  isVedaToken,
  MONEY_ACCOUNT_DELEGATION_NETWORK,
  MONEY_ACCOUNT_DELEGATION_TOKEN_KEY,
  MONEY_ACCOUNT_DISPLAY_SYMBOL,
} from './vedaToken';

const VEDA_ADDRESS = '0xb4563bcD3B7764CCBf497f515585f70B6C3EA5Ae';
const USDC_ADDRESS = '0x3F9608bb41f7C30E82cFD4C812b3Ac2f9cb91198';
const DELEGATION_CONTRACT = '0xC7f1b2228fbf28451c7bf791C4f610111f0f32cb';

const makeSettings = (
  overrides?: Partial<DelegationSettingsResponse['networks'][number]>,
): DelegationSettingsResponse => ({
  networks: [
    {
      network: MONEY_ACCOUNT_DELEGATION_NETWORK,
      environment: 'staging',
      chainId: '143',
      delegationContract: DELEGATION_CONTRACT,
      tokens: {
        usdc: { symbol: 'usdc', decimals: 6, address: USDC_ADDRESS },
        veda: { symbol: 'veda', decimals: 6, address: VEDA_ADDRESS },
      },
      ...overrides,
    },
  ],
  count: 1,
  _links: { self: '/v1/delegation/chain/config' },
});

describe('vedaToken constants', () => {
  it('exposes the canonical network name', () => {
    expect(MONEY_ACCOUNT_DELEGATION_NETWORK).toBe('monad');
  });
  it('exposes the delegation-settings token key', () => {
    expect(MONEY_ACCOUNT_DELEGATION_TOKEN_KEY).toBe('veda');
  });
  it('exposes the user-facing display symbol', () => {
    expect(MONEY_ACCOUNT_DISPLAY_SYMBOL).toBe('mUSD');
  });
});

describe('getVedaTokenConfig', () => {
  it('returns null when delegation settings are missing', () => {
    expect(getVedaTokenConfig(null)).toBeNull();
    expect(getVedaTokenConfig(undefined)).toBeNull();
  });

  it('returns null when no networks are configured', () => {
    expect(
      getVedaTokenConfig({ networks: [], count: 0, _links: { self: '' } }),
    ).toBeNull();
  });

  it('returns null when the monad network is absent', () => {
    const settings = makeSettings({ network: 'linea' });
    expect(getVedaTokenConfig(settings)).toBeNull();
  });

  it('returns null when the monad network has no veda key', () => {
    const settings = makeSettings({
      tokens: {
        usdc: { symbol: 'usdc', decimals: 6, address: USDC_ADDRESS },
      },
    });
    expect(getVedaTokenConfig(settings)).toBeNull();
  });

  it('returns null when veda token has no address', () => {
    const settings = makeSettings({
      tokens: {
        veda: { symbol: 'veda', decimals: 6, address: '' },
      },
    });
    expect(getVedaTokenConfig(settings)).toBeNull();
  });

  it('returns null when delegationContract is missing', () => {
    const settings = makeSettings({ delegationContract: '' });
    expect(getVedaTokenConfig(settings)).toBeNull();
  });

  it('parses decimal chainId into CAIP', () => {
    const config = getVedaTokenConfig(makeSettings());
    expect(config).toEqual({
      caipChainId: 'eip155:143',
      address: VEDA_ADDRESS,
      decimals: 6,
      delegationContract: DELEGATION_CONTRACT,
    });
  });

  it('parses hex chainId into CAIP', () => {
    const config = getVedaTokenConfig(makeSettings({ chainId: '0x8f' }));
    expect(config?.caipChainId).toBe('eip155:143');
  });

  it('matches network case-insensitively', () => {
    const config = getVedaTokenConfig(makeSettings({ network: 'Monad' }));
    expect(config?.address).toBe(VEDA_ADDRESS);
  });
});

describe('isVedaToken', () => {
  const vedaConfig = getVedaTokenConfig(makeSettings());

  it('returns false when vedaConfig is null', () => {
    expect(
      isVedaToken(
        { address: VEDA_ADDRESS, caipChainId: 'eip155:143' as CaipChainId },
        null,
      ),
    ).toBe(false);
  });

  it('returns true on exact match', () => {
    expect(
      isVedaToken(
        { address: VEDA_ADDRESS, caipChainId: 'eip155:143' as CaipChainId },
        vedaConfig,
      ),
    ).toBe(true);
  });

  it('matches address case-insensitively', () => {
    expect(
      isVedaToken(
        {
          address: VEDA_ADDRESS.toUpperCase(),
          caipChainId: 'eip155:143' as CaipChainId,
        },
        vedaConfig,
      ),
    ).toBe(true);
  });

  it('returns false for non-veda address on monad', () => {
    expect(
      isVedaToken(
        { address: USDC_ADDRESS, caipChainId: 'eip155:143' as CaipChainId },
        vedaConfig,
      ),
    ).toBe(false);
  });

  it('returns false for veda address on a different chain', () => {
    expect(
      isVedaToken(
        { address: VEDA_ADDRESS, caipChainId: 'eip155:1' as CaipChainId },
        vedaConfig,
      ),
    ).toBe(false);
  });

  it('matches via stagingTokenAddress when address holds the SDK mainnet address', () => {
    expect(
      isVedaToken(
        {
          address: '0x0000000000000000000000000000000000000099',
          stagingTokenAddress: VEDA_ADDRESS,
          caipChainId: 'eip155:143' as CaipChainId,
        },
        vedaConfig,
      ),
    ).toBe(true);
  });

  it('matches via symbol when token address is null (no feature-flag mapping yet)', () => {
    expect(
      isVedaToken(
        {
          address: null,
          stagingTokenAddress: null,
          symbol: 'VEDA',
          caipChainId: 'eip155:143' as CaipChainId,
        },
        vedaConfig,
      ),
    ).toBe(true);
  });

  it('does not symbol-match across chains', () => {
    expect(
      isVedaToken(
        {
          address: null,
          symbol: 'veda',
          caipChainId: 'eip155:1' as CaipChainId,
        },
        vedaConfig,
      ),
    ).toBe(false);
  });
});
