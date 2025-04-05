import { createSHA256Hash } from '@metamask/profile-sync-controller/sdk';

// As we rely on profile syncing for most of our features, we need to use the same SRP for all of our tests
export const NOTIFICATIONS_TEAM_SEED_PHRASE =
  'leisure swallow trip elbow prison wait rely keep supply hole general mountain';
export const NOTIFICATIONS_TEAM_PASSWORD = 'notify_password';
// You can use the storage key below to generate mock data
export const NOTIFICATIONS_TEAM_STORAGE_KEY =
  '0d55d30da233959674d14076737198c05ae3fb8631a17e20d3c28c60dddd82f7';

export const NOTIFICATION_WALLET_ACCOUNT_1 =
  '0xAa4179E7f103701e904D27DF223a39Aa9c27405a'.toLowerCase();
export const NOTIFICATION_WALLET_ACCOUNT_2 =
  '0xd2a4aFe5c2fF0a16Bf81F77ba4201A8107AA874b'.toLowerCase();

// This key is used to point in the UserStorage path for notifications
export const NOTIFICATION_STORAGE_HASHED_KEY = createSHA256Hash(
  'notification_settings' + NOTIFICATIONS_TEAM_STORAGE_KEY,
);
