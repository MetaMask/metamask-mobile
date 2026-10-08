import { TransactionMeta } from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import {
  Caveat,
  DeleGatorEnvironment,
  createCaveatBuilder,
} from '../../core/Delegation';
import { allowedCalldata } from '../../core/Delegation/caveatBuilder/allowedCalldataBuilder';
import { allowedTargets } from '../../core/Delegation/caveatBuilder/allowedTargetsBuilder';
import { prefixError } from './error-prefix';

/**
 * Must match the placeholder used by the Intents API so subsidized quotes can
 * inject the real order ID after signing.
 */
export const SUBSIDIZED_ORDER_ID_PLACEHOLDER =
  '0x07cece46d0aec658b12c9d194b3ac3cc74aadf102176005c76f96422b57328b2' as Hex;

/** The number of bytes in a function selector. */
const SELECTOR_BYTES = 4;

interface ByteRange {
  end: number;
  start: number;
}

interface EnforcedSegment {
  startIndex: number;
  value: Hex;
}

/**
 * Builds the caveats specific to a subsidized transaction.
 *
 * Restricts the delegation to the batch target and enforces all calldata
 * except the order ID placeholder, so the order ID can be injected after
 * signing.
 *
 * @param environment - Delegation environment.
 * @param transactionMeta - Transaction being delegated.
 * @returns The subsidized caveats.
 */
export function getSubsidizedCaveats(
  environment: DeleGatorEnvironment,
  transactionMeta: TransactionMeta,
): Caveat[] {
  try {
    return buildSubsidizedCaveats(environment, transactionMeta);
  } catch (error) {
    throw prefixError(error, 'Subsidized Caveats: ');
  }
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

function buildSubsidizedCaveats(
  environment: DeleGatorEnvironment,
  transactionMeta: TransactionMeta,
): Caveat[] {
  const { txParams } = transactionMeta;
  const target = txParams.to as Hex | undefined;
  const calldata = txParams.data as Hex | undefined;

  if (!target || !calldata) {
    throw new Error('Missing batch target or calldata');
  }

  const caveatBuilder = createCaveatBuilder(environment).addCaveat(
    allowedTargets,
    [target],
  );

  for (const { startIndex, value } of getEnforcedSegments(
    calldata,
    transactionMeta.nestedTransactions ?? [],
  )) {
    caveatBuilder.addCaveat(allowedCalldata, startIndex, value);
  }

  return caveatBuilder.build();
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
