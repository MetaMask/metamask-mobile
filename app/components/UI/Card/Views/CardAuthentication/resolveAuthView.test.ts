import {
  CardProviderIds,
  type CardSignInOption,
  type CardSignInResolution,
} from '../../../../../core/Engine/controllers/card-controller/provider-types';
import {
  resolveActiveBanner,
  resolveAuthView,
  resolveDisplayedWalletAddress,
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
const OTHER_ADDR = '0x2222222222222222222222222222222222222222';

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

describe('resolveDisplayedWalletAddress', () => {
  it('keeps the linked address until that account has been selected', () => {
    expect(
      resolveDisplayedWalletAddress({
        origin: 'linked',
        pinnedAddress: ADDR,
        selectedAddress: OTHER_ADDR,
        hasShownPinnedSelection: false,
      }),
    ).toBe(ADDR);
  });

  it('shows a later pick after the linked account was selected', () => {
    expect(
      resolveDisplayedWalletAddress({
        origin: 'linked',
        pinnedAddress: ADDR,
        selectedAddress: OTHER_ADDR,
        hasShownPinnedSelection: true,
      }),
    ).toBe(OTHER_ADDR);
  });

  it('keeps the resume address even after another account is selected', () => {
    expect(
      resolveDisplayedWalletAddress({
        origin: 'resume',
        pinnedAddress: ADDR,
        selectedAddress: OTHER_ADDR,
        hasShownPinnedSelection: true,
      }),
    ).toBe(ADDR);
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
