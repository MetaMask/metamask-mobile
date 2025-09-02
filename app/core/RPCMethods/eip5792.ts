import { AccountsControllerGetSelectedAccountAction } from '@metamask/accounts-controller';
import {
  GetCallsStatusCode,
  GetCallsStatusResult,
  GetCapabilitiesResult,
  SendCalls,
  SendCallsResult,
} from '@metamask/eth-json-rpc-middleware';
import { bytesToHex, Hex, JsonRpcRequest } from '@metamask/utils';
import { JsonRpcError, rpcErrors } from '@metamask/rpc-errors';
import { KeyringTypes } from '@metamask/keyring-controller';
import { parse, v4 as uuidv4 } from 'uuid';
import {
  BatchTransactionParams,
  IsAtomicBatchSupportedResult,
  IsAtomicBatchSupportedResultEntry,
  Log,
  SecurityAlertResponse,
  TransactionControllerGetStateAction,
  TransactionEnvelopeType,
  TransactionMeta,
  TransactionReceipt,
  TransactionStatus,
  ValidateSecurityRequest,
} from '@metamask/transaction-controller';
import { Messenger } from '@metamask/base-controller';
import { NetworkControllerGetNetworkClientByIdAction } from '@metamask/network-controller';
import { PreferencesControllerGetStateAction } from '@metamask/preferences-controller';

import ppomUtil from '../../lib/ppom/ppom-util';
import { EIP5792ErrorCode } from '../../constants/transaction';
import { areAddressesEqual } from '../../util/address';
import { selectSmartTransactionsEnabled } from '../../selectors/smartTransactionsController';
import { store } from '../../store/index';
import DevLogger from '../SDKConnect/utils/DevLogger';
import Engine from '../Engine';
import { isRelaySupported } from './transaction-relay.ts';
import { getSendBundleSupportedChains } from './sentinel-api.ts';

const VERSION = '2.0.0';
const SUPPORTED_KEYRING_TYPES = [KeyringTypes.hd, KeyringTypes.simple];

export const getAccounts = async () => {
  const { AccountsController } = Engine.context;
  const addresses = AccountsController.listAccounts().map((acc) => acc.address);
  return Promise.resolve(addresses);
};

export async function processSendCalls(
  params: SendCalls,
  req: JsonRpcRequest,
): Promise<SendCallsResult> {
  const { AccountsController } = Engine.context;
  const { calls, from: paramFrom } = params;
  const { networkClientId, origin } = req as JsonRpcRequest & {
    networkClientId: string;
    origin?: string;
  };
  const transactions = calls.map((call) => ({ params: call }));
  const from =
    paramFrom ?? (AccountsController.getSelectedAccount()?.address as Hex);

  const securityAlertId = uuidv4();
  const validateSecurity =
    ppomUtil.createValidatorForSecurityAlertId(securityAlertId);

  let batchId: Hex;
  if (Object.keys(transactions).length === 1) {
    batchId = await processSingleTransaction({
      from,
      networkClientId,
      origin,
      securityAlertId,
      sendCalls: params,
      transactions,
      validateSecurity,
    });
  } else {
    batchId = await processMultipleTransaction({
      from,
      networkClientId,
      origin,
      sendCalls: params,
      securityAlertId,
      transactions,
      validateSecurity,
    });
  }
  return { id: batchId };
}

type Actions =
  | AccountsControllerGetSelectedAccountAction
  | NetworkControllerGetNetworkClientByIdAction
  | TransactionControllerGetStateAction
  | PreferencesControllerGetStateAction;

export type EIP5792Messenger = Messenger<Actions, never>;

