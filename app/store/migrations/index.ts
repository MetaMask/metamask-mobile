import { MigrationManifest } from 'redux-persist';

import migration00 from './000';
import migration01 from './001';
import migration02 from './002';
import migration03 from './003';
import migration04 from './004';
import migration05 from './005';
import migration06 from './006';
import migration07 from './007';
import migration08 from './008';
import migration09 from './009';
import migration10 from './010';
import migration11 from './011';
import migration12 from './012';
import migration13 from './013';
import migration14 from './014';
import migration15 from './015';
import migration16 from './016';
import migration17 from './017';
import migration18 from './018';
import migration19 from './019';
import migration20 from './020';
import migration21 from './021';
import migration22 from './022';
import migration23 from './023';
import migration24 from './024';
import migration25 from './025';
import migration26 from './026';
import migration27 from './027';
import migration28 from './028';
import migration29 from './029';
import migration30 from './030';
import migration31 from './031';
import migration32 from './032';
import migration33 from './033';
import migration34 from './034';
import migration35 from './035';
import migration36 from './036';
import migration37 from './037';
import migration38 from './038';
import migration39 from './039';
import migration40 from './040';
import migration41 from './041';
import migration42 from './042';
import migration43 from './043';
import migration44 from './044';
import migration45 from './045';
import migration46 from './046';
import migration47 from './047';
import migration48 from './048';
import migration49 from './049';
import migration50 from './050';
import migration51 from './051';
import migration52 from './052';
import migration53 from './053';
import migration54 from './054';
import migration55 from './055';
import migration56 from './056';
import migration57 from './057';
import migration58 from './058';
import migration59 from './059';
import migration60 from './060';
import migration61 from './061';
import migration62 from './062';
import migration63 from './063';
import migration64 from './064';
import migration65 from './065';
import migration66 from './066';
import migration67 from './067';
import migration68 from './068';
import migration69 from './069';
import migration70 from './070';
import migration71 from './071';
import migration72 from './072';
import migration73 from './073';
import migration74 from './074';
import migration75 from './075';
import migration76 from './076';
import migration77 from './077';
import migration78 from './078';
import migration79 from './079';
import migration80 from './080';
import migration81 from './081';
import migration82 from './082';
import migration83 from './083';
import migration84 from './084';
import migration85 from './085';
import migration86 from './086';
import migration87 from './087';
import migration88 from './088';
import migration89 from './089';
import migration90 from './090';
import migration91 from './091';
import migration92 from './092';
import migration93 from './093';
import migration94 from './094';
import migration95 from './095';
import migration96 from './096';
import migration97 from './097';
import migration98 from './098';
import migration99 from './099';
import migration100 from './100';
import migration101 from './101';
import migration102 from './102';
import migration103 from './103';
import migration104 from './104';
import migration105 from './105';
import migration106 from './106';
import migration107 from './107';
import migration108 from './108';

// Add migrations above this line
import { ControllerStorage } from '../persistConfig';
import { captureException } from '@sentry/react-native';
import FilesystemStorage from 'redux-persist-filesystem-storage';
import Device from '../../util/device';
import { MIGRATION_ERROR_HAPPENED } from '../../constants/storage';

type MigrationFunction = (state: unknown) => unknown;
type AsyncMigrationFunction = (state: unknown) => Promise<unknown>;
export type MigrationsList = Record<
  string,
  MigrationFunction | AsyncMigrationFunction
>;

/**
 * Contains both asynchronous and synchronous migrations
 */
export const migrationList: MigrationsList = {
  0: migration00,
  1: migration01,
  2: migration02,
  3: migration03,
  4: migration04,
  5: migration05,
  6: migration06,
  7: migration07,
  8: migration08,
  9: migration09,
  10: migration10,
  11: migration11,
  12: migration12,
  13: migration13,
  14: migration14,
  15: migration15,
  16: migration16,
  17: migration17,
  18: migration18,
  19: migration19,
  20: migration20,
  21: migration21,
  22: migration22,
  23: migration23,
  24: migration24,
  25: migration25,
  26: migration26,
  27: migration27,
  28: migration28,
  29: migration29,
  30: migration30,
  31: migration31,
  32: migration32,
  33: migration33,
  34: migration34,
  35: migration35,
  36: migration36,
  37: migration37,
  38: migration38,
  39: migration39,
  40: migration40,
  41: migration41,
  42: migration42,
  43: migration43,
  44: migration44,
  45: migration45,
  46: migration46,
  47: migration47,
  48: migration48,
  49: migration49,
  50: migration50,
  51: migration51,
  52: migration52,
  53: migration53,
  54: migration54,
  55: migration55,
  56: migration56,
  57: migration57,
  58: migration58,
  59: migration59,
  60: migration60,
  61: migration61,
  62: migration62,
  63: migration63,
  64: migration64,
  65: migration65,
  66: migration66,
  67: migration67,
  68: migration68,
  69: migration69,
  70: migration70,
  71: migration71,
  72: migration72,
  73: migration73,
  74: migration74,
  75: migration75,
  76: migration76,
  77: migration77,
  78: migration78,
  79: migration79,
  80: migration80,
  81: migration81,
  82: migration82,
  83: migration83,
  84: migration84,
  85: migration85,
  86: migration86,
  87: migration87,
  88: migration88,
  89: migration89,
  90: migration90,
  91: migration91,
  92: migration92,
  93: migration93,
  94: migration94,
  95: migration95,
  96: migration96,
  97: migration97,
  98: migration98,
  99: migration99,
  100: migration100,
  101: migration101,
  102: migration102,
  103: migration103,
  104: migration104,
  105: migration105,
  106: migration106,
  107: migration107,
  108: migration108,
};

