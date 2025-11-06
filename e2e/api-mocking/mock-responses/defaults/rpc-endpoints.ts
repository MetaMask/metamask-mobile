import { MockEventsObject } from '../../../framework';

/**
 * Mock data for external RPC endpoints used in E2E testing.
 * Blocks actual requests to external RPC providers that are not needed for testing.
 */
export const DEFAULT_RPC_ENDPOINT_MOCKS: MockEventsObject = {
  POST: [
    {
      urlEndpoint: 'https://carrot.megaeth.com/rpc',
      responseCode: 200,
      response: {
        jsonrpc: '2.0',
        id: 1,
        result: '0x0',
      },
    },
  ],
};
