/**
 * Temporary Hermes PoC copied from MetaMask/core#11010.
 * Hand-rolled Multicall3 aggregate3 codec plus the balance-call builders
 * the production MulticallClient uses to assemble a batch.
 * Remove this module if the codec experiment is not adopted.
 */
import { Interface } from '@ethersproject/abi';

export type Hex = `0x${string}`;

export interface Aggregate3Call {
  target: Hex;
  allowFailure: boolean;
  callData: Hex;
}

export const ZERO_ADDRESS: Hex = '0x0000000000000000000000000000000000000000';

type Address = Hex;

interface BalanceOfRequest {
  tokenAddress: Hex;
  accountAddress: Hex;
}

const MULTICALL3_ABI = [
  {
    name: 'aggregate3',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      {
        name: 'calls',
        type: 'tuple[]',
        components: [
          { name: 'target', type: 'address' },
          { name: 'allowFailure', type: 'bool' },
          { name: 'callData', type: 'bytes' },
        ],
      },
    ],
    outputs: [
      {
        name: 'returnData',
        type: 'tuple[]',
        components: [
          { name: 'success', type: 'bool' },
          { name: 'returnData', type: 'bytes' },
        ],
      },
    ],
  },
  {
    name: 'getEthBalance',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'addr', type: 'address' }],
    outputs: [{ name: 'balance', type: 'uint256' }],
  },
];

/**
 * ERC-20 ABI (subset for balanceOf).
 */
const ERC20_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: 'balance', type: 'uint256' }],
  },
];

/**
 * Interface instances for ABI encoding/decoding.
 */
const multicall3Interface = new Interface(MULTICALL3_ABI);
const erc20Interface = new Interface(ERC20_ABI);
/**
 * Encode a balanceOf call for an ERC-20 token.
 *
 * @param accountAddress - The account address.
 * @returns The encoded call data.
 */
function encodeBalanceOf(accountAddress: Address): Hex {
  return erc20Interface.encodeFunctionData('balanceOf', [
    accountAddress,
  ]) as Hex;
}

/**
 * Encode a getEthBalance call for native token via Multicall3.
 *
 * @param accountAddress - The account address.
 * @returns The encoded call data.
 */
function encodeGetEthBalance(accountAddress: Address): Hex {
  return multicall3Interface.encodeFunctionData('getEthBalance', [
    accountAddress,
  ]) as Hex;
}

interface BalanceCallDataCache {
  getErc20BalanceCallData: (accountAddress: Address) => Hex;
  getNativeBalanceCallData: (accountAddress: Address) => Hex;
}

function createBalanceCallDataCache(): BalanceCallDataCache {
  const erc20ByAccount = new Map<string, Hex>();
  const nativeByAccount = new Map<string, Hex>();

  return {
    getErc20BalanceCallData(accountAddress: Address): Hex {
      const key = accountAddress.toLowerCase();
      const existing = erc20ByAccount.get(key);
      if (existing !== undefined) {
        return existing;
      }
      const callData = encodeBalanceOf(accountAddress);
      erc20ByAccount.set(key, callData);
      return callData;
    },
    getNativeBalanceCallData(accountAddress: Address): Hex {
      const key = accountAddress.toLowerCase();
      const existing = nativeByAccount.get(key);
      if (existing !== undefined) {
        return existing;
      }
      const callData = encodeGetEthBalance(accountAddress);
      nativeByAccount.set(key, callData);
      return callData;
    },
  };
}

/**
 * Cache balance call encodings per account address.
 * ERC-20 `balanceOf` and native `getEthBalance` call data depend only on the
 * account being queried, not the token contract (which is the multicall target).
 */
const balanceCallDataCache = createBalanceCallDataCache();

/**
 * Build Multicall3 aggregate3 calls for a batch of balance requests.
 *
 * @param batch - Balance requests in the current batch.
 * @param multicallAddress - Multicall3 contract address for native balance calls.
 * @returns Aggregate3 call descriptors.
 */
