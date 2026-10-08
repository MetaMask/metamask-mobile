import { toHex } from '@metamask/controller-utils';
import { Messenger } from '@metamask/messenger';
import { RemoteFeatureFlagControllerGetStateAction } from '@metamask/remote-feature-flag-controller';
import { TransactionMeta } from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import {
  Caveat,
  DeleGatorEnvironment,
  ExecutionStruct,
  createCaveatBuilder,
} from '../../core/Delegation';
import { allowedCalldata } from '../../core/Delegation/caveatBuilder/allowedCalldataBuilder';
import { allowedTargets } from '../../core/Delegation/caveatBuilder/allowedTargetsBuilder';
import { exactExecutionBatch } from '../../core/Delegation/caveatBuilder/exactExecutionBatchBuilder';
import { exactExecution } from '../../core/Delegation/caveatBuilder/exactExecutionBuilder';
import { limitedCalls } from '../../core/Delegation/caveatBuilder/limitedCallsBuilder';
import { redeemer } from '../../core/Delegation/caveatBuilder/redeemerBuilder';
import { prefixError } from './error-prefix';

export const CONFIRMATIONS_DELEGATIONS_FEATURE_FLAG_NAME =
  'confirmations_delegations' as const;

/**
 * Must match the placeholder used by the Intents API so subsidized quotes can
 * inject the real order ID after signing.
 */
export const SUBSIDIZED_ORDER_ID_PLACEHOLDER =
  '0x07cece46d0aec658b12c9d194b3ac3cc74aadf102176005c76f96422b57328b2' as Hex;

const DEFAULT_DELEGATION_DEADLINE_MINUTES = 30;

/** The number of bytes in a function selector. */
const SELECTOR_BYTES = 4;

type DelegationCaveatsMessenger = Messenger<
  string,
  RemoteFeatureFlagControllerGetStateAction,
  never
>;

interface ConfirmationsDelegationsFeatureFlag {
  delegationDeadlineMinutes?: number;
}

interface ByteRange {
  end: number;
  start: number;
}

interface EnforcedSegment {
  startIndex: number;
  value: Hex;
}

/**
 * Builds the caveats for an EIP-7702 delegation.
 *
 * Default caveats restrict the delegation to exactly the provided executions
 * (`exactExecution` or `exactExecutionBatch`) and a single call. Subsidized
 * transactions instead leave the order ID placeholder free. A redeemer caveat
 * is added when redeemers are provided, and a deadline caveat is always
 * appended.
 *
 * @param options - Options.
 * @param options.caveats - Optional caveats overriding the defaults.
 * @param options.environment - Delegation environment.
 * @param options.executions - Executions the delegation will be redeemed with.
 * @param options.isSubsidized - Whether to build subsidized caveats.
 * @param options.messenger - Messenger used to read remote feature flags.
 * @param options.redeemers - Optional addresses allowed to redeem the delegation.
 * @param options.transactionMeta - Transaction being delegated.
 * @returns The delegation caveats.
 */
export function getDelegationCaveats({
  caveats,
  environment,
  executions,
  isSubsidized = false,
  messenger,
  redeemers,
  transactionMeta,
}: {
  caveats?: Caveat[];
  environment: DeleGatorEnvironment;
  executions: ExecutionStruct[];
  isSubsidized?: boolean;
  messenger: DelegationCaveatsMessenger;
  redeemers?: Hex[];
  transactionMeta: TransactionMeta;
}): Caveat[] {
  const resolvedCaveats =
    caveats ??
    (isSubsidized
      ? buildSubsidizedCaveats(environment, transactionMeta)
      : buildDefaultCaveats(environment, executions));

  return appendDelegationDeadlineCaveat(
    environment,
    [...resolvedCaveats, ...buildRedeemerCaveats(environment, redeemers)],
    getDelegationDeadlineBeforeThreshold(messenger),
  );
}

/**
 * Normalizes calldata to a lowercase, 0x-prefixed, even-length hex string so
 * byte offsets used by caveat terms cannot shift.
 *
 * @param data - Raw calldata value.
 * @returns Normalized calldata, or `0x` if empty or not a string.
 */
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
  environment: DeleGatorEnvironment,
  executions: ExecutionStruct[],
): Caveat[] {
  const caveatBuilder = createCaveatBuilder(environment);

  const caveatExecutions = executions.map(({ callData, target, value }) => ({
    data: callData,
    to: target,
    value: toHex(value),
  }));

  if (caveatExecutions.length > 1) {
    caveatBuilder.addCaveat(exactExecutionBatch, caveatExecutions);
  } else {
    const [execution] = caveatExecutions;

    caveatBuilder.addCaveat(
      exactExecution,
      execution.to,
      execution.value,
      execution.data,
    );
  }

  caveatBuilder.addCaveat(limitedCalls, 1);

  return caveatBuilder.build();
}

