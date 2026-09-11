import packageJSON from '../../../../package.json';
import {
  PredictNextController,
  type PredictNextControllerMessenger,
} from '../../../components/UI/PredictNext/controller/PredictNextController';
import type { MessengerClientInitFunction } from '../types';

export const predictNextControllerInit: MessengerClientInitFunction<
  PredictNextController,
  PredictNextControllerMessenger
> = ({ controllerMessenger }) => {
  const controller = new PredictNextController({
    messenger: controllerMessenger,
    baseUrl: process.env.MM_PREDICT_API_URL,
    clientVersion: packageJSON.version,
  });
  controller.initialize();

  return { controller };
};
