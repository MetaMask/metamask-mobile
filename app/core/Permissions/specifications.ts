import { v1 as uuidv1 } from 'uuid';
import { PermissionType, constructPermission, CaveatSpecificationMap } from '@metamask/permission-controller';
import { CaveatTypes, RestrictedMethods } from './constants';
import { InternalAccount } from '@metamask/keyring-api';
///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
import { caveatSpecifications, endowmentCaveatSpecifications } from '@metamask/snaps-rpc-methods';
///: END:ONLY_INCLUDE_IF

/**
 * This file contains the specifications of the permissions and caveats
 * that are recognized by our permission system. See the PermissionController
 * README in @metamask/snaps-controllers for details.
 */

/**
 * The "keys" of all of permissions recognized by the PermissionController.
 * Permission keys and names have distinct meanings in the permission system.
 */
const PermissionKeys = Object.freeze({ ...RestrictedMethods });

/**
 * Factory functions for all caveat types recognized by the
 * PermissionController.
 */
const CaveatFactories = Object.freeze({
  [CaveatTypes.restrictReturnedAccounts]: (accounts: string[]) => ({
    type: CaveatTypes.restrictReturnedAccounts,
    value: accounts,
  }),
});

/**
 * A PreferencesController identity object.
 *
 * @typedef {Object} Identity
 * @property {string} address - The address of the identity.
 * @property {string} name - The name of the identity.
 * @property {number} [lastSelected] - Unix timestamp of when the identity was
 * last selected in the UI.
 */

/**
 * Gets the specifications for all caveats that will be recognized by the
 * PermissionController.
 *
 * @param {{
 * getInternalAccounts: () => InternalAccount[],
 * }} options - Options bag.
 */
const getCaveatSpecifications = function ({
  getInternalAccounts
}: {
  getInternalAccounts: () => InternalAccount[]
}): CaveatSpecificationMap<any> {
  return {
    ...{
      [CaveatTypes.restrictReturnedAccounts]: {
        type: CaveatTypes.restrictReturnedAccounts,
        decorator: (method: (args: unknown) => Promise<string[]>, caveat: { value: string[] }) =>
          async (args: unknown): Promise<string[]> => {
            const permittedAccounts: string[] = [];
            const allAccounts = await method(args);
            caveat.value.forEach((address) => {
              const addressToCompare = address.toLowerCase();
              const isPermittedAccount = allAccounts.includes(addressToCompare);
              if (isPermittedAccount) {
                permittedAccounts.push(addressToCompare);
              }
            });
            return permittedAccounts;
          },
        validator: (caveat: { value: string[] }, _origin: unknown, _target: unknown): void => {
          validateCaveatAccounts(caveat.value, getInternalAccounts);
        }
      },
    },
    ...caveatSpecifications,
    ...endowmentCaveatSpecifications,
  };
};

/**
 * Gets the specifications for all permissions that will be recognized by the
 * PermissionController.
 *
 * @param {{
 *   getAllAccounts: () => Promise<string[]>,
 *   getInternalAccounts: () => InternalAccount[],
 *   captureKeyringTypesWithMissingIdentities: (internalAccounts?: InternalAccount[], accounts?: string[]) => void,
 * }} options - Options bag.
 * @param options.getAllAccounts - A function that returns all Ethereum accounts
 * in the current MetaMask instance.
 * @param options.getInternalAccounts - A function that returns the
 * `AccountsController` internalAccount objects for all accounts in the current Metamask instance
 * @param options.captureKeyringTypesWithMissingIdentities - A function that
 * captures extra error information about the "Missing identity for address"
 * error.
 * current MetaMask instance.
 */

interface PermissionSpecificationOptions {
  getAllAccounts: () => Promise<string[]>;
  getInternalAccounts: () => InternalAccount[];
  captureKeyringTypesWithMissingIdentities: (internalAccounts?: InternalAccount[], accounts?: string[]) => void;
}

