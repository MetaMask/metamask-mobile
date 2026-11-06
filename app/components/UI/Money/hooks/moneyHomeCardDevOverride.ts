import { useSyncExternalStore } from 'react';
import type { MoneyHomeCard, MoneyHomeVbaVariant } from './getMoneyHomeCard';

/**
 * One forced Money home card for a local demo. `null` means live routing.
 * "Eligible" in the rendering table is a VBA-supported region.
 */
export interface MoneyHomeCardDevOverride {
  id: string;
  label: string;
  card: MoneyHomeCard;
  /** Stepper index when `card` is the onboarding card. */
  onboardingStep?: 0 | 1;
}

/** One VBA identity card in the developer menu. */
const vbaOverride = (
  id: string,
  label: string,
  variant: MoneyHomeVbaVariant,
): MoneyHomeCardDevOverride => ({
  id,
  label,
  card: { type: 'vba', variant },
});

/** Table rows a developer can force from Settings → Developer options. */
export const MONEY_HOME_CARD_DEV_OVERRIDES: readonly MoneyHomeCardDevOverride[] =
  [
    { id: 'loading', label: '1. Loading: no card', card: { type: 'none' } },
    vbaOverride(
      'get_started',
      '2. VBA eligible, empty wallet: Get started',
      'get_started',
    ),
    vbaOverride(
      'finish_verification',
      '3. VBA eligible, KYC in progress: Finish verification',
      'finish_verification',
    ),
    vbaOverride(
      'kyc_pending',
      '4. VBA eligible, KYC in progress: KYC pending',
      'kyc_pending',
    ),
    vbaOverride(
      'kyc_decision',
      '5. VBA eligible, KYC rejected or retry: KYC decision',
      'kyc_decision',
    ),
    vbaOverride(
      'identity_verified',
      '6. VBA eligible, KYC approved: Identity verified',
      'identity_verified',
    ),
    {
      id: 'add_funds',
      label: '7. Not VBA eligible, or has crypto: Add funds',
      card: { type: 'onboarding' },
      onboardingStep: 0,
    },
    {
      id: 'card',
      label: '8. Funded: Get card or Link card',
      card: { type: 'onboarding' },
      onboardingStep: 1,
    },
    {
      id: 'card_done',
      label: '9. Card linked, blocked, or skipped: no card',
      card: { type: 'none' },
    },
    {
      id: 'autoramp_active',
      label: '10. Autoramp active: no card',
      card: { type: 'none' },
    },
  ];

const listeners = new Set<() => void>();

let currentOverride: MoneyHomeCardDevOverride | null = null;

const emit = (): void => {
  listeners.forEach((listener) => listener());
};

/**
 * Looks up a catalog entry by id.
 *
 * @param id - Entry id from {@link MONEY_HOME_CARD_DEV_OVERRIDES}.
 * @returns The entry, or `null` when the id is unknown.
 */
export const getMoneyHomeCardDevOverrideById = (
  id: string,
): MoneyHomeCardDevOverride | null =>
  MONEY_HOME_CARD_DEV_OVERRIDES.find((entry) => entry.id === id) ?? null;

/**
 * The forced card, or `null` for live routing. Production builds always
 * return `null`.
 *
 * @returns The active override.
 */
export const getMoneyHomeCardDevOverride =
  (): MoneyHomeCardDevOverride | null => {
    if (!__DEV__) {
      return null;
    }
    return currentOverride;
  };

/**
 * Forces a home card until cleared or the app reloads. Ignored outside dev.
 *
 * @param override - Catalog entry, or `null` to return to live routing.
 */
export const setMoneyHomeCardDevOverride = (
  override: MoneyHomeCardDevOverride | null,
): void => {
  if (!__DEV__) {
    return;
  }
  currentOverride = override;
  emit();
};

/**
 * Subscribes to override changes.
 *
 * @param listener - Called after each set.
 * @returns Unsubscribe.
 */
export const subscribeMoneyHomeCardDevOverride = (
  listener: () => void,
): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/**
 * Live override for Money home. The server snapshot is always live routing.
 *
 * @returns The active override, or `null`.
 */
export const useMoneyHomeCardDevOverride =
  (): MoneyHomeCardDevOverride | null =>
    useSyncExternalStore(
      subscribeMoneyHomeCardDevOverride,
      getMoneyHomeCardDevOverride,
      () => null,
    );

/**
 * Card shown after the KYC decision card is dismissed while an override is on.
 * A funded Money account moves to the card step. Otherwise Add funds.
 *
 * @param isMoneyAccountFunded - Money account token total is above zero.
 * @returns The catalog entry for that step.
 */
export const getKycDecisionDismissDevOverride = (
  isMoneyAccountFunded: boolean,
): MoneyHomeCardDevOverride => {
  const id = isMoneyAccountFunded ? 'card' : 'add_funds';
  const entry = getMoneyHomeCardDevOverrideById(id);
  if (!entry) {
    throw new Error(`Missing Money home card dev override: ${id}`);
  }
  return entry;
};
