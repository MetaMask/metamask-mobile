import { MockApiEndpoint, RampsRegion } from '../../../framework';

/**
 * Creates a region-specific geolocation response based on the selected region
 */
export const createGeolocationResponse = (
  region: RampsRegion,
): MockApiEndpoint[] => [
  {
    urlEndpoint: /^https:\/\/on-ramp\.api\.cx\.metamask\.io\/geolocation$/,
    responseCode: 200,
    response: {
      id: region.id,
      name: region.name,
      emoji: region.emoji,
      detected: true,
    },
  },
  {
    urlEndpoint: /^https:\/\/on-ramp\.uat-api\.cx\.metamask\.io\/geolocation$/,
    responseCode: 200,
    response: {
      id: region.id,
      name: region.name,
      emoji: region.emoji,
      detected: true,
    },
  },
];
