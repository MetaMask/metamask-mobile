import { Mockttp } from 'mockttp';
import { setupMockRequest } from '../../helpers/mockHelpers';
import { MockApiEndpoint, RampsRegion } from '../../../framework/types';
import {
  RAMPS_NETWORKS_RESPONSE,
  RAMPS_COUNTRIES_RESPONSE,
  RAMPS_LIGHT_RESPONSE,
  RAMPS_AMOUNT_RESPONSE,
} from './ramps-mocks';
import { createGeolocationResponse } from './ramps-geolocation';
import { RAMPS_QUOTE_RESPONSE } from './ramps-quotes-response';

/**
 * Sets up comprehensive on-ramp API mocks that are aware of the selected region
 * This ensures the geolocation response matches the region set in the test fixture
 *
 * @param mockServer - The mock server instance
 * @param selectedRegion - The region selected in the test fixture
 */
export const setupRegionAwareOnRampMocks = async (
  mockServer: Mockttp,
  selectedRegion: RampsRegion,
) => {
  const geolocationResponse = createGeolocationResponse(selectedRegion);

  const mockEndpoints: MockApiEndpoint[] = [
    // 1. Geolocation endpoints (both UAT and prod) - region-specific
    ...geolocationResponse,

    // 2. Networks endpoints (both UAT and prod)
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

    // 3. Countries endpoints (both UAT and prod) - Add more countries as needed - RAMPS_COUNTRIES_RESPONSE in on-ramp-mocks.ts
    {
      urlEndpoint:
        /^https:\/\/on-ramp-cache\.api\.cx\.metamask\.io\/regions\/countries\?.*$/,
      responseCode: 200,
      response: RAMPS_COUNTRIES_RESPONSE,
    },
    {
      urlEndpoint:
        /^https:\/\/on-ramp-cache\.uat-api\.cx\.metamask\.io\/regions\/countries\?.*$/,
      responseCode: 200,
      response: RAMPS_COUNTRIES_RESPONSE,
    },

    // 4. Light endpoints - all parameter variations (both UAT and prod)
    // This controls things like: payment methods, available cryptocurrencies, fiat currencies and limits
    {
      urlEndpoint:
        /^https:\/\/on-ramp-cache\.api\.cx\.metamask\.io\/regions\/[^/]+\/light\?.*$/,
      responseCode: 200,
      response: RAMPS_LIGHT_RESPONSE,
    },
    {
      urlEndpoint:
        /^https:\/\/on-ramp-cache\.uat-api\.cx\.metamask\.io\/regions\/[^/]+\/light\?.*$/,
      responseCode: 200,
      response: RAMPS_LIGHT_RESPONSE,
    },

    // 5. Amount conversion endpoints (both UAT and prod)
    {
      urlEndpoint:
        /^https:\/\/on-ramp-cache\.api\.cx\.metamask\.io\/currencies\/crypto\/.*\/amount\?.*$/,
      responseCode: 200,
      response: RAMPS_AMOUNT_RESPONSE,
    },
    {
      urlEndpoint:
        /^https:\/\/on-ramp-cache\.uat-api\.cx\.metamask\.io\/currencies\/crypto\/.*\/amount\?.*$/,
      responseCode: 200,
      response: RAMPS_AMOUNT_RESPONSE,
    },

    // 6. Quote endpoints (both UAT and prod)
    {
      urlEndpoint:
        /^https:\/\/on-ramp\.api\.cx\.metamask\.io\/providers\/all\/quote\?.*$/,
      responseCode: 200,
      response: RAMPS_QUOTE_RESPONSE,
    },
    {
      urlEndpoint:
        /^https:\/\/on-ramp\.uat-api\.cx\.metamask\.io\/providers\/all\/quote\?.*$/,
      responseCode: 200,
      response: RAMPS_QUOTE_RESPONSE,
    },
  ];

  // Set up all mocks
  for (const mock of mockEndpoints) {
    await setupMockRequest(mockServer, {
      requestMethod: 'GET',
      url: mock.urlEndpoint,
      response: mock.response,
      responseCode: mock.responseCode,
    });
  }
};
