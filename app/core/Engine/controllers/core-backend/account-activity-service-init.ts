import { AccountActivityService } from '@metamask/core-backend';
import { TraceCallback } from '@metamask/controller-utils';
import { ControllerInitFunction } from '../../types';
import { AccountActivityServiceMessenger } from '../../messengers/core-backend';
import { trace } from '../../../../util/trace';
import Logger from '../../../../util/Logger';

/**
 * Initialize the Account Activity service.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the service.
 * @returns The initialized service.
 */
export const accountActivityServiceInit: ControllerInitFunction<
  AccountActivityService,
  AccountActivityServiceMessenger
> = ({ controllerMessenger }) => {
  Logger.log('Initializing AccountActivityService');

  const controller = new AccountActivityService({
    messenger: controllerMessenger,
    traceFn: trace as TraceCallback,
  });

  Logger.log('AccountActivityService initialized');

  return {
    controller,
  };
};
