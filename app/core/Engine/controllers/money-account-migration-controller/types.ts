import type {
  ControllerGetStateAction,
  ControllerStateChangeEvent,
} from '@metamask/base-controller';
import type { Messenger } from '@metamask/messenger';
import type {
  MigratedMoneyAccount,
  MigrationCursor,
} from '../../../../lib/Money/migration/types';

export const MONEY_ACCOUNT_MIGRATION_CONTROLLER_NAME =
  'MoneyAccountMigrationController';

export type MoneyAccountMigrationControllerState = MigrationCursor & {
  /** Keyed by lowercase old Money address. */
  migrated: Record<string, MigratedMoneyAccount>;
};

export type MoneyAccountMigrationControllerActions = ControllerGetStateAction<
  typeof MONEY_ACCOUNT_MIGRATION_CONTROLLER_NAME,
  MoneyAccountMigrationControllerState
>;

export type MoneyAccountMigrationControllerEvents = ControllerStateChangeEvent<
  typeof MONEY_ACCOUNT_MIGRATION_CONTROLLER_NAME,
  MoneyAccountMigrationControllerState
>;

export type MoneyAccountMigrationControllerMessenger = Messenger<
  typeof MONEY_ACCOUNT_MIGRATION_CONTROLLER_NAME,
  MoneyAccountMigrationControllerActions,
  MoneyAccountMigrationControllerEvents
>;
