import { MockEventsObject } from '../../../framework';

export const NFT_API_MOCKS: MockEventsObject = {
  GET: [
    {
      urlEndpoint:
        /^https:\/\/nft\.api\.cx\.metamask\.io\/users\/0x[0-9a-fA-F]+\/tokens\?.*$/,
      responseCode: 200,
      response: {
        tokens: [],
        continuation: null,
      },
    },
    {
      urlEndpoint: /^https:\/\/nft\.api\.cx\.metamask\.io\/collections\?.*$/,
      responseCode: 200,
      response: {
        collections: [],
      },
    },
    {
      urlEndpoint: /^https:\/\/nft\.api\.cx\.metamask\.io\/explore\/sites\?.*$/,
      responseCode: 200,
      response: {
        dapps: [],
      },
    },
  ],
};
