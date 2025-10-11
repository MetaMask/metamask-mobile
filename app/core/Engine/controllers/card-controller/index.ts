import type { ControllerInitFunction } from '../../types';
import {
  CardController,
  CardControllerMessenger,
  getCardControllerDefaultState,
} from './CardController';

/**
 * Initialize the CardController.
 *
 * @param request - The request object.
 * @returns The CardController.
 */
export const cardControllerInit: ControllerInitFunction<
  CardController,
  CardControllerMessenger
> = (request) => {
  const { controllerMessenger, persistedState } = request;

  const cardControllerState =
    persistedState.CardController ?? getCardControllerDefaultState();

  const controller = new CardController({
    messenger: controllerMessenger,
    state: cardControllerState,
  });

  return { controller };
};

export { CardController } from './CardController';
export type { CardControllerMessenger } from './CardController';
export * from './types';
export * from './services';
