import { createSelector } from 'reselect';
import { Platform } from 'react-native';
import { selectRemoteFeatureFlags } from '..';
import { validatedVersionGatedFeatureFlag } from '../../../util/remoteFeatureFlag';
import { CardProviderIds } from '../../../core/Engine/controllers/card-controller/provider-types';
import {
  NO_PROVISIONING_WALLETS,
  readCardFeatureFlag,
  readCardLinkApiEnabled,
  readCardProviderChains,
  readCardProviderConfig,
  readCardProviderCountries,
  readCardProviderEnabled,
  readCardImmersveMfaEnabled,
  readCardUkMigrationSignInRoutingEnabled,
  resolveCardProvisioningWallets,
  resolveCardUkMigrationState,
  type CardRemoteFeatureFlags,
} from './read';
import type {
  CardFeatureFlag,
  CardProvisioningFacts,
  CardProviderChains,
  CardUkMigrationState,
  GateVersionedFeatureFlag,
  ImmersveProgramConfig,
  ProvisioningPlatform,
  ResolvedProvisioningWallet,
} from './types';

export { defaultCardFeatureFlag, defaultCardUkMigrationFlag } from './defaults';
export * from './types';
export {
  CARD_PROVIDER_FLAGS,
  CARD_UK_MIGRATION_COUNTRY_CODE,
  CARD_UK_MIGRATION_UPDATE_BADGE_WARNING_DAYS,
  FALLBACK_CARD_PROVIDER_ID,
  getCardUkMigrationUpdateBadgeSeverity,
  isCardUkMigrationEligible,
  readCardFeatureFlag,
  readCardLinkApiEnabled,
  readCardProviderChains,
  readCardProviderConfig,
  readCardProviderCountries,
  readCardProviderEnabled,
  CARD_PROVISIONING_FLAG_KEYS,
  IMPLEMENTED_PROVISIONING_WALLETS,
  NO_PROVISIONING_WALLETS,
  readCardUkMigrationFlag,
  readCardImmersveMfaEnabled,
  readCardUkMigrationSignInRoutingEnabled,
  resolveCardProviderForCountry,
  resolveCardProvisioningWallets,
  resolveCardUkMigrationState,
  type CardRemoteFeatureFlags,
  type CardUkMigrationUpdateBadgeSeverity,
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

/** Used when `cardFeature.constants.applePayLearnMoreUrl` is missing or blank. */
export const DEFAULT_APPLE_PAY_LEARN_MORE_URL = 'https://metamask.io/card';

export const selectApplePayLearnMoreUrl = createSelector(
  selectCardFeatureFlag,
  (cardFeatureFlag): string => {
    const url = cardFeatureFlag.constants?.applePayLearnMoreUrl;
    return typeof url === 'string' && url.trim().length > 0
      ? url
      : DEFAULT_APPLE_PAY_LEARN_MORE_URL;
  },
);

export const selectCardLinkApiEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) =>
    readCardLinkApiEnabled(remoteFeatureFlags as CardRemoteFeatureFlags),
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

/** Kill-switch for the card arrival reveal. Defaults to ON. */
export const selectCardArrivalAnimationEnabledFlag = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const remoteFlag =
      remoteFeatureFlags?.cardArrivalAnimationEnabled as unknown as GateVersionedFeatureFlag;
    const local = process.env.MM_CARD_ARRIVAL_ANIMATION_ENABLED !== 'false';

    return validatedVersionGatedFeatureFlag(remoteFlag) ?? local;
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

export const selectImmersveAppleWalletProvisioningEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const remoteFlag =
      remoteFeatureFlags?.immersveAppleWalletInAppProvisioningEnabled as unknown as GateVersionedFeatureFlag;

    return validatedVersionGatedFeatureFlag(remoteFlag) ?? false;
  },
);

type PushProvisioningWallet = 'apple_wallet' | 'google_wallet';

