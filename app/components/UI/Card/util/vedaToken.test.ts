import type { CaipChainId } from '@metamask/utils';
import type { DelegationSettingsResponse } from '../types';
import {
  getVedaTokenConfig,
  getVedaTokenConfigFromFeatureFlag,
  isVedaToken,
  isMoneyAccountCardTokenAllowlisted,
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

describe('getVedaTokenConfigFromFeatureFlag', () => {
  it('returns null when chains is null/undefined', () => {
    expect(getVedaTokenConfigFromFeatureFlag(null)).toBeNull();
    expect(getVedaTokenConfigFromFeatureFlag(undefined)).toBeNull();
  });

  it('returns null when no veda token is allowlisted', () => {
    expect(
      getVedaTokenConfigFromFeatureFlag({
        'eip155:143': {
          tokens: [{ symbol: 'USDC', address: USDC_ADDRESS, decimals: 6 }],
        },
      }),
    ).toBeNull();
  });

  it('returns null when the veda token is disabled', () => {
    expect(
      getVedaTokenConfigFromFeatureFlag({
        'eip155:143': {
          tokens: [
            {
              symbol: 'veda',
              address: VEDA_ADDRESS,
              decimals: 6,
              enabled: false,
            },
          ],
        },
      }),
    ).toBeNull();
  });

  it('returns null when the veda token has no address', () => {
    expect(
      getVedaTokenConfigFromFeatureFlag({
        'eip155:143': {
          tokens: [{ symbol: 'veda', address: '', decimals: 6 }],
        },
      }),
    ).toBeNull();
  });

  it('builds a config (without delegationContract) from the veda token', () => {
    expect(
      getVedaTokenConfigFromFeatureFlag({
        'eip155:143': {
          tokens: [
            { symbol: 'USDC', address: USDC_ADDRESS, decimals: 6 },
            { symbol: 'VEDA', address: VEDA_ADDRESS, decimals: 6 },
          ],
        },
      }),
    ).toEqual({
      caipChainId: 'eip155:143',
      address: VEDA_ADDRESS,
      decimals: 6,
    });
  });

  it('treats a token with enabled omitted as enabled', () => {
    const config = getVedaTokenConfigFromFeatureFlag({
      'eip155:143': {
        tokens: [{ symbol: 'veda', address: VEDA_ADDRESS, decimals: 6 }],
      },
    });
    expect(config?.address).toBe(VEDA_ADDRESS);
  });

  it('defaults decimals to 6 when missing', () => {
    const config = getVedaTokenConfigFromFeatureFlag({
      'eip155:143': {
        tokens: [{ symbol: 'veda', address: VEDA_ADDRESS }],
      },
    });
    expect(config?.decimals).toBe(6);
  });

  it('ignores veda tokens on non-Monad chains', () => {
    expect(
      getVedaTokenConfigFromFeatureFlag({
        'eip155:59144': {
          tokens: [{ symbol: 'veda', address: VEDA_ADDRESS, decimals: 6 }],
        },
      }),
    ).toBeNull();
  });

  it('resolves the Monad veda row when veda is listed on multiple chains', () => {
    const config = getVedaTokenConfigFromFeatureFlag({
      'eip155:59144': {
        tokens: [{ symbol: 'veda', address: USDC_ADDRESS, decimals: 6 }],
      },
      'eip155:143': {
        tokens: [{ symbol: 'veda', address: VEDA_ADDRESS, decimals: 6 }],
      },
    });
    expect(config).toEqual({
      caipChainId: 'eip155:143',
      address: VEDA_ADDRESS,
      decimals: 6,
    });
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

describe('isMoneyAccountCardTokenAllowlisted', () => {
  const vedaConfig = getVedaTokenConfig(makeSettings());

  it('returns false when chains is null/undefined', () => {
    expect(isMoneyAccountCardTokenAllowlisted(null, vedaConfig)).toBe(false);
    expect(isMoneyAccountCardTokenAllowlisted(undefined, vedaConfig)).toBe(
      false,
    );
  });

  it('returns false when vedaConfig is null/undefined', () => {
    const chains = { 'eip155:143': { tokens: [{ symbol: 'veda' }] } };
    expect(isMoneyAccountCardTokenAllowlisted(chains, null)).toBe(false);
    expect(isMoneyAccountCardTokenAllowlisted(chains, undefined)).toBe(false);
  });

  it('returns true when an enabled veda token is present', () => {
    expect(
      isMoneyAccountCardTokenAllowlisted(
        {
          'eip155:143': {
            tokens: [{ symbol: 'veda', enabled: true }],
          },
        },
        vedaConfig,
      ),
    ).toBe(true);
  });

  it('matches the veda symbol case-insensitively', () => {
    expect(
      isMoneyAccountCardTokenAllowlisted(
        {
          'eip155:143': { tokens: [{ symbol: 'VEDA', enabled: true }] },
        },
        vedaConfig,
      ),
    ).toBe(true);
  });

  it('matches by VEDA address when allowlisted under the mUSD display symbol', () => {
    expect(
      isMoneyAccountCardTokenAllowlisted(
        {
          'eip155:143': {
            tokens: [
              {
                address: VEDA_ADDRESS,
                symbol: MONEY_ACCOUNT_DISPLAY_SYMBOL,
                enabled: true,
              },
            ],
          },
        },
        vedaConfig,
      ),
    ).toBe(true);
  });

  it('matches the VEDA address case-insensitively', () => {
    expect(
      isMoneyAccountCardTokenAllowlisted(
        {
          'eip155:143': {
            tokens: [{ address: VEDA_ADDRESS.toUpperCase(), symbol: 'mUSD' }],
          },
        },
        vedaConfig,
      ),
    ).toBe(true);
  });

  it('treats a token with enabled omitted as enabled', () => {
    expect(
      isMoneyAccountCardTokenAllowlisted(
        {
          'eip155:143': { tokens: [{ symbol: 'veda' }] },
        },
        vedaConfig,
      ),
    ).toBe(true);
  });

  it('returns false when the veda token is disabled', () => {
    expect(
      isMoneyAccountCardTokenAllowlisted(
        {
          'eip155:143': { tokens: [{ symbol: 'veda', enabled: false }] },
        },
        vedaConfig,
      ),
    ).toBe(false);
  });

  it('returns false when the matching token is on a different chain', () => {
    expect(
      isMoneyAccountCardTokenAllowlisted(
        {
          'eip155:59144': {
            tokens: [{ address: VEDA_ADDRESS, symbol: 'mUSD' }],
          },
        },
        vedaConfig,
      ),
    ).toBe(false);
  });

  it('returns false when no veda token is allowlisted', () => {
    expect(
      isMoneyAccountCardTokenAllowlisted(
        {
          'eip155:143': {
            tokens: [{ symbol: 'USDC', enabled: true }],
          },
        },
        vedaConfig,
      ),
    ).toBe(false);
  });
});
