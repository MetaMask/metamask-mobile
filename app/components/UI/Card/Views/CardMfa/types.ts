import type {
  CardMfaMethod,
  CardMfaOption,
} from '../../../../../core/Engine/controllers/card-controller/provider-types';
import type { CardEntryPoint } from '../../util/metrics';

/**
 * What to do after MFA succeeds. Matches the arguments
 * `resumeImmersveOnboarding` already takes, minus country and address.
 */
export interface ImmersveMfaContinuation {
  entrypoint: CardEntryPoint.SIGN_UP | CardEntryPoint.AUTHENTICATION;
  email?: string;
  phone?: string;
  showAccountExistsToast?: boolean;
  navigateFromRoot?: boolean;
}

export interface CardMfaMethodParams {
  country: string;
  address: string;
  options: CardMfaOption[];
  continuation: ImmersveMfaContinuation;
}

export interface CardMfaCodeParams extends CardMfaMethodParams {
  method: CardMfaMethod;
  maskedDestination: string;
  expiresAt: number | null;
}
