import {
  CardFundingToken,
  FundingStatus,
  DelegationSettingsResponse,
} from '../../../../../components/UI/Card/types';
import { getVedaTokenConfig } from '../../../../../components/UI/Card/util/vedaToken';
import {
  hasMoneyAccountCardRequirements,
  isAnyMoneyAccountDelegatedForCard,
  isMoneyAccountDelegatedForCard,
  resolveMoneyAccountCardToken,
} from './moneyAccountCardToken';

const VEDA_ADDRESS = '0xb4563bcD3B7764CCBf497f515585f70B6C3EA5Ae';
const DELEGATION_CONTRACT = '0xC7f1b2228fbf28451c7bf791C4f610111f0f32cb';

const createDelegationSettings = (
  overrides: Partial<DelegationSettingsResponse['networks'][0]> = {},
): DelegationSettingsResponse => ({
  count: 1,
  _links: { self: '/v1/delegation/chain/config' },
  networks: [
    {
      network: 'monad',
      environment: 'staging',
      chainId: '143',
      delegationContract: DELEGATION_CONTRACT,
      tokens: {
        usdc: {
          symbol: 'usdc',
          decimals: 6,
          address: '0x3F9608bb41f7C30E82cFD4C812b3Ac2f9cb91198',
        },
        veda: {
          symbol: 'veda',
          decimals: 6,
          address: VEDA_ADDRESS,
        },
      },
      ...overrides,
    },
  ],
});

describe('resolveMoneyAccountCardToken', () => {
  it('returns the Veda token from delegation settings', () => {
    expect(resolveMoneyAccountCardToken(createDelegationSettings())).toEqual({
      address: VEDA_ADDRESS,
      symbol: 'veda',
      name: 'veda',
      decimals: 6,
      caipChainId: 'eip155:143',
      walletAddress: undefined,
      fundingStatus: FundingStatus.NotEnabled,
      spendableBalance: '0',
      delegationContract: DELEGATION_CONTRACT,
      priority: undefined,
      stagingTokenAddress: undefined,
      displaySymbol: 'mUSD',
    });
  });

  it('returns null when Monad is missing', () => {
    expect(
      resolveMoneyAccountCardToken(
        createDelegationSettings({ network: 'linea' }),
      ),
    ).toBeNull();
  });

  it('returns null when the veda key is missing', () => {
    expect(
      resolveMoneyAccountCardToken(
        createDelegationSettings({
          tokens: {
            usdc: { symbol: 'USDC', decimals: 6, address: '0xusdc' },
          },
        }),
      ),
    ).toBeNull();
  });

  it('uses the delegation-settings address directly (no SDK remap)', () => {
    const customAddress = '0x1111111111111111111111111111111111111111';
    const result = resolveMoneyAccountCardToken(
      createDelegationSettings({
        environment: 'production',
        tokens: {
          veda: { symbol: 'veda', decimals: 6, address: customAddress },
        },
      }),
    );
    expect(result?.address).toBe(customAddress);
    expect(result?.stagingTokenAddress).toBeUndefined();
  });
});

describe('hasMoneyAccountCardRequirements', () => {
  it('returns true when flag, vault config, and primary Money Account are present', () => {
    expect(
      hasMoneyAccountCardRequirements({
        isMoneyAccountEnabled: true,
        vaultConfig: { chainId: '0x8f' },
        moneyAccountAddress: '0x123',
      }),
    ).toBe(true);
  });

  it('returns false when the feature flag is disabled', () => {
    expect(
      hasMoneyAccountCardRequirements({
        isMoneyAccountEnabled: false,
        vaultConfig: { chainId: '0x8f' },
        moneyAccountAddress: '0x123',
      }),
    ).toBe(false);
  });

  it('returns false when the vault config is missing', () => {
    expect(
      hasMoneyAccountCardRequirements({
        isMoneyAccountEnabled: true,
        vaultConfig: undefined,
        moneyAccountAddress: '0x123',
      }),
    ).toBe(false);
  });

  it('returns false when the primary Money Account is missing', () => {
    expect(
      hasMoneyAccountCardRequirements({
        isMoneyAccountEnabled: true,
        vaultConfig: { chainId: '0x8f' },
        moneyAccountAddress: undefined,
      }),
    ).toBe(false);
  });
});