export async function getCallsStatus(id: Hex): Promise<GetCallsStatusResult> {
  const transactions = Engine.controllerMessenger
    .call('TransactionController:getState')
    .transactions.filter((tx: TransactionMeta) => tx.batchId === id);

  if (!transactions?.length) {
    throw new JsonRpcError(
      EIP5792ErrorCode.UnknownBundleId,
      `No matching bundle found`,
    );
  }

  const transaction = transactions[0];
  const { chainId, txReceipt: rawTxReceipt } = transaction;
  const status = getStatusCode(transaction);
  const txReceipt = rawTxReceipt as Required<TransactionReceipt> | undefined;
  const logs = (txReceipt?.logs ?? []) as Required<Log>[];

  const receipts: GetCallsStatusResult['receipts'] = txReceipt && [
    {
      blockHash: txReceipt.blockHash as Hex,
      blockNumber: txReceipt.blockNumber as Hex,
      gasUsed: txReceipt.gasUsed as Hex,
      logs: logs.map((log: Required<Log> & { data: Hex }) => ({
        address: log.address as Hex,
        data: log.data,
        topics: log.topics as unknown as Hex[],
      })),
      status: txReceipt.status as '0x0' | '0x1',
      transactionHash: txReceipt.transactionHash,
    },
  ];

  return {
    version: VERSION,
    id,
    chainId,
    atomic: true,
    status,
    receipts,
  };
}

export enum AtomicCapabilityStatus {
  Supported = 'supported',
  Ready = 'ready',
  Unsupported = 'unsupported',
}

async function getAlternateGasFeesCapability(
  chainIds: Hex[],
  batchSupport: IsAtomicBatchSupportedResult,
  messenger: EIP5792Messenger,
) {
  const simulationEnabled = messenger.call(
    'PreferencesController:getState',
  ).useTransactionSimulations;

  const sendBundleSupportedChains = await getSendBundleSupportedChains(
    chainIds,
  );

  const relaySupportedChains = await Promise.all(
    batchSupport
      .map(({ chainId }) => chainId)
      .map((chainId) => isRelaySupported(chainId)),
  );
  const updatedBatchSupport = batchSupport.map((support, index) => ({
    ...support,
    relaySupportedForChain: relaySupportedChains[index],
  }));

  return chainIds.reduce<GetCapabilitiesResult>((acc, chainId) => {
    const chainBatchSupport = (updatedBatchSupport.find(
      ({ chainId: batchChainId }) => batchChainId === chainId,
    ) ?? {}) as IsAtomicBatchSupportedResultEntry & {
      relaySupportedForChain: boolean;
    };

    const { isSupported = false, relaySupportedForChain } = chainBatchSupport;

    const isSmartTransaction = selectSmartTransactionsEnabled(
      store.getState(),
      chainId,
    );
    const isSendBundleSupported = sendBundleSupportedChains[chainId] ?? false;

    const alternateGasFees =
      simulationEnabled &&
      ((isSmartTransaction && isSendBundleSupported) ||
        (isSupported && relaySupportedForChain));

    if (alternateGasFees) {
      acc[chainId] = {
        alternateGasFees: {
          supported: true,
        },
      };
    }

    return acc;
  }, {});
}

export async function getCapabilities(address: Hex, chainIds?: Hex[]) {
  const {
    controllerMessenger,
    context: { TransactionController },
  } = Engine;

  let chainIdsNormalized = chainIds?.map(
    (chainId) => chainId.toLowerCase() as Hex,
  );

  if (!chainIdsNormalized?.length) {
    const networkConfigurations = controllerMessenger.call(
      'NetworkController:getState',
    ).networkConfigurationsByChainId;
    chainIdsNormalized = Object.keys(networkConfigurations) as Hex[];
  }

  const batchSupport = await TransactionController.isAtomicBatchSupported({
    address,
    chainIds,
  });

  const alternateGasFeesAcc = await getAlternateGasFeesCapability(
    chainIdsNormalized,
    batchSupport,
    controllerMessenger as unknown as EIP5792Messenger,
  );

  return chainIdsNormalized.reduce<GetCapabilitiesResult>(
    (acc, chainIdNormalised) => {
      const chainBatchSupport = (batchSupport.find(
        ({ chainId: batchChainId }) => batchChainId === chainIdNormalised,
      ) ?? {}) as IsAtomicBatchSupportedResultEntry & {
        isRelaySupported: boolean;
      };

      const { delegationAddress, isSupported, upgradeContractAddress } =
        chainBatchSupport;

      let isSupportedAccount = false;
      try {
        const keyringType = getAccountKeyringType(address) ?? '';
        isSupportedAccount = SUPPORTED_KEYRING_TYPES.includes(keyringType);
      } catch (error) {
        DevLogger.log(error);
      }

      const canUpgrade =
        upgradeContractAddress && !delegationAddress && isSupportedAccount;
      if (!isSupported && !canUpgrade) {
        return acc;
      }
      const status = isSupported
        ? AtomicCapabilityStatus.Supported
        : AtomicCapabilityStatus.Ready;

      if (!acc[chainIdNormalised]) {
        acc[chainIdNormalised] = {};
      }

      acc[chainIdNormalised].atomic = {
        status,
      };
      return acc;
    },
    alternateGasFeesAcc,
  );
}

