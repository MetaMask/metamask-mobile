import {
  CaveatSpecificationMap,
  CaveatSpecificationConstraint,
  CaveatValueMerger,
} from '@metamask/permission-controller';
import { CaveatTypes, RestrictedMethods } from './constants';
import { InternalAccount } from '@metamask/keyring-api';

type JsonPrimitive = string | number | boolean | null;
interface JsonObject { [key: string]: JsonValue }
type JsonArray = JsonValue[];
type JsonValue = JsonPrimitive | JsonObject | JsonArray;

interface CaveatSpecificationType {
  type: typeof CaveatTypes.restrictReturnedAccounts;
  value: string[];
}

type CustomCaveatSpecification = CaveatSpecificationConstraint & {
  type: typeof CaveatTypes.restrictReturnedAccounts;
  validator: (caveat: unknown) => void;
  merger: CaveatValueMerger<JsonValue>;
};

const PermissionKeys: Readonly<typeof RestrictedMethods> = Object.freeze({
  ...RestrictedMethods,
});

export const getCaveatSpecifications = ({ getInternalAccounts }: {
  getInternalAccounts: () => InternalAccount[]
}): CaveatSpecificationMap<CustomCaveatSpecification> => ({
  [CaveatTypes.restrictReturnedAccounts]: {
    type: CaveatTypes.restrictReturnedAccounts,
    validator: (caveat: unknown): void => {
      if (
        typeof caveat !== 'object' ||
        caveat === null ||
        !Array.isArray((caveat as CaveatSpecificationType).value)
      ) {
        throw new Error('Invalid caveat value');
      }
      validateCaveatAccounts((caveat as CaveatSpecificationType).value, getInternalAccounts);
    },
    merger: (leftValue: unknown, rightValue: unknown): [JsonValue, JsonValue] => {
      const leftTyped = leftValue as CaveatSpecificationType;
      const rightTyped = rightValue as CaveatSpecificationType;
      const mergedCaveat = {
        type: CaveatTypes.restrictReturnedAccounts,
        value: [...new Set([...leftTyped.value, ...rightTyped.value])],
      };
      return [leftValue as JsonValue, mergedCaveat as JsonValue];
    },
  },
});

function validateCaveatAccounts(accounts: string[], getInternalAccounts: () => InternalAccount[]) {
  if (!Array.isArray(accounts) || accounts.length === 0) {
    throw new Error(
      `${PermissionKeys.eth_accounts} error: Expected non-empty array of Ethereum addresses.`,
    );
  }

  const internalAccounts = getInternalAccounts();
  const internalAccountAddresses = internalAccounts.map(
    (account) => account.address,
  );

  const invalidAccounts = accounts.filter(
    (address) =>
      !internalAccountAddresses.includes(address.toLowerCase()),
  );

  if (invalidAccounts.length > 0) {
    throw new Error(
      `${
        PermissionKeys.eth_accounts
      } error: The following addresses are not valid: ${invalidAccounts.join(
        ', ',
      )}`,
    );
  }
}

export const unrestrictedMethods: readonly string[] = [
  'wallet_getPermissions',
  'wallet_requestPermissions',
  'eth_getTransactionByHash',
  'eth_getTransactionByBlockHashAndIndex',
  'eth_getTransactionByBlockNumberAndIndex',
  'eth_chainId',
  'eth_hashrate',
  'eth_mining',
  'eth_syncing',
  'eth_feeHistory',
  'eth_maxPriorityFeePerGas',
  'eth_getBlockByNumber',
  'eth_getBlockByHash',
  'eth_getBlockTransactionCountByHash',
  'eth_getBlockTransactionCountByNumber',
  'eth_getUncleCountByBlockHash',
  'eth_getUncleCountByBlockNumber',
  'eth_getTransactionReceipt',
  'eth_getTransactionCount',
  'eth_getFilterLogs',
  'eth_getLogs',
  'eth_blockNumber',
  'eth_call',
  'eth_estimateGas',
  'eth_gasPrice',
  'eth_getBalance',
  'eth_getCode',
  'eth_getStorageAt',
  'eth_getProof',
  'net_listening',
  'net_peerCount',
  'net_version',
  'web3_clientVersion',
  'web3_sha3',
  ...(process.env.BUILD_MMI === 'true'
    ? [
        'eth_signTypedData_v4',
        'eth_signTypedData',
        'personal_sign',
        'eth_sign',
        'eth_sendRawTransaction',
        'eth_sendTransaction',
      ]
    : []),
  ...(process.env.BUILD_FLASK === 'true'
    ? ['snap_updateInterface', 'snap_getInterfaceState']
    : []),
];

// Add any additional functions or exports here
