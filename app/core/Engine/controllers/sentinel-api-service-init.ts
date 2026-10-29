import {
  SentinelApiService,
  type SentinelApiServiceMessenger,
} from '@metamask/sentinel-api-service';
import type { MessengerClientInitFunction } from '../types';
import { setSentinelApiMessenger } from '../../../util/transactions/sentinel-api';
import { getBaseSemVerVersion } from '../../../util/version';

/**
 * Initialize the SentinelApiService.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the service.
 * @returns The initialized service.
 */
export const sentinelApiServiceInit: MessengerClientInitFunction<
  SentinelApiService,
  SentinelApiServiceMessenger
> = ({ controllerMessenger }) => {
  const controller = new SentinelApiService({
    messenger: controllerMessenger,
    fetch: fetch.bind(globalThis),
    clientId: 'mobile',
    // The Sentinel backend expects a clean `major.minor.patch` version, so
    // use the base SemVer version rather than a raw version that may carry a
    // prerelease or build suffix.
    clientVersion: getBaseSemVerVersion(),
  });

  // Legacy Sentinel utils query the service via its messenger.
  setSentinelApiMessenger(controllerMessenger);

  return { controller };
};
