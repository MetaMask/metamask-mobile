import { MockEventsObject } from '../../../framework';
import { RampsRegions, RampsRegionsEnum } from '../../../framework/Constants';
import { RAMPS_NETWORKS_RESPONSE } from '../ramps/ramps-mocks';
import { createGeolocationResponse } from '../ramps/ramps-geolocation';

/**
 * Mock data for on-ramp API endpoints used in E2E testing.
 * Covers geolocation and network information.
 * Can be overriden by testSpecificMock
 */

export const DEFAULT_RAMPS_API_MOCKS: MockEventsObject = {
  GET: [
    ...createGeolocationResponse(RampsRegions[RampsRegionsEnum.UNITED_STATES]),
    {
      urlEndpoint:
        /^https:\/\/on-ramp-cache\.api\.cx\.metamask\.io\/regions\/networks\?.*$/,
      responseCode: 200,
      response: RAMPS_NETWORKS_RESPONSE,
    },
    {
      urlEndpoint:
        /^https:\/\/on-ramp-cache\.uat-api\.cx\.metamask\.io\/regions\/networks\?.*$/,
      responseCode: 200,
      response: RAMPS_NETWORKS_RESPONSE,
    },
  ],
};
