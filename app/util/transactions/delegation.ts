import {
  AuthorizationList,
  TransactionMeta,
} from '@metamask/transaction-controller';
import {
  BATCH_DEFAULT_MODE,
  Caveat,
  DeleGatorEnvironment,
  ExecutionMode,
  ExecutionStruct,
  SINGLE_DEFAULT_MODE,
  createCaveatBuilder,
  getDeleGatorEnvironment,
} from '../../core/Delegation';
import {
  ANY_BENEFICIARY,
  Delegation,
  UnsignedDelegation,
  createDelegation,
  encodeRedeemDelegations,
} from '../../core/Delegation/delegation';
import { Hex, add0x, createProjectLogger } from '@metamask/utils';
import { limitedCalls } from '../../core/Delegation/caveatBuilder/limitedCallsBuilder';
import { Messenger } from '@metamask/messenger';
import { DelegationControllerSignDelegationAction } from '@metamask/delegation-controller';
import { KeyringControllerSignEip7702AuthorizationAction } from '@metamask/keyring-controller';
import { toHex } from '@metamask/controller-utils';
import Engine from '../../core/Engine';
import { exactExecutionBatch } from '../../core/Delegation/caveatBuilder/exactExecutionBatchBuilder';
import { exactExecution } from '../../core/Delegation/caveatBuilder/exactExecutionBuilder';
import { stripSingleLeadingZero } from './util';

const log = createProjectLogger('transaction-delegation');

export type SignMessenger = Messenger<
  string,
  | DelegationControllerSignDelegationAction
  | KeyringControllerSignEip7702AuthorizationAction,
  never
>;

export interface DelegationTransaction {
  authorizationList?: AuthorizationList;
  data: Hex;
  to: Hex;
  value: Hex;
}

interface ConvertTransactionToRedeemDelegationsRequest {
  transaction: TransactionMeta;
  messenger: SignMessenger;
  additionalExecutions?: ExecutionStruct[];
  authorization?: {
    upgradeContractAddress?: Hex;
    getNextNonce?: (
      address: string,
      networkClientId: string,
    ) => Promise<{ nextNonce: number; releaseLock: () => void }>;
    isAtomicBatchSupported?: (request: {
      address: Hex;
      chainIds: Hex[];
    }) => Promise<
      {
        chainId: string;
        isSupported: boolean;
        delegationAddress?: string;
        upgradeContractAddress?: Hex;
      }[]
    >;
  };
}

interface ConvertTransactionToRedeemDelegationsResult {
  authorizationList?: AuthorizationList;
  data: Hex;
  to: Hex;
}

/**
 * Converts a transaction into a redeemDelegations call.
 *
 * By default, caveats, executions, and modes are derived from the
 * transaction's nestedTransactions (or txParams as fallback).
 * Callers can append additional executions to customise the
 * delegation (e.g. gas-fee-token transfer).
 *
 * @param request - The conversion request.
 * @returns The encoded calldata, delegation manager address, and optional authorization list.
 */
export async function convertTransactionToRedeemDelegations(
  request: ConvertTransactionToRedeemDelegationsRequest,
): Promise<ConvertTransactionToRedeemDelegationsResult> {
  const { transaction, messenger } = request;
  const { chainId } = transaction;
  const environment = getDeleGatorEnvironment(parseInt(chainId, 16));

  const defaultExecutions = getDefaultTransactionExecutions(transaction);
  const additionalExecutions = request.additionalExecutions ?? [];
  const executions: ExecutionStruct[][] = [
    [...defaultExecutions, ...additionalExecutions],
  ];

  const caveats = buildDefaultCaveats(environment, executions[0]);

  const modes: ExecutionMode[] = [
    executions[0].length > 1 ? BATCH_DEFAULT_MODE : SINGLE_DEFAULT_MODE,
  ];

  const delegations = await signAndWrapDelegation({
    transaction,
    caveats,
    messenger,
  });

  log('Built delegations', { delegations, modes, executions });

  const data = encodeRedeemDelegations({
    delegations,
    modes,
    executions,
  });

  const authorizationList = request.authorization
    ? await buildConvertAuthorizationList(
        transaction,
        messenger,
        request.authorization.upgradeContractAddress,
        request.authorization.getNextNonce,
        request.authorization.isAtomicBatchSupported,
      )
    : undefined;

  return {
    authorizationList,
    data,
    to: environment.DelegationManager as Hex,
  };
}

