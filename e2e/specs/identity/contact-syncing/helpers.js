import { SDK } from '@metamask/profile-sync-controller';
import { IDENTITY_TEAM_STORAGE_KEY } from '../utils/constants';
import { UserStorageMockttpControllerEvents } from '../utils/user-storage/userStorageMockttpController';

/**
 * Prepares test utilities for contact syncing tests
 * @param {Object} userStorageMockttpController - The mock controller instance
 * @returns {Object} Test utilities
 */
export const arrangeTestUtils = (userStorageMockttpController) => {
  const prepareEventsEmittedCounter = (eventName) => {
    let eventsEmitted = 0;

    userStorageMockttpController.on(eventName, () => {
      eventsEmitted += 1;
    });

    const waitUntilEventsEmittedNumberEquals = async (expectedNumber) => {
      const maxAttempts = 10;
      let attempts = 0;

      while (eventsEmitted < expectedNumber && attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        attempts += 1;
      }

      if (eventsEmitted !== expectedNumber) {
        throw new Error(
          `Expected ${expectedNumber} events to be emitted, but got ${eventsEmitted}`,
        );
      }
    };

    return {
      waitUntilEventsEmittedNumberEquals,
    };
  };

  const waitUntilSyncedContactsNumberEquals = async (expectedNumber) => {
    const maxAttempts = 10;
    let attempts = 0;
    let syncedContacts = 0;

    while (syncedContacts < expectedNumber && attempts < maxAttempts) {
      const response = await userStorageMockttpController.getPath(
        USER_STORAGE_FEATURE_NAMES.contacts,
      );

      if (response) {
        const decryptedData = await SDK.Encryption.decryptString(
          response.Data,
          IDENTITY_TEAM_STORAGE_KEY,
        );
        const contacts = JSON.parse(decryptedData);
        syncedContacts = Object.keys(contacts).length;
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
      attempts += 1;
    }

    if (syncedContacts !== expectedNumber) {
      throw new Error(
        `Expected ${expectedNumber} contacts to be synced, but got ${syncedContacts}`,
      );
    }
  };

  return {
    prepareEventsEmittedCounter,
    waitUntilSyncedContactsNumberEquals,
  };
}; 