/**
 * Generate a transaction batch ID.
 *
 * @returns  A unique batch ID as a hexadecimal string.
 */
function generateBatchId(): Hex {
  const idString = uuidv4();
  const idBytes = new Uint8Array(parse(idString));
  return bytesToHex(idBytes);
}

function getChainIdForNetworkClientId(networkClientId: string): Hex {
  return Engine.controllerMessenger.call(
    'NetworkController:getNetworkClientById',
    networkClientId,
  ).configuration.chainId;
}

function validateSendCallsVersion(sendCalls: SendCalls) {
  const { version } = sendCalls;

  if (version !== VERSION) {
    throw rpcErrors.invalidInput(
      `Version not supported: Got ${version}, expected ${VERSION}`,
    );
  }
}

function validateDappChainId(sendCalls: SendCalls, networkClientId: string) {
  const { chainId: requestChainId } = sendCalls;
  const dappChainId = getChainIdForNetworkClientId(networkClientId);

  if (
    requestChainId &&
    requestChainId.toLowerCase() !== dappChainId.toLowerCase()
  ) {
    throw rpcErrors.invalidParams(
      `Chain ID must match the dApp selected network: Got ${requestChainId}, expected ${dappChainId}`,
    );
  }
}

async function validateSendCallsChainId(
  sendCalls: SendCalls,
  chainBatchSupport: IsAtomicBatchSupportedResultEntry | undefined,
  networkClientId: string,
) {
  const { chainId } = sendCalls;

  validateDappChainId(sendCalls, networkClientId);

  if (!chainBatchSupport) {
    throw new JsonRpcError(
      EIP5792ErrorCode.UnsupportedChainId,
      `EIP-7702 not supported on chain: ${chainId}`,
    );
  }
}

function validateCapabilities(sendCalls: SendCalls) {
  const { calls, capabilities } = sendCalls;

  const requiredTopLevelCapabilities = Object.keys(capabilities ?? {}).filter(
    (name) => capabilities?.[name]?.optional !== true,
  );

  const requiredCallCapabilities = calls.flatMap((call) =>
    Object.keys(call.capabilities ?? {}).filter(
      (name) => call.capabilities?.[name]?.optional !== true,
    ),
  );

  const requiredCapabilities = [
    ...requiredTopLevelCapabilities,
    ...requiredCallCapabilities,
  ];

  if (requiredCapabilities?.length) {
    throw new JsonRpcError(
      EIP5792ErrorCode.UnsupportedNonOptionalCapability,
      `Unsupported non-optional capabilities: ${requiredCapabilities.join(
        ', ',
      )}`,
    );
  }
}

function validateUpgrade(
  chainBatchSupport: IsAtomicBatchSupportedResultEntry | undefined,
  keyringType?: KeyringTypes,
) {
  if (chainBatchSupport?.delegationAddress) {
    return;
  }

  // Not allow upgrade if user has disabled smart account upgrade prompts
  if (
    Engine.context.PreferencesController.state
      .dismissSmartAccountSuggestionEnabled
  ) {
    throw new JsonRpcError(
      EIP5792ErrorCode.RejectedUpgrade,
      'EIP-7702 upgrade disabled by the user',
    );
  }

  // Not allow upgrade for hardware wallet accounts
  if (keyringType && !SUPPORTED_KEYRING_TYPES.includes(keyringType)) {
    throw new JsonRpcError(
      EIP5792ErrorCode.RejectedUpgrade,
      'EIP-7702 upgrade not supported on account',
    );
  }
}

