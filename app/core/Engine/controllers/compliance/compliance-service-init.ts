import {
  ComplianceService,
  type ComplianceServiceMessenger,
} from '@metamask/compliance-controller';
import type { MessengerClientInitFunction } from '../../types';
import { isProduction } from '../../../../util/environment';

/**
 * Initialize the ComplianceService.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the service.
 * @returns The initialized ComplianceService.
 */
export const complianceServiceInit: MessengerClientInitFunction<
  ComplianceService,
  ComplianceServiceMessenger
> = ({ controllerMessenger }) => {
  const controller = new ComplianceService({
    apiUrl: process.env.COMPLIANCE_API_URL || undefined,
    fetch,
    env: isProduction() ? 'production' : 'development',
    messenger: controllerMessenger,
  });

  return { controller };
};
