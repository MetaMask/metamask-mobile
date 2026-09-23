import type {
  CardSignInOption,
  CardSignInResolution,
} from '../../../../../core/Engine/controllers/card-controller/provider-types';

export type UkManualMode = 'email' | 'wallet' | null;

export type AuthBanner =
  | 'account_missing'
  | 'no_card'
  | 'moved'
  | 'resume_soft'
  | 'bad_creds'
  | null;

export type AuthView =
  | { mode: 'otp' }
  | { mode: 'resolving' }
  | { mode: 'awaiting_country' }
  | {
      mode: 'fork';
      options: CardSignInOption[];
      reason: 'no_match' | 'check_failed';
    }
  | {
      mode: 'wallet';
      option: CardSignInOption;
      address: string | null;
      origin: 'linked' | 'resume' | 'manual';
    }
  | { mode: 'email'; origin: 'only' | 'fork' | 'resume' }
  | {
      mode: 'account_missing';
      option: CardSignInOption;
      address: string;
    };

export function resolveAuthView({
  isOtpStep,
  isResolving,
  resolution,
  ukMode,
  resumeEmail,
}: {
  isOtpStep: boolean;
  isResolving: boolean;
  resolution: CardSignInResolution | null;
  ukMode: UkManualMode;
  resumeEmail: boolean;
}): AuthView {
  if (isOtpStep) {
    return { mode: 'otp' };
  }
  if (isResolving) {
    return { mode: 'resolving' };
  }
  if (!resolution) {
    return { mode: 'awaiting_country' };
  }

  switch (resolution.kind) {
    case 'wallet':
      return {
        mode: 'wallet',
        option: resolution.option,
        address: resolution.address,
        origin: 'linked',
      };
    case 'wallet_account_missing':
      return {
        mode: 'account_missing',
        option: resolution.option,
        address: resolution.address,
      };
    case 'resume':
      if (resumeEmail) {
        return { mode: 'email', origin: 'resume' };
      }
      return {
        mode: 'wallet',
        option: resolution.option,
        address: resolution.address,
        origin: 'resume',
      };
    case 'email':
      return { mode: 'email', origin: 'only' };
    case 'unresolved':
      if (ukMode === 'wallet') {
        const option = resolution.options.find((o) => o.method === 'siwe');
        if (option) {
          return {
            mode: 'wallet',
            option,
            address: null,
            origin: 'manual',
          };
        }
      }
      if (ukMode === 'email') {
        return { mode: 'email', origin: 'fork' };
      }
      return {
        mode: 'fork',
        options: resolution.options,
        reason: resolution.reason,
      };
    default: {
      const _exhaustive: never = resolution;
      return _exhaustive;
    }
  }
}

export function resolveActiveBanner({
  banner,
  view,
}: {
  banner: AuthBanner;
  view: AuthView;
}): AuthBanner {
  if (banner) return banner;
  if (view.mode === 'account_missing') return 'account_missing';
  if (view.mode === 'email' && view.origin === 'resume') return 'resume_soft';
  return null;
}
