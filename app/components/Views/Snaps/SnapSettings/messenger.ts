import { defineAllowedRouteCapabilities } from '../../../../messengers/helpers/route-messenger-helpers';
import type { RouteMessengerFromCapabilities } from '../../../../messengers/route-messenger';

export const ALLOWED_CAPABILITIES = defineAllowedRouteCapabilities({
  actions: ['SnapController:removeSnap'],
  events: [],
});

export type RouteMessengerInstance = RouteMessengerFromCapabilities<
  typeof ALLOWED_CAPABILITIES
>;
