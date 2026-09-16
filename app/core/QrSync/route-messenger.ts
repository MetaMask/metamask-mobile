import { defineAllowedRouteCapabilities } from '../../messengers/helpers/route-messenger-helpers';
import type { RouteMessengerFromCapabilities } from '../../messengers/route-messenger';

/**
 * Shared UI-messenger capabilities for Add Device and the QR scanner.
 * Secret material stays inside the controller; UI only gets a boolean.
 */
export const ALLOWED_CAPABILITIES = defineAllowedRouteCapabilities({
  actions: [
    'QrSyncController:resetState',
    'QrSyncController:handleScannedQrPayload',
    'QrSyncController:importRemainingSecrets',
    'QrSyncController:hasPendingSecretImports',
    'KeyringController:getAccounts',
  ],
  events: [],
});

export type RouteMessengerInstance = RouteMessengerFromCapabilities<
  typeof ALLOWED_CAPABILITIES
>;
