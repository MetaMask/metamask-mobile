import { createProjectLogger, Hex, Json } from '@metamask/utils';
import Engine from '../../core/Engine';
import { PermissionKeys } from '../../core/Permissions/specifications';
import { CaveatTypes } from '../../core/Permissions/constants';
import { pick } from 'lodash';
import { isSnapId } from '@metamask/snaps-utils';
import { Caip25CaveatType, Caip25EndowmentPermissionName, setEthAccounts, setPermittedEthChainIds } from '@metamask/chain-agnostic-permission';
import { RequestedPermissions } from '@metamask/permission-controller';
import { providerErrors } from '@metamask/rpc-errors';
import { ApprovalRequest } from '@metamask/approval-controller';
import { ApprovalType } from '@metamask/controller-utils';
import { DIALOG_APPROVAL_TYPES } from '@metamask/snaps-rpc-methods';
///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
import { SNAP_MANAGE_ACCOUNTS_CONFIRMATION_TYPES } from '../../core/RPCMethods/RPCMethodMiddleware';
///: END:ONLY_INCLUDE_IF

const approvalLog = createProjectLogger('approval-utils');

/**
 * Requests user approval for the CAIP-25 permission for the specified origin
 * and returns a granted permissions object.
 *
 * @param {string} origin - The origin to request approval for.
 * @param requestedPermissions - The legacy permissions to request approval for.
 * @returns the approved permissions object.
 */
export const getCaip25PermissionFromLegacyPermissions = (
  origin: string,
  requestedPermissions?: {
    [PermissionKeys.eth_accounts]?: {
      caveats?: {
        type: keyof typeof CaveatTypes;
        value: Hex[];
      }[];
    };
    [PermissionKeys.permittedChains]?: {
      caveats?: {
        type: keyof typeof CaveatTypes;
        value: Hex[];
      }[];
    };
  },
): RequestedPermissions => {
  const permissions = pick(requestedPermissions, [
    PermissionKeys.eth_accounts,
    PermissionKeys.permittedChains,
  ]);

  if (!permissions[PermissionKeys.eth_accounts]) {
    permissions[PermissionKeys.eth_accounts] = {};
  }

  if (!permissions[PermissionKeys.permittedChains]) {
    permissions[PermissionKeys.permittedChains] = {};
  }

  if (isSnapId(origin)) {
    delete permissions[PermissionKeys.permittedChains];
  }

  const requestedAccounts =
    permissions[PermissionKeys.eth_accounts]?.caveats?.find(
      (caveat) => caveat.type === CaveatTypes.restrictReturnedAccounts,
    )?.value ?? [];

  const requestedChains =
    permissions[PermissionKeys.permittedChains]?.caveats?.find(
      (caveat) => caveat.type === CaveatTypes.restrictNetworkSwitching,
    )?.value ?? [];

  const newCaveatValue = {
    requiredScopes: {},
    optionalScopes: {
      'wallet:eip155': {
        accounts: [],
      },
    },
    isMultichainOrigin: false,
    sessionProperties: {},
  };

  const caveatValueWithChains = setPermittedEthChainIds(
    newCaveatValue,
    isSnapId(origin) ? [] : requestedChains,
  );

  const caveatValueWithAccountsAndChains = setEthAccounts(
    caveatValueWithChains,
    requestedAccounts,
  );

  return {
    [Caip25EndowmentPermissionName]: {
      caveats: [
        {
          type: Caip25CaveatType,
          value: caveatValueWithAccountsAndChains,
        },
      ],
    },
  };
};


/**
 * Requests incremental permittedChains permission for the specified origin.
 * and updates the existing CAIP-25 permission.
 * Allows for granting without prompting for user approval which
 * would be used as part of flows like `wallet_addEthereumChain`
 * requests where the addition of the network and the permitting
 * of the chain are combined into one approval.
 *
 * @param {object} options - The options object
 * @param {string} options.origin - The origin to request approval for.
 * @param {Hex} options.chainId - The chainId to add to the existing permittedChains.
 * @param {boolean} options.autoApprove - If the chain should be granted without prompting for user approval.
 */
export const requestPermittedChainsPermissionIncremental = async ({
  origin,
  chainId,
  autoApprove,
}: {
  origin: string;
  chainId: Hex;
  autoApprove: boolean;
}) => {
  if (isSnapId(origin)) {
    throw new Error(
      `Cannot request permittedChains permission for Snaps with origin "${origin}"`,
    );
  }

  const { PermissionController } = Engine.context;
  const caveatValueWithChains = setPermittedEthChainIds(
    {
      requiredScopes: {},
      optionalScopes: {},
      isMultichainOrigin: false,
      sessionProperties: {},
    },
    [chainId],
  );

  if (!autoApprove) {
    await PermissionController.requestPermissionsIncremental(
      { origin },
      {
        [Caip25EndowmentPermissionName]: {
          caveats: [
            {
              type: Caip25CaveatType,
              value: caveatValueWithChains,
            },
          ],
        },
      },
    );
    return;
  }

  await PermissionController.grantPermissionsIncremental({
    subject: { origin },
    approvedPermissions: {
      [Caip25EndowmentPermissionName]: {
        caveats: [
          {
            type: Caip25CaveatType,
            value: caveatValueWithChains,
          },
        ],
      },
    },
  });
};

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
      approvalLog('Rejecting snap confirmation', { id, interfaceId, origin, type });
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
    controllerMessenger.call(
      'SnapInterfaceController:deleteInterface',
      id,
    );

  rejectOriginApprovals({
    deleteInterface,
    origin,
  });
};
