import { MOCK_SRP_E2E_IDENTIFIER_BASE_KEY } from './mocks';
import { USER_STORAGE_FEATURE_NAMES } from '@metamask/profile-sync-controller/sdk';
import { UserStorageMockttpController } from './user-storage/userStorageMockttpController';

export interface UserStorageAccount {
  /**
   * The Version 'v' of the User Storage.
   * NOTE - will allow us to support upgrade/downgrades in the future
   */
  v: string;
  /** the id 'i' of the account */
  i: string;
  /** the address 'a' of the account */
  a: string;
  /** the name 'n' of the account */
  n: string;
  /** the nameLastUpdatedAt timestamp 'nlu' of the account */
  nlu?: number;
}

export const determineIfFeatureEntryFromURL = (url: string) => {
  const decodedUrl = decodeURIComponent(url);
  return (
    decodedUrl.substring(decodedUrl.lastIndexOf('userstorage') + 12).split('/')
      .length === 2
  );
};

export const getDecodedProxiedURL = (url: string) =>
  decodeURIComponent(String(new URL(url).searchParams.get('url')));

export const getSrpIdentifierFromHeaders = (
  headers: Record<string, unknown>,
) => {
  const authHeader = headers.authorization;
  return (
    authHeader?.toString()?.split(' ')[1] ||
    `${MOCK_SRP_E2E_IDENTIFIER_BASE_KEY}_1`
  );
};

export const arrangeTestUtils = (
  userStorageMockttpController: UserStorageMockttpController,
) => {
  const BASE_TIMEOUT = 12000;
  const BASE_INTERVAL = 1000;

  const prepareEventsEmittedCounter = (event: string) => {
    let counter = 0;
    userStorageMockttpController.eventEmitter.on(event, () => {
      counter += 1;
    });

    const waitUntilEventsEmittedNumberEquals = (
      expectedNumber: number,
    ): Promise<void> =>
      new Promise((resolve, reject) => {
        if (counter >= expectedNumber) {
          resolve();
          return;
        }

        (() => {
          const ids = {} as {
            interval: NodeJS.Timeout;
            timeout: NodeJS.Timeout;
          };

          ids.interval = setInterval(() => {
            if (counter >= expectedNumber) {
              clearInterval(ids.interval);
              clearTimeout(ids.timeout);
              resolve();
            }
          }, BASE_INTERVAL);

          ids.timeout = setTimeout(() => {
            clearInterval(ids.interval);
            reject(
              new Error(
                `Timeout waiting for event ${event} to be emitted ${expectedNumber} times`,
              ),
            );
          }, BASE_TIMEOUT);

          return ids;
        })();
      });

    return { waitUntilEventsEmittedNumberEquals };
  };

  /**
   * Waits until the number of synced accounts equals the expected number
   * @param {number} expectedNumber - The expected number of accounts
   * @returns {Promise} Resolves when the condition is met, rejects on timeout
   */
  const waitUntilSyncedAccountsNumberEquals = (
    expectedNumber: number,
  ): Promise<void> =>
    new Promise((resolve, reject) => {
      const checkAccounts = () => {
        const accounts = userStorageMockttpController.paths.get(
          USER_STORAGE_FEATURE_NAMES.accounts,
        )?.response;
        return accounts?.length === expectedNumber;
      };

      if (checkAccounts()) {
        resolve();
        return;
      }

      (() => {
        const ids = {} as {
          interval: NodeJS.Timeout;
          timeout: NodeJS.Timeout;
        };

        ids.interval = setInterval(() => {
          if (checkAccounts()) {
            clearInterval(ids.interval);
            clearTimeout(ids.timeout);
            resolve();
          }
        }, BASE_INTERVAL);

        ids.timeout = setTimeout(() => {
          clearInterval(ids.interval);
          reject(
            new Error(
              `Timeout waiting for synced accounts number to be ${expectedNumber}`,
            ),
          );
        }, BASE_TIMEOUT);

        return ids;
      })();
    });

  const waitUntilSyncedContactsNumberEquals = (
    expectedNumber: number,
  ): Promise<void> =>
    new Promise((resolve, reject) => {
      const checkContacts = () => {
        const contacts = userStorageMockttpController.paths.get(
          USER_STORAGE_FEATURE_NAMES.addressBook,
        )?.response;
        return contacts?.length === expectedNumber;
      };

      if (checkContacts()) {
        resolve();
        return;
      }

      (() => {
        const ids = {} as {
          interval: NodeJS.Timeout;
          timeout: NodeJS.Timeout;
        };

        ids.interval = setInterval(() => {
          if (checkContacts()) {
            clearInterval(ids.interval);
            clearTimeout(ids.timeout);
            resolve();
          }
        }, BASE_INTERVAL);

        ids.timeout = setTimeout(() => {
          clearInterval(ids.interval);
          reject(
            new Error(
              `Timeout waiting for synced contacts number to be ${expectedNumber}`,
            ),
          );
        }, BASE_TIMEOUT);

        return ids;
      })();
    });

  return {
    prepareEventsEmittedCounter,
    waitUntilSyncedAccountsNumberEquals,
    waitUntilSyncedContactsNumberEquals,
  };
};
