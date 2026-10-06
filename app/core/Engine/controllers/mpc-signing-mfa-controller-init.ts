import type { MessengerClientInitFunction } from '../types';
import {
  MpcSigningMfaController,
  type MpcSigningMfaControllerMessenger,
} from './mpc-signing-mfa-controller';

/**
 * Initialize the controller that coordinates MPC signing MFA confirmation.
 *
 * @param request - The initialization request.
 * @param request.controllerMessenger - The controller messenger.
 * @param request.persistedState - Persisted engine state.
 * @returns The initialized controller.
 */
export const mpcSigningMfaControllerInit: MessengerClientInitFunction<
  MpcSigningMfaController,
  MpcSigningMfaControllerMessenger
> = ({ controllerMessenger, persistedState }) => {
  const controller = new MpcSigningMfaController({
    messenger: controllerMessenger,
    state: persistedState.MpcSigningMfaController,
  });

  return { controller };
};
