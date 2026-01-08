import { Mockttp } from 'mockttp';
import { setupMockRequest, setupMockPostRequest } from './mockHelpers';
import { MockEventsObject } from '../../framework';

/**
 * Setup multiple mocks from a centralized configuration object
 * @param mockServer - The mock server instance
 * @param mocks - The mock configuration object containing GET, POST, etc.
 */
export const setupMockEvents = async (
  mockServer: Mockttp,
  mocks: MockEventsObject,
): Promise<void> => {
  if (mocks.GET) {
    for (const mock of mocks.GET) {
      await setupMockRequest(
        mockServer,
        {
          requestMethod: 'GET',
          url: mock.urlEndpoint,
          response: mock.response,
          responseCode: mock.responseCode,
        },
        mock.priority,
      );
    }
  }

  if (mocks.POST) {
    for (const mock of mocks.POST) {
      await setupMockPostRequest(
        mockServer,
        mock.urlEndpoint,
        mock.requestBody,
        mock.response,
        {
          statusCode: mock.responseCode,
          ignoreFields: mock.ignoreFields,
          priority: mock.priority,
        },
      );
    }
  }
};
