import { BaseControllerMessenger } from '../../../core/Engine';
import type {
  SamplePetnamesControllerMessenger,
  SamplePetnamesControllerEvents,
} from '@metamask/sample-controllers';

/**
 * Get the messenger for the SamplePetnamesController.
 *
 * @param baseMessenger - The base controller messenger.
 * @returns The restricted controller messenger for the SamplePetnamesController.
 */
export const getSamplePetnamesControllerMessenger = (
  baseMessenger: BaseControllerMessenger,
): SamplePetnamesControllerMessenger => {
  return baseMessenger.getRestricted({
    name: 'SamplePetnamesController',
    allowedActions: [],
    allowedEvents: [
      'SamplePetnamesController:stateChange',
    ] as SamplePetnamesControllerEvents['type'][],
  });
};
