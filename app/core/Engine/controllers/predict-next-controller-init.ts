import packageJSON from '../../../../package.json';
import {
  PredictNextController,
  type PredictNextControllerMessenger,
} from '../../../components/UI/PredictNext/controller/PredictNextController';
import type { MessengerClientInitFunction } from '../types';
import type { PredictNextControllerInitMessenger } from '../messengers/predict-next-controller-messenger';

export const predictNextControllerInit: MessengerClientInitFunction<
  PredictNextController,
  PredictNextControllerMessenger,
  PredictNextControllerInitMessenger
> = ({ controllerMessenger, initMessenger }) => {
  const controller = new PredictNextController({
    messenger: controllerMessenger,
    baseUrl: process.env.MM_PREDICT_API_URL,
    clientVersion: packageJSON.version,
    getBearerToken: () =>
      initMessenger.call('AuthenticationController:getBearerToken'),
  });
  controller.initialize();

  return { controller };
};
