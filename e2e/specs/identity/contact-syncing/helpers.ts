import { SDK } from '@metamask/profile-sync-controller';
import { IDENTITY_TEAM_STORAGE_KEY } from '../utils/constants';
import { UserStorageMockttpController } from '../utils/user-storage/userStorageMockttpController';
import { USER_STORAGE_FEATURE_NAMES } from '@metamask/profile-sync-controller/sdk';

/**
 * Prepares test utilities for contact syncing tests
 * @param {Object} userStorageMockttpController - The mock controller instance
 * @returns {Object} Test utilities
 */
export const arrangeTestUtils = (
  userStorageMockttpController: UserStorageMockttpController,
) => {
  const prepareEventsEmittedCounter = (eventName: string) => {
    let eventsEmitted = 0;

    userStorageMockttpController.eventEmitter.on(eventName, () => {
      eventsEmitted += 1;
    });

    const waitUntilEventsEmittedNumberEquals = async (
      expectedNumber: number,
    ) => {
      const maxAttempts = 10;

      // eslint-disable-next-line no-unmodified-loop-condition
      for (let i = 0; i < maxAttempts && eventsEmitted < expectedNumber; i++) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
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

  const waitUntilSyncedContactsNumberEquals = async (
    expectedNumber: number,
  ) => {
    const maxAttempts = 10;
    let attempts = 0;
    let syncedContacts = 0;

    while (syncedContacts < expectedNumber && attempts < maxAttempts) {
      const response = await userStorageMockttpController.paths.get(
        USER_STORAGE_FEATURE_NAMES.addressBook,
      );

      if (response) {
        const decryptedData = await SDK.Encryption.decryptString(
          response.response[0].Data,
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