describe('isMoneyAccountDelegatedForCard', () => {
  const MA_ADDRESS = '0x1234567890abcdef1234567890abcdef12345678';
  const vedaConfig = getVedaTokenConfig(createDelegationSettings());

  const createFundingToken = (
    overrides: Partial<CardFundingToken> = {},
  ): CardFundingToken =>
    ({
      address: VEDA_ADDRESS,
      symbol: 'veda',
      name: 'veda',
      decimals: 6,
      caipChainId: 'eip155:143',
      walletAddress: MA_ADDRESS,
      fundingStatus: FundingStatus.Enabled,
      spendableBalance: '0',
      delegationContract: DELEGATION_CONTRACT,
      priority: undefined,
      stagingTokenAddress: undefined,
      displaySymbol: 'mUSD',
      ...overrides,
    }) as CardFundingToken;

  it('returns false when no Money Account address is provided', () => {
    expect(
      isMoneyAccountDelegatedForCard({
        fundingTokens: [createFundingToken()],
        moneyAccountAddress: undefined,
        vedaConfig,
      }),
    ).toBe(false);
  });

  it('returns false when vedaConfig is null', () => {
    expect(
      isMoneyAccountDelegatedForCard({
        fundingTokens: [createFundingToken()],
        moneyAccountAddress: MA_ADDRESS,
        vedaConfig: null,
      }),
    ).toBe(false);
  });

  it('returns false when the funding token list is empty', () => {
    expect(
      isMoneyAccountDelegatedForCard({
        fundingTokens: [],
        moneyAccountAddress: MA_ADDRESS,
        vedaConfig,
      }),
    ).toBe(false);
  });

  it('returns true when an enabled Veda row matches the Money Account address', () => {
    expect(
      isMoneyAccountDelegatedForCard({
        fundingTokens: [
          createFundingToken({ fundingStatus: FundingStatus.Enabled }),
        ],
        moneyAccountAddress: MA_ADDRESS,
        vedaConfig,
      }),
    ).toBe(true);
  });

  it('returns true when the matching row has Limited status', () => {
    expect(
      isMoneyAccountDelegatedForCard({
        fundingTokens: [
          createFundingToken({ fundingStatus: FundingStatus.Limited }),
        ],
        moneyAccountAddress: MA_ADDRESS,
        vedaConfig,
      }),
    ).toBe(true);
  });

  it('returns false when the matching row has NotEnabled status', () => {
    expect(
      isMoneyAccountDelegatedForCard({
        fundingTokens: [
          createFundingToken({ fundingStatus: FundingStatus.NotEnabled }),
        ],
        moneyAccountAddress: MA_ADDRESS,
        vedaConfig,
      }),
    ).toBe(false);
  });

  it('matches addresses case-insensitively', () => {
    expect(
      isMoneyAccountDelegatedForCard({
        fundingTokens: [
          createFundingToken({ walletAddress: MA_ADDRESS.toUpperCase() }),
        ],
        moneyAccountAddress: MA_ADDRESS,
        vedaConfig,
      }),
    ).toBe(true);
  });

  it('returns false when the wallet address does not match the Money Account', () => {
    expect(
      isMoneyAccountDelegatedForCard({
        fundingTokens: [
          createFundingToken({
            walletAddress: '0x0000000000000000000000000000000000000000',
          }),
        ],
        moneyAccountAddress: MA_ADDRESS,
        vedaConfig,
      }),
    ).toBe(false);
  });

  it('returns false when the funding row is on a different chain than Monad', () => {
    expect(
      isMoneyAccountDelegatedForCard({
        fundingTokens: [createFundingToken({ caipChainId: 'eip155:59144' })],
        moneyAccountAddress: MA_ADDRESS,
        vedaConfig,
      }),
    ).toBe(false);
  });

  it('returns false when the matching row is not Veda', () => {
    expect(
      isMoneyAccountDelegatedForCard({
        fundingTokens: [
          createFundingToken({
            address: '0x3F9608bb41f7C30E82cFD4C812b3Ac2f9cb91198',
            symbol: 'usdc',
          }),
        ],
        moneyAccountAddress: MA_ADDRESS,
        vedaConfig,
      }),
    ).toBe(false);
  });

  it('returns true when any of several funding tokens matches', () => {
    expect(
      isMoneyAccountDelegatedForCard({
        fundingTokens: [
          createFundingToken({
            address: '0x3F9608bb41f7C30E82cFD4C812b3Ac2f9cb91198',
            symbol: 'usdc',
          }),
          createFundingToken({ walletAddress: '0xother' }),
          createFundingToken({ fundingStatus: FundingStatus.Enabled }),
        ],
        moneyAccountAddress: MA_ADDRESS,
        vedaConfig,
      }),
    ).toBe(true);
  });
});

describe('isAnyMoneyAccountDelegatedForCard', () => {
  const vedaConfig = getVedaTokenConfig(createDelegationSettings());

  const createFundingToken = (
    overrides: Partial<CardFundingToken> = {},
  ): CardFundingToken =>
    ({
      address: VEDA_ADDRESS,
      symbol: 'veda',
      name: 'veda',
      decimals: 6,
      caipChainId: 'eip155:143',
      walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
      fundingStatus: FundingStatus.Enabled,
      spendableBalance: '0',
      delegationContract: DELEGATION_CONTRACT,
      priority: undefined,
      stagingTokenAddress: undefined,
      displaySymbol: 'mUSD',
      ...overrides,
    }) as CardFundingToken;

  it('returns true for a delegated Veda token on any (non-primary) wallet address', () => {
    expect(
      isAnyMoneyAccountDelegatedForCard({
        fundingTokens: [
          createFundingToken({
            walletAddress: '0x9999999999999999999999999999999999999999',
          }),
        ],
        vedaConfig,
      }),
    ).toBe(true);
  });

  it('returns false when no Veda token is enabled', () => {
    expect(
      isAnyMoneyAccountDelegatedForCard({
        fundingTokens: [
          createFundingToken({ fundingStatus: FundingStatus.NotEnabled }),
        ],
        vedaConfig,
      }),
    ).toBe(false);
  });

  it('returns false when vedaConfig is null', () => {
    expect(
      isAnyMoneyAccountDelegatedForCard({
        fundingTokens: [createFundingToken()],
        vedaConfig: null,
      }),
    ).toBe(false);
  });
});
