import type { InternalAccount } from '@metamask/keyring-api';
import { KeyringTypes } from '@metamask/keyring-controller';
import type {
  MarkAsReadNotificationsParam,
  Notification,
} from '../../../util/notifications/types/notification';

export interface UseCreateSessionReturn {
  createSession: () => Promise<string | undefined>;
  loading: boolean;
  error?: string;
}
export interface EnableMetametricsReturn {
  enableMetametrics: () => Promise<string | undefined>;
  loading: boolean;
  error?: string;
}
export interface DisableMetametricsReturn {
  disableMetametrics: () => Promise<string | undefined>;
  loading: boolean;
  error?: string;
}
export interface ListNotificationsReturn {
  listNotifications: () => Promise<string | undefined>;
  notificationsData?: Notification[];
  isLoading: boolean;
  error?: string;
}
export interface CreateNotificationsReturn {
  createNotifications: (accounts: string[]) => Promise<string | undefined>;
  loading: boolean;
  error?: string;
}
export interface EnableNotificationsReturn {
  enableNotifications: () => Promise<string | boolean>;
  loading: boolean;
  error?: string;
}
export type AccountType = InternalAccount & {
  balance: string;
  keyring: KeyringTypes;
  label: string;
};

export interface DisableNotificationsReturn {
  disableNotifications: () => Promise<string | boolean>;
  loading: boolean;
  error?: string;
}

export interface MarkNotificationAsReadReturn {
  markNotificationAsRead: (
    notifications: MarkAsReadNotificationsParam[],
  ) => Promise<string | undefined>;
  loading: boolean;
  error?: string;
}

export interface EnableProfileSyncingReturn {
  enableProfileSyncing: () => Promise<string | undefined>;
  loading: boolean;
  error?: string;
}

export interface DisableProfileSyncingReturn {
  disableProfileSyncing: () => Promise<string | undefined>;
  loading: boolean;
  error?: string;
}

export interface SetIsProfileSyncingEnabledReturn {
  setIsProfileSyncingEnabled: () => Promise<string | undefined>;
  error?: string;
}

export interface SwitchSnapNotificationsChangeReturn {
  onChange: (state: boolean) => void;
  error?: string;
}
export interface SwitchFeatureAnnouncementsChangeReturn {
  onChange: (state: boolean) => void;
  error?: string;
}

export interface SwitchPushNotificationsReturn {
  onChange: (UUIDS: string[], state: boolean) => void;
  error?: string;
}

export interface UseSwitchAccountNotificationsData {
  [address: string]: boolean;
}

export interface SwitchAccountNotificationsReturn {
  switchAccountNotifications: () => Promise<string | undefined>;
  isLoading: boolean;
  error?: string;
}

export interface SwitchAccountNotificationsChangeReturn {
  onChange: (addresses: string[], state: boolean) => void;
  error?: string;
}
