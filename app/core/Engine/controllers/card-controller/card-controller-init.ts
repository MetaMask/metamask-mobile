import { CardController } from '@metamask/card-controller';
import { BaseRestrictedControllerMessenger } from '../../types';
import { ControllerInitRequest } from '../../types';
import {
  CardControllerActions,
  CardControllerEvents,
  CardControllerState,
} from './types';

/**
 * Card Controller messenger type
 */
export type CardControllerMessenger = BaseRestrictedControllerMessenger;

/**
 * Initialize CardController
 * 
 * @param options - Controller initialization options
 * @returns The initialized CardController
 */
export function cardControllerInit({
  controllerMessenger,
  getGlobalChainId,
}: ControllerInitRequest<CardControllerMessenger>): { controller: CardController } {
  const messenger = controllerMessenger.getRestricted({
    name: 'CardController',
    allowedActions: [],
    allowedEvents: [],
  });

  // Initialize the card controller with the current chain ID
  const controller = new CardController({
    messenger,
    chainId: getGlobalChainId(),
  });

  // Register the isCardHolder action
  controllerMessenger.registerActionHandler(
    'CardController:isCardHolder',
    controller.isCardHolder.bind(controller),
  );

  return { controller };
} 