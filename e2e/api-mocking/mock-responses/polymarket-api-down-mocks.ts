/**
 * Test-specific mock for Polymarket API returning 500 error
 * This simulates the Polymarket API being down
 */

import { Mockttp } from 'mockttp';
import { setupMockRequest } from '../helpers/mockHelpers';

export const POLYMARKET_API_DOWN_MOCKS = async (mockServer: Mockttp) => {
  // Mock the Polymarket events pagination endpoint to return 500 error
  await setupMockRequest(mockServer, {
    requestMethod: 'GET',
    url: /^https:\/\/gamma-api\.polymarket\.com\/events\/pagination/,
    responseCode: 500,
    response: {
      error: 'Internal Server Error',
      message: 'Service temporarily unavailable',
      statusCode: 500,
    },
  });

  // Optionally mock other Polymarket endpoints to return 500 as well
  await setupMockRequest(mockServer, {
    requestMethod: 'GET',
    url: /^https:\/\/gamma-api\.polymarket\.com/,
    responseCode: 500,
    response: {
      error: 'Internal Server Error',
      message: 'Service temporarily unavailable',
      statusCode: 500,
    },
  });
};