export async function getDelegationTransaction<
  MessengerType extends SignMessenger,
>(
  messenger: MessengerType,
  transaction: TransactionMeta,
): Promise<DelegationTransaction> {
  const { authorizationList, data, to } =
    await convertTransactionToRedeemDelegations({
      transaction,
      messenger,
      authorization: {},
    });

  return {
    authorizationList,
    data,
    to,
    value: '0x0',
  };
}

async function buildAuthorizationList<MessengerType extends SignMessenger>(
  transactionMeta: TransactionMeta,
  messenger: MessengerType,
): Promise<AuthorizationList | undefined> {
  const { TransactionController } = Engine.context;
  const { chainId, networkClientId, txParams } = transactionMeta;
  const { from } = txParams;

  const atomicBatchResult = await TransactionController.isAtomicBatchSupported({
    address: from as Hex,
    chainIds: [chainId],
  });

  const chainResult = atomicBatchResult.find(
    (r) => r.chainId.toLowerCase() === chainId.toLowerCase(),
  );

  if (!chainResult) {
    throw new Error('Chain does not support EIP-7702');
  }

  const { delegationAddress, isSupported, upgradeContractAddress } =
    chainResult;

  if (isSupported) {
    log('Skipping authorization as already upgraded');
    return undefined;
  }

  if (!delegationAddress) {
    log('Upgrading account to EIP-7702', { from, upgradeContractAddress });
  } else {
    log('Overwriting authorization as already upgraded', {
      from,
      current: delegationAddress,
      new: upgradeContractAddress,
    });
  }

  if (!upgradeContractAddress) {
    throw new Error('Upgrade contract address not found');
  }

  const nonceLock = await TransactionController.getNonceLock(
    from,
    networkClientId,
  );

  const nonce = nonceLock.nextNonce;
  nonceLock.releaseLock();

  return buildSignedAuthorization(
    messenger,
    chainId,
    from,
    upgradeContractAddress,
    nonce,
  );
}

async function buildConvertAuthorizationList<
  MessengerType extends SignMessenger,
>(
  transactionMeta: TransactionMeta,
  messenger: MessengerType,
  upgradeContractAddress?: Hex,
  getNextNonceFn?: (
    address: string,
    networkClientId: string,
  ) => Promise<{ nextNonce: number; releaseLock: () => void }>,
  isAtomicBatchSupportedFn?: (request: {
    address: Hex;
    chainIds: Hex[];
  }) => Promise<
    {
      chainId: string;
      isSupported: boolean;
      delegationAddress?: string;
      upgradeContractAddress?: Hex;
    }[]
  >,
): Promise<AuthorizationList | undefined> {
  const { TransactionController } = Engine.context;
  const { chainId, networkClientId, txParams } = transactionMeta;
  const { from } = txParams;

  if (!upgradeContractAddress) {
    const isAtomicBatchSupported =
      isAtomicBatchSupportedFn ??
      TransactionController.isAtomicBatchSupported.bind(TransactionController);

    const atomicBatchResult = await isAtomicBatchSupported({
      address: from as Hex,
      chainIds: [chainId],
    });

    const chainResult = atomicBatchResult.find(
      (r) => r.chainId.toLowerCase() === chainId.toLowerCase(),
    );

    if (!chainResult) {
      throw new Error('Chain does not support EIP-7702');
    }

    if (chainResult.isSupported) {
      log('Skipping authorization as already upgraded');
      return undefined;
    }

    if (!chainResult.upgradeContractAddress) {
      throw new Error('Upgrade contract address not found');
    }

    upgradeContractAddress = chainResult.upgradeContractAddress;
  }

  const getNonceLock =
    getNextNonceFn ??
    TransactionController.getNonceLock.bind(TransactionController);

  const nonceLock = await getNonceLock(from, networkClientId);

  const nonce = nonceLock.nextNonce;
  nonceLock.releaseLock();

  return buildSignedAuthorization(
    messenger,
    chainId,
    from,
    upgradeContractAddress,
    nonce,
  );
}

