import {
  getAuthenticatedStorageUrl,
  type NotificationPreferences,
  type WalletActivityAccount,
} from '@metamask/authenticated-user-storage';
import {
  DEFAULT_AGENTIC_CLI_PREFERENCES,
  DEFAULT_PERPS_PREFERENCES,
  DEFAULT_SOCIAL_AI_PREFERENCES,
} from '@metamask/notification-services-controller';
import type { Hex } from '@metamask/utils';
import { getAuthenticatedUserStorageEnvironment } from '../../core/Engine/controllers/authenticated-user-storage-service-init';
import Engine from '../../core/Engine';
import ReactQueryService from '../../core/ReactQueryService';
import Logger from '../Logger';
import { toFormattedAddress } from '../address';
import {
  isNotificationPreferencesMissingAgenticCli,
  resolveAgenticCliPreference,
  withAgenticCliDefaults,
} from './agenticCliNotificationPreferences';

const GET_NOTIFICATION_PREFERENCES_ACTION =
  'AuthenticatedUserStorageService:getNotificationPreferences' as const;
const NOTIFICATION_PREFERENCES_QUERY_KEY = [
  GET_NOTIFICATION_PREFERENCES_ACTION,
];
const CLIENT_TYPE = 'mobile' as const;

/** Prevents re-applying ON defaults when the server omits `agenticCli` from GET. */
let hasPersistedAgenticCliDefaultsMigration = false;

export const fetchRawNotificationPreferences =
  async (): Promise<NotificationPreferences | null> => {
    const accessToken =
      await Engine.context.AuthenticationController.getBearerToken();
    const url = `${getAuthenticatedStorageUrl(
      getAuthenticatedUserStorageEnvironment(),
    )}/preferences/notifications`;

    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(
        `Failed to fetch notification preferences for migration: ${response.status}`,
      );
    }

    return (await response.json()) as NotificationPreferences;
  };

const putRawNotificationPreferences = async (
  preferences: NotificationPreferences,
): Promise<void> => {
  const accessToken =
    await Engine.context.AuthenticationController.getBearerToken();
  const url = `${getAuthenticatedStorageUrl(
    getAuthenticatedUserStorageEnvironment(),
  )}/preferences/notifications`;

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'X-Client-Type': CLIENT_TYPE,
    },
    body: JSON.stringify(preferences),
  });

  if (!response.ok) {
    throw new Error(
      `Failed to put notification preferences: ${response.status}`,
    );
  }
};

/**
 * Persists via raw HTTP so AUS messenger PUT does not invalidate the React
 * Query cache and trigger a validated GET that drops `agenticCli` updates.
 */
const persistNotificationPreferences = async (
  preferences: NotificationPreferences,
): Promise<NotificationPreferences> => {
  const preferencesWithDefaults = withAgenticCliDefaults(preferences);

  await putRawNotificationPreferences(preferencesWithDefaults);

  ReactQueryService.queryClient.setQueryData(
    NOTIFICATION_PREFERENCES_QUERY_KEY,
    preferencesWithDefaults,
  );

  return preferencesWithDefaults;
};

export const readValidatedNotificationPreferences =
  async (): Promise<NotificationPreferences | null> => {
    try {
      return await Engine.controllerMessenger.call(
        GET_NOTIFICATION_PREFERENCES_ACTION,
      );
    } catch {
      return null;
    }
  };

/**
 * Reads notification preferences for merge-and-PUT updates. Falls back to raw
 * HTTP when validated GET fails on legacy blobs missing `agenticCli`.
 */
export const readNotificationPreferencesForUpdate =
  async (): Promise<NotificationPreferences | null> => {
    const cachedPreferences =
      ReactQueryService.queryClient.getQueryData<NotificationPreferences>(
        NOTIFICATION_PREFERENCES_QUERY_KEY,
      );

    const validatedPreferences = await readValidatedNotificationPreferences();
    const serverPreferences =
      validatedPreferences ?? (await fetchRawNotificationPreferences());

    if (serverPreferences == null) {
      return cachedPreferences ?? null;
    }

    if (
      cachedPreferences?.agenticCli != null &&
      isNotificationPreferencesMissingAgenticCli(serverPreferences)
    ) {
      return {
        ...serverPreferences,
        agenticCli: cachedPreferences.agenticCli,
      };
    }

    return serverPreferences;
  };

