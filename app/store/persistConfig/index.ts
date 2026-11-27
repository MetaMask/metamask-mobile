import { createMigrate, createTransform } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import FilesystemStorage from 'redux-persist-filesystem-storage';
import autoMergeLevel2 from 'redux-persist/lib/stateReconciler/autoMergeLevel2';
import { RootState } from '../../reducers';
import type { CardSliceState } from '../../core/redux/slices/card';
import type { BridgeState } from '../../core/redux/slices/bridge';
import { version, migrations } from '../migrations';
import Logger from '../../util/Logger';
import { reportStorageWriteError } from '../../util/storage/diskSpaceError';
import Device from '../../util/device';
import { UserState } from '../../reducers/user';
import { debounce } from 'lodash';
import { BACKGROUND_STATE_CHANGE_EVENT_NAMES } from '../../core/Engine/constants';

import {
  COLLECTIBLES_STORAGE_KEY,
  UNREADABLE_COLLECTIBLES_JOURNAL,
  readCollectiblesJournal,
  removeCollectiblesJournal,
  writeCollectiblesJournal,
} from './collectiblesPersistence';

const TIMEOUT = 40000;
const STORAGE_THROTTLE_DELAY = 200;

/**
 * Creates a storage object with optional AsyncStorage fallback for migration scenarios.
 *
 * @param enableAsyncStorageFallback - Whether to fall back to AsyncStorage if FilesystemStorage fails
 * @returns Storage object with getItem, setItem, and removeItem methods
 */
const createStorage = (enableAsyncStorageFallback = false) => ({
  async getItem(key: string) {
    if (key === COLLECTIBLES_STORAGE_KEY) return readCollectiblesJournal();
    try {
      const res = await FilesystemStorage.getItem(key);
      if (res) {
        // Using new storage system
        return res;
      }
    } catch (error) {
      Logger.error(error as Error, {
        message: `Failed to get item for ${key}`,
      });
    }

    // Optional AsyncStorage fallback for migration scenarios
    if (enableAsyncStorageFallback) {
      try {
        const res = await AsyncStorage.getItem(key);
        if (res) {
          // Using old storage system
          return res;
        }
      } catch (error) {
        Logger.error(error as Error, { message: 'Failed to run migration' });
        throw new Error('Failed async storage storage fetch.');
      }
    }
  },

  async setItem(key: string, value: string) {
    if (key === COLLECTIBLES_STORAGE_KEY)
      return writeCollectiblesJournal(value);
    try {
      return await FilesystemStorage.setItem(key, value, Device.isIos());
    } catch (error) {
      reportStorageWriteError(error as Error, {
        message: `Failed to set item for ${key}`,
        key,
        source: 'persist_storage',
      });
    }
  },

  async removeItem(key: string) {
    if (key === COLLECTIBLES_STORAGE_KEY) return removeCollectiblesJournal();
    try {
      return await FilesystemStorage.removeItem(key);
    } catch (error) {
      Logger.error(error as Error, {
        message: `Failed to remove item for ${key}`,
      });
    }
  },
});

export const ControllerStorage = {
  // Use the consolidated storage without AsyncStorage fallback
  ...createStorage(false),

  /**
   * Loads every persisted controller file into a `backgroundState` object.
   *
   * @param additionalControllerNames - Controllers to load on top of the
   * runtime ones (derived from the Engine change event names), e.g. removed
   * controllers whose files are still read by migrations.
   * @returns The persisted state, keyed under `backgroundState`.
   */
  async getAllPersistedState(
    additionalControllerNames: readonly string[] = [],
  ): Promise<Record<string, unknown>> {
    try {
      const backgroundState: Record<string, unknown> = {};

      await Promise.all(
        // Build runtime controller list from engine change event names
        Array.from(
          new Set([
            ...Array.from(BACKGROUND_STATE_CHANGE_EVENT_NAMES).map(
              (eventName) => eventName.split(':')[0],
            ),
            ...additionalControllerNames,
          ]),
        ).map(async (controllerName) => {
          const key = `persist:${controllerName}`;
          try {
            const data =
              key === COLLECTIBLES_STORAGE_KEY
                ? await readCollectiblesJournal()
                : await FilesystemStorage.getItem(key);
            if (data) {
              const parsedData = JSON.parse(data);

              // Ensure parsedData is an object to prevent destructuring errors
              if (
                !parsedData ||
                typeof parsedData !== 'object' ||
                Array.isArray(parsedData)
              ) {
                Logger.error(
                  new Error(
                    `Invalid persisted data for ${controllerName}: not an object`,
                  ),
                );
                return; // This just skips this controller, doesn't exit getKey()
              }

              const { _persist, ...controllerState } = parsedData;

              backgroundState[controllerName] = controllerState;
            }
          } catch (error) {
            Logger.error(error as Error, {
              message: `Failed to get controller state for ${controllerName}`,
            });
            if (key === COLLECTIBLES_STORAGE_KEY) {
              backgroundState[controllerName] = UNREADABLE_COLLECTIBLES_JOURNAL;
            }
          }
        }),
      );

      return { backgroundState };
    } catch (error) {
      Logger.error(error as Error, {
        message: 'Failed to gather controller states',
      });
      return { backgroundState: {} };
    }
  },
};

