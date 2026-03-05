import type { ControllerInitFunction } from '../../types';
import { CardController, defaultCardControllerState } from './CardController';
import type { CardControllerMessenger } from './types';

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

  const controller = new CardController({
    messenger: controllerMessenger,
    state: persistedState.CardController ?? defaultCardControllerState,
  });

  return { controller };
};

export { CardController };
export type { CardControllerMessenger };
