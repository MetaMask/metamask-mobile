import {
  CardProviderIds,
  type CardSignInOption,
  type CardSignInResolution,
} from '../../../../../core/Engine/controllers/card-controller/provider-types';
import {
  isCountryLocked,
  resolveActiveBanner,
  resolveAuthView,
} from './resolveAuthView';

const walletOption: CardSignInOption = {
  providerId: CardProviderIds.Immersve,
  method: 'siwe',
};
const emailOption: CardSignInOption = {
  providerId: CardProviderIds.Baanx,
  method: 'email_password',
};

const ADDR = '0x1234567890123456789012345678901234567890';

const base = {
  isOtpStep: false,
  isResolving: false,
  resolution: null as CardSignInResolution | null,
  ukMode: null as 'email' | 'wallet' | null,
  resumeEmail: false,
};

describe('resolveAuthView', () => {
  it('returns otp before any other mode', () => {
    expect(
      resolveAuthView({
        ...base,
        isOtpStep: true,
        isResolving: true,
        resolution: {
          kind: 'wallet',
          option: walletOption,
          address: ADDR,
          source: 'record',
        },
      }),
    ).toEqual({ mode: 'otp' });
  });

  it('returns resolving when not on otp', () => {
    expect(
      resolveAuthView({
        ...base,
        isResolving: true,
        resolution: { kind: 'email', option: emailOption },
      }),
    ).toEqual({ mode: 'resolving' });
  });

  it('returns awaiting_country when resolution is null', () => {
    expect(resolveAuthView(base)).toEqual({ mode: 'awaiting_country' });
  });

  it('returns wallet linked for a wallet resolution', () => {
    expect(
      resolveAuthView({
        ...base,
        resolution: {
          kind: 'wallet',
          option: walletOption,
          address: ADDR,
          source: 'lookup',
        },
      }),
    ).toEqual({
      mode: 'wallet',
      option: walletOption,
      address: ADDR,
      origin: 'linked',
    });
  });

  it('returns account_missing for wallet_account_missing', () => {
    expect(
      resolveAuthView({
        ...base,
        resolution: {
          kind: 'wallet_account_missing',
          option: walletOption,
          address: ADDR,
        },
      }),
    ).toEqual({
      mode: 'account_missing',
      option: walletOption,
      address: ADDR,
    });
  });

  it('returns wallet resume when resumeEmail is false', () => {
    expect(
      resolveAuthView({
        ...base,
        resolution: {
          kind: 'resume',
          option: walletOption,
          address: ADDR,
          stage: 'identity',
        },
      }),
    ).toEqual({
      mode: 'wallet',
      option: walletOption,
      address: ADDR,
      origin: 'resume',
    });
  });

  it('returns email resume when resumeEmail is true', () => {
    expect(
      resolveAuthView({
        ...base,
        resumeEmail: true,
        resolution: {
          kind: 'resume',
          option: walletOption,
          address: ADDR,
          stage: 'spending',
        },
      }),
    ).toEqual({ mode: 'email', origin: 'resume' });
  });

  it('returns email only for an email resolution', () => {
    expect(
      resolveAuthView({
        ...base,
        resolution: { kind: 'email', option: emailOption },
      }),
    ).toEqual({ mode: 'email', origin: 'only' });
  });

  describe('unresolved', () => {
    const unresolved: CardSignInResolution = {
      kind: 'unresolved',
      options: [walletOption, emailOption],
      reason: 'no_match',
    };

    it('returns fork when ukMode is null', () => {
      expect(resolveAuthView({ ...base, resolution: unresolved })).toEqual({
        mode: 'fork',
        options: [walletOption, emailOption],
        reason: 'no_match',
      });
    });

    it('returns wallet manual when ukMode is wallet', () => {
      expect(
        resolveAuthView({
          ...base,
          resolution: unresolved,
          ukMode: 'wallet',
        }),
      ).toEqual({
        mode: 'wallet',
        option: walletOption,
        address: null,
        origin: 'manual',
      });
    });

    it('returns email fork when ukMode is email', () => {
      expect(
        resolveAuthView({
          ...base,
          resolution: unresolved,
          ukMode: 'email',
        }),
      ).toEqual({ mode: 'email', origin: 'fork' });
    });

    it('falls back to fork when wallet mode has no siwe option', () => {
      expect(
        resolveAuthView({
          ...base,
          ukMode: 'wallet',
          resolution: {
            kind: 'unresolved',
            options: [emailOption],
            reason: 'check_failed',
          },
        }),
      ).toEqual({
        mode: 'fork',
        options: [emailOption],
        reason: 'check_failed',
      });
    });
  });
});

