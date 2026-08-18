import type { ImmersveProgramConfig } from '../../../../selectors/featureFlagController/card';
import {
  getImmersveSignupFundingChannelId,
  getImmersveSignupNetwork,
  hasImmersveMonadConfig,
  resolveImmersveNetworkProgramValue,
} from './immersveSignupNetwork';

const BASE_CONFIG: ImmersveProgramConfig = {
  network: 'base-mainnet',
  fundingChannelId: 'base-channel',
  cardProgramId: 'base-program',
  spenderAddress: '0xBaseSpender',
};

const MONAD_CONFIG: ImmersveProgramConfig = {
  ...BASE_CONFIG,
  monadConfig: {
    fundingChannelId: 'monad-channel',
    cardProgramId: 'monad-program',
    spenderAddress: '0xMonadSpender',
  },
};

describe('immersveSignupNetwork', () => {
  it('treats a missing or empty monadConfig as absent', () => {
    expect(hasImmersveMonadConfig(BASE_CONFIG)).toBe(false);
    expect(hasImmersveMonadConfig({ ...BASE_CONFIG, monadConfig: {} })).toBe(
      false,
    );
    expect(hasImmersveMonadConfig(undefined)).toBe(false);
  });

  it('keeps the top-level flag network when monadConfig is absent', () => {
    expect(getImmersveSignupNetwork(BASE_CONFIG)).toBe('base-mainnet');
    expect(getImmersveSignupFundingChannelId(BASE_CONFIG)).toBe('base-channel');
    expect(
      resolveImmersveNetworkProgramValue(
        'base-mainnet',
        'spenderAddress',
        BASE_CONFIG,
      ),
    ).toBe('0xBaseSpender');
  });

  it('routes signup to Monad when monadConfig is present', () => {
    expect(hasImmersveMonadConfig(MONAD_CONFIG)).toBe(true);
    expect(getImmersveSignupNetwork(MONAD_CONFIG)).toBe('monad-mainnet');
    expect(getImmersveSignupFundingChannelId(MONAD_CONFIG)).toBe(
      'monad-channel',
    );
    expect(
      resolveImmersveNetworkProgramValue(
        'monad-mainnet',
        'cardProgramId',
        MONAD_CONFIG,
      ),
    ).toBe('monad-program');
  });

  it('honours monadConfig.network when provided', () => {
    expect(
      getImmersveSignupNetwork({
        ...BASE_CONFIG,
        monadConfig: {
          network: 'monad-mainnet',
          fundingChannelId: 'monad-channel',
        },
      }),
    ).toBe('monad-mainnet');
  });

  it('keeps Base program values for Base funding sources when monadConfig is present', () => {
    expect(
      resolveImmersveNetworkProgramValue(
        'base-mainnet',
        'spenderAddress',
        MONAD_CONFIG,
      ),
    ).toBe('0xBaseSpender');
    expect(
      resolveImmersveNetworkProgramValue(
        'base-mainnet',
        'fundingChannelId',
        MONAD_CONFIG,
      ),
    ).toBe('base-channel');
  });

  it('does not fall back to the Base channel when monadConfig channel is empty', () => {
    expect(
      getImmersveSignupFundingChannelId({
        ...BASE_CONFIG,
        monadConfig: { fundingChannelId: '' },
      }),
    ).toBe('');
  });
});
