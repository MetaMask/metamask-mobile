import {
  ProofOfOwnershipService,
  ProofOfOwnershipServiceMessenger,
} from '@metamask/profile-metrics-controller';
import { MessengerClientInitFunction } from '../types';

/**
 * Initialize the proof of ownership service.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the service.
 * @returns The initialized controller.
 */
export const proofOfOwnershipServiceInit: MessengerClientInitFunction<
  ProofOfOwnershipService,
  ProofOfOwnershipServiceMessenger
> = ({ controllerMessenger }) => {
  const controller = new ProofOfOwnershipService({
    messenger: controllerMessenger,
  });

  return {
    controller,
  };
};