// Enable both synchronous and asynchronous migrations
export const asyncifyMigrations = (inputMigrations: MigrationsList) => {
  const lastVersion = Math.max(...Object.keys(inputMigrations).map(Number));
  let didInflate = false;

  type StateWithEngine = Record<string, unknown> & {
    engine?: { backgroundState?: Record<string, unknown> };
  };

  /**
   * Loads controller data from individual filesystem storage back into engine.backgroundState
   * for migrations to process.
   *
   * - Migration 104 moved controller data from redux-persist to individual files
   * - Migrations 105+ still expect to work with the old engine.backgroundState format
   * - This function temporarily recreates the old format so migrations can run
   * - "unpacking" distributed files back into a single object
   *
   * CRITICAL: Crashes if controller data cannot be loaded.
   * This ensures migrations run with complete data and prevents silent data loss.
   */
  const inflateFromControllers = async (state: unknown) => {
    try {
      const fsState = (await ControllerStorage.getAllPersistedState()) as
        | {
            backgroundState?: Record<string, unknown>;
          }
        | undefined;

      const s = state as StateWithEngine;
      const fsControllers = fsState?.backgroundState || {};

      if (Object.keys(fsControllers).length === 0) {
        return state;
      }

      const inflated: StateWithEngine = {
        ...(s as object),
        engine: {
          ...(s.engine || {}),
          backgroundState: fsControllers,
        },
      } as StateWithEngine;
      return inflated as unknown;
    } catch (error) {
      captureException(
        new Error(
          `inflateFromControllers: Critical error loading controller data: ${String(
            error,
          )}`,
        ),
      );

      throw new Error(
        `Critical: Failed to load controller data for migration. ` +
          `Cannot continue safely as migrations may corrupt data without complete state. ` +
          `App will restart to attempt recovery. Error: ${String(error)}`,
      );
    }
  };

  /**
   * Saves controller data from engine.backgroundState back to individual filesystem storage
   * and removes the engine slice from redux state.
   *
   * - After migrations run, we need to save updated controller data back to individual files
   * - The engine.backgroundState should not persist in redux (it's just temporary for migrations)
   * - This function "redistributes" the single object back into individual controller files
   * - Then strips engine.backgroundState from redux to maintain the new architecture
   * - "repacking" the single object back into distributed files
   *
   * CRITICAL: Crashes immediately if ANY controller fails to save.
   * This prevents partial migration state corruption and ensures clean recovery.
   */
  const deflateToControllersAndStrip = async (state: unknown) => {
    try {
      const s = state as StateWithEngine;
      const migratedControllers = s.engine?.backgroundState || {};
      const entries = Object.entries(migratedControllers) as [
        string,
        unknown,
      ][];
      await Promise.all(
        entries.map(async ([controllerName, controllerState]) => {
          try {
            await ControllerStorage.setItem(
              `persist:${controllerName}`,
              JSON.stringify(controllerState),
            );
          } catch (error) {
            captureException(
              new Error(
                `deflateToControllersAndStrip: Failed to save ${controllerName} to individual storage: ${String(
                  error,
                )}`,
              ),
            );

            throw new Error(
              `Critical: Migration failed for controller '${controllerName}'. ` +
                `Cannot continue with partial migration as this would corrupt user data. ` +
                `App will restart to attempt recovery. Error: ${String(error)}`,
            );
          }
        }),
      );

      const { engine: _engine, ...rest } = s;
      return rest as unknown;
    } catch (error) {
      captureException(
        new Error(
          `deflateToControllersAndStrip: Critical error during deflation: ${String(
            error,
          )}`,
        ),
      );

      throw new Error(
        `Critical: deflateToControllersAndStrip failed completely. ` +
          `Cannot continue safely as this indicates severe migration system failure. ` +
          `App will restart to attempt recovery. Error: ${String(error)}`,
      );
    }
  };

  return Object.entries(inputMigrations).reduce(
    (newMigrations, [migrationNumber, migrationFunction]) => {
      const asyncMigration = async (
        incomingState: Promise<unknown> | unknown,
      ) => {
        try {
          let state = await incomingState;

          if (!didInflate && Number(migrationNumber) > 107) {
            state = await inflateFromControllers(state);
            didInflate = true;
          }

          const migratedState = await migrationFunction(state);
          if (Number(migrationNumber) === lastVersion && lastVersion >= 107) {
            const s2 = migratedState as StateWithEngine;
            const hasControllers = Boolean(
              s2.engine?.backgroundState &&
                Object.keys(s2.engine.backgroundState).length > 0,
            );
            if (hasControllers) {
              return await deflateToControllersAndStrip(migratedState);
            }
          }

          return migratedState;
        } catch (error) {
          try {
            // Use FilesystemStorage with isIos flag to exclude from iCloud backup
            // This prevents the flag from persisting across app deletions on iOS
            await FilesystemStorage.setItem(
              MIGRATION_ERROR_HAPPENED,
              'true',
              Device.isIos(),
            );
          } catch (storageError) {
            captureException(storageError as Error);
          }

          // Re-throw to let redux-persist handle it
          throw error;
        }
      };
      newMigrations[migrationNumber] = asyncMigration;
      return newMigrations;
    },
    {} as Record<string, AsyncMigrationFunction>,
  );
};

// Convert all migrations to async
export const migrations = asyncifyMigrations(
  migrationList,
) as unknown as MigrationManifest;

// The latest (i.e. highest) version number.
export const version = Object.keys(migrations).length - 1;
