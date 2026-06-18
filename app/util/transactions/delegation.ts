import {
  AuthorizationList,
  TransactionControllerGetNonceLockAction,
  TransactionControllerIsAtomicBatchSupportedAction,
  TransactionEnvelopeType,
  TransactionMeta,
  decodeAuthorizationSignature,
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
  ROOT_AUTHORITY,
  UnsignedDelegation,
  encodeRedeemDelegations,
} from '../../core/Delegation/delegation';
import { Hex, bytesToHex, createProjectLogger } from '@metamask/utils';
import { limitedCalls } from '../../core/Delegation/caveatBuilder/limitedCallsBuilder';
import { Messenger } from '@metamask/messenger';
import { DelegationControllerSignDelegationAction } from '@metamask/delegation-controller';
import { KeyringControllerSignEip7702AuthorizationAction } from '@metamask/keyring-controller';
import { toHex } from '@metamask/controller-utils';
import { exactExecutionBatch } from '../../core/Delegation/caveatBuilder/exactExecutionBatchBuilder';
import { exactExecution } from '../../core/Delegation/caveatBuilder/exactExecutionBuilder';

const log = createProjectLogger('transaction-delegation');

export type SignMessenger = Messenger<
  string,
  | DelegationControllerSignDelegationAction
  | KeyringControllerSignEip7702AuthorizationAction
  | TransactionControllerGetNonceLockAction
  | TransactionControllerIsAtomicBatchSupportedAction,
  never
>;

export interface AuthorizationRequest {
  minimal?: boolean;
  upgradeContractAddress?: Hex;
  upgradeExistingDelegation?: boolean;
}

export interface ConvertTransactionToRedeemDelegationsRequest {
  additionalExecutions?: ExecutionStruct[];
  authorization?: AuthorizationRequest;
  caveats?: Caveat[];
  delegatee?: Hex;
  delegationSignature?: Hex;
  messenger: SignMessenger;
  transaction: TransactionMeta;
}

export interface ConvertTransactionToRedeemDelegationsResult {
  authorizationList?: AuthorizationList;
  data: Hex;
  to: Hex;
  type: TransactionEnvelopeType;
}

