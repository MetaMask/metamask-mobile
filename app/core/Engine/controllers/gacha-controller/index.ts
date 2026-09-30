import {
  GachaController,
  getDefaultGachaControllerState,
  type GachaControllerMessenger,
} from '../../../../components/UI/Gacha/controllers/GachaController';
import type { MessengerClientInitFunction } from '../../types';

/**
 * Initializes the GachaController. No network call happens at init:
 * recovery and sync are triggered by the UI.
 *
 * @param request - The init request.
 * @returns The controller.
 */
export const gachaControllerInit: MessengerClientInitFunction<
  GachaController,
  GachaControllerMessenger
> = ({ controllerMessenger, persistedState }) => {
  const controller = new GachaController({
    messenger: controllerMessenger,
    state: persistedState.GachaController ?? getDefaultGachaControllerState(),
  });
  return { controller };
};
