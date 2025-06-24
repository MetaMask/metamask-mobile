import { AccountsControllerGetSelectedAccountAction } from '@metamask/accounts-controller';
import {
  GetCallsStatusCode,
  GetCallsStatusResult,
  GetCapabilitiesResult,
  SendCalls,
  SendCallsResult,
} from '@metamask/eth-json-rpc-middleware';
import { Hex, JsonRpcRequest } from '@metamask/utils';
import { JsonRpcError, rpcErrors } from '@metamask/rpc-errors';
import { KeyringTypes } from '@metamask/keyring-controller';
import { v4 as uuidv4 } from 'uuid';
import {
  IsAtomicBatchSupportedResult,
  IsAtomicBatchSupportedResultEntry,
  Log,
  TransactionControllerGetStateAction,
  TransactionMeta,
  TransactionReceipt,
  TransactionStatus,
} from '@metamask/transaction-controller';
import { Messenger } from '@metamask/base-controller';
import { NetworkControllerGetNetworkClientByIdAction } from '@metamask/network-controller';
import { PreferencesControllerGetStateAction } from '@metamask/preferences-controller';

import ppomUtil from '../../lib/ppom/ppom-util';
import { EIP5792ErrorCode } from '../../constants/transaction';
import { areAddressesEqual } from '../../util/address';
import { selectSmartTransactionsEnabled } from '../../selectors/smartTransactionsController';
import { store } from '../../store/index.ts';
import DevLogger from '../SDKConnect/utils/DevLogger';
import Engine from '../Engine';
import { isRelaySupported } from './transaction-relay.ts';

const VERSION = '2.0.0';
const SUPPORTED_KEYRING_TYPES = [KeyringTypes.hd, KeyringTypes.simple];

type JSONRPCRequest = JsonRpcRequest & {
  networkClientId: string;
  origin?: string;
};

export const getAccounts = async () => {
  const { AccountsController } = Engine.context;
  const addresses = AccountsController.listAccounts().map((acc) => acc.address);
  return Promise.resolve(addresses);
};

function validateSendCallsVersion(sendCalls: SendCalls) {
  const { version } = sendCalls;

  if (version !== VERSION) {
    throw rpcErrors.invalidInput(
      `Version not supported: Got ${version}, expected ${VERSION}`,
    );
  }
}

async function validateSendCallsChainId(
  sendCalls: SendCalls,
  req: JSONRPCRequest,
) {
  const { TransactionController, AccountsController } = Engine.context;
  const { chainId } = sendCalls;
  const { networkClientId } = req;

  const dappChainId = Engine.controllerMessenger.call(
    'NetworkController:getNetworkClientById',
    networkClientId,
  ).configuration.chainId;

  if (chainId && chainId.toLowerCase() !== dappChainId.toLowerCase()) {
    throw rpcErrors.invalidParams(
      `Chain ID must match the dApp selected network: Got ${chainId}, expected ${dappChainId}`,
    );
  }

  const from =
    sendCalls.from ?? (AccountsController.getSelectedAccount()?.address as Hex);

  const batchSupport = await TransactionController.isAtomicBatchSupported({
    address: from,
    chainIds: [dappChainId],
  });

  const chainBatchSupport = batchSupport?.[0];

  if (!chainBatchSupport) {
    throw new JsonRpcError(
      EIP5792ErrorCode.UnsupportedChainId,
      `EIP-7702 not supported on chain: ${dappChainId}`,
    );
  }
}

function validateCapabilities(sendCalls: SendCalls) {
  const { calls, capabilities } = sendCalls;

  const requiredTopLevelCapabilities = Object.keys(capabilities ?? {}).filter(
    (name) => capabilities?.[name].optional !== true,
  );

  const requiredCallCapabilities = calls.flatMap((call) =>
    Object.keys(call.capabilities ?? {}).filter(
      (name) => call.capabilities?.[name].optional !== true,
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

function validateUpgrade(keyringType?: KeyringTypes) {
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

async function validateSendCalls(
  sendCalls: SendCalls,
  req: JSONRPCRequest,
  keyringType?: KeyringTypes,
) {
  validateSendCallsVersion(sendCalls);
  await validateSendCallsChainId(sendCalls, req);
  validateCapabilities(sendCalls);
  validateUpgrade(keyringType);
}

export async function processSendCalls(
  params: SendCalls,
  req: JsonRpcRequest,
): Promise<SendCallsResult> {
  const { TransactionController, AccountsController } = Engine.context;
  const { calls, from: paramFrom } = params;
  const { networkClientId, origin } = req as JsonRpcRequest & {
    networkClientId: string;
    origin?: string;
  };
  const transactions = calls.map((call) => ({ params: call }));
  const from =
    paramFrom ?? (AccountsController.getSelectedAccount()?.address as Hex);

  const keyringType = getAccountKeyringType(from);

  await validateSendCalls(params, req as JSONRPCRequest, keyringType);

  const securityAlertId = uuidv4();

  const { batchId: id } = await TransactionController.addTransactionBatch({
    from,
    networkClientId,
    origin,
    securityAlertId,
    transactions,
    validateSecurity:
      ppomUtil.createValidatorForSecurityAlertId(securityAlertId),
  });

  return { id };
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
  getIsSmartTransaction: (chainId: Hex) => boolean,
  isRelaySupported: (chainId: Hex) => Promise<boolean>,
  messenger: EIP5792Messenger,
) {
  const simulationEnabled = messenger.call(
    'PreferencesController:getState',
  ).useTransactionSimulations;

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

    const isSmartTransaction = getIsSmartTransaction(chainId);

    const alternateGasFees =
      simulationEnabled &&
      (isSmartTransaction || (isSupported && relaySupportedForChain));

    if (alternateGasFees) {
      acc[chainId as Hex] = {
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
    selectSmartTransactionsEnabled.bind(undefined, store.getState()),
    isRelaySupported,
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

      if (acc[chainIdNormalised] === undefined) {
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

function getAccountKeyringType(accountAddress: Hex): KeyringTypes {
  const { accounts } = Engine.controllerMessenger.call(
    'AccountsController:getState',
  ).internalAccounts;
  const account = Object.values(accounts).find((acc) =>
    areAddressesEqual(acc.address, accountAddress),
  );

  return account?.metadata?.keyring?.type as KeyringTypes;
}
