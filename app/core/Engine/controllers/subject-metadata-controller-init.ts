import { ControllerInitFunction } from '../types';
import { SubjectMetadataController } from '@metamask/permission-controller';
import { SubjectMetadataControllerMessenger } from '../messengers/subject-metadata-controller-messenger';

/**
 * Initialize the subject metadata controller.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the controller.
 * @param request.persistedState - The persisted state of the extension.
 * @returns The initialized controller.
 */
export const subjectMetadataControllerInit: ControllerInitFunction<
  SubjectMetadataController,
  SubjectMetadataControllerMessenger
> = ({ controllerMessenger, persistedState }) => {
  const controller = new SubjectMetadataController({
    messenger: controllerMessenger,
    state: persistedState.SubjectMetadataController || {},
    subjectCacheLimit: 100,
  });

  return {
    controller,
  };
};
