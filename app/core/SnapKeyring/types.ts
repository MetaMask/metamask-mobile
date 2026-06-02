import { Messenger } from '@metamask/messenger';
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
  ApprovalControllerAcceptRequestAction,
  ApprovalControllerAddRequestAction,
  ApprovalControllerEndFlowAction,
  ApprovalControllerRejectRequestAction,
  ApprovalControllerShowErrorAction,
  ApprovalControllerShowSuccessAction,
  ApprovalControllerStartFlowAction,
} from '@metamask/approval-controller';
import { SnapKeyringAllowedActions } from '@metamask/eth-snap-keyring';

export type SnapKeyringBuilderAllowActions =
  | ApprovalControllerStartFlowAction
  | ApprovalControllerEndFlowAction
  | ApprovalControllerShowSuccessAction
  | ApprovalControllerShowErrorAction
  | ApprovalControllerAddRequestAction
  | ApprovalControllerAcceptRequestAction
  | ApprovalControllerRejectRequestAction
  | MaybeUpdateState
  | TestOrigin
  | KeyringControllerGetAccountsAction
  | GetSubjectMetadata
  | AccountsControllerSetSelectedAccountAction
  | AccountsControllerGetAccountByAddressAction
  | AccountsControllerListMultichainAccountsAction
  | AccountsControllerSetAccountNameAction
  | AccountsControllerSetAccountNameAndSelectAccountAction
  | SnapKeyringAllowedActions;

export type SnapKeyringBuilderMessenger = Messenger<
  'SnapKeyring',
  SnapKeyringBuilderAllowActions,
  never
>;
