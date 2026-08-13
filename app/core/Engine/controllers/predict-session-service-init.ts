import packageJSON from '../../../../package.json';
import Logger from '../../../util/Logger';
import { KalshiRemoteAdapter } from '../../../components/UI/PredictNext/adapters/remote/KalshiRemoteAdapter';
import { PredictApiAccountClient } from '../../../components/UI/PredictNext/adapters/remote/PredictApiAccountClient';
import { PredictApiReadClient } from '../../../components/UI/PredictNext/adapters/remote/PredictApiReadClient';
import {
  PredictSessionService,
  type PredictSessionServiceMessenger,
} from '../../../components/UI/PredictNext/services/PredictSessionService';
import { KALSHI_VENUE_ID } from '../../../components/UI/PredictNext/types';
import type { MessengerClientInitFunction } from '../types';

export const predictSessionServiceInit: MessengerClientInitFunction<
  PredictSessionService,
  PredictSessionServiceMessenger
> = ({ controllerMessenger }) => {
  const baseUrl = process.env.MM_PREDICT_API_URL;
  let account: InstanceType<typeof KalshiRemoteAdapter>['account'];

  if (!baseUrl) {
    Logger.error(new Error('PredictNext configuration is missing.'));
  } else {
    try {
      const readClient = new PredictApiReadClient({
        baseUrl,
        clientVersion: packageJSON.version,
      });
      const accountClient = new PredictApiAccountClient({
        baseUrl,
        clientVersion: packageJSON.version,
        getBearerToken: () =>
          controllerMessenger.call('AuthenticationController:getBearerToken'),
      });
      account = new KalshiRemoteAdapter(readClient, accountClient).account;
    } catch (error) {
      Logger.error(
        error instanceof Error
          ? error
          : new Error('PredictNext configuration is malformed.'),
      );
    }
  }

  return {
    controller: new PredictSessionService({
      messenger: controllerMessenger,
      account,
      authenticate: async () => {
        await controllerMessenger.call(
          'AuthenticationController:getBearerToken',
        );
      },
      venueId: KALSHI_VENUE_ID,
    }),
  };
};
