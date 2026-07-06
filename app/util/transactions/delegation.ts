import {
  AuthorizationList,
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
  UnsignedDelegation,
  createDelegation,
  encodeRedeemDelegations,
} from '../../core/Delegation/delegation';
import { Hex, createProjectLogger } from '@metamask/utils';
import { limitedCalls } from '../../core/Delegation/caveatBuilder/limitedCallsBuilder';
import { allowedTargets } from '../../core/Delegation/caveatBuilder/allowedTargetsBuilder';
import { allowedCalldata } from '../../core/Delegation/caveatBuilder/allowedCalldataBuilder';
import { Messenger } from '@metamask/messenger';
import { DelegationControllerSignDelegationAction } from '@metamask/delegation-controller';
import { KeyringControllerSignEip7702AuthorizationAction } from '@metamask/keyring-controller';
import { toHex } from '@metamask/controller-utils';
import Engine from '../../core/Engine';
import { exactExecutionBatch } from '../../core/Delegation/caveatBuilder/exactExecutionBatchBuilder';
import { exactExecution } from '../../core/Delegation/caveatBuilder/exactExecutionBuilder';

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

  const delegations = await buildDelegation(
    delegationEnvironment,
    transaction,
    messenger,
    isSubsidized,
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

async function buildDelegation<MessengerType extends SignMessenger>(
  delegationEnvironment: DeleGatorEnvironment,
  transactionMeta: TransactionMeta,
  messenger: MessengerType,
  isSubsidized?: boolean,
): Promise<Delegation[][]> {
  const unsignedDelegation = buildUnsignedDelegation(
    delegationEnvironment,
    transactionMeta,
    isSubsidized,
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
  isSubsidized?: boolean,
): UnsignedDelegation {
  const resolvedCaveats = isSubsidized
    ? buildSubsidizedCaveats(environment, transactionMeta)
    : buildCaveats(environment, transactionMeta);

  log('Caveats', resolvedCaveats);

  const delegation = createDelegation({
    from: transactionMeta.txParams.from as Hex,
    to: ANY_BENEFICIARY,
    caveats: resolvedCaveats,
  });

  log('Delegation', delegation);

  return delegation;
}

function buildSubsidizedCaveats(
  environment: DeleGatorEnvironment,
  transaction: TransactionMeta,
): Caveat[] {
  const caveatBuilder = createCaveatBuilder(environment);
  const nestedTransactions = transaction.nestedTransactions ?? [];

  // Subsidized execute only supports single-step deposit routes
  if (nestedTransactions.length !== 1) {
    throw new Error(
      'Subsidized Relay execute: expected single-step deposit route',
    );
  }

  const transferTx = nestedTransactions[0];
  const token = transferTx.to as Hex | undefined;
  const calldata = transferTx.data as Hex | undefined;

  if (!token || !calldata) {
    throw new Error(
      'Subsidized Relay execute: missing token address or calldata',
    );
  }

  // Extract selector (0x + bytes 2-10) and recipient+amount (bytes 10-138)
  // Split to prevent Relay post-deposit parser from misreading caveat terms as transfer
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
  const transferSelector = `0x${calldata.slice(2, 10)}` as Hex;
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
  const recipientAndAmount = `0x${calldata.slice(10, 138)}` as Hex;

  caveatBuilder.addCaveat(limitedCalls, 1);
  caveatBuilder.addCaveat(allowedTargets, [token]);
  caveatBuilder.addCaveat(allowedCalldata, 0, transferSelector);
  caveatBuilder.addCaveat(allowedCalldata, 4, recipientAndAmount);

  return caveatBuilder.build();
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
