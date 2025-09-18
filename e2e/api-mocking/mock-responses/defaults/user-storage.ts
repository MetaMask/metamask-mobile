import { MockEventsObject } from '../../../framework';

const accountsStorageUrl =
  'https://user-storage.api.cx.metamask.io/api/v1/userstorage/accounts_v2';

const contactStorageUrl =
  'https://user-storage.api.cx.metamask.io/api/v1/userstorage/addressBook';

const multichainWalletsUrl =
  'https://user-storage.api.cx.metamask.io/api/v1/userstorage/multichain_accounts_wallets';

const multichainGroupsUrl =
  'https://user-storage.api.cx.metamask.io/api/v1/userstorage/multichain_accounts_groups';

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
    {
      urlEndpoint: multichainWalletsUrl,
      responseCode: 200,
      response: [],
    },
    {
      urlEndpoint: multichainGroupsUrl,
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
      urlEndpoint: multichainWalletsUrl,
      responseCode: 200,
      response: 'OK',
    },
    {
      urlEndpoint: multichainGroupsUrl,
      responseCode: 200,
      response: 'OK',
    },
  ],
};
