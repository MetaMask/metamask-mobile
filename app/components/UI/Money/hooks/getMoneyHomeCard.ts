import type { VbaHomeCard } from '../../Ramp/Views/VirtualBankAccount/hooks/useVbaHomeCard';

/** VBA home-card variant. `VbaHomeCard` minus the empty `none` result. */
export type MoneyHomeVbaVariant = Exclude<VbaHomeCard['type'], 'none'>;

/**
 * The one card Money home renders.
 *
 * `vba` is an identity-status card. `onboarding` is the existing Add funds /
 * Get card stepper, which picks its own step. `none` leaves the slot empty.
 */
export type MoneyHomeCard =
  | { type: 'none' }
  | { type: 'vba'; variant: MoneyHomeVbaVariant }
  | { type: 'onboarding' };

/** Inputs for {@link getMoneyHomeCard}. */
export interface MoneyHomeCardInputs {
  /** VBA eligibility is still resolving. */
  isEligibilityLoading: boolean;
  /** Money account balance is still resolving. */
  isMoneyBalanceLoading: boolean;
  /** Selected wallet's crypto balance is still resolving. */
  isCryptoBalanceLoading: boolean;
  /** Card linkage state has resolved (`selectIsCardStateResolved`). */
  isCardStateResolved: boolean;
  /** VBA identity card from {@link getVbaHomeCard}. */
  vbaCard: VbaHomeCard;
  /** User is in a VBA region with the neobank flag on. */
  isVbaEligible: boolean;
  /** Mainnet balance above zero. Dust counts. */
  hasCrypto: boolean;
  /** A usable VBA autoramp already exists. */
  hasUsableAutoramp: boolean;
  /** Money account token total above zero. Same check as Add funds. */
  isMoneyAccountFunded: boolean;
  /** Card is linked to the Money account. */
  isCardLinked: boolean;
  /** Card step cannot be completed in this region. */
  isResidencyBlocked: boolean;
  /** User skipped the card step (`currentStep >= totalSteps`). */
  isCardStepSkipped: boolean;
  /** User dismissed the KYC decision card this session. */
  isKycDecisionDismissed: boolean;
}

/**
 * Picks the single Money home card from the rendering table.
 *
 * KYC status cards render once eligibility resolves. Everything else waits
 * for both balances. Get started and Identity verified give way once the
 * Money account is funded. A usable autoramp shows nothing until then.
 *
 * @param inputs - Eligibility, balances, VBA card, and card-step state.
 * @returns The one card to mount, or `none`.
 */
export function getMoneyHomeCard(inputs: MoneyHomeCardInputs): MoneyHomeCard {
  if (inputs.isEligibilityLoading) {
    return { type: 'none' };
  }

  const { vbaCard } = inputs;
  if (
    vbaCard.type === 'finish_verification' ||
    vbaCard.type === 'kyc_pending' ||
    (vbaCard.type === 'kyc_decision' && !inputs.isKycDecisionDismissed)
  ) {
    return { type: 'vba', variant: vbaCard.type };
  }

  if (inputs.isMoneyBalanceLoading || inputs.isCryptoBalanceLoading) {
    return { type: 'none' };
  }

  if (
    vbaCard.type === 'identity_verified' &&
    !inputs.hasUsableAutoramp &&
    !inputs.isMoneyAccountFunded
  ) {
    return { type: 'vba', variant: 'identity_verified' };
  }

  if (
    vbaCard.type === 'get_started' &&
    !inputs.hasCrypto &&
    !inputs.isMoneyAccountFunded
  ) {
    return { type: 'vba', variant: 'get_started' };
  }

  if (inputs.isCardStepSkipped) {
    return { type: 'none' };
  }

  const canTakeOnboarding =
    !inputs.isVbaEligible ||
    inputs.hasCrypto ||
    inputs.isKycDecisionDismissed ||
    inputs.isMoneyAccountFunded;

  if (!canTakeOnboarding) {
    return { type: 'none' };
  }

  if (!inputs.isMoneyAccountFunded) {
    return { type: 'onboarding' };
  }

  if (!inputs.isCardStateResolved) {
    return { type: 'none' };
  }

  if (inputs.isCardLinked || inputs.isResidencyBlocked) {
    return { type: 'none' };
  }

  return { type: 'onboarding' };
}