function validateSingleSendCall(sendCalls: SendCalls, networkClientId: string) {
  validateSendCallsVersion(sendCalls);
  validateDappChainId(sendCalls, networkClientId);
  validateCapabilities(sendCalls);
}

async function validateSendCalls(
  sendCalls: SendCalls,
  networkClientId: string,
  keyringType?: KeyringTypes,
) {
  const { AccountsController, TransactionController } = Engine.context;
  const { from: paramFrom, chainId } = sendCalls;

  const from =
    paramFrom ?? (AccountsController.getSelectedAccount()?.address as Hex);

  const batchSupport = await TransactionController.isAtomicBatchSupported({
    address: from,
    chainIds: [chainId],
  });

  const chainBatchSupport = batchSupport?.[0];

  validateSendCallsVersion(sendCalls);
  await validateSendCallsChainId(sendCalls, chainBatchSupport, networkClientId);
  validateCapabilities(sendCalls);
  validateUpgrade(chainBatchSupport, keyringType);
}

async function processSingleTransaction({
  from,
  networkClientId,
  origin,
  securityAlertId,
  sendCalls,
  transactions,
  validateSecurity,
}: {
  from: Hex;
  networkClientId: string;
  origin?: string;
  securityAlertId: string;
  sendCalls: SendCalls;
  transactions: { params: BatchTransactionParams }[];
  validateSecurity: (
    securityRequest: ValidateSecurityRequest,
    chainId: Hex,
  ) => Promise<unknown>;
}) {
  const { TransactionController } = Engine.context;

  validateSingleSendCall(sendCalls, networkClientId);

  const txParams = {
    from,
    ...transactions[0].params,
    type: TransactionEnvelopeType.feeMarket,
  };

  const chainId = getChainIdForNetworkClientId(networkClientId);

  const securityRequest: ValidateSecurityRequest = {
    method: 'eth_sendTransaction',
    params: [txParams],
    origin,
  };
  validateSecurity(securityRequest, chainId);

  const batchId = generateBatchId();

  await TransactionController.addTransaction(txParams, {
    networkClientId,
    origin,
    securityAlertResponse: { securityAlertId } as SecurityAlertResponse,
    batchId,
  });
  return batchId;
}

async function processMultipleTransaction({
  from,
  networkClientId,
  origin,
  sendCalls,
  securityAlertId,
  transactions,
  validateSecurity,
}: {
  from: Hex;
  networkClientId: string;
  origin?: string;
  sendCalls: SendCalls;
  securityAlertId: string;
  transactions: { params: BatchTransactionParams }[];
  validateSecurity: (
    securityRequest: ValidateSecurityRequest,
    chainId: Hex,
  ) => Promise<void>;
}): Promise<Hex> {
  const { TransactionController } = Engine.context;
  const keyringType = getAccountKeyringType(from);
  await validateSendCalls(sendCalls, networkClientId, keyringType);
  const result = await TransactionController.addTransactionBatch({
    from,
    networkClientId,
    origin,
    securityAlertId,
    transactions,
    validateSecurity,
  });
  return result.batchId;
}

function getStatusCode(transactionMeta: TransactionMeta) {
  const { hash, status } = transactionMeta;

  if (status === TransactionStatus.confirmed) {
    return GetCallsStatusCode.CONFIRMED;
  }

  if (status === TransactionStatus.failed) {
    return hash
      ? GetCallsStatusCode.REVERTED
      : GetCallsStatusCode.FAILED_OFFCHAIN;
  }

  if (status === TransactionStatus.dropped) {
    return GetCallsStatusCode.REVERTED;
  }

  return GetCallsStatusCode.PENDING;
}

function getAccountKeyringType(accountAddress: Hex): KeyringTypes {
  const { accounts } = Engine.controllerMessenger.call(
    'AccountsController:getState',
  ).internalAccounts;
  const account = Object.values(accounts).find((acc) =>
    areAddressesEqual(acc.address, accountAddress),
  );

  return account?.metadata?.keyring?.type as KeyringTypes;
}
