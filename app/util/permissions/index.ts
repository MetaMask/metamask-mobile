import { createProjectLogger, Json } from '@metamask/utils';
import Engine from '../../core/Engine';
import {
  Caip25CaveatValue,
  InternalScopesObject,
  InternalScopeString,
} from '@metamask/chain-agnostic-permission';
import { providerErrors } from '@metamask/rpc-errors';
import { ApprovalRequest } from '@metamask/approval-controller';
import { ApprovalType } from '@metamask/controller-utils';
import { DIALOG_APPROVAL_TYPES } from '@metamask/snaps-rpc-methods';
///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
import { SNAP_MANAGE_ACCOUNTS_CONFIRMATION_TYPES } from '../../core/RPCMethods/RPCMethodMiddleware';
///: END:ONLY_INCLUDE_IF

const approvalLog = createProjectLogger('approval-utils');

/**
 * Rejects an approval.
 *
 * @param {object} params.approvalRequest - Approval request to be rejected.
 * @param {function} params.deleteInterface - callback to SnapInterfaceController to delete the approval.
 * @returns {void}
 */
const rejectApproval = ({
  approvalRequest,
  deleteInterface,
}: {
  approvalRequest: ApprovalRequest<Record<string, Json>>;
  deleteInterface?: (id: string) => void;
}) => {
  const { ApprovalController } = Engine.context;
  const { id, type, origin } = approvalRequest;
  const interfaceId = approvalRequest.requestData?.id as string;

  switch (type) {
    case ApprovalType.SnapDialogAlert:
    case ApprovalType.SnapDialogPrompt:
    case DIALOG_APPROVAL_TYPES.default:
      approvalLog('Rejecting snap dialog', { id, interfaceId, origin, type });
      ApprovalController.accept(id, null);
      deleteInterface?.(interfaceId);
      break;

    case ApprovalType.SnapDialogConfirmation:
      approvalLog('Rejecting snap confirmation', {
        id,
        interfaceId,
        origin,
        type,
      });
      ApprovalController.accept(id, false);
      deleteInterface?.(interfaceId);
      break;

    ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
    case SNAP_MANAGE_ACCOUNTS_CONFIRMATION_TYPES.confirmAccountCreation:
    case SNAP_MANAGE_ACCOUNTS_CONFIRMATION_TYPES.confirmAccountRemoval:
    case SNAP_MANAGE_ACCOUNTS_CONFIRMATION_TYPES.showSnapAccountRedirect:
      approvalLog('Rejecting snap account confirmation', { id, origin, type });
      ApprovalController.accept(id, false);
      break;
    ///: END:ONLY_INCLUDE_IF

    default:
      approvalLog('Rejecting pending approval', { id, origin, type });
      ApprovalController.reject(id, providerErrors.userRejectedRequest());
      break;
  }
};

/**
 * Rejects approvals for origin.
 *
 * @param {function} params.deleteInterface - callback to SnapInterfaceController to delete the approval.
 * @param {string} params.origin - The origin with the approval requests.
 * @returns {void}
 */
export const rejectOriginApprovals = ({
  deleteInterface,
  origin,
}: {
  deleteInterface?: (id: string) => void;
  origin: string;
}) => {
  const { ApprovalController } = Engine.context;
  const approvalRequestsById = ApprovalController.state.pendingApprovals;
  const approvalRequests = Object.values(approvalRequestsById);

  const originApprovalRequests = approvalRequests.filter(
    (approvalRequest) => approvalRequest.origin === origin,
  );

  for (const approvalRequest of originApprovalRequests) {
    rejectApproval({
      approvalRequest,
      deleteInterface,
    });
  }
};

/**
 * Rejects all pending approvals for origin.
 *
 * @param {string} origin - The origin with the pending approval requests.
 * @returns {void}
 */
export const rejectOriginPendingApprovals = (origin: string) => {
  const { controllerMessenger } = Engine;
  const deleteInterface = (id: string) =>
    controllerMessenger.call('SnapInterfaceController:deleteInterface', id);

  rejectOriginApprovals({
    deleteInterface,
    origin,
  });
};

/**
 * Given the current and previous exposed CAIP-25 authorization for a PermissionController,
 * returns the current value of scopes if they've changed, or empty scopes if not.
 *
 * @param newAuthorization - The new authorization.
 * @param [previousAuthorization] - The previous authorization.
 * @returns The changed authorization scopes or empty scopes if nothing changed.
 */
export const getChangedAuthorization = (
  newAuthorization: Caip25CaveatValue,
  previousAuthorization?: Caip25CaveatValue,
): Pick<Caip25CaveatValue, 'requiredScopes' | 'optionalScopes'> => {
  if (newAuthorization === previousAuthorization) {
    return { requiredScopes: {}, optionalScopes: {} };
  }

  return newAuthorization;
};

/**
 * Given the current and previous exposed CAIP-25 authorization for a PermissionController,
 * returns an object containing only the scopes that were removed entirely from the authorization.
 *
 * @param newAuthorization - The new authorization.
 * @param [previousAuthorization] - The previous authorization.
 * @returns An object containing the removed scopes, or empty scopes if nothing was removed.
 */
export const getRemovedAuthorization = (
  newAuthorization?: Caip25CaveatValue,
  previousAuthorization?: Caip25CaveatValue,
): Pick<Caip25CaveatValue, 'requiredScopes' | 'optionalScopes'> => {
  if (
    previousAuthorization === undefined ||
    newAuthorization === previousAuthorization
  ) {
    return { requiredScopes: {}, optionalScopes: {} };
  }

  if (!newAuthorization) {
    return previousAuthorization;
  }

  const removedRequiredScopes: InternalScopesObject = {};
  const { requiredScopes = {}, optionalScopes = {} } = previousAuthorization ?? {};
  Object.entries(requiredScopes).forEach(
    ([scope, prevScopeObject]) => {
      const newScopeObject =
        newAuthorization.requiredScopes[scope as InternalScopeString];
      if (!newScopeObject) {
        removedRequiredScopes[scope as InternalScopeString] = prevScopeObject;
      }
    },
  );

  const removedOptionalScopes: InternalScopesObject = {};
  Object.entries(optionalScopes).forEach(
    ([scope, prevScopeObject]) => {
      const newScopeObject =
        newAuthorization.optionalScopes[scope as InternalScopeString];
      if (!newScopeObject) {
        removedOptionalScopes[scope as InternalScopeString] = prevScopeObject;
      }
    },
  );

  return {
    requiredScopes: removedRequiredScopes,
    optionalScopes: removedOptionalScopes,
  };
};
