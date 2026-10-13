import { IMMERSVE_MONEY_ACCOUNT_CONFIG } from '../../../../selectors/featureFlagController/card/defaults';
import {
  getImmersveMoneyAccountConfig,
  getImmersveMoneyAccountToken,
  isImmersveMoneyAccountFundingSource,
} from './immersveMoneyAccount';

describe('getImmersveMoneyAccountConfig', () => {
  it('returns the block when the country is claimed', () => {
    expect(
      getImmersveMoneyAccountConfig(
        { moneyAccountConfig: IMMERSVE_MONEY_ACCOUNT_CONFIG },
        'nz',
      ),
    ).toBe(IMMERSVE_MONEY_ACCOUNT_CONFIG);
  });

  it('returns null for an unclaimed country or a missing block', () => {
    expect(
      getImmersveMoneyAccountConfig(
        { moneyAccountConfig: IMMERSVE_MONEY_ACCOUNT_CONFIG },
        'GB',
      ),
    ).toBeNull();
    expect(getImmersveMoneyAccountConfig({}, 'NZ')).toBeNull();
    expect(
      getImmersveMoneyAccountConfig(
        { moneyAccountConfig: IMMERSVE_MONEY_ACCOUNT_CONFIG },
        null,
      ),
    ).toBeNull();
  });
});

describe('isImmersveMoneyAccountFundingSource', () => {
  it('matches the configured funding channel', () => {
    const config = { moneyAccountConfig: IMMERSVE_MONEY_ACCOUNT_CONFIG };
    expect(
      isImmersveMoneyAccountFundingSource(
        { fundingChannelId: IMMERSVE_MONEY_ACCOUNT_CONFIG.fundingChannelId },
        config,
      ),
    ).toBe(true);
    expect(
      isImmersveMoneyAccountFundingSource(
        { fundingChannelId: 'other' },
        config,
      ),
    ).toBe(false);
  });
});

describe('getImmersveMoneyAccountToken', () => {
  it('returns Veda on Monad', () => {
    expect(getImmersveMoneyAccountToken()).toEqual({
      caipChainId: 'eip155:143',
      tokenAddress: '0x1C8a336051D2024E318A229d01F9F6CF96efD316',
      decimals: 6,
      symbol: 'veda',
    });
  });
});
