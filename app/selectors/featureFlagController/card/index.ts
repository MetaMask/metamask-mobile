import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import { validatedVersionGatedFeatureFlag } from '../../../util/remoteFeatureFlag';
import { CardProviderIds } from '../../../core/Engine/controllers/card-controller/provider-types';
import {
  readCardFeatureFlag,
  readCardProviderChains,
  readCardProviderConfig,
  readCardProviderCountries,
  readCardProviderEnabled,
  type CardRemoteFeatureFlags,
} from './read';
import type {
  CardFeatureFlag,
  CardProviderChains,
  GateVersionedFeatureFlag,
  ImmersveProgramConfig,
} from './types';

export { defaultCardFeatureFlag } from './defaults';
export * from './types';
export {
  CARD_PROVIDER_FLAGS,
  FALLBACK_CARD_PROVIDER_ID,
  readCardFeatureFlag,
  readCardProviderChains,
  readCardProviderConfig,
  readCardProviderCountries,
  readCardProviderEnabled,
  resolveCardProviderForCountry,
  type CardRemoteFeatureFlags,
} from './read';

/**
 * Resolves an already-extracted `cardFeature` value against the built-in
 * default. Prefer `readCardFeatureFlag(remoteFeatureFlags)` when you hold the
 * whole flag bag.
 */
export const resolveCardFeatureFlag = (
  cardFeatureFlag?: CardFeatureFlag | null,
): CardFeatureFlag =>
  readCardFeatureFlag({ cardFeature: cardFeatureFlag ?? undefined });

export const selectCardFeatureFlag = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) =>
    readCardFeatureFlag(remoteFeatureFlags as CardRemoteFeatureFlags),
);

// -- Immersve provider flags --

export const selectCardImmersveEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) =>
    readCardProviderEnabled(
      remoteFeatureFlags as CardRemoteFeatureFlags,
      CardProviderIds.Immersve,
    ),
);

/** @deprecated Alias of {@link selectCardImmersveEnabled}. */
export const selectImmersveOnboardingEnabled = selectCardImmersveEnabled;

export const selectCardImmersveConfig = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): ImmersveProgramConfig =>
    readCardProviderConfig<ImmersveProgramConfig>(
      remoteFeatureFlags as CardRemoteFeatureFlags,
      CardProviderIds.Immersve,
    ),
);

export const selectCardImmersveChains = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): CardProviderChains =>
    readCardProviderChains(
      remoteFeatureFlags as CardRemoteFeatureFlags,
      CardProviderIds.Immersve,
    ),
);

export const selectCardImmersveCountries = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): string[] =>
    readCardProviderCountries(
      remoteFeatureFlags as CardRemoteFeatureFlags,
      CardProviderIds.Immersve,
    ),
);

// -- Baanx-only sub-feature flags (renamed in the Baanx migration) --

export const selectMetalCardCheckoutFeatureFlag = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const remoteFlag =
      remoteFeatureFlags?.metalCardCheckoutEnabled as unknown as GateVersionedFeatureFlag;

    return validatedVersionGatedFeatureFlag(remoteFlag) ?? false;
  },
);

export const selectGalileoAppleWalletProvisioningEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const remoteFlag =
      remoteFeatureFlags?.galileoAppleWalletInAppProvisioningEnabled as unknown as GateVersionedFeatureFlag;

    return validatedVersionGatedFeatureFlag(remoteFlag) ?? false;
  },
);

export const selectGalileoGoogleWalletProvisioningEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const remoteFlag =
      remoteFeatureFlags?.galileoGoogleWalletInAppProvisioningEnabled as unknown as GateVersionedFeatureFlag;

    return validatedVersionGatedFeatureFlag(remoteFlag) ?? false;
  },
);

export const selectCardForgotPasswordFeatureEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const remoteFlag =
      remoteFeatureFlags?.cardForgotPasswordFeature as unknown as GateVersionedFeatureFlag;

    return validatedVersionGatedFeatureFlag(remoteFlag) ?? false;
  },
);

export const selectCardFiatCreditFeatureEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const remoteFlag =
      remoteFeatureFlags?.cardFiatCreditFeature as unknown as GateVersionedFeatureFlag;

    return validatedVersionGatedFeatureFlag(remoteFlag) ?? false;
  },
);
