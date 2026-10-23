/**
 * Temporary Hermes PoC for MetaMask/core#11010.
 * Times a 300-call Multicall3 aggregate3 batch on the hand-rolled, viem,
 * and stock Ethers codecs. Remove this module if the experiment is dropped.
 */
import { defaultAbiCoder } from '@ethersproject/abi';
import { Platform } from 'react-native';

import {
  getAggregate3Codec,
  type Aggregate3CodecVariant,
} from './aggregate3Codecs';
import {
  buildAggregate3BalanceCalls,
  ZERO_ADDRESS,
  type Hex,
} from './aggregate3Handrolled';

/** Production balance-fetch batches observed in the app are this size. */
export const AGGREGATE3_BENCHMARK_BATCH_SIZE = 300;

export const AGGREGATE3_CODEC_VARIANTS = [
  'ethers',
  'viem',
  'handrolled',
] as const satisfies readonly Aggregate3CodecVariant[];

const MULTICALL3_ADDRESS: Hex = '0xca11bde05977b3631167028862be2a173976ca11';

const TOKEN_POOL: Hex[] = [
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  '0xdac17f958d2ee523a2206206994597c13d831ec7',
  '0x6b175474e89094c44da98b954eedeac495271d0f',
  '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
  '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984',
];

export interface Aggregate3BenchmarkWorkload {
  batchSize: number;
  returnDataBytes: number;
  calls: { target: Hex; allowFailure: boolean; callData: Hex }[];
  response: Hex;
}

export interface Aggregate3BenchmarkStageMs {
  encodeMs: number;
  decodeMs: number;
  decodeUint256Ms: number;
  fullPathMs: number;
}

export interface Aggregate3BenchmarkResult {
  batchSize: number;
  returnDataBytes: number;
  reps: number;
  minSampleMs: number;
  parityOk: true;
  platform: string;
  platformVersion: string;
  hermes: Record<string, string> | null;
  variants: Record<Aggregate3CodecVariant, Aggregate3BenchmarkStageMs>;
  speedupVsEthers: Record<Aggregate3CodecVariant, number>;
}

interface BenchmarkTimingOptions {
  reps?: number;
  minSampleMs?: number;
  maxIterations?: number;
}

interface HermesInternal {
  getRuntimeProperties?: () => Record<string, string>;
}

/**
 * Build the same deterministic 300-call balance batch the core harness uses:
 * about 20% native balances, the rest ERC-20 `balanceOf` across five tokens.
 *
 * @param batchSize - Number of aggregate3 calls. Defaults to 300.
 * @param returnDataBytes - Bytes of uint256 return data per successful result.
 * @returns Calls and a synthetic aggregate3 response for those calls.
 */
export function createAggregate3BenchmarkWorkload(
  batchSize = AGGREGATE3_BENCHMARK_BATCH_SIZE,
  returnDataBytes = 32,
): Aggregate3BenchmarkWorkload {
  let seed = 0x2f6e2b1;
  const rand = (): number => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed;
  };
  const hexOf = (length: number): string => {
    let hex = '';
    for (let index = 0; index < length; index++) {
      hex += (rand() % 16).toString(16);
    }
    return hex;
  };

  const requests: { tokenAddress: Hex; accountAddress: Hex }[] = [];
  for (let index = 0; index < batchSize; index++) {
    const native = rand() % 5 === 0;
    requests.push({
      tokenAddress: native
        ? ZERO_ADDRESS
        : TOKEN_POOL[rand() % TOKEN_POOL.length],
      accountAddress: `0x${hexOf(40)}`,
    });
  }

  const tuples: [boolean, string][] = requests.map((_, index) => {
    const success = rand() % 20 !== 0;
    if (!success) {
      return [false, '0x'];
    }
    return [
      true,
      `0x${BigInt(index * 999983 + 1)
        .toString(16)
        .padStart(returnDataBytes * 2, '0')}`,
    ];
  });

  return {
    batchSize,
    returnDataBytes,
    calls: buildAggregate3BalanceCalls(requests, MULTICALL3_ADDRESS),
    response: defaultAbiCoder.encode(
      ['(bool success, bytes returnData)[]'],
      [tuples],
    ) as Hex,
  };
}

/**
 * Throw when any codec disagrees with stock Ethers on this workload.
 *
 * @param workload - Calls and response to compare.
 */
export function assertAggregate3CodecParity(
  workload: Aggregate3BenchmarkWorkload,
): void {
  const ethersCodec = getAggregate3Codec('ethers');
  const ethersEncoded = ethersCodec
    .encodeAggregate3(workload.calls)
    .toLowerCase();
  const ethersDecoded = ethersCodec.decodeAggregate3Response(
    workload.response,
    workload.batchSize,
  );

  for (const variant of AGGREGATE3_CODEC_VARIANTS) {
    const codec = getAggregate3Codec(variant);
    const encoded = codec.encodeAggregate3(workload.calls).toLowerCase();
    if (encoded !== ethersEncoded) {
      throw new Error(`${variant} encodeAggregate3 differs from ethers`);
    }

    const decoded = codec.decodeAggregate3Response(
      workload.response,
      workload.batchSize,
    );
    if (decoded.length !== ethersDecoded.length) {
      throw new Error(`${variant} decoded ${decoded.length} results`);
    }
    for (let index = 0; index < decoded.length; index++) {
      const actual = decoded[index];
      const expected = ethersDecoded[index];
      if (
        actual.success !== expected.success ||
        actual.returnData.toLowerCase() !== expected.returnData.toLowerCase()
      ) {
        throw new Error(
          `${variant} decodeAggregate3Response differs at result ${index}`,
        );
      }
      const actualBalance = codec.decodeUint256(actual.returnData);
      const expectedBalance = ethersCodec.decodeUint256(expected.returnData);
      if (actualBalance !== expectedBalance) {
        throw new Error(
          `${variant} decodeUint256 differs at result ${index}: ${actualBalance} vs ${expectedBalance}`,
        );
      }
    }
  }
}