/**
 * Merges partial preference updates onto the latest server blob and persists
 * via PUT, using raw GET when validated GET fails.
 */
export const mergeAndPersistNotificationPreferences = async (
  updates: Partial<NotificationPreferences>,
): Promise<NotificationPreferences> => {
  const currentPreferences = await readNotificationPreferencesForUpdate();

  if (currentPreferences == null) {
    throw new Error('No notification preferences found to update');
  }

  return persistNotificationPreferences({
    ...currentPreferences,
    ...updates,
  });
};

const getKeyringEvmAddresses = (): string[] => {
  const { keyrings } = Engine.context.KeyringController.state;
  return [
    ...new Set(
      keyrings
        .flatMap((keyring) => keyring.accounts)
        .map((address) => toFormattedAddress(address)),
    ),
  ];
};

const buildInitialNotificationPreferences = (
  addresses: string[],
): NotificationPreferences =>
  withAgenticCliDefaults({
    walletActivity: {
      inAppNotificationsEnabled: true,
      pushNotificationsEnabled: true,
      accounts: addresses.map(
        (address): WalletActivityAccount => ({
          address: address.toLowerCase() as Hex,
          enabled: true,
        }),
      ),
    },
    marketing: {
      inAppNotificationsEnabled: false,
      pushNotificationsEnabled: false,
    },
    perps: { ...DEFAULT_PERPS_PREFERENCES },
    socialAI: { ...DEFAULT_SOCIAL_AI_PREFERENCES },
  });

const mergeWalletActivityAccountStates = (
  preferences: NotificationPreferences,
  updates: { address: string; enabled: boolean }[],
): NotificationPreferences => {
  const accountsByAddress = new Map(
    (preferences.walletActivity.accounts ?? []).map((account) => [
      account.address.toLowerCase(),
      {
        address: account.address.toLowerCase() as Hex,
        enabled: account.enabled,
      },
    ]),
  );

  for (const update of updates) {
    accountsByAddress.set(update.address.toLowerCase(), {
      address: update.address.toLowerCase() as Hex,
      enabled: update.enabled,
    });
  }

  return withAgenticCliDefaults({
    ...preferences,
    walletActivity: {
      ...preferences.walletActivity,
      accounts: [...accountsByAddress.values()],
    },
  });
};

/**
 * Backfills `agenticCli` on stored notification preferences when the server blob
 * predates core#8933. Preview `authenticated-user-storage` rejects GET responses
 * that omit `agenticCli`, which breaks account enable/disable and inbox fetch.
 */
export const ensureAgenticCliNotificationPreferencesMigrated =
  async (): Promise<void> => {
    try {
      const validatedPreferences = await readValidatedNotificationPreferences();

      if (
        validatedPreferences != null &&
        !isNotificationPreferencesMissingAgenticCli(validatedPreferences)
      ) {
        return;
      }

      const rawPreferences = await fetchRawNotificationPreferences();

      if (
        rawPreferences != null &&
        isNotificationPreferencesMissingAgenticCli(rawPreferences)
      ) {
        if (hasPersistedAgenticCliDefaultsMigration) {
          return;
        }

        await persistNotificationPreferences(rawPreferences);
        hasPersistedAgenticCliDefaultsMigration = true;
        Logger.log(
          'Migrated notification preferences with agenticCli defaults',
        );
      }
    } catch (error) {
      Logger.error(
        error as Error,
        'Failed to migrate notification preferences with agenticCli defaults',
      );
      throw error;
    }
  };

/**
 * Ensures AUS notification preferences exist on the server. Uses raw HTTP when
 * validated GET fails on legacy blobs missing `agenticCli`.
 */
