import { RestrictedMessenger } from '@metamask/base-controller';
import { MaybeUpdateState, TestOrigin } from '@metamask/phishing-controller';
import type { KeyringControllerGetAccountsAction } from '@metamask/keyring-controller';
import { GetSubjectMetadata } from '@metamask/permission-controller';
import {
  AccountsControllerGetAccountByAddressAction,
  AccountsControllerSetAccountNameAction,
  AccountsControllerSetAccountNameAndSelectAccountAction,
  AccountsControllerSetSelectedAccountAction,
  AccountsControllerListMultichainAccountsAction,
} from '@metamask/accounts-controller';
import type {
  AcceptRequest,
  AddApprovalRequest,
  EndFlow,
  RejectRequest,
  ShowError,
  ShowSuccess,
  StartFlow,
} from '@metamask/approval-controller';
import {
  HandleSnapRequest as SnapControllerHandleRequestActionType,
  GetSnap as SnapControllerGetSnapActionType,
} from '@metamask/snaps-controllers';

export type SnapKeyringBuilderAllowActions =
  | StartFlow
  | EndFlow
  | ShowSuccess
  | ShowError
  | AddApprovalRequest
  | AcceptRequest
  | RejectRequest
  | MaybeUpdateState
  | TestOrigin
  | KeyringControllerGetAccountsAction
  | GetSubjectMetadata
  | AccountsControllerSetSelectedAccountAction
  | AccountsControllerGetAccountByAddressAction
  | AccountsControllerListMultichainAccountsAction
  | AccountsControllerSetAccountNameAction
  | AccountsControllerSetAccountNameAndSelectAccountAction
  | SnapControllerHandleRequestActionType
  | SnapControllerGetSnapActionType;

export type SnapKeyringBuilderMessenger = RestrictedMessenger<
  'SnapKeyring',
  SnapKeyringBuilderAllowActions,
  never,
  SnapKeyringBuilderAllowActions['type'],
  never
>;
