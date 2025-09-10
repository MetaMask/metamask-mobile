import { MockEventsObject } from '../../../framework';

const accountsStorageUrl =
  'https://user-storage.api.cx.metamask.io/api/v1/userstorage/accounts_v2';
const contactStorageUrl =
  'https://user-storage.api.cx.metamask.io/api/v1/userstorage/addressBook';

export const USER_STORAGE_MOCK: MockEventsObject = {
  GET: [
    {
      urlEndpoint: contactStorageUrl,
      responseCode: 200,
      response: [],
    },
    {
      urlEndpoint: accountsStorageUrl,
      responseCode: 200,
      response: [],
    },
  ],
  PUT: [
    {
      urlEndpoint:
        /^https:\/\/user-storage\.api\.cx\.metamask\.io\/api\/v1\/userstorage\/accounts_v2\/[a-fA-F0-9]+$/,
      responseCode: 200,
      response: 'OK',
    },
    {
      urlEndpoint: accountsStorageUrl,
      responseCode: 200,
      response: 'OK',
    },
    {
      urlEndpoint: contactStorageUrl,
      responseCode: 200,
      response: 'OK',
    },
  ],
};
