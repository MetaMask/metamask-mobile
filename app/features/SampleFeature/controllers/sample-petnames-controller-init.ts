import type { MessengerClientInitFunction } from '../../../core/Engine/types';
import {
  SamplePetnamesController,
  SamplePetnamesControllerMessenger,
} from '@metamask/sample-controllers';
import { createProjectLogger } from '@metamask/utils';

const log = createProjectLogger('sample-petnames-controller');

export const samplePetnamesControllerInit: MessengerClientInitFunction<
  SamplePetnamesController,
  SamplePetnamesControllerMessenger
> = (request) => {
  const { controllerMessenger, persistedState } = request;

  const initialState = persistedState.SamplePetnamesController;
  log('Initializing SamplePetnamesController', initialState);

  const messengerClient = new SamplePetnamesController({
    messenger: controllerMessenger,
    state: initialState,
  });

  return { messengerClient };
};
