import { MOCK_SRP_E2E_IDENTIFIER_BASE_KEY } from './mocks';
import { USER_STORAGE_FEATURE_NAMES } from '@metamask/profile-sync-controller/sdk';
import {
  UserStorageMockttpController,
  UserStorageMockttpControllerEvents,
  AsEnum,
} from './user-storage/userStorageMockttpController';
import { USER_STORAGE_GROUPS_FEATURE_KEY } from '@metamask/account-tree-controller';

/**
 * Extracts the subject (identifier) from a JWT token.
 * @param jwt - The JWT token string
 * @returns The 'sub' claim from the JWT payload
 */
const getE2EIdentifierFromJwt = (jwt: string): string => {
  const parts = jwt.split('.');
  if (parts.length !== 3) {
    return jwt;
  }
  const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
  return payload.sub as string;
};

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
  const token =
    authHeader?.toString()?.split(' ')[1] ||
    `${MOCK_SRP_E2E_IDENTIFIER_BASE_KEY}_1`;

  return getE2EIdentifierFromJwt(token);
};

export const arrangeTestUtils = (
  userStorageMockttpController: UserStorageMockttpController,
) => {
  const BASE_TIMEOUT = 30000;
  const BASE_INTERVAL = 1000;

  const prepareEventsEmittedCounter = (
    event: AsEnum<typeof UserStorageMockttpControllerEvents>,
  ) => {
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
                `Timeout waiting for event ${event} to be emitted ${expectedNumber} times\n Actual: ${counter}`,
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
          USER_STORAGE_GROUPS_FEATURE_KEY,
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
          const actual =
            userStorageMockttpController.paths.get(
              USER_STORAGE_GROUPS_FEATURE_KEY,
            )?.response?.length ?? 0;
          reject(
            new Error(
              `Timeout waiting for synced accounts number to be ${expectedNumber}\n Actual: ${actual}`,
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
          const actual =
            userStorageMockttpController.paths.get(
              USER_STORAGE_FEATURE_NAMES.addressBook,
            )?.response?.length ?? 0;
          reject(
            new Error(
              `Timeout waiting for synced contacts number to be ${expectedNumber}\n Actual: ${actual}`,
            ),
          );
        }, BASE_TIMEOUT);

        return ids;
      })();
    });

  /**
   * Waits until the number of synced elements equals the expected number
   * @param {string} path - The path to check in the user storage
   * @param {number} expectedNumber - The expected number of synced elements
   * @returns {Promise} Resolves when the condition is met, rejects on timeout
   */
  const waitUntilSyncedElementsNumberEquals = (
    path: (typeof USER_STORAGE_FEATURE_NAMES)[keyof typeof USER_STORAGE_FEATURE_NAMES],
    expectedNumber: number,
  ): Promise<void> =>
    new Promise((resolve, reject) => {
      const checkElements = () => {
        const syncedElements =
          userStorageMockttpController.paths.get(path)?.response;
        return syncedElements?.length === expectedNumber;
      };

      if (checkElements()) {
        resolve();
        return;
      }

      (() => {
        const ids = {} as {
          interval: NodeJS.Timeout;
          timeout: NodeJS.Timeout;
        };

        ids.interval = setInterval(() => {
          if (checkElements()) {
            clearInterval(ids.interval);
            clearTimeout(ids.timeout);
            resolve();
          }
        }, BASE_INTERVAL);

        ids.timeout = setTimeout(() => {
          clearInterval(ids.interval);
          const actual =
            userStorageMockttpController.paths.get(path)?.response?.length ?? 0;
          reject(
            new Error(
              `Timeout waiting for synced elements at "${path}" to be ${expectedNumber}\n Actual: ${actual}`,
            ),
          );
        }, BASE_TIMEOUT);

        return ids;
      })();
    });

  return {
    prepareEventsEmittedCounter,
    waitUntilSyncedElementsNumberEquals,
    waitUntilSyncedAccountsNumberEquals,
    waitUntilSyncedContactsNumberEquals,
  };
};
