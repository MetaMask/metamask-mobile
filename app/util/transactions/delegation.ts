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
  encodePermissionContexts,
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
import { encodeExecutionCalldatas } from '../../core/Delegation/execution';
import type { TransactionPayAction } from '@metamask/transaction-pay-controller';

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
  action: TransactionPayAction;
}

export async function getDelegationTransaction<
  MessengerType extends SignMessenger,
>(
  messenger: MessengerType,
  transaction: TransactionMeta,
): Promise<DelegationTransaction> {
  const { chainId } = transaction;
  const delegationEnvironment = getDeleGatorEnvironment(parseInt(chainId, 16));

  const delegationManagerAddress =
    delegationEnvironment.DelegationManager as Hex;

  const delegations = await buildDelegation(
    delegationEnvironment,
    transaction,
    messenger,
  );

  const executions = buildExecutions(transaction);

  const modes: ExecutionMode[] = [
    executions[0].length > 1 ? BATCH_DEFAULT_MODE : SINGLE_DEFAULT_MODE,
  ];

  log('Built delegations', { delegations, modes, executions });

  const transactionData = encodeRedeemDelegations({
    delegations,
    modes,
    executions,
  });

  const contexts = encodePermissionContexts(delegations);
  const calldatas = encodeExecutionCalldatas(executions);

  const action: TransactionPayAction = {
    target: delegationManagerAddress,
    functionSignature:
      'function redeemDelegations(bytes[] delegations, bytes32[] modes, bytes[] executions)',
    args: [
      { value: contexts, populateDynamically: false },
      { value: modes, populateDynamically: false },
      { value: calldatas, populateDynamically: false },
    ],
    value: '0x0',
    isNativeTransfer: false,
  };

  const authorizationList = await buildAuthorizationList(
    transaction,
    messenger,
  );

  return {
    authorizationList,
    data: transactionData,
    to: delegationManagerAddress,
    value: '0x0',
    action,
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

async function buildDelegation<MessengerType extends SignMessenger>(
  delegationEnvironment: DeleGatorEnvironment,
  transactionMeta: TransactionMeta,
  messenger: MessengerType,
): Promise<Delegation[][]> {
  const unsignedDelegation = buildUnsignedDelegation(
    delegationEnvironment,
    transactionMeta,
  );

  log('Signing delegation');

  const delegationSignature = (await messenger.call(
    'DelegationController:signDelegation',
    {
      chainId: transactionMeta.chainId,
      delegation: unsignedDelegation,
    },
  )) as Hex;

  log('Delegation signature', delegationSignature);

  const delegations: Delegation[][] = [
    [
      {
        ...unsignedDelegation,

        signature: delegationSignature,
      },
    ],
  ];

  return delegations;
}

function buildExecutions(
  transactionMeta: TransactionMeta,
): ExecutionStruct[][] {
  const { nestedTransactions } = transactionMeta;

  return [
    (nestedTransactions ?? []).map((tx) => ({
      target: tx.to as Hex,
      value: BigInt(tx.value ?? '0x0'),
      callData: tx.data as Hex,
    })),
  ];
}

function buildUnsignedDelegation(
  environment: DeleGatorEnvironment,
  transactionMeta: TransactionMeta,
): UnsignedDelegation {
  const caveats = buildCaveats(environment, transactionMeta);

  log('Caveats', caveats);

  const delegation = createDelegation({
    from: transactionMeta.txParams.from as Hex,
    to: ANY_BENEFICIARY,
    caveats,
  });

  log('Delegation', delegation);

  return delegation;
}

function buildCaveats(
  environment: DeleGatorEnvironment,
  transaction: TransactionMeta,
): Caveat[] {
  const caveatBuilder = createCaveatBuilder(environment);
  const { nestedTransactions } = transaction;

  const executions = (transaction.nestedTransactions ?? []).map((tx) => ({
    to: tx.to as string,
    value: tx.value ?? '0x0',
    data: tx.data as string | undefined,
  }));

  if ((nestedTransactions ?? []).length > 1) {
    caveatBuilder.addCaveat(exactExecutionBatch, executions);
  } else {
    caveatBuilder.addCaveat(
      exactExecution,
      executions[0].to,
      executions[0].value,
      executions[0].data,
    );
  }

  caveatBuilder.addCaveat(limitedCalls, 1);

  return caveatBuilder.build();
}

function decodeAuthorizationSignature(signature: Hex) {
  const r = signature.slice(0, 66) as Hex;
  const s = add0x(signature.slice(66, 130));
  const v = parseInt(signature.slice(130, 132), 16);
  const yParity = toHex(v - 27 === 0 ? 0 : 1);

  return {
    r,
    s,
    yParity,
  };
}
