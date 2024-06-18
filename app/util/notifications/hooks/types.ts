import type { InternalAccount } from '@metamask/keyring-api';
import { KeyringTypes } from '@metamask/keyring-controller';
import type {
  MarkAsReadNotificationsParam,
  Notification,
} from '../../../util/notifications/types/notification';

export interface UseCreateSessionReturn {
  createSession: () => Promise<void>;
}
export interface EnableMetametricsReturn {
  enableMetametrics: () => Promise<void>;
  loading: boolean;
  error: string | null;
}
export interface DisableMetametricsReturn {
  disableMetametrics: () => Promise<void>;
  loading: boolean;
  error: string | null;
}
export interface ListNotificationsReturn {
  listNotifications: () => Promise<Notification[] | undefined>;
  notificationsData?: Notification[];
  isLoading: boolean;
  error?: unknown;
}
export interface CreateNotificationsReturn {
  createNotifications: () => Promise<void>;
  loading: boolean;
  error: string | null;
}
export interface EnableNotificationsReturn {
  enableNotifications: () => Promise<void>;
  loading: boolean;
  error: string | null;
}
export type AccountType = InternalAccount & {
  balance: string;
  keyring: KeyringTypes;
  label: string;
};

export interface DisableNotificationsReturn {
  disableNotifications: () => Promise<void>;
  loading: boolean;
  error: string | null;
}

export interface MarkNotificationAsReadReturn {
  markNotificationAsRead: (
    notifications: MarkAsReadNotificationsParam,
  ) => Promise<void>;
}

export interface EnableProfileSyncingReturn {
  enableProfileSyncing: () => Promise<void>;
  error: string | null;
}

export interface DisableProfileSyncingReturn {
  disableProfileSyncing: () => Promise<void>;
  error: string | null;
}

export interface SetIsProfileSyncingEnabledReturn {
  setIsProfileSyncingEnabled: () => Promise<void>;
  error: string | null;
}

export interface SwitchSnapNotificationsChangeReturn {
  onChange: (state: boolean) => Promise<void>;
  error: null | string;
}
export interface SwitchFeatureAnnouncementsChangeReturn {
  onChange: (state: boolean) => Promise<void>;
  error: null | string;
}

export interface UseSwitchAccountNotificationsData {
  [address: string]: boolean;
}

export interface SwitchAccountNotificationsReturn {
  switchAccountNotifications: () => Promise<
    UseSwitchAccountNotificationsData | undefined
  >;
  isLoading: boolean;
  error: string | null;
}

export interface SwitchAccountNotificationsChangeReturn {
  onChange: (addresses: string[], state: boolean) => Promise<void>;
  error: string | null;
}
