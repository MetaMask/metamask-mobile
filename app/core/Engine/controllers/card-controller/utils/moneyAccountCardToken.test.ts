import {
  CardFundingToken,
  FundingStatus,
  DelegationSettingsResponse,
} from '../../../../../components/UI/Card/types';
import {
  hasMoneyAccountCardRequirements,
  isMoneyAccountDelegatedForCard,
  resolveMoneyAccountCardToken,
} from './moneyAccountCardToken';

const createDelegationSettings = (
  overrides: Partial<DelegationSettingsResponse['networks'][0]> = {},
): DelegationSettingsResponse => ({
  count: 1,
  _links: { self: '/v1/delegation/chain/config' },
  networks: [
    {
      network: 'monad',
      environment: 'production',
      chainId: '143',
      delegationContract: '0xdelegation',
      tokens: {
        usdc: {
          symbol: 'USDC',
          decimals: 6,
          address: '0xusdc',
        },
      },
      ...overrides,
    },
  ],
});

describe('resolveMoneyAccountCardToken', () => {
  it('returns Monad USDC from delegation settings', () => {
    expect(resolveMoneyAccountCardToken(createDelegationSettings())).toEqual({
      address: '0xusdc',
      symbol: 'USDC',
      name: 'USDC',
      decimals: 6,
      caipChainId: 'eip155:143',
      walletAddress: undefined,
      fundingStatus: FundingStatus.NotEnabled,
      spendableBalance: '0',
      delegationContract: '0xdelegation',
      priority: undefined,
      stagingTokenAddress: undefined,
    });
  });

  it('returns null when Monad is missing', () => {
    expect(
      resolveMoneyAccountCardToken(
        createDelegationSettings({ network: 'linea' }),
      ),
    ).toBeNull();
  });

  it('returns null when USDC is missing', () => {
    expect(
      resolveMoneyAccountCardToken(createDelegationSettings({ tokens: {} })),
    ).toBeNull();
  });

  it('keeps staging token address for non-production settings', () => {
    expect(
      resolveMoneyAccountCardToken(
        createDelegationSettings({ environment: 'staging' }),
      )?.stagingTokenAddress,
    ).toBe('0xusdc');
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

  const createFundingToken = (
    overrides: Partial<CardFundingToken> = {},
  ): CardFundingToken =>
    ({
      address: '0xusdc',
      symbol: 'USDC',
      name: 'USDC',
      decimals: 6,
      caipChainId: 'eip155:143',
      walletAddress: MA_ADDRESS,
      fundingStatus: FundingStatus.Enabled,
      spendableBalance: '0',
      delegationContract: '0xdelegation',
      priority: undefined,
      stagingTokenAddress: undefined,
      ...overrides,
    }) as CardFundingToken;

  it('returns false when no Money Account address is provided', () => {
    expect(
      isMoneyAccountDelegatedForCard({
        fundingTokens: [createFundingToken()],
        moneyAccountAddress: undefined,
      }),
    ).toBe(false);
  });

  it('returns false when the funding token list is empty', () => {
    expect(
      isMoneyAccountDelegatedForCard({
        fundingTokens: [],
        moneyAccountAddress: MA_ADDRESS,
      }),
    ).toBe(false);
  });

  it('returns true when an enabled Monad USDC row matches the Money Account address', () => {
    expect(
      isMoneyAccountDelegatedForCard({
        fundingTokens: [
          createFundingToken({ fundingStatus: FundingStatus.Enabled }),
        ],
        moneyAccountAddress: MA_ADDRESS,
      }),
    ).toBe(true);
  });

  it('returns true when the matching row has Limited status (allowance below the cap still counts as delegated)', () => {
    expect(
      isMoneyAccountDelegatedForCard({
        fundingTokens: [
          createFundingToken({ fundingStatus: FundingStatus.Limited }),
        ],
        moneyAccountAddress: MA_ADDRESS,
      }),
    ).toBe(true);
  });

  it('returns false when the matching row has NotEnabled status (delegation was revoked / never approved)', () => {
    expect(
      isMoneyAccountDelegatedForCard({
        fundingTokens: [
          createFundingToken({ fundingStatus: FundingStatus.NotEnabled }),
        ],
        moneyAccountAddress: MA_ADDRESS,
      }),
    ).toBe(false);
  });

  it('matches addresses case-insensitively (checksum vs all-lowercase)', () => {
    expect(
      isMoneyAccountDelegatedForCard({
        fundingTokens: [
          createFundingToken({
            walletAddress: MA_ADDRESS.toUpperCase(),
          }),
        ],
        moneyAccountAddress: MA_ADDRESS,
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
      }),
    ).toBe(false);
  });

  it('returns false when the funding row is on a different chain than Monad', () => {
    expect(
      isMoneyAccountDelegatedForCard({
        fundingTokens: [createFundingToken({ caipChainId: 'eip155:59144' })],
        moneyAccountAddress: MA_ADDRESS,
      }),
    ).toBe(false);
  });

  it('returns false when the matching row is not USDC', () => {
    expect(
      isMoneyAccountDelegatedForCard({
        fundingTokens: [createFundingToken({ symbol: 'mUSD' })],
        moneyAccountAddress: MA_ADDRESS,
      }),
    ).toBe(false);
  });

  it('returns true when any of several funding tokens matches', () => {
    expect(
      isMoneyAccountDelegatedForCard({
        fundingTokens: [
          createFundingToken({
            symbol: 'USDC',
            caipChainId: 'eip155:59144',
          }),
          createFundingToken({
            walletAddress: '0xother',
            symbol: 'USDC',
          }),
          createFundingToken({ fundingStatus: FundingStatus.Enabled }),
        ],
        moneyAccountAddress: MA_ADDRESS,
      }),
    ).toBe(true);
  });
});
