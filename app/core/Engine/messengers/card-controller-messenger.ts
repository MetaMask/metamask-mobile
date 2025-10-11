import type { RestrictedMessenger } from '@metamask/base-controller';
import type { BaseControllerMessenger } from '../types';
import type {
  CardControllerActions,
  CardControllerEvents,
} from '../controllers/card-controller/types';

/**
 * Actions that CardController is allowed to call from other controllers
 */
export type AllowedActions = never;

/**
 * Events that CardController is allowed to subscribe to from other controllers
 */
export type AllowedEvents = never;

/**
 * CardController messenger type with restricted permissions
 */
export type CardControllerMessenger = RestrictedMessenger<
  'CardController',
  CardControllerActions | AllowedActions,
  CardControllerEvents | AllowedEvents,
  AllowedActions extends never ? never : AllowedActions['type'],
  AllowedEvents extends never ? never : AllowedEvents['type']
>;

/**
 * Creates a CardController messenger from the base controller messenger
 */
export const getCardControllerMessenger = (
  controllerMessenger: BaseControllerMessenger,
): CardControllerMessenger =>
  controllerMessenger.getRestricted({
    name: 'CardController',
    allowedActions: [],
    allowedEvents: [],
  });
