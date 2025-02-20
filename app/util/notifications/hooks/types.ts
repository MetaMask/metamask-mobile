import type { InternalAccount } from '@metamask/keyring-internal-api';
import { KeyringTypes } from '@metamask/keyring-controller';
import type { INotification } from '../../../util/notifications/types/notification';

import { MarkAsReadNotificationsParam } from '../../../actions/notification/helpers';

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
  notificationsData: readonly INotification[];
  isLoading: boolean;
  error?: string;
}
export interface CreateNotificationsReturn {
  createNotifications: (accounts: string[]) => Promise<string | undefined>;
  loading: boolean;
  error?: string;
}
export interface EnableNotificationsReturn {
  enableNotifications: () => Promise<string | undefined>;
  loading: boolean;
  error?: string;
}
export type AccountType = InternalAccount & {
  balance: string;
  keyring: KeyringTypes;
  label: string;
};

export interface DisableNotificationsReturn {
  disableNotifications: () => Promise<string | undefined>;
  loading: boolean;
  error?: string;
}

export interface deleteNotificationsStorageKeyReturn {
  deleteNotificationsStorageKey: () => Promise<string | undefined>;
  loading: boolean;
  error?: string;
}

export interface MarkNotificationAsReadReturn {
  markNotificationAsRead: (
    notifications: MarkAsReadNotificationsParam,
  ) => Promise<string | undefined>;
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
