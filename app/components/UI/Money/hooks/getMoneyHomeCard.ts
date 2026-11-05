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
  /**
   * Selected account group has a positive mainnet balance. Dust above zero
   * counts; the wallet empty-state selector is the source of truth.
   */
  hasCrypto: boolean;
  /** A usable VBA autoramp already exists. */
  hasUsableAutoramp: boolean;
  /**
   * Money account token total is greater than zero. Matches the onboarding
   * card's own "step 1 complete" check, so the slot and the stepper agree.
   */
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
 * KYC status cards (finish verification, pending, decision) are not
 * crypto-gated and render as soon as eligibility has resolved. Everything
 * else waits until the crypto and Money balances have loaded, so an empty
 * wallet cannot flash Get started and then swap to Add funds.
 *
 * Get started is the only crypto-gated VBA card: a VBA-supported region,
 * nothing started, and no crypto. It also gives way once the Money account
 * is funded, so depositing the whole wallet into Money shows the card step
 * instead of Get started. "Eligible" in the rendering table means that
 * region. A wallet that already has crypto, or a user outside a VBA
 * region, takes the onboarding stepper instead. Identity verified is the
 * KYC-approved card with no usable autoramp, and it shows only while the
 * Money account is unfunded. A usable autoramp does not render You're all
 * set: an unfunded account shows nothing, and a funded account takes the
 * card step (or nothing, when that step is already done). Dismissing the
 * KYC decision card falls through to that same stepper.
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

  // getVbaHomeCard returns identity_verified only when KYC is approved and
  // no usable autoramp exists. account_is_ready now means a usable autoramp
  // whose details have not been viewed, and that card stays off this screen.
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
