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
    {
      urlEndpoint:
        'https://bafybeidxfmwycgzcp4v2togflpqh2gnibuexjy4m4qqwxp7nh3jx5zlh4y.ipfs.dweb.link/1.json',
      response: {
        name: 'Rocks',
        description: 'This is a collection of Rock NFTs.',
        image:
          'ipfs://bafkreifvhjdf6ve4jfv6qytqtux5nd4nwnelioeiqx5x2ez5yrgrzk7ypi',
      },
      responseCode: 200,
    },
    {
      urlEndpoint: /^data:application\/json;base64,.*$/,
      response: {
        name: 'Test Dapp NFTs #1',
        description: 'Test Dapp NFTs for testing.',
        image:
          'data:image/svg+xml;base64,PHN2ZyBoZWlnaHQ9IjM1MCIgd2lkdGg9IjM1MCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdGggaWQ9Ik15UGF0aCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZWQiIGQ9Ik0xMCw5MCBROTAsOTAgOTAsNDUgUTkwLDEwIDUwLDEwIFExMCwxMCAxMCw0MCBRMTAsNzAgNDUsNzAgUTcwLDcwIDc1LDUwIiAvPjwvZGVmcz48dGV4dD48dGV4dFBhdGggaHJlZj0iI015UGF0aCI+UXVpY2sgYnJvd24gZm94IGp1bXBzIG92ZXIgdGhlIGxhenkgZG9nLjwvdGV4dFBhdGg+PC90ZXh0Pjwvc3ZnPg==',
        attributes: [
          {
            trait_type: 'Token Id',
            value: '1',
          },
        ],
      },
      responseCode: 200,
    },
  ],
};