interface PermissionSpecification {
  permissionType: PermissionType;
  targetName: string;
  allowedCaveats: string[];
  factory: (permissionOptions: any, requestData: any) => any;
  methodImplementation: (args: any) => Promise<string[]>;
  validator: (permission: any, origin: any, target: any) => void;
}

const getPermissionSpecifications = function ({
  getAllAccounts,
  getInternalAccounts,
  captureKeyringTypesWithMissingIdentities,
}: PermissionSpecificationOptions): Record<string, PermissionSpecification> {
  return {
    [PermissionKeys.eth_accounts]: {
      permissionType: PermissionType.RestrictedMethod,
      targetName: PermissionKeys.eth_accounts,
      allowedCaveats: [CaveatTypes.restrictReturnedAccounts],
      factory: (permissionOptions: any, requestData: any) => {
        if (Array.isArray(permissionOptions.caveats)) {
          throw new Error(
            `${PermissionKeys.eth_accounts} error: Received unexpected caveats. Any permitted caveats will be added automatically.`
          );
        }
        if (!requestData.approvedAccounts) {
          throw new Error(
            `${PermissionKeys.eth_accounts} error: No approved accounts specified.`
          );
        }
        return constructPermission({
          id: uuidv1(),
          ...permissionOptions,
          caveats: [
            CaveatFactories[CaveatTypes.restrictReturnedAccounts](
              requestData.approvedAccounts
            ),
          ],
        });
      },
      methodImplementation: async (_args: any): Promise<string[]> => {
        const accounts = await getAllAccounts();
        const internalAccounts = getInternalAccounts();
        return accounts.sort((firstAddress, secondAddress) => {
          const lowerCaseFirstAddress = firstAddress.toLowerCase();
          const firstAccount = internalAccounts.find(
            (internalAccount) =>
              internalAccount.address.toLowerCase() === lowerCaseFirstAddress
          );
          const lowerCaseSecondAddress = secondAddress.toLowerCase();
          const secondAccount = internalAccounts.find(
            (internalAccount) =>
              internalAccount.address.toLowerCase() === lowerCaseSecondAddress
          );
          if (!firstAccount) {
            captureKeyringTypesWithMissingIdentities(internalAccounts, accounts);
            throw new Error(`Missing identity for address: "${firstAddress}".`);
          } else if (!secondAccount) {
            captureKeyringTypesWithMissingIdentities(internalAccounts, accounts);
            throw new Error(`Missing identity for address: "${secondAddress}".`);
          } else if (
            firstAccount.metadata.lastSelected ===
            secondAccount.metadata.lastSelected
          ) {
            return 0;
          } else if (firstAccount.metadata.lastSelected === undefined) {
            return 1;
          } else if (secondAccount.metadata.lastSelected === undefined) {
            return -1;
          }
          return (
            (secondAccount.metadata.lastSelected ?? 0) -
            (firstAccount.metadata.lastSelected ?? 0)
          );
        });
      },
      validator(permission: any, _origin: any, _target: any): void {
        const caveats = permission.caveats;
        if (
          !caveats ||
          caveats.length !== 1 ||
          caveats[0].type !== CaveatTypes.restrictReturnedAccounts
        ) {
          throw new Error(
            `${PermissionKeys.eth_accounts} error: Invalid caveats. There must be a single caveat of type "${CaveatTypes.restrictReturnedAccounts}".`
          );
        }
      },
    },
  };
};

export { getPermissionSpecifications };

// Remove duplicate import as it's already imported at the top of the file
// import { InternalAccount } from '@metamask/keyring-api';

/**
 * Validates the accounts associated with a caveat. In essence, ensures that
 * the accounts value is an array of non-empty strings, and that each string
 * corresponds to a PreferencesController identity.
 *
 * @param accounts - The accounts associated with the caveat.
 * @param getInternalAccounts - Gets all AccountsController InternalAccounts.
 * @throws {Error} If the accounts array is invalid or contains unrecognized addresses.
 */
