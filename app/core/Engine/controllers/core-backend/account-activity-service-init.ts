import {
  AccountActivityService,
  AccountActivityServiceMessenger,
} from '@metamask/core-backend';
import { MessengerClientInitFunction } from '../../types';
import { trace } from '../../../../util/trace';
import Logger from '../../../../util/Logger';

/**
 * Initialize the Account Activity service.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the service.
 * @returns The initialized service.
 */
export const accountActivityServiceInit: MessengerClientInitFunction<
  AccountActivityService,
  AccountActivityServiceMessenger
> = ({ controllerMessenger }) => {
  Logger.log('Initializing AccountActivityService');

  const messengerClient = new AccountActivityService({
    messenger: controllerMessenger,
    // @ts-expect-error: Types of `TraceRequest` are not the same.
    traceFn: trace,
  });

  Logger.log('AccountActivityService initialized');

  return {
    messengerClient,
  };
};