async function buildSignedAuthorization<MessengerType extends SignMessenger>(
  messenger: MessengerType,
  chainId: string,
  from: string,
  upgradeContractAddress: Hex,
  nonce: number,
): Promise<AuthorizationList> {
  const authorizationSignature = (await messenger.call(
    'KeyringController:signEip7702Authorization',
    {
      chainId: parseInt(chainId, 16),
      contractAddress: upgradeContractAddress,
      from,
      nonce,
    },
  )) as Hex;

  const { r, s, yParity } = decodeAuthorizationSignature(
    authorizationSignature,
  );

  log('Authorization signature', {
    r,
    s,
    yParity,
    nonce,
  });

  return [
    {
      address: upgradeContractAddress,
      chainId: chainId as Hex,
      nonce: toHex(nonce),
      r,
      s,
      yParity,
    },
  ];
}

function hasExecutableNestedTransactions(
  transactionMeta: TransactionMeta,
): boolean {
  const { nestedTransactions } = transactionMeta;
  return Boolean(nestedTransactions?.length && nestedTransactions[0].to);
}

export function getDefaultTransactionExecutions(
  transactionMeta: TransactionMeta,
): ExecutionStruct[] {
  const { nestedTransactions, txParams } = transactionMeta;

  if (
    nestedTransactions?.length &&
    hasExecutableNestedTransactions(transactionMeta)
  ) {
    return nestedTransactions.map((tx) => ({
      target: tx.to as Hex,
      value: BigInt(tx.value ?? '0x0'),
      callData: normalizeCallData(tx.data),
    }));
  }

  return [
    {
      target: txParams.to as Hex,
      value: BigInt(txParams.value ?? '0x0'),
      callData: normalizeCallData(txParams.data),
    },
  ];
}

export function normalizeCallData(data: unknown): Hex {
  if (typeof data !== 'string' || data.length === 0) {
    return '0x';
  }

  const hasHexPrefix = data.slice(0, 2).toLowerCase() === '0x';
  const lower = data.toLowerCase();
  const prefixed = hasHexPrefix ? `0x${lower.slice(2)}` : `0x${lower}`;
  const hexBody = prefixed.slice(2);

  if (hexBody.length === 0) {
    return '0x';
  }

  if (hexBody.length % 2 !== 0) {
    return normalizeCallData(`0x0${hexBody}`);
  }

  return prefixed as Hex;
}

function buildDefaultCaveats(
  environment: ReturnType<typeof getDeleGatorEnvironment>,
  executions: ExecutionStruct[],
): Caveat[] {
  const caveatBuilder = createCaveatBuilder(environment);

  const hasValidTargets = executions.every(
    (e) => e.target !== undefined && e.target !== null,
  );

  if (hasValidTargets) {
    if (executions.length > 1) {
      caveatBuilder.addCaveat(
        exactExecutionBatch,
        executions.map((e) => ({
          to: e.target as string,
          value: `0x${e.value.toString(16)}`,
          data: e.callData as string | undefined,
        })),
      );
    } else {
      const execution = executions[0];

      caveatBuilder.addCaveat(
        exactExecution,
        execution.target as string,
        `0x${execution.value.toString(16)}`,
        execution.callData as string | undefined,
      );
    }
  }

  caveatBuilder.addCaveat(limitedCalls, 1);

  return caveatBuilder.build();
}

async function signAndWrapDelegation({
  transaction,
  caveats,
  messenger,
}: {
  transaction: TransactionMeta;
  caveats: Caveat[];
  messenger: SignMessenger;
}): Promise<Delegation[][]> {
  const unsignedDelegation: UnsignedDelegation = createDelegation({
    from: transaction.txParams.from as Hex,
    to: ANY_BENEFICIARY,
    caveats,
  });

  log('Signing delegation', unsignedDelegation);

  const signature = (await messenger.call(
    'DelegationController:signDelegation',
    {
      chainId: transaction.chainId,
      delegation: unsignedDelegation,
    },
  )) as Hex;

  log('Delegation signature', signature);

  return [[{ ...unsignedDelegation, signature }]];
}

function decodeAuthorizationSignature(signature: Hex) {
  const r = stripSingleLeadingZero(signature.slice(0, 66)) as Hex;
  const s = stripSingleLeadingZero(add0x(signature.slice(66, 130))) as Hex;
  const v = parseInt(signature.slice(130, 132), 16);
  const yParity = toHex(v - 27 === 0 ? 0 : 1);

  return {
    r,
    s,
    yParity,
  };
}
