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

const log = createProjectLogger('transaction-delegation');

type SignMessenger = Messenger<
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

  const modes: ExecutionMode[] = [BATCH_DEFAULT_MODE];
  const executions = buildExecutions(transaction);

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

  const { chainId, delegationAddress, networkClientId, txParams } =
    transactionMeta;

  const { from } = txParams;

  if (delegationAddress) {
    log('Skipping authorization list as already upgraded');
    return undefined;
  }

  log('Including authorization as not upgraded');

  const atomicBatchResult =
    await Engine.context.TransactionController.isAtomicBatchSupported({
      address: from as Hex,
      chainIds: [chainId],
    });

  const upgradeContractAddress = atomicBatchResult.find(
    (r) => r.chainId.toLowerCase() === chainId.toLowerCase(),
  )?.upgradeContractAddress;

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
  const caveats = buildCaveats(environment);

  log('Caveats', caveats);

  const delegation = createDelegation({
    from: transactionMeta.txParams.from as Hex,
    to: ANY_BENEFICIARY,
    caveats,
  });

  log('Delegation', delegation);

  return delegation;
}

function buildCaveats(environment: DeleGatorEnvironment): Caveat[] {
  const caveatBuilder = createCaveatBuilder(environment);

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
