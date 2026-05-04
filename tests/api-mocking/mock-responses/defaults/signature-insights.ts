import { MockEventsObject } from '../../../framework';

export const SIGNATURE_INSIGHTS_MOCKS: MockEventsObject = {
  POST: [
    {
      urlEndpoint:
        /^https:\/\/signature-insights\.api\.cx\.metamask\.io\/v1\/signature\?chainId=0x[0-9a-fA-F]+$/,
      responseCode: 200,
      response: {
        stateChanges: null,
        error: {
          message: 'Unsupported signature.',
          type: 'UNSUPPORTED_SIGNATURE',
        },
      },
    },
  ],
};
