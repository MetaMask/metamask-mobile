import { MockEventsObject } from '../../../framework';
import { USER_STORAGE_FEATURE_NAMES } from '@metamask/profile-sync-controller/sdk';
import {
  USER_STORAGE_GROUPS_FEATURE_KEY,
  USER_STORAGE_WALLETS_FEATURE_KEY,
} from '@metamask/account-tree-controller';

const accountsStorageUrl = `https://user-storage.api.cx.metamask.io/api/v1/userstorage/${USER_STORAGE_FEATURE_NAMES.accounts}`;

const contactStorageUrl = `https://user-storage.api.cx.metamask.io/api/v1/userstorage/${USER_STORAGE_FEATURE_NAMES.addressBook}`;

const multichainWalletsUrl = `https://user-storage.api.cx.metamask.io/api/v1/userstorage/${USER_STORAGE_WALLETS_FEATURE_KEY}`;

const multichainGroupsUrl = `https://user-storage.api.cx.metamask.io/api/v1/userstorage/${USER_STORAGE_GROUPS_FEATURE_KEY}`;

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
      urlEndpoint:
        /^https:\/\/user-storage\.api\.cx\.metamask\.io\/api\/v1\/userstorage\/addressBook\/[a-fA-F0-9]+$/,
      responseCode: 200,
      response: 'OK',
    },
    {
      urlEndpoint: contactStorageUrl,
      responseCode: 200,
      response: [],
    },
    {
      urlEndpoint:
        /^https:\/\/user-storage\.api\.cx\.metamask\.io\/api\/v1\/userstorage\/multichain_accounts_wallets\/[a-fA-F0-9]+$/,
      responseCode: 200,
      response: 'OK',
    },
    {
      urlEndpoint: multichainWalletsUrl,
      responseCode: 200,
      response: 'OK',
    },
    {
      urlEndpoint:
        /^https:\/\/user-storage\.api\.cx\.metamask\.io\/api\/v1\/userstorage\/multichain_accounts_groups\/[a-fA-F0-9]+$/,
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