function buildRedeemerCaveats(
  environment: DeleGatorEnvironment,
  redeemers: Hex[] | undefined,
): Caveat[] {
  if (!redeemers?.length) {
    return [];
  }

  return createCaveatBuilder(environment).addCaveat(redeemer, redeemers).build();
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

function appendDelegationDeadlineCaveat(
  environment: DeleGatorEnvironment,
  caveats: Caveat[],
  beforeThreshold: number,
): Caveat[] {
  const timestampEnforcer = environment.caveatEnforcers.TimestampEnforcer as Hex;

  if (
    caveats.some(
      (caveat) => caveat.enforcer.toLowerCase() === timestampEnforcer.toLowerCase(),
    )
  ) {
    return caveats;
  }

  return [
    ...caveats,
    {
      args: '0x',
      enforcer: timestampEnforcer,
      terms: buildTimestampTerms(0, beforeThreshold),
    },
  ];
}

/**
 * Encodes TimestampEnforcer terms as two packed uint128 values.
 *
 * @param afterThreshold - Unix timestamp (seconds) after which the delegation is valid, or 0.
 * @param beforeThreshold - Unix timestamp (seconds) before which the delegation is valid.
 * @returns 32-byte terms: afterThreshold (16 bytes) followed by beforeThreshold (16 bytes).
 */
function buildTimestampTerms(
  afterThreshold: number,
  beforeThreshold: number,
): Hex {
  const toUint128 = (value: number) => value.toString(16).padStart(32, '0');

  return `0x${toUint128(afterThreshold)}${toUint128(beforeThreshold)}`;
}

function getDelegationDeadlineBeforeThreshold(
  messenger: DelegationCaveatsMessenger,
): number {
  const { remoteFeatureFlags } = messenger.call(
    'RemoteFeatureFlagController:getState',
  ) as {
    remoteFeatureFlags?: Record<string, unknown>;
  };

  const delegationDeadlineMinutes = (
    remoteFeatureFlags?.[
      CONFIRMATIONS_DELEGATIONS_FEATURE_FLAG_NAME
    ] as ConfirmationsDelegationsFeatureFlag | undefined
  )?.delegationDeadlineMinutes;

  const resolvedDeadlineMinutes =
    typeof delegationDeadlineMinutes === 'number' &&
    Number.isFinite(delegationDeadlineMinutes) &&
    delegationDeadlineMinutes > 0
      ? delegationDeadlineMinutes
      : DEFAULT_DELEGATION_DEADLINE_MINUTES;

  return (
    Math.floor(Date.now() / 1000) + Math.floor(resolvedDeadlineMinutes * 60)
  );
}

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

function getSplitPoints(
  calldata: Hex,
  nestedTransactions: { data?: string }[],
): number[] {
  const placeholderBody = SUBSIDIZED_ORDER_ID_PLACEHOLDER.slice(2).toLowerCase();

  const nestedData = nestedTransactions
    .map((tx) => tx.data)
    .filter((data): data is string => data !== undefined && data.length >= 10)
    .map((data) => data.toLowerCase() as Hex)
    .filter((data) => data.includes(placeholderBody));

  const ranges = findByteRanges(calldata, nestedData);

  const points = ranges.map((range) => range.start + SELECTOR_BYTES);

  return [...new Set(points)].sort((a, b) => a - b);
}

function findByteRanges(calldata: Hex, needles: Hex[]): ByteRange[] {
  const haystack = calldata.slice(2).toLowerCase();

  return needles.flatMap((needle) => {
    const body = needle.slice(2).toLowerCase();
    const byteLength = body.length / 2;
    const ranges: ByteRange[] = [];

    let charIndex = haystack.indexOf(body);
    while (charIndex !== -1) {
      if (charIndex % 2 === 0) {
        const start = charIndex / 2;
        ranges.push({ start, end: start + byteLength });
      }
      charIndex = haystack.indexOf(body, charIndex + 1);
    }

    return ranges;
  });
}

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

  let cursor = 0;
  for (const free of [...sortedFree, { start: totalBytes, end: totalBytes }]) {
    addSegments(cursor, free.start, sortedSplitPoints, segments, sliceValue);
    cursor = Math.max(cursor, free.end);
  }

  return segments;
}

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