function validateCaveatAccounts(
  accounts: readonly string[],
  getInternalAccounts: () => readonly InternalAccount[]
): void {
  if (!Array.isArray(accounts) || accounts.length === 0) {
    throw new Error(
      `${PermissionKeys.eth_accounts} error: Expected non-empty array of Ethereum addresses.`
    );
  }
  const internalAccounts = getInternalAccounts();
  accounts.forEach((address: string) => {
    if (!address || typeof address !== 'string') {
      throw new Error(
        `${PermissionKeys.eth_accounts} error: Expected an array of objects that contains Ethereum addresses. Received: "${address}".`
      );
    }
    const lowerCaseAddress = address.toLowerCase();
    if (
      !internalAccounts.some((internalAccount: InternalAccount) =>
        internalAccount.address.toLowerCase() === lowerCaseAddress
      )
    ) {
      throw new Error(
        `${PermissionKeys.eth_accounts} error: Received unrecognized address: "${address}".`
      );
    }
  });
}

/**
 * All unrestricted methods recognized by the PermissionController.
 * Unrestricted methods are ignored by the permission system, but every
 * JSON-RPC request seen by the permission system must correspond to a
 * restricted or unrestricted method, or the request will be rejected with a
 * "method not found" error.
 */
export const unrestrictedMethods = Object.freeze([
  'eth_blockNumber',
  'eth_call',
  'eth_decrypt',
  'eth_estimateGas',
  'eth_feeHistory',
  'eth_gasPrice',
  'eth_getBalance',
  'eth_getBlockByHash',
  'eth_getBlockByNumber',
  'eth_getBlockTransactionCountByHash',
  'eth_getBlockTransactionCountByNumber',
  'eth_getCode',
  'eth_getEncryptionPublicKey',
  'eth_getFilterChanges',
  'eth_getFilterLogs',
  'eth_getLogs',
  'eth_getProof',
  'eth_getStorageAt',
  'eth_getTransactionCount',
  'eth_getTransactionReceipt',
  'eth_getUncleByBlockHashAndIndex',
  'eth_getUncleByBlockNumberAndIndex',
  'eth_getUncleCountByBlockHash',
  'eth_getUncleCountByBlockNumber',
  'eth_getWork',
  'eth_newBlockFilter',
  'eth_newFilter',
  'eth_newPendingTransactionFilter',
  'eth_protocolVersion',
  'eth_sendRawTransaction',
  'eth_signTypedData_v1',
  'eth_submitHashrate',
  'eth_submitWork',
  'eth_syncing',
  'eth_uninstallFilter',
  'metamask_watchAsset',
  'net_peerCount',
  'web3_sha3',
  // Define unrestricted methods below to bypass PermissionController. These are eventually handled by RPCMethodMiddleware (User facing RPC methods)
  'wallet_getPermissions',
  'wallet_requestPermissions',
  'eth_getTransactionByHash',
  'eth_getTransactionByBlockHashAndIndex',
  'eth_getTransactionByBlockNumberAndIndex',
  'eth_chainId',
  'eth_hashrate',
  'eth_mining',
  'net_listening',
  'net_version',
  'eth_requestAccounts',
  'eth_coinbase',
  'parity_defaultAccount',
  'eth_sendTransaction',
  'eth_sign',
  'personal_sign',
  'personal_ecRecover',
  'parity_checkRequest',
  'eth_signTypedData',
  'eth_signTypedData_v3',
  'eth_signTypedData_v4',
  'web3_clientVersion',
  'wallet_scanQRCode',
  'wallet_watchAsset',
  'metamask_removeFavorite',
  'metamask_showTutorial',
  'metamask_showAutocomplete',
  'metamask_injectHomepageScripts',
  'metamask_getProviderState',
  'metamask_logWeb3ShimUsage',
  'wallet_switchEthereumChain',
  'wallet_addEthereumChain',
  ///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
  'wallet_getAllSnaps',
  'wallet_getSnaps',
  'wallet_requestSnaps',
  'wallet_invokeSnap',
  'wallet_invokeKeyring',
  'snap_getClientStatus',
  'snap_getFile',
  'snap_createInterface',
  'snap_updateInterface',
  'snap_getInterfaceState',
  ///: END:ONLY_INCLUDE_IF
] as const);
