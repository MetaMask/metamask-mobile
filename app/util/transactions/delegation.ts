import {
  AuthorizationList,
  TransactionMeta,
  decodeAuthorizationSignature,
} from '@metamask/transaction-controller';
import {
  BATCH_DEFAULT_MODE,
  DeleGatorEnvironment,
  ExecutionMode,
  ExecutionStruct,
  SINGLE_DEFAULT_MODE,
  getDeleGatorEnvironment,
} from '../../core/Delegation';
import {
  ANY_BENEFICIARY,
  Delegation,
  createDelegation,
  encodeRedeemDelegations,
} from '../../core/Delegation/delegation';
import { Hex, createProjectLogger } from '@metamask/utils';
import { Messenger } from '@metamask/messenger';
import { DelegationControllerSignDelegationAction } from '@metamask/delegation-controller';
import { RemoteFeatureFlagControllerGetStateAction } from '@metamask/remote-feature-flag-controller';
import { KeyringControllerSignEip7702AuthorizationAction } from '@metamask/keyring-controller';
import { toHex } from '@metamask/controller-utils';
import Engine from '../../core/Engine';
import { getDelegationCaveats } from './caveats';

const log = createProjectLogger('transaction-delegation');

export type SignMessenger = Messenger<
  string,
  | DelegationControllerSignDelegationAction
  | RemoteFeatureFlagControllerGetStateAction
  | KeyringControllerSignEip7702AuthorizationAction,
  never
>;

export interface DelegationTransaction {
  authorizationList?: AuthorizationList;
  data: Hex;
  to: Hex;
  value: Hex;
}

export async function getDelegationTransaction<
  MessengerType extends SignMessenger,
>(
  messenger: MessengerType,
  transaction: TransactionMeta,
  isSubsidized?: boolean,
): Promise<DelegationTransaction> {
  const { chainId } = transaction;
  const delegationEnvironment = getDeleGatorEnvironment(parseInt(chainId, 16));

  const delegationManagerAddress =
    delegationEnvironment.DelegationManager as Hex;

  const executions = isSubsidized
    ? buildSubsidizedExecutions(transaction)
    : buildExecutions(transaction);

  const delegations = await buildDelegation({
    environment: delegationEnvironment,
    executions: executions[0],
    isSubsidized,
    messenger,
    transactionMeta: transaction,
  });

  const modes: ExecutionMode[] = [
    isSubsidized || executions[0].length <= 1
      ? SINGLE_DEFAULT_MODE
      : BATCH_DEFAULT_MODE,
  ];

  log('Built delegations', { delegations, modes, executions });

  const transactionData = encodeRedeemDelegations({
    delegations,
    modes,
    executions,
  });

  const authorizationList = await buildAuthorizationList(
    transaction,
    messenger,
  );

  return {
    authorizationList,
    data: transactionData,
    to: delegationManagerAddress,
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

async function buildDelegation<MessengerType extends SignMessenger>({
  environment,
  executions,
  isSubsidized,
  messenger,
  transactionMeta,
}: {
  environment: DeleGatorEnvironment;
  executions: ExecutionStruct[];
  isSubsidized?: boolean;
  messenger: MessengerType;
  transactionMeta: TransactionMeta;
}): Promise<Delegation[][]> {
  const caveats = getDelegationCaveats({
    environment,
    executions,
    isSubsidized,
    messenger,
    transactionMeta,
  });

  log('Caveats', caveats);

  const unsignedDelegation = createDelegation({
    from: transactionMeta.txParams.from as Hex,
    to: ANY_BENEFICIARY,
    caveats,
  });

  log('Signing delegation', unsignedDelegation);

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

function buildSubsidizedExecutions(
  transactionMeta: TransactionMeta,
): ExecutionStruct[][] {
  const { txParams } = transactionMeta;
  const target = txParams.to as Hex | undefined;
  const callData = txParams.data as Hex | undefined;

  if (!target || !callData) {
    throw new Error('Subsidized Caveats: Missing batch target or calldata');
  }

  return [
    [
      {
        target,
        value: BigInt(txParams.value ?? '0x0'),
        callData,
      },
    ],
  ];
}