export const ensureNotificationPreferencesReady = async (): Promise<void> => {
  await ensureAgenticCliNotificationPreferencesMigrated();

  const validatedPreferences = await readValidatedNotificationPreferences();
  if (validatedPreferences != null) {
    return;
  }

  const rawPreferences = await fetchRawNotificationPreferences();

  if (rawPreferences == null) {
    const addresses = getKeyringEvmAddresses();
    await persistNotificationPreferences(
      buildInitialNotificationPreferences(addresses),
    );
    Logger.log('Initialized fresh notification preferences blob');
    return;
  }

  if (
    isNotificationPreferencesMissingAgenticCli(rawPreferences) &&
    !hasPersistedAgenticCliDefaultsMigration
  ) {
    await persistNotificationPreferences(rawPreferences);
    hasPersistedAgenticCliDefaultsMigration = true;
    Logger.log(
      'Re-persisted legacy notification preferences with agenticCli defaults',
    );
  }
};

/**
 * Enables agentic CLI push and in-app notifications when either channel is off.
 * Used after Agentic CLI QR login so users receive CLI-related notifications.
 */
export const enableAgenticCliNotificationsIfDisabled =
  async (): Promise<boolean> => {
    await ensureNotificationPreferencesReady();

    const preferences = await readNotificationPreferencesForUpdate();
    const currentPreference = resolveAgenticCliPreference(preferences);

    if (
      currentPreference.inAppNotificationsEnabled &&
      currentPreference.pushNotificationsEnabled
    ) {
      return false;
    }

    await mergeAndPersistNotificationPreferences({
      agenticCli: {
        ...currentPreference,
        inAppNotificationsEnabled: true,
        pushNotificationsEnabled: true,
      },
    });

    return true;
  };

export const readWalletActivityAccountEnabledStates = async (
  accounts: string[],
): Promise<Record<string, boolean>> => {
  await ensureNotificationPreferencesReady();

  const preferences = await fetchRawNotificationPreferences();
  const enabledByAddress = new Map(
    (preferences?.walletActivity.accounts ?? []).map((account) => [
      account.address.toLowerCase(),
      account.enabled,
    ]),
  );

  return accounts.reduce<Record<string, boolean>>((result, address) => {
    result[address] = enabledByAddress.get(address.toLowerCase()) ?? false;
    return result;
  }, {});
};

export const getEnabledWalletActivityAddresses = async (): Promise<
  string[]
> => {
  await ensureNotificationPreferencesReady();

  const preferences = await fetchRawNotificationPreferences();
  return (preferences?.walletActivity.accounts ?? [])
    .filter((account) => account.enabled)
    .map((account) => account.address);
};

/**
 * Seeds the AUS React Query cache with agenticCli defaults so validated GET
 * succeeds when the server blob predates core#8933.
 */
export const seedNotificationPreferencesQueryCache =
  async (): Promise<void> => {
    const cachedPreferences =
      ReactQueryService.queryClient.getQueryData<NotificationPreferences>(
        NOTIFICATION_PREFERENCES_QUERY_KEY,
      );

    if (cachedPreferences != null) {
      return;
    }

    const rawPreferences = await fetchRawNotificationPreferences();
    if (rawPreferences == null) {
      return;
    }

    ReactQueryService.queryClient.setQueryData(
      NOTIFICATION_PREFERENCES_QUERY_KEY,
      withAgenticCliDefaults(rawPreferences),
    );
  };

export const updateWalletActivityAccountEnabledStates = async (
  accounts: string[],
  enabled: boolean,
): Promise<void> => {
  await ensureNotificationPreferencesReady();

  let preferences = await fetchRawNotificationPreferences();

  if (preferences == null) {
    preferences = buildInitialNotificationPreferences(getKeyringEvmAddresses());
  }

  await persistNotificationPreferences(
    mergeWalletActivityAccountStates(
      preferences,
      accounts.map((address) => ({ address, enabled })),
    ),
  );
};
