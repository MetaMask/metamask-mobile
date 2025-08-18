import { TestSpecificMock } from '../../../framework';

export const EMPTY_USER_STORAGE_MOCK: TestSpecificMock = {
  GET: [
    {
      urlEndpoint:
        'https://user-storage.api.cx.metamask.io/api/v1/userstorage/addressBook',
      responseCode: 200,
      response: [],
    },
    {
      urlEndpoint:
        'https://user-storage.api.cx.metamask.io/api/v1/userstorage/accounts_v2',
      responseCode: 200,
      response: [],
    },
  ],
};
