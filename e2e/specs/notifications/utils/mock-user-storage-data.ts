import { createMockFullUserStorage } from '@metamask/notification-services-controller/notification-services/mocks';
import { Encryption } from '@metamask/profile-sync-controller/sdk';
import {
  NOTIFICATION_WALLET_ACCOUNT_1,
  NOTIFICATIONS_TEAM_STORAGE_KEY,
} from './constants';

export const mockStorageWithTriggers = createMockFullUserStorage({
  address: NOTIFICATION_WALLET_ACCOUNT_1,
});

let cachedEncryptedStorageWithTriggers: string | undefined;
export const encryptedStorageWithTriggers = async () =>
  (cachedEncryptedStorageWithTriggers ??= await Encryption.encryptString(
    JSON.stringify(mockStorageWithTriggers),
    NOTIFICATIONS_TEAM_STORAGE_KEY,
  ));
