import { AccountsControllerSelectedAccountChangeEvent } from '@metamask/accounts-controller';
import {
  type NetworkControllerSetActiveNetworkAction,
  type NetworkControllerGetStateAction,
} from '@metamask/network-controller';

export type MultichainNetworkControllerActions =
  | NetworkControllerSetActiveNetworkAction
  | NetworkControllerGetStateAction;

export type MultichainNetworkControllerEvents =
  AccountsControllerSelectedAccountChangeEvent;
