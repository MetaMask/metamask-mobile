import { USER_STORAGE_FEATURE_NAMES } from '@metamask/profile-sync-controller/sdk';

export const determineIfFeatureEntryFromURL = (url) => {
  const decodedUrl = decodeURIComponent(url);
  return (
    decodedUrl.substring(decodedUrl.lastIndexOf('userstorage') + 12).split('/')
      .length === 2
  );
};

export const getDecodedProxiedURL = (url) =>
  decodeURIComponent(String(new URL(url).searchParams.get('url')));

export const arrangeTestUtils = (userStorageMockttpController) => {
  const BASE_TIMEOUT = 30000;
  const BASE_INTERVAL = 1000;

  /**
   * Creates a counter for events and provides a way to wait until a specific number of events have been emitted
   * @param {string} event - The event to track
   * @returns {Object} Object containing waitUntilEventsEmittedNumberEquals function
   */
  const prepareEventsEmittedCounter = (event) => {
    let counter = 0;
    userStorageMockttpController.eventEmitter.on(event, () => {
      counter += 1;
    });

    const waitUntilEventsEmittedNumberEquals = (expectedNumber) =>
      new Promise((resolve, reject) => {
        if (counter >= expectedNumber) {
          resolve();
          return;
        }

        const timerIds = (() => {
          const ids = {};

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
  const waitUntilSyncedAccountsNumberEquals = (expectedNumber) =>
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

      const timerIds = (() => {
        const ids = {};

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

  return {
    prepareEventsEmittedCounter,
    waitUntilSyncedAccountsNumberEquals,
  };
};
