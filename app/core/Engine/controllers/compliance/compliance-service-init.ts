import {
  ComplianceService,
  type ComplianceServiceMessenger,
} from '@metamask/compliance-controller';
import type { ControllerInitFunction } from '../../types';
import { isProduction } from '../../../../util/environment';

/**
 * Initialize the ComplianceService.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the service.
 * @returns The initialized ComplianceService.
 */
export const complianceServiceInit: ControllerInitFunction<
  ComplianceService,
  ComplianceServiceMessenger
> = ({ controllerMessenger }) => {
  const controller = new ComplianceService({
    messenger: controllerMessenger,
    fetch,
    env: isProduction() ? 'production' : 'development',
  });

  return { controller };
};
