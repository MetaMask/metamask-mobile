import type { BaseControllerMessenger } from '../Engine';
import type { HandleSnapRequestArgs } from './types';
import { SnapControllerHandleRequestAction } from '../Engine/controllers/SnapController/constants';

/**
 * Passes a JSON-RPC request object to the SnapController for execution.
 *
 * @param {object} args - A bag of options.
 * @param {string} args.snapId - The ID of the recipient snap.
 * @param {string} args.origin - The origin of the RPC request.
 * @param {string} args.handler - The handler to trigger on the snap for the request.
 * @param {object} args.request - The JSON-RPC request object.
 * @returns The result of the JSON-RPC request.
 */
export async function handleSnapRequest(
  controllerMessenger: BaseControllerMessenger,
  args: HandleSnapRequestArgs,
) {
  return await controllerMessenger.call(
    SnapControllerHandleRequestAction,
    args,
  );
}
