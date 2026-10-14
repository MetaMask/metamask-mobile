import { ClientType } from '@metamask/remote-feature-flag-controller';
import { validatedVersionGatedFeatureFlag } from '../../../../util/remoteFeatureFlag';
import { getBaseSemVerVersion } from '../../../../util/version';
import {
  getFeatureFlagAppDistribution,
  getFeatureFlagAppEnvironment,
} from '../remote-feature-flag-controller/utils';
import { resolveBaanxConfig } from './services/baanx-config';
import { resolveImmersveConfig } from './services/immersve-config';
import type { CardController } from './CardController';
import type { CardControllerMessenger } from './types';
import { CardProviderIds } from './provider-types';
import {
  BAANX_APPLE_PAY_FLAG_KEY,
  IMMERSVE_APPLE_PAY_FLAG_KEY,
  decideCardWalletExtensionSnapshot,
} from './buildCardWalletExtensionSnapshot';
import {
  clearCardWalletExtensionSnapshot,
  writeCardWalletExtensionSnapshot,
} from './cardWalletExtensionLock';

const FLAGS_URL = 'https://client-config.api.cx.metamask.io/v1/flags';

function flagsUrl(): string {
  return (
    `${FLAGS_URL}?client=${ClientType.Mobile}` +
    `&distribution=${getFeatureFlagAppDistribution()}` +
    `&environment=${getFeatureFlagAppEnvironment()}`
  );
}

export async function publishCardWalletExtensionSnapshot(
  controller: CardController,
  messenger: CardControllerMessenger,
): Promise<void> {
  const { state } = controller;
  const providerId = state.activeProviderId;
  const provider = providerId ? controller.getProvider(providerId) : undefined;
  const flags = messenger.call('RemoteFeatureFlagController:getState')
    .remoteFeatureFlags as Record<string, unknown> | undefined;
  const flagKey =
    providerId === CardProviderIds.Immersve
      ? IMMERSVE_APPLE_PAY_FLAG_KEY
      : BAANX_APPLE_PAY_FLAG_KEY;
  const applePayEnabled =
    validatedVersionGatedFeatureFlag(flags?.[flagKey]) ?? false;
  const stored = providerId ? state.providerData[providerId] : undefined;
  const location =
    (stored as { location?: string } | undefined)?.location ?? null;
  const baanx = resolveBaanxConfig();
  const immersve = resolveImmersveConfig();
  const apiBaseUrl =
    providerId === CardProviderIds.Immersve ? immersve.baseUrl : baanx.baseUrl;
  const decision = decideCardWalletExtensionSnapshot({
    providerId,
    providerUserId: state.providerUserId,
    location,
    applePayEnabled,
    applePayCapability:
      provider?.capabilities.pushProvisioning.applePay ?? false,
    cardHomeData: state.cardHomeData as Record<string, unknown> | null,
    apiBaseUrl,
    baanxClientKey: baanx.apiKey,
    immersveClientApplicationId: immersve.clientApplicationId,
    immersveAppUrl: immersve.appUrl,
    flagsUrl: flagsUrl(),
    flagKey,
    appVersion: getBaseSemVerVersion(),
  });

  if (decision.action === 'write') {
    await writeCardWalletExtensionSnapshot(JSON.stringify(decision.snapshot));
  } else if (decision.action === 'clear') {
    await clearCardWalletExtensionSnapshot();
  }
}

export function startCardWalletExtensionSync(
  controller: CardController,
  messenger: CardControllerMessenger,
): void {
  const publish = () => {
    publishCardWalletExtensionSnapshot(controller, messenger).catch(() => {
      // The extension keeps the last snapshot if a publish fails.
    });
  };
  messenger.subscribe('CardController:stateChange', publish);
  messenger.subscribe('RemoteFeatureFlagController:stateChange', publish);
  publish();
}