export function buildAggregate3BalanceCalls(
  batch: BalanceOfRequest[],
  multicallAddress: Hex,
): { target: Address; allowFailure: boolean; callData: Hex }[] {
  return batch.map((req) => {
    const isNative = req.tokenAddress === ZERO_ADDRESS;
    const target = isNative ? multicallAddress : req.tokenAddress;
    return {
      target,
      allowFailure: true,
      callData: isNative
        ? balanceCallDataCache.getNativeBalanceCallData(req.accountAddress)
        : balanceCallDataCache.getErc20BalanceCallData(req.accountAddress),
    };
  });
}
/** Selector (sighash) of the Multicall3 `aggregate3` function, without `0x` prefix. */
const AGGREGATE3_SELECTOR = '82ad56cb';

// 32-byte words (64 hex chars, no `0x` prefix) of the fixed aggregate3
// calldata layout. The `calls` argument is the only (dynamic) argument, so
// its offset word is the constant 0x20; each (address, bool, bytes) tuple
// has exactly three static words, so each tuple's callData offset word is
// the constant 0x60.
const WORD_ARRAY_OFFSET = `0${'0'.repeat(61)}20`;
const WORD_CALLDATA_OFFSET = `0${'0'.repeat(61)}60`;
const WORD_ZERO = '0'.repeat(64);
const WORD_ONE = `0${'0'.repeat(62)}1`;

/** Hex string body (lowercase, no `0x` prefix). */
const LOWERCASE_HEX_RE = /^[0-9a-f]*$/u;

// Fail fast at module load if the vendored ABI ever disagrees with the
// selector this encoder hard-codes, instead of producing corrupt calldata.
if (
  multicall3Interface.getSighash(
    multicall3Interface.getFunction('aggregate3'),
  ) !== `0x${AGGREGATE3_SELECTOR}`
) {
  throw new Error(
    'Multicall3 aggregate3 sighash changed; hand-rolled encoder is stale',
  );
}

/**
 * Encode a Multicall3 aggregate3 call.
 *
 * Hand-rolled ABI encoding for the fixed `aggregate3` calldata layout
 * (byte-identical to the generic @ethersproject/abi encoder for valid
 * inputs, but far faster on Hermes, where the generic Writer path — with
 * its per-value numeric conversions — dominates encode time):
 *
 * ```text
 * selector                                   4 bytes
 * offset to `calls` array data              32 bytes (constant 0x20)
 * array length (call count)                 32 bytes
 * offset to tuple 0                          32 bytes (\u2261 first tuple
 *   … one offset word per call                 starts right after the array
 *                                              head: 32 * n bytes)
 * per call tuple body:
 *   target                                    32 bytes (left-padded)
 *   allowFailure                              32 bytes (0 or 1)
 *   offset to callData within the tuple       32 bytes (constant 0x60)
 *   callData length in bytes                  32 bytes
 *   callData                                  right-padded to 32-byte words
 * ```
 *
 * Because every tuple contains dynamic `bytes`, tuples are dynamic types, so
 * the array head carries one offset word per call; tuple offsets are
 * cumulative over the padded callData sizes of preceding calls.
 *
 * @param calls - Array of calls with target, allowFailure, and callData.
 * @returns The encoded aggregate3 call data.
 */
export function encodeAggregate3(
  calls: readonly { target: Address; allowFailure: boolean; callData: Hex }[],
): Hex {
  const callCount = calls.length;

  // Pass 1: validate + normalize each call, remember tuple bodies, and
  // compute the cumulative array offsets while walking.
  const headParts = new Array<string>(callCount);
  const bodyParts = new Array<string>(callCount * 5);
  let tupleOffset = 32 * callCount; // bytes; first tuple starts after the array head

  for (let i = 0; i < callCount; i++) {
    const { target, allowFailure, callData } = calls[i];

    if (!target.startsWith('0x')) {
      throw new Error(`invalid address value: ${target}`);
    }
    const targetHex = target.slice(2).toLowerCase();
    if (!LOWERCASE_HEX_RE.test(targetHex) || targetHex.length > 64) {
      throw new Error(`invalid address value: ${target}`);
    }

    if (!callData.startsWith('0x')) {
      throw new Error(`invalid bytes value: ${callData}`);
    }
    const dataHex = callData.slice(2).toLowerCase();
    if (dataHex.length % 2 !== 0 || !LOWERCASE_HEX_RE.test(dataHex)) {
      throw new Error(`invalid bytes value: ${callData}`);
    }

    headParts[i] = tupleOffset.toString(16).padStart(64, '0');
    tupleOffset +=
      128 + dataHex.length / 2 + ((64 - (dataHex.length % 64)) % 64) / 2; // static + len + padded data

    const j = i * 5;
    bodyParts[j] = targetHex.padStart(64, '0');
    bodyParts[j + 1] = allowFailure ? WORD_ONE : WORD_ZERO;
    bodyParts[j + 2] = WORD_CALLDATA_OFFSET;
    bodyParts[j + 3] = (dataHex.length / 2).toString(16).padStart(64, '0');
    bodyParts[j + 4] = dataHex.padEnd(
      dataHex.length + ((64 - (dataHex.length % 64)) % 64),
      '0',
    );
  }

  const parts: string[] = [
    `0x${AGGREGATE3_SELECTOR}`,
    WORD_ARRAY_OFFSET,
    callCount.toString(16).padStart(64, '0'),
  ];
  for (let i = 0; i < callCount; i++) {
    parts.push(headParts[i]);
  }
  for (let i = 0; i < callCount * 5; i++) {
    parts.push(bodyParts[i]);
  }

  return parts.join('') as Hex;
}

