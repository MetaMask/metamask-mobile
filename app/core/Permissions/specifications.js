///: BEGIN:ONLY_INCLUDE_IF(snaps)
import {
  caveatSpecifications as snapsCaveatsSpecifications,
  endowmentCaveatSpecifications as snapsEndowmentCaveatSpecifications,
} from '@metamask/snaps-rpc-methods';
///: END:ONLY_INCLUDE_IF
import {
  constructPermission,
  PermissionType,
} from '@metamask/permission-controller';
import { v1 as random } from 'uuid';
import { CaveatTypes, RestrictedMethods } from './constants';

/**
 * This file contains the specifications of the permissions and caveats
 * that are recognized by our permission system. See the PermissionController
 * README in @metamask/snaps-controllers for details.
 */

/**
 * The "keys" of all of permissions recognized by the PermissionController.
 * Permission keys and names have distinct meanings in the permission system.
 */
const PermissionKeys = Object.freeze({
  ...RestrictedMethods,
});

/**
 * Factory functions for all caveat types recognized by the
 * PermissionController.
 */
const CaveatFactories = Object.freeze({
  [CaveatTypes.restrictReturnedAccounts]: (accounts) => ({
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
 * getInternalAccounts: () => import('@metamask/keyring-api').InternalAccount[],
 * }} options - Options bag.
 */
export const getCaveatSpecifications = ({ getInternalAccounts }) => ({
  [CaveatTypes.restrictReturnedAccounts]: {
    type: CaveatTypes.restrictReturnedAccounts,

    decorator: (method, caveat) => async (args) => {
      const permittedAccounts = [];
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

    validator: (caveat, _origin, _target) =>
      validateCaveatAccounts(caveat.value, getInternalAccounts),
  },
  ///: BEGIN:ONLY_INCLUDE_IF(snaps)
  ...snapsCaveatsSpecifications,
  ...snapsEndowmentCaveatSpecifications,
  ///: END:ONLY_INCLUDE_IF
});

/**
 * Gets the specifications for all permissions that will be recognized by the
 * PermissionController.
 *
 * @param {{
 *   getAllAccounts: () => Promise<string[]>,
 *   getInternalAccounts: () => import('@metamask/keyring-api').InternalAccount[],
 *   captureKeyringTypesWithMissingIdentities: (internalAccounts?: import('@metamask/keyring-api').InternalAccount[], accounts?: string[]) => void,
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
export const getPermissionSpecifications = ({
  getAllAccounts,
  getInternalAccounts,
  captureKeyringTypesWithMissingIdentities,
}) => ({
  [PermissionKeys.eth_accounts]: {
    permissionType: PermissionType.RestrictedMethod,
    targetName: PermissionKeys.eth_accounts,
    allowedCaveats: [CaveatTypes.restrictReturnedAccounts],

    factory: (permissionOptions, requestData) => {
      if (Array.isArray(permissionOptions.caveats)) {
        throw new Error(
          `${PermissionKeys.eth_accounts} error: Received unexpected caveats. Any permitted caveats will be added automatically.`,
        );
      }

      // This value will be further validated as part of the caveat.
      if (!requestData.approvedAccounts) {
        throw new Error(
          `${PermissionKeys.eth_accounts} error: No approved accounts specified.`,
        );
      }

      return constructPermission({
        id: random(),
        ...permissionOptions,
        caveats: [
          CaveatFactories[CaveatTypes.restrictReturnedAccounts](
            requestData.approvedAccounts,
          ),
        ],
      });
    },

    methodImplementation: async (_args) => {
      const accounts = await getAllAccounts();
      const internalAccounts = getInternalAccounts();

      return accounts.sort((firstAddress, secondAddress) => {
        const lowerCaseFirstAddress = firstAddress.toLowerCase();
        const firstAccount = internalAccounts.find(
          (internalAccount) =>
            internalAccount.address.toLowerCase() === lowerCaseFirstAddress,
        );

        const lowerCaseSecondAddress = secondAddress.toLowerCase();
        const secondAccount = internalAccounts.find(
          (internalAccount) =>
            internalAccount.address.toLowerCase() === lowerCaseSecondAddress,
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
          secondAccount.metadata.lastSelected -
          firstAccount.metadata.lastSelected
        );
      });
    },

    validator: (permission, _origin, _target) => {
      const { caveats } = permission;
      if (
        !caveats ||
        caveats.length !== 1 ||
        caveats[0].type !== CaveatTypes.restrictReturnedAccounts
      ) {
        throw new Error(
          `${PermissionKeys.eth_accounts} error: Invalid caveats. There must be a single caveat of type "${CaveatTypes.restrictReturnedAccounts}".`,
        );
      }
    },
  },
});

/**
 * Validates the accounts associated with a caveat. In essence, ensures that
 * the accounts value is an array of non-empty strings, and that each string
 * corresponds to a PreferencesController identity.
 *
 * @param {string[]} accounts - The accounts associated with the caveat.
 * @param {() => import('@metamask/keyring-api').InternalAccount[]} getInternalAccounts -
 * Gets all AccountsController InternalAccounts.
 */
function validateCaveatAccounts(accounts, getInternalAccounts) {
  if (!Array.isArray(accounts) || accounts.length === 0) {
    throw new Error(
      `${PermissionKeys.eth_accounts} error: Expected non-empty array of Ethereum addresses.`,
    );
  }

  const internalAccounts = getInternalAccounts();
  accounts.forEach((address) => {
    if (!address || typeof address !== 'string') {
      throw new Error(
        `${PermissionKeys.eth_accounts} error: Expected an array of objects that contains an Ethereum addresses. Received: "${address}".`,
      );
    }
    const lowerCaseAddress = address.toLowerCase();
    if (
      !internalAccounts.some(
        (internalAccount) =>
          internalAccount.address.toLowerCase() === lowerCaseAddress,
      )
    ) {
      throw new Error(
        `${PermissionKeys.eth_accounts} error: Received unrecognized address: "${address}".`,
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
]);