// Use the consolidated storage WITH AsyncStorage fallback for migration scenarios
const MigratedStorage = createStorage(true);
/**
 * Creates a debounced controller persistence function.
 *
 * This utility handles saving controller state to individual filesystem storage files
 * with automatic debouncing to prevent excessive writes during rapid state changes.
 *
 * @param debounceMs - Milliseconds to debounce persistence operations (default: 200ms)
 * @returns Debounced persistence function
 */
export const createPersistController = (debounceMs: number = 200) =>
  debounce(async (filteredState: unknown, controllerName: string) => {
    try {
      // Save the filtered state to filesystem storage
      await ControllerStorage.setItem(
        `persist:${controllerName}`,
        JSON.stringify(filteredState),
      );

      Logger.log(`${controllerName} state persisted successfully`);
    } catch (error) {
      Logger.error(error as Error, {
        message: `Failed to persist ${controllerName} state`,
      });
    }
  }, debounceMs);

type PersistedUserState = Omit<
  UserState,
  'initialScreen' | 'isAuthChecked' | 'appServicesReady' | 'userLoggedIn'
>;

const persistUserTransform = createTransform<UserState, PersistedUserState>(
  (inboundState) => {
    const {
      initialScreen,
      isAuthChecked,
      appServicesReady,
      userLoggedIn,
      ...state
    } = inboundState;
    // userLoggedIn is session-only; rehydrated true would claim unlocked during Login.
    return state;
  },
  // Restore session fields to their initial values on read. Older builds
  // persisted userLoggedIn, so without the explicit `false` here the first
  // rehydrate after an upgrade would claim the wallet is unlocked while it
  // is still locked.
  (outboundState) => ({
    ...outboundState,
    moneySplashSeen: outboundState.moneySplashSeen ?? false,
    initialScreen: '',
    isAuthChecked: false,
    appServicesReady: false,
    userLoggedIn: false,
  }),
  { whitelist: ['user'] },
);

const persistOnboardingTransform = createTransform(
  (inboundState: RootState['onboarding']) => {
    const {
      events,
      walletHomeOnboardingSkipInitialBalanceWait: _omitSessionSkipBalanceWait,
      ...state
    } = inboundState;
    // Reconstruct data to persist (session-only fields stripped like `events`)
    return state;
  },
  null,
  { whitelist: ['onboarding'] },
);

type PersistedCardState = Omit<
  CardSliceState,
  | 'pendingMoneyAccountCardLink'
  | 'cardArrivalPreviewRequested'
  | 'immersveFundingSettling'
>;

const persistCardTransform = createTransform<
  CardSliceState,
  PersistedCardState
>(
  (inboundState) => {
    const {
      pendingMoneyAccountCardLink: _omitSession,
      cardArrivalPreviewRequested: _omitPreview,
      immersveFundingSettling: _omitFundingSettling,
      ...state
    } = inboundState;
    return state;
  },
  (outboundState) => ({
    ...outboundState,
    pendingMoneyAccountCardLink: null,
    cardArrivalPreviewRequested: false,
    immersveFundingSettling: false,
  }),
  { whitelist: ['card'] },
);

// Advanced-order settings are session-only. Limit settings are also cleared on
// read because older builds persisted limitOrderCostTolerance.
type PersistedBridgeState = Omit<
  BridgeState,
  | 'limitOrderCostTolerance'
  | 'limitOrderExpirationMinutes'
  | 'recurringPriceTolerance'
>;

const persistBridgeTransform = createTransform<
  BridgeState,
  PersistedBridgeState
>(
  ({
    limitOrderCostTolerance: _omitCostTolerance,
    limitOrderExpirationMinutes: _omitExpirationMinutes,
    recurringPriceTolerance: _omitRecurringPriceTolerance,
    ...state
  }) => state,
  (state) => ({
    ...state,
    limitOrderCostTolerance: undefined,
    limitOrderExpirationMinutes: undefined,
    recurringPriceTolerance: undefined,
  }),
  { whitelist: ['bridge'] },
);

const persistConfig = {
  key: 'root',
  version,
  blacklist: [
    'rpcEvents',
    'accounts',
    'confirmationMetrics',
    'alert',
    'engine',
    'qrKeyringScanner',
    'securityAlerts',
  ],
  storage: MigratedStorage,
  transforms: [
    persistUserTransform,
    persistOnboardingTransform,
    persistCardTransform,
    persistBridgeTransform,
  ],
  stateReconciler: autoMergeLevel2, // see "Merge Process" section for details.
  migrate: createMigrate(migrations, {
    debug: false,
  }),
  timeout: TIMEOUT,
  throttle: STORAGE_THROTTLE_DELAY,
  writeFailHandler: (error: Error) =>
    reportStorageWriteError(error, {
      message: 'Error persisting data',
      source: 'redux_persist',
    }),
};

export default persistConfig;
