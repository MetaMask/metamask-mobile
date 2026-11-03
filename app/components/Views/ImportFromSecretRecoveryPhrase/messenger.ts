import { defineAllowedRouteCapabilities } from '../../../messengers/helpers/route-messenger-helpers';
import type { RouteMessengerFromCapabilities } from '../../../messengers/route-messenger';

export const ALLOWED_CAPABILITIES = defineAllowedRouteCapabilities({
  actions: [
    'QrSyncController:resetState',
    'QrSyncController:clearAccountsReview',
  ],
  events: [],
});

export type RouteMessengerInstance = RouteMessengerFromCapabilities<
  typeof ALLOWED_CAPABILITIES
>;
