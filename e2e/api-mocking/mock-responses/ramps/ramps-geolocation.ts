import { MockApiEndpoint, RampsRegion } from '../../../framework';

/**
 * Creates a region-specific geolocation response based on the selected region
 */
export const createGeolocationResponse = (
  region: RampsRegion,
): MockApiEndpoint[] =>
  ['prod', 'uat', 'dev'].map((env) => {
    const url =
      env === 'prod'
        ? `https://on-ramp.api.cx.metamask.io/geolocation`
        : `https://on-ramp.${env}-api.cx.metamask.io/geolocation`;
    return {
      urlEndpoint: url,
      responseCode: 200,
      response: {
        id: region.id,
        name: region.name,
        emoji: region.emoji,
        detected: true,
      },
    };
  });