function nowMs(): number {
  return performance.now();
}

function timeOp(
  operation: () => void,
  minMs: number,
  maxIters: number,
): number {
  let iterations = 0;
  const startedAt = nowMs();
  do {
    operation();
    iterations += 1;
  } while (nowMs() - startedAt < minMs && iterations < maxIters);
  return (nowMs() - startedAt) / iterations;
}

function median(values: number[]): number {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[(sorted.length - 1) >> 1];
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

/**
 * Time one codec on a prepared workload.
 *
 * @param variant - Codec to measure.
 * @param workload - Calls and response shared by every variant.
 * @param options - Sample window. Defaults match the core Hermes harness.
 * @returns Median milliseconds for each stage.
 */
export function measureAggregate3CodecVariant(
  variant: Aggregate3CodecVariant,
  workload: Aggregate3BenchmarkWorkload,
  options: BenchmarkTimingOptions = {},
): Aggregate3BenchmarkStageMs {
  const reps = options.reps ?? 5;
  const minSampleMs = options.minSampleMs ?? 120;
  const maxIterations = options.maxIterations ?? 40;
  const codec = getAggregate3Codec(variant);

  codec.encodeAggregate3(workload.calls);
  codec.decodeAggregate3Response(workload.response, workload.batchSize);

  const encodeSamples: number[] = [];
  const decodeSamples: number[] = [];
  const uint256Samples: number[] = [];

  for (let rep = 0; rep < reps; rep++) {
    encodeSamples.push(
      timeOp(
        () => {
          codec.encodeAggregate3(workload.calls);
        },
        minSampleMs,
        maxIterations,
      ),
    );
    decodeSamples.push(
      timeOp(
        () => {
          codec.decodeAggregate3Response(workload.response, workload.batchSize);
        },
        minSampleMs,
        maxIterations,
      ),
    );
    const decoded = codec.decodeAggregate3Response(
      workload.response,
      workload.batchSize,
    );
    const balances = decoded
      .filter((result) => result.success && result.returnData.length > 2)
      .map((result) => result.returnData);
    uint256Samples.push(
      timeOp(
        () => {
          for (const balance of balances) {
            codec.decodeUint256(balance);
          }
        },
        minSampleMs,
        maxIterations,
      ),
    );
  }

  const encodeMs = round3(median(encodeSamples));
  const decodeMs = round3(median(decodeSamples));
  const decodeUint256Ms = round3(median(uint256Samples));
  return {
    encodeMs,
    decodeMs,
    decodeUint256Ms,
    fullPathMs: round3(encodeMs + decodeMs + decodeUint256Ms),
  };
}

function readHermesRuntime(): Record<string, string> | null {
  const hermes = (globalThis as { HermesInternal?: HermesInternal })
    .HermesInternal;
  if (!hermes?.getRuntimeProperties) {
    return null;
  }
  return hermes.getRuntimeProperties();
}

/**
 * Check parity, then time ethers, viem, and the hand-rolled codec.
 *
 * @param options - Workload size and sampling window.
 * @returns Medians and speedup relative to stock Ethers.
 */
export function runAggregate3CodecBenchmark(
  options: BenchmarkTimingOptions & {
    batchSize?: number;
    returnDataBytes?: number;
  } = {},
): Aggregate3BenchmarkResult {
  const workload = createAggregate3BenchmarkWorkload(
    options.batchSize,
    options.returnDataBytes,
  );
  assertAggregate3CodecParity(workload);

  const variants = {
    ethers: measureAggregate3CodecVariant('ethers', workload, options),
    viem: measureAggregate3CodecVariant('viem', workload, options),
    handrolled: measureAggregate3CodecVariant('handrolled', workload, options),
  };
  const ethersFullPathMs = variants.ethers.fullPathMs;

  return {
    batchSize: workload.batchSize,
    returnDataBytes: workload.returnDataBytes,
    reps: options.reps ?? 5,
    minSampleMs: options.minSampleMs ?? 120,
    parityOk: true,
    platform: Platform.OS,
    platformVersion: String(Platform.Version),
    hermes: readHermesRuntime(),
    variants,
    speedupVsEthers: {
      ethers: 1,
      viem:
        ethersFullPathMs === 0
          ? 0
          : round3(ethersFullPathMs / variants.viem.fullPathMs),
      handrolled:
        ethersFullPathMs === 0
          ? 0
          : round3(ethersFullPathMs / variants.handrolled.fullPathMs),
    },
  };
}

if (typeof __DEV__ !== 'undefined' && __DEV__) {
  (
    globalThis as {
      __runAggregate3CodecBenchmark?: typeof runAggregate3CodecBenchmark;
    }
  ).__runAggregate3CodecBenchmark = runAggregate3CodecBenchmark;
}