export interface DelegationTransaction {
  authorizationList?: AuthorizationList;
  data: Hex;
  to: Hex;
  value: Hex;
}

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

  const caveats =
    request.caveats ?? buildDefaultCaveats(environment, executions[0]);

  const modes: ExecutionMode[] = [
    executions[0].length > 1 ? BATCH_DEFAULT_MODE : SINGLE_DEFAULT_MODE,
  ];

  const delegations = await signAndWrapDelegation({
    transaction,
    caveats,
    messenger,
    delegatee: request.delegatee,
    delegationSignature: request.delegationSignature,
  });

  log('Built delegations', { delegations, modes, executions });

  const data = encodeRedeemDelegations({
    delegations,
    modes,
    executions,
  });

  const authorizationList = request.authorization
    ? await buildAuthorizationList(transaction, messenger, request.authorization)
    : undefined;

  return {
    authorizationList,
    data,
    to: environment.DelegationManager as Hex,
    type: authorizationList
      ? TransactionEnvelopeType.setCode
      : (transaction.txParams.type as TransactionEnvelopeType),
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

function normalizeCallData(data: unknown): Hex {
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

function getDefaultTransactionExecutions(
  transactionMeta: TransactionMeta,
): ExecutionStruct[] {
  const { nestedTransactions, txParams } = transactionMeta;

  if (nestedTransactions?.length && nestedTransactions[0].to) {
    return nestedTransactions.map((tx) => ({
      target: tx.to as Hex,
      value: BigInt(tx.value ?? '0x0'),
      callData: normalizeCallData(tx.data),
    }));
  }

  if (!txParams.to) {
    return [];
  }

  return [
    {
      target: txParams.to as Hex,
      value: BigInt((txParams.value as Hex) ?? '0x0'),
      callData: normalizeCallData(txParams.data),
    },
  ];
}

function buildDefaultCaveats(
  environment: DeleGatorEnvironment,
  executions: ExecutionStruct[],
): Caveat[] {
  const caveatBuilder = createCaveatBuilder(environment);

  caveatBuilder.addCaveat(limitedCalls, 1);

  if (executions.length > 1) {
    const executionParams = executions.map((ex) => ({
      to: ex.target as string,
      value: toHex(ex.value),
      data: ex.callData as string | undefined,
    }));
    caveatBuilder.addCaveat(exactExecutionBatch, executionParams);
  } else if (executions.length === 1) {
    const ex = executions[0];
    caveatBuilder.addCaveat(
      exactExecution,
      ex.target as string,
      toHex(ex.value),
      ex.callData as string | undefined,
    );
  }

  return caveatBuilder.build();
}

async function signAndWrapDelegation({
  transaction,
  caveats,
  messenger,
  delegatee,
  delegationSignature,
}: {
  transaction: TransactionMeta;
  caveats: Caveat[];
  messenger: SignMessenger;
  delegatee?: Hex;
  delegationSignature?: Hex;
}): Promise<Delegation[][]> {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const salt = bytesToHex(bytes);

  const unsignedDelegation: UnsignedDelegation = {
    delegator: transaction.txParams.from as Hex,
    delegate: delegatee ?? ANY_BENEFICIARY,
    authority: ROOT_AUTHORITY,
    salt,
    caveats,
  };

  log('Signing delegation', unsignedDelegation);

  const signature =
    delegationSignature ??
    ((await messenger.call('DelegationController:signDelegation', {
      chainId: transaction.chainId,
      delegation: unsignedDelegation,
    })) as Hex);

  log('Delegation signature', signature);

  return [[{ ...unsignedDelegation, signature }]];
}

async function buildAuthorizationList(
  transactionMeta: TransactionMeta,
  messenger: SignMessenger,
  authorization: AuthorizationRequest,
): Promise<AuthorizationList | undefined> {
  const upgradeContractAddress = await resolveUpgradeContractAddress(
    transactionMeta,
    messenger,
    authorization,
  );

  if (!upgradeContractAddress) {
    return undefined;
  }

  if (authorization.minimal) {
    return [{ address: upgradeContractAddress }];
  }

  const { chainId, networkClientId, txParams } = transactionMeta;
  const { from } = txParams;

  log('Upgrading account to EIP-7702', { from, upgradeContractAddress });

  const nonceLock = await messenger.call(
    'TransactionController:getNonceLock',
    from,
    networkClientId,
  );

  const nonce = nonceLock.nonceDetails.params.nextNetworkNonce;
  nonceLock.releaseLock();

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
    authorizationSignature,
    r,
    s,
    yParity,
    nonce,
  });

  return [
    {
      address: upgradeContractAddress,
      chainId,
      nonce: toHex(nonce),
      r,
      s,
      yParity,
    },
  ];
}

async function resolveUpgradeContractAddress(
  transactionMeta: TransactionMeta,
  messenger: SignMessenger,
  authorization: AuthorizationRequest,
): Promise<Hex | undefined> {
  if (authorization.upgradeContractAddress) {
    return authorization.upgradeContractAddress;
  }

  const { chainId, txParams } = transactionMeta;
  const { from } = txParams;

  const atomicBatchResult = await messenger.call(
    'TransactionController:isAtomicBatchSupported',
    {
      address: from as Hex,
      chainIds: [chainId],
    },
  );

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

  if (delegationAddress && authorization.upgradeExistingDelegation === false) {
    throw new Error(
      `Account is already upgraded to a different delegation address: ${delegationAddress}`,
    );
  }

  if (!upgradeContractAddress) {
    throw new Error('Upgrade contract address not found');
  }

  if (delegationAddress) {
    log('Overwriting existing delegation', {
      current: delegationAddress,
      new: upgradeContractAddress,
    });
  }

  return upgradeContractAddress;
}


