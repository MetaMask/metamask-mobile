import { ApiEnv, getApiEnv } from '../../../../core/apiEnv';
import { SdkEnvironment } from '../types/legacyDeposit';

/**
 * Legacy deposit SDK has Production and Staging only.
 * Dev and UAT clusters both use Staging. Prod uses Production.
 */
export function getSdkEnvironment() {
  return getApiEnv() === ApiEnv.Prod
    ? SdkEnvironment.Production
    : SdkEnvironment.Staging;
}
