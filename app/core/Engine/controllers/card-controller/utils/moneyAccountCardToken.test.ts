import {
  FundingStatus,
  DelegationSettingsResponse,
} from '../../../../../components/UI/Card/types';
import {
  hasMoneyAccountCardRequirements,
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
