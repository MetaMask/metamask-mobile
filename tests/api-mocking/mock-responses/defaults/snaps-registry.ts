// eslint-disable-next-line import-x/no-nodejs-modules
import { readFileSync } from 'fs';
import { MockEventsObject } from '../../../framework';

export const SNAPS_REGISTRY_MOCKS: MockEventsObject = {
  GET: [
    {
      urlEndpoint:
        /^https:\/\/acl\.execution\.metamask\.io\/latest\/registry\.json(\?.*)?$/,
      responseCode: 200,
      response: readFileSync(
        './tests/api-mocking/mock-responses/defaults/snaps-registry.txt',
        'utf-8',
      ),
    },
    {
      urlEndpoint:
        /^https:\/\/acl\.execution\.metamask\.io\/latest\/signature\.json(\?.*)?$/,
      responseCode: 200,
      response: {
        signature:
          '0x30450221008eaada670c822238ffcecc570e8f543183e05ab84897a53ffa87464cdcee0a8202201263be7d836be6cee4ac1dd5e7afd51b228777ab6b65fe620a577a40329cb750',
        curve: 'secp256k1',
        format: 'DER',
      },
    },
  ],
};