describe('isCountryLocked', () => {
  it('locks resolving and account_missing', () => {
    expect(
      isCountryLocked(
        { mode: 'resolving' },
        { countryKey: 'US', migrationPhase: 'soft' },
      ),
    ).toBe(true);
    expect(
      isCountryLocked(
        {
          mode: 'account_missing',
          option: walletOption,
          address: ADDR,
        },
        { countryKey: 'US', migrationPhase: 'soft' },
      ),
    ).toBe(true);
  });

  it('locks linked and resume wallet, not manual', () => {
    expect(
      isCountryLocked(
        {
          mode: 'wallet',
          option: walletOption,
          address: ADDR,
          origin: 'linked',
        },
        { countryKey: 'GB', migrationPhase: 'soft' },
      ),
    ).toBe(true);
    expect(
      isCountryLocked(
        {
          mode: 'wallet',
          option: walletOption,
          address: ADDR,
          origin: 'resume',
        },
        { countryKey: 'GB', migrationPhase: 'soft' },
      ),
    ).toBe(true);
    expect(
      isCountryLocked(
        {
          mode: 'wallet',
          option: walletOption,
          address: null,
          origin: 'manual',
        },
        { countryKey: 'GB', migrationPhase: 'soft' },
      ),
    ).toBe(false);
  });

  it('locks email resume always and email only when GB forced', () => {
    expect(
      isCountryLocked(
        { mode: 'email', origin: 'resume' },
        { countryKey: 'US', migrationPhase: 'soft' },
      ),
    ).toBe(true);
    expect(
      isCountryLocked(
        { mode: 'email', origin: 'only' },
        { countryKey: 'GB', migrationPhase: 'forced' },
      ),
    ).toBe(true);
    expect(
      isCountryLocked(
        { mode: 'email', origin: 'only' },
        { countryKey: 'GB', migrationPhase: 'soft' },
      ),
    ).toBe(false);
    expect(
      isCountryLocked(
        { mode: 'email', origin: 'fork' },
        { countryKey: 'GB', migrationPhase: 'forced' },
      ),
    ).toBe(false);
  });

  it('does not lock fork or awaiting_country', () => {
    expect(
      isCountryLocked(
        {
          mode: 'fork',
          options: [walletOption, emailOption],
          reason: 'no_match',
        },
        { countryKey: 'GB', migrationPhase: 'forced' },
      ),
    ).toBe(false);
    expect(
      isCountryLocked(
        { mode: 'awaiting_country' },
        { countryKey: null, migrationPhase: null },
      ),
    ).toBe(false);
  });
});

describe('resolveActiveBanner', () => {
  it('prefers an explicit banner', () => {
    expect(
      resolveActiveBanner({
        banner: 'no_card',
        view: { mode: 'account_missing', option: walletOption, address: ADDR },
      }),
    ).toBe('no_card');
  });

  it('derives account_missing and resume_soft from the view', () => {
    expect(
      resolveActiveBanner({
        banner: null,
        view: {
          mode: 'account_missing',
          option: walletOption,
          address: ADDR,
        },
      }),
    ).toBe('account_missing');
    expect(
      resolveActiveBanner({
        banner: null,
        view: { mode: 'email', origin: 'resume' },
      }),
    ).toBe('resume_soft');
  });
});
