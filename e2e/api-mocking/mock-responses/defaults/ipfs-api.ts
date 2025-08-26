import { MockEventsObject } from '../../../framework';

const ipfsResponseMessage = 'Hello from IPFS Gateway Checker';

/**
 * Mock data for IPFS gateway endpoints used in E2E testing.
 * Returns simple text response for IPFS content requests.
 * Handles multiple IPFS gateways with consistent responses.
 */
export const DEFAULT_IPFS_GATEWAY_MOCKS: MockEventsObject = {
  GET: [
    {
      urlEndpoint:
        /^https:\/\/ipfs\.io\/ipfs\/[a-zA-Z0-9]+#x-ipfs-companion-no-redirect$/,
      response: ipfsResponseMessage,
      responseCode: 200,
    },
    {
      urlEndpoint:
        /^https:\/\/gateway\.ipfs\.io\/ipfs\/[a-zA-Z0-9]+#x-ipfs-companion-no-redirect$/,
      response: ipfsResponseMessage,
      responseCode: 200,
    },
    {
      urlEndpoint:
        /^https:\/\/gateway\.pinata\.cloud\/ipfs\/[a-zA-Z0-9]+#x-ipfs-companion-no-redirect$/,
      response: ipfsResponseMessage,
      responseCode: 200,
    },
    // IPFS Mock
    {
      urlEndpoint:
        /^https:\/\/dweb\.link\/ipfs\/[a-zA-Z0-9]+#x-ipfs-companion-no-redirect$/,
      responseCode: 200,
      response: ipfsResponseMessage,
    },
  ],
};