type CardProvisioningSelectorFacts = Pick<
  CardProvisioningFacts,
  'countryCode' | 'cardProcessor'
>;

const provisioningPlatform = (): ProvisioningPlatform | null => {
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    return Platform.OS;
  }
  return null;
};

/**
 * Wallets the nested provisioning flag offers for this device. The empty
 * result is {@link NO_PROVISIONING_WALLETS}.
 */
export function selectCardProvisioningWallets(
  state: Parameters<typeof selectRemoteFeatureFlags>[0],
  providerId: string | null | undefined,
  facts: CardProvisioningSelectorFacts,
): readonly ResolvedProvisioningWallet[] {
  const platform = provisioningPlatform();
  if (!platform || !providerId) {
    return NO_PROVISIONING_WALLETS;
  }
  return resolveCardProvisioningWallets(
    selectRemoteFeatureFlags(state) as CardRemoteFeatureFlags,
    providerId,
    {
      platform,
      countryCode: facts.countryCode,
      cardProcessor: facts.cardProcessor,
    },
  );
}

export function selectPushProvisioningEnabled(
  state: Parameters<typeof selectRemoteFeatureFlags>[0],
  providerId: string | null | undefined,
  walletType: PushProvisioningWallet,
  facts?: CardProvisioningSelectorFacts,
): boolean {
  if (facts) {
    return selectCardProvisioningWallets(state, providerId, facts).some(
      (resolved) => resolved.wallet === walletType,
    );
  }
  if (providerId === CardProviderIds.Baanx && walletType === 'apple_wallet') {
    return selectGalileoAppleWalletProvisioningEnabled(state);
  }
  if (providerId === CardProviderIds.Baanx && walletType === 'google_wallet') {
    return selectGalileoGoogleWalletProvisioningEnabled(state);
  }
  if (
    providerId === CardProviderIds.Immersve &&
    walletType === 'apple_wallet'
  ) {
    return selectImmersveAppleWalletProvisioningEnabled(state);
  }
  return false;
}

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

export const selectCardTransactionHistoryEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const localFlag =
      process.env.MM_CARD_TRANSACTION_HISTORY_ENABLED === 'true';
    const remoteFlag =
      remoteFeatureFlags?.cardTransactionHistory as unknown as GateVersionedFeatureFlag;

    return validatedVersionGatedFeatureFlag(remoteFlag) ?? localFlag;
  },
);

/**
 * Snapshot of UK migration state at the last remote-flag bag change.
 * Soft vs forced depends on `Date.now()` inside `resolveCardUkMigrationState`,
 * so this stays frozen across `endDate` until flags change. Card Home should
 * use `useCardUkMigrationState` to re-evaluate on focus / pull-to-refresh.
 */
export const selectCardUkMigrationState = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): CardUkMigrationState =>
    resolveCardUkMigrationState(remoteFeatureFlags as CardRemoteFeatureFlags),
);

export const selectCardUkMigrationPhase = createSelector(
  selectCardUkMigrationState,
  (state) => state.phase,
);

export const selectIsCardUkMigrationActive = createSelector(
  selectCardUkMigrationState,
  (state) => state.isActive,
);

export const selectCardUkMigrationSignInRoutingEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) =>
    readCardUkMigrationSignInRoutingEnabled(
      remoteFeatureFlags as CardRemoteFeatureFlags,
    ),
);

export const selectCardImmersveMfaEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) =>
    readCardImmersveMfaEnabled(remoteFeatureFlags as CardRemoteFeatureFlags),
);

export const selectCardIntercomSupportEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const localFlag = process.env.MM_CARD_INTERCOM_SUPPORT_ENABLED === 'true';
    const remoteFlag =
      remoteFeatureFlags?.cardIntercomSupport as unknown as GateVersionedFeatureFlag;

    return validatedVersionGatedFeatureFlag(remoteFlag) ?? localFlag;
  },
);