/**
 * Read one 32-byte word (64 hex chars) of a stripped response body at the
 * given character index, as a number.
 *
 * @param body - The response body (lowercase hex, no `0x` prefix).
 * @param charIndex - The character index at which the word starts.
 * @returns The word's numeric value.
 */
function readResponseWord(body: string, charIndex: number): number {
  if (charIndex < 0 || charIndex + 64 > body.length) {
    throw new Error('aggregate3 response data length out-of-bounds');
  }
  const value = parseInt(body.slice(charIndex, charIndex + 64), 16);
  if (!Number.isFinite(value)) {
    throw new Error('aggregate3 response contains a non-hex word');
  }
  return value;
}

/**
 * Decode the response from aggregate3.
 * Returns array of (success, returnData) tuples.
 *
 * Hand-rolled decoder for the fixed aggregate3 response layout —
 * byte-for-byte equivalent to the generic @ethersproject/abi Reader (which
 * allocates Result objects, BigNumbers and byte arrays per element and
 * dominates decode time on Hermes), but as direct substring parsing:
 *
 * ```text
 * offset to results array data               32 bytes (0x20)
 * array length (result count)               32 bytes
 * offset to tuple 0                           32 bytes — one per result,
 *   …                                          cumulative over returnData
 * per result tuple body:
 *   success                                    32 bytes (0 or nonzero)
 *   offset to returnData within the tuple     32 bytes (0x40)
 *   returnData length in bytes                32 bytes
 *   returnData                                right-padded to 32-byte words
 * ```
 *
 * @param data - The raw response data.
 * @param callCount - Number of calls made (used for validation).
 * @returns Array of success and return data.
 */
export function decodeAggregate3Response(
  data: Hex,
  callCount: number,
): { success: boolean; returnData: Hex }[] {
  if (!data.startsWith('0x')) {
    throw new Error(`invalid response data value: ${data}`);
  }
  const body = data.slice(2);

  const headStart = readResponseWord(body, 0) * 2 + 64;
  const results = readResponseWord(body, headStart - 64);
  if (results !== callCount) {
    throw new Error(`Expected ${callCount} results, got ${results}`);
  }

  const out = new Array(results);
  for (let i = 0; i < results; i++) {
    const tupleStart =
      headStart + readResponseWord(body, headStart + i * 64) * 2;
    const success = readResponseWord(body, tupleStart) !== 0;
    const returnDataStart =
      tupleStart + readResponseWord(body, tupleStart + 64) * 2;
    const returnDataBytes = readResponseWord(body, returnDataStart);
    const dataChars = returnDataStart + 64;
    if (dataChars + returnDataBytes * 2 > body.length) {
      throw new Error('aggregate3 response data length out-of-bounds');
    }
    out[i] = {
      success,
      returnData: `0x${body
        .slice(dataChars, dataChars + returnDataBytes * 2)
        .toLowerCase()}`,
    };
  }
  return out;
}

/**
 * Decode a uint256 balance from return data.
 *
 * @param data - The hex return data.
 * @returns The decoded balance as a string.
 */
export function decodeUint256(data: Hex): string {
  if (data === '0x' || data.length < 66) {
    // Empty or invalid data; treat as 0
    return '0';
  }
  // Decode the first 32-byte word directly (matching the generic decoder,
  // which reads one word and ignores any trailing data).
  return BigInt(data.slice(0, 66)).toString();
}
