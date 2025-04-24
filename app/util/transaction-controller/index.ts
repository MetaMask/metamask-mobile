import {
  TransactionParams,
  TransactionController as BaseTransactionController,
} from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';

import Engine from '../../core/Engine';
import { NetworkClientId } from '@metamask/network-controller';
import { selectBasicFunctionalityEnabled } from '../../selectors/settings';
import { store } from '../../store';
import { PermissionKeys } from '../../core/Permissions/specifications';
import { CaveatTypes } from '../../core/Permissions/constants';
import { pick } from 'lodash';
import { isSnapId } from '@metamask/snaps-utils';
import { Caip25CaveatType, Caip25EndowmentPermissionName, setEthAccounts, setPermittedEthChainIds } from '@metamask/chain-agnostic-permission';

export async function addTransaction(
  transaction: TransactionParams,
  opts: Parameters<BaseTransactionController['addTransaction']>[1],
) {
  const { TransactionController } = Engine.context;

  return await TransactionController.addTransaction(transaction, opts);
}

// Keeping this export as function to put more logic in the future
export async function estimateGas(
  transaction: TransactionParams,
  networkClientId: NetworkClientId,
) {
  const { TransactionController } = Engine.context;
  return await TransactionController.estimateGas(transaction, networkClientId);
}

export async function estimateGasFee({
  transactionParams,
  chainId,
}: {
  transactionParams: TransactionParams;
  chainId: Hex;
}) {
  const { TransactionController } = Engine.context;

  return await TransactionController.estimateGasFee({
    transactionParams,
    chainId,
  });
}

// Proxy methods
export function handleMethodData(
  ...args: Parameters<BaseTransactionController['handleMethodData']>
) {
  const { TransactionController } = Engine.context;
  return TransactionController.handleMethodData(...args);
}

export function getNonceLock(
  ...args: Parameters<BaseTransactionController['getNonceLock']>
) {
  const { TransactionController } = Engine.context;
  return TransactionController.getNonceLock(...args);
}

export function speedUpTransaction(
  ...args: Parameters<BaseTransactionController['speedUpTransaction']>
) {
  const { TransactionController } = Engine.context;
  return TransactionController.speedUpTransaction(...args);
}

export function startIncomingTransactionPolling() {
  const isBasicFunctionalityToggleEnabled = selectBasicFunctionalityEnabled(
    store.getState(),
  );

  if (isBasicFunctionalityToggleEnabled) {
    const { TransactionController } = Engine.context;
    return TransactionController.startIncomingTransactionPolling();
  }
}

export function stopIncomingTransactionPolling() {
  const { TransactionController } = Engine.context;
  return TransactionController.stopIncomingTransactionPolling();
}

export function updateIncomingTransactions() {
  const isBasicFunctionalityToggleEnabled = selectBasicFunctionalityEnabled(
    store.getState(),
  );

  if (isBasicFunctionalityToggleEnabled) {
    const { TransactionController } = Engine.context;
    return TransactionController.updateIncomingTransactions();
  }
}

export function updateSecurityAlertResponse(
  ...args: Parameters<BaseTransactionController['updateSecurityAlertResponse']>
) {
  const { TransactionController } = Engine.context;
  return TransactionController.updateSecurityAlertResponse(...args);
}

export function updateTransaction(
  ...args: Parameters<BaseTransactionController['updateTransaction']>
) {
  const { TransactionController } = Engine.context;
  return TransactionController.updateTransaction(...args);
}

export function wipeTransactions(
  ...args: Parameters<BaseTransactionController['wipeTransactions']>
) {
  const { TransactionController } = Engine.context;
  return TransactionController.wipeTransactions(...args);
}

export function updateEditableParams(
  ...args: Parameters<BaseTransactionController['updateEditableParams']>
) {
  const { TransactionController } = Engine.context;
  return TransactionController.updateEditableParams(...args);
}

export const getNetworkNonce = async (
  { from }: { from: string },
  networkClientId: NetworkClientId,
) => {
  const { nextNonce, releaseLock } = await getNonceLock(from, networkClientId);

  releaseLock();

  return nextNonce;
};

// TODO: [ffmcgee] move this elsewhere ?
export interface LegacyPermissions {
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
}

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
  requestedPermissions: LegacyPermissions,
) => {
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
}


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
}
