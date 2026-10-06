export interface CardWalletExtensionSnapshotCard {
  entryId: string;
  cardId: string;
  lastFour: string;
  cardholderName: string;
  primaryAccountIdentifier?: string;
  title: string;
  localizedDescription: string;
}

export interface CardWalletExtensionSnapshot {
  schemaVersion: number;
  updatedAt: number;
  providerId: string;
  providerUserId: string | null;
  apiBaseUrl: string;
  location: string;
  flagEnabled: boolean;
  flagsEndpoint: {
    url: string;
    flagKey: string;
    appVersion: string;
  };
  baanxClientKey?: string;
  immersveClientApplicationId?: string;
  immersveAppUrl?: string;
  cards: CardWalletExtensionSnapshotCard[];
}

export type SnapshotDecision =
  | { action: 'write'; snapshot: CardWalletExtensionSnapshot }
  | { action: 'clear' }
  | { action: 'keep' };

export interface SnapshotInput {
  providerId: string | null;
  providerUserId: string | null;
  location: string | null;
  applePayEnabled: boolean;
  applePayCapability: boolean;
  cardHomeData: Record<string, unknown> | null;
  apiBaseUrl: string;
  baanxClientKey?: string;
  immersveClientApplicationId?: string;
  immersveAppUrl?: string;
  flagsUrl: string;
  flagKey: string;
  appVersion: string;
  now?: number;
}

const BAANX_PROVIDER_ID = 'baanx';

export function decideCardWalletExtensionSnapshot(
  input: SnapshotInput,
): SnapshotDecision {
  if (!input.cardHomeData) {
    return { action: 'keep' };
  }

  const provisioning = input.cardHomeData.walletProvisioning as
    | {
        eligible?: boolean;
        cardholderName?: string;
        lastFour?: string;
        primaryAccountIdentifier?: string;
      }
    | null
    | undefined;
  const card = input.cardHomeData.card as
    | { id?: string; lastFour?: string; holderName?: string }
    | null
    | undefined;
  const isBaanx = input.providerId === BAANX_PROVIDER_ID;
  const eligible =
    Boolean(input.providerId) &&
    input.applePayEnabled &&
    input.applePayCapability &&
    provisioning?.eligible === true &&
    Boolean(card?.id) &&
    (!isBaanx || input.location === 'us');

  if (!eligible || !input.providerId || !card?.id) {
    return { action: 'clear' };
  }

  const lastFour = provisioning?.lastFour || card.lastFour || '';
  const cardholderName = provisioning?.cardholderName || card.holderName || '';
  const primaryAccountIdentifier = isBaanx
    ? undefined
    : provisioning?.primaryAccountIdentifier;
  const entryId = primaryAccountIdentifier || card.id;

  return {
    action: 'write',
    snapshot: {
      schemaVersion: 1,
      updatedAt: input.now ?? Date.now(),
      providerId: input.providerId,
      providerUserId: input.providerUserId,
      apiBaseUrl: input.apiBaseUrl,
      location: input.location ?? '',
      flagEnabled: input.applePayEnabled,
      flagsEndpoint: {
        url: input.flagsUrl,
        flagKey: input.flagKey,
        appVersion: input.appVersion,
      },
      baanxClientKey: isBaanx ? input.baanxClientKey : undefined,
      immersveClientApplicationId: isBaanx
        ? undefined
        : input.immersveClientApplicationId,
      immersveAppUrl: isBaanx ? undefined : input.immersveAppUrl,
      cards: [
        {
          entryId,
          cardId: card.id,
          lastFour,
          cardholderName,
          primaryAccountIdentifier,
          title: 'MetaMask Card',
          localizedDescription: `MetaMask Card ending in ${lastFour}`,
        },
      ],
    },
  };
}

export const BAANX_APPLE_PAY_FLAG_KEY =
  'galileoAppleWalletInAppProvisioningEnabled';
export const IMMERSVE_APPLE_PAY_FLAG_KEY =
  'immersveAppleWalletInAppProvisioningEnabled';
