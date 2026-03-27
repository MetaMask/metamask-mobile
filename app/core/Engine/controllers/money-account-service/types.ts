import type {
  KeyringControllerAddNewKeyringAction,
  KeyringControllerWithKeyringAction,
  KeyringControllerGetStateAction,
} from '@metamask/keyring-controller';
import type { Messenger } from '@metamask/messenger';

import type { serviceName } from './money-account-service';
import type { MoneyAccountServiceMethodActions } from './money-account-service-method-action-types';

export type MoneyAccountServiceActions = MoneyAccountServiceMethodActions;

type AllowedActions =
  | KeyringControllerWithKeyringAction
  | KeyringControllerAddNewKeyringAction
  | KeyringControllerGetStateAction;

type AllowedEvents = never;

export type MoneyAccountServiceMessenger = Messenger<
  typeof serviceName,
  MoneyAccountServiceActions | AllowedActions,
  AllowedEvents
>;
