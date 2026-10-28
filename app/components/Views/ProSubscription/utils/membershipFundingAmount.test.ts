import { getVaultRate } from '../../../UI/Money/utils/moneyAccountTransactions';
import { getProviderByChainId } from '../../../../util/notifications/methods/common';
import {
  fetchMembershipFundingRates,
  getMembershipFundingAmount,
  previewDepositShares,
  previewRedeemAssets,
  previewSettledValue,
} from './membershipFundingAmount';

jest.mock('../../../UI/Money/utils/moneyAccountTransactions', () => ({
  getVaultRate: jest.fn(),
}));

jest.mock('../../../../util/notifications/methods/common', () => ({
  getProviderByChainId: jest.fn(),
}));

const BASE_RATE = BigInt(1_000_000);
const PREMIUM_RATE = BigInt(1_002_997);
const RATES = { baseRate: BASE_RATE, premiumRate: PREMIUM_RATE };

describe('previewDepositShares', () => {
  it('rounds the mint down against the depositor using rate + 1', () => {
    expect(previewDepositShares(BigInt(4_990_000), BASE_RATE)).toBe(
      BigInt(4_989_995),
    );
  });
});

describe('previewRedeemAssets', () => {
  it('values shares at floor(shares * rate / 1e6)', () => {
    expect(previewRedeemAssets(BigInt(4_975_090), PREMIUM_RATE)).toBe(
      BigInt(4_990_000),
    );
  });
});

describe('previewSettledValue', () => {
  it('settles an exact $4.99 funding below $4.99 after base and premium deposits', () => {
    expect(previewSettledValue(BigInt(4_990_000), RATES)).toBe(
      BigInt(4_989_989),
    );
  });

  it('covers only the base deposit when no premium rate is given', () => {
    expect(
      previewSettledValue(BigInt(4_990_000), { baseRate: BASE_RATE }),
    ).toBe(BigInt(4_989_995));
  });
});

describe('getMembershipFundingAmount', () => {
  it.each([
    ['$4.99 monthly', BigInt(4_990_000), BigInt(4_990_013)],
    ['$49.90', BigInt(49_900_000), BigInt(49_900_103)],
    ['$499 yearly', BigInt(499_000_000), BigInt(499_001_000)],
  ])(
    'adds the rounding add-on plus safety units for %s',
    (_label, target, expected) => {
      const funding = getMembershipFundingAmount(target, RATES);

      expect(funding).toBe(expected);
      expect(previewSettledValue(funding, RATES)).toBeGreaterThanOrEqual(
        target,
      );
    },
  );

  it('returns the smallest amount that settles at the target before safety units', () => {
    const funding = getMembershipFundingAmount(BigInt(4_990_000), RATES);

    expect(previewSettledValue(funding - BigInt(3), RATES)).toBeLessThan(
      BigInt(4_990_000),
    );
  });

  it('covers only the base deposit when no premium rate is given', () => {
    expect(
      getMembershipFundingAmount(BigInt(4_990_000), { baseRate: BASE_RATE }),
    ).toBe(BigInt(4_990_007));
  });

  it('returns 0 when there is no shortfall', () => {
    expect(getMembershipFundingAmount(BigInt(0), RATES)).toBe(BigInt(0));
  });
});

describe('fetchMembershipFundingRates', () => {
  const mockedGetVaultRate = jest.mocked(getVaultRate);
  const mockedGetProvider = jest.mocked(getProviderByChainId);
  const provider = {} as ReturnType<typeof getProviderByChainId>;
  const baseVault = { chainId: '0x8f', accountantAddress: '0xbase' };
  const premiumVault = { chainId: '0x8f', accountantAddress: '0xpremium' };

  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetProvider.mockReturnValue(provider);
    mockedGetVaultRate.mockImplementation(async ({ accountantAddress }) =>
      accountantAddress === '0xbase' ? BASE_RATE : PREMIUM_RATE,
    );
  });

  it('reads both accountant rates', async () => {
    const rates = await fetchMembershipFundingRates(baseVault, premiumVault);

    expect(rates).toStrictEqual(RATES);
    expect(mockedGetVaultRate).toHaveBeenCalledWith({
      accountantAddress: '0xbase',
      provider,
    });
    expect(mockedGetVaultRate).toHaveBeenCalledWith({
      accountantAddress: '0xpremium',
      provider,
    });
  });

  it('leaves the premium rate undefined when the premium vault is not configured', async () => {
    const rates = await fetchMembershipFundingRates(baseVault, undefined);

    expect(rates).toStrictEqual({
      baseRate: BASE_RATE,
      premiumRate: undefined,
    });
    expect(mockedGetVaultRate).toHaveBeenCalledTimes(1);
  });

  it('throws when no provider exists for the vault chain', async () => {
    mockedGetProvider.mockReturnValue(undefined);

    await expect(
      fetchMembershipFundingRates(baseVault, premiumVault),
    ).rejects.toThrow('No provider available for chain 0x8f');
  });
});
