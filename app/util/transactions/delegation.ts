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
import { prefixError } from './error-prefix';

const log = createProjectLogger('transaction-delegation');

/**
 * Must match placeholder used by Intents API.
 */
export const SUBSIDIZED_ORDER_ID_PLACEHOLDER =
  '0x07cece46d0aec658b12c9d194b3ac3cc74aadf102176005c76f96422b57328b2' as Hex;

/** The number of bytes in a function selector. */
const SELECTOR_BYTES = 4;

/** A byte range within calldata: [start, end) in bytes, not hex characters. */
interface ByteRange {
  start: number;
  end: number;
}

/** A run of calldata bytes to enforce, plus its byte start index. */
interface EnforcedSegment {
  startIndex: number;
  value: Hex;
}

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

  const executions = isSubsidized
    ? buildSubsidizedExecutions(transaction)
    : buildExecutions(transaction);

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

function buildSubsidizedExecutions(
  transactionMeta: TransactionMeta,
): ExecutionStruct[][] {
  const { txParams } = transactionMeta;
  const target = txParams.to as Hex | undefined;
  const callData = txParams.data as Hex | undefined;

  if (!target || !callData) {
    throw new Error('Missing batch target or calldata');
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
  try {
    return buildSubsidizedCaveatsInternal(environment, transaction);
  } catch (error) {
    throw prefixError(error, 'Subsidized Caveats: ');
  }
}

function buildSubsidizedCaveatsInternal(
  environment: DeleGatorEnvironment,
  transaction: TransactionMeta,
): Caveat[] {
  const caveatBuilder = createCaveatBuilder(environment);

  const { txParams } = transaction;
  const target = txParams.to as Hex | undefined;
  const calldata = txParams.data as Hex | undefined;

  if (!target || !calldata) {
    throw new Error('Missing batch target or calldata');
  }

  caveatBuilder.addCaveat(allowedTargets, [target]);
  caveatBuilder.addCaveat(limitedCalls, 1);

  for (const { startIndex, value } of getEnforcedSegments(
    calldata,
    transaction.nestedTransactions ?? [],
  )) {
    caveatBuilder.addCaveat(allowedCalldata, startIndex, value);
  }

  return caveatBuilder.build();
}

/**
 * Enforces every calldata byte except the order-ID placeholder window(s).
 *
 * @param calldata - The 0x-prefixed batch calldata (txParams.data).
 * @param nestedTransactions - The batch's nested calls, used to locate split points.
 * @returns The segments to enforce, ordered by byte start index.
 */
function getEnforcedSegments(
  calldata: Hex,
  nestedTransactions: { data?: string }[],
): EnforcedSegment[] {
  const freeRanges = findByteRanges(calldata, [
    SUBSIDIZED_ORDER_ID_PLACEHOLDER,
  ]);

  const splitPoints = getSplitPoints(calldata, nestedTransactions);

  return getSegmentsBetweenFreeRanges(calldata, freeRanges, splitPoints);
}

/**
 * Byte offset after the selector of each order-ID-bearing nested call.
 *
 * @param calldata - The 0x-prefixed batch calldata.
 * @param nestedTransactions - The nested calls to locate.
 * @returns The post-selector byte offsets, sorted ascending, deduplicated.
 */
function getSplitPoints(
  calldata: Hex,
  nestedTransactions: { data?: string }[],
): number[] {
  const placeholderBody =
    SUBSIDIZED_ORDER_ID_PLACEHOLDER.slice(2).toLowerCase();

  const nestedData = nestedTransactions
    .map((tx) => tx.data)
    // length >= 10 ensures at least a 0x-prefixed 4-byte selector.
    .filter((data): data is string => data !== undefined && data.length >= 10)
    .map((data) => data.toLowerCase() as Hex)
    // Only order-ID-bearing calls need an isolated boundary.
    .filter((data) => data.includes(placeholderBody));

  const ranges = findByteRanges(calldata, nestedData);

  const points = ranges.map((range) => range.start + SELECTOR_BYTES);

  return [...new Set(points)].sort((a, b) => a - b);
}

/**
 * Every whole-byte-aligned occurrence of each needle in calldata.
 *
 * @param calldata - The 0x-prefixed calldata to search.
 * @param needles - The 0x-prefixed values to locate.
 * @returns The byte ranges [start, end) of every occurrence, unsorted.
 */
function findByteRanges(calldata: Hex, needles: Hex[]): ByteRange[] {
  const haystack = calldata.slice(2).toLowerCase();

  return needles.flatMap((needle) => {
    const body = needle.slice(2).toLowerCase();
    const byteLength = body.length / 2;
    const ranges: ByteRange[] = [];

    let charIndex = haystack.indexOf(body);
    while (charIndex !== -1) {
      // Only whole-byte boundaries are meaningful (each byte is two hex chars).
      if (charIndex % 2 === 0) {
        const start = charIndex / 2;
        ranges.push({ start, end: start + byteLength });
      }
      charIndex = haystack.indexOf(body, charIndex + 1);
    }

    return ranges;
  });
}

/**
 * Enforces the bytes outside the free ranges, ending a segment at each split point.
 *
 * @param calldata - The 0x-prefixed calldata.
 * @param freeRanges - Ranges to leave free (order-ID placeholder windows).
 * @param splitPoints - Byte offsets at which to end a segment (post-selector).
 * @returns The enforced segments ordered by byte start index.
 */
function getSegmentsBetweenFreeRanges(
  calldata: Hex,
  freeRanges: ByteRange[],
  splitPoints: number[],
): EnforcedSegment[] {
  const totalBytes = (calldata.length - 2) / 2;
  const sliceValue = (start: number, end: number): Hex =>
    `0x${calldata.slice(2 + start * 2, 2 + end * 2)}` as Hex;

  const sortedFree = [...freeRanges].sort((a, b) => a.start - b.start);
  const sortedSplitPoints = [...splitPoints].sort((a, b) => a - b);

  const segments: EnforcedSegment[] = [];

  // Walk the ranges between free windows, ending a segment at each split point.
  let cursor = 0;
  for (const free of [...sortedFree, { start: totalBytes, end: totalBytes }]) {
    addSegments(cursor, free.start, sortedSplitPoints, segments, sliceValue);
    cursor = Math.max(cursor, free.end);
  }

  return segments;
}

/**
 * Enforces [start, end), ending a segment at each split point inside it; the preceding
 * selector folds into that segment.
 *
 * @param start - The first byte of the range (inclusive).
 * @param end - The end of the range (exclusive).
 * @param sortedSplitPoints - Split points sorted ascending, spanning the whole calldata.
 * @param segments - The accumulator to push enforced segments onto.
 * @param sliceValue - Extracts the 0x-prefixed value for a byte range.
 */
function addSegments(
  start: number,
  end: number,
  sortedSplitPoints: number[],
  segments: EnforcedSegment[],
  sliceValue: (from: number, to: number) => Hex,
): void {
  const pushSegment = (from: number, to: number) => {
    if (to > from) {
      segments.push({ startIndex: from, value: sliceValue(from, to) });
    }
  };

  const pointsInRange = sortedSplitPoints.filter(
    (point) => point > start && point < end,
  );

  let cursor = start;
  for (const point of pointsInRange) {
    pushSegment(cursor, point);
    cursor = point;
  }

  pushSegment(cursor, end);
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
