import { getAggregate3Codec } from './aggregate3Codecs';
import {
  AGGREGATE3_BENCHMARK_BATCH_SIZE,
  AGGREGATE3_CODEC_VARIANTS,
  assertAggregate3CodecParity,
  createAggregate3BenchmarkWorkload,
  runAggregate3CodecBenchmark,
} from './runAggregate3CodecBenchmark';

describe('aggregate3 codec benchmark', () => {
  it('builds a 300-call balance batch', () => {
    const workload = createAggregate3BenchmarkWorkload();

    expect(workload.batchSize).toBe(AGGREGATE3_BENCHMARK_BATCH_SIZE);
    expect(workload.calls).toHaveLength(300);
    expect(workload.calls.every((call) => call.allowFailure)).toBe(true);
    expect(workload.response.startsWith('0x')).toBe(true);
  });

  it('keeps handrolled and viem output identical to ethers for 300 calls', () => {
    const workload = createAggregate3BenchmarkWorkload();

    expect(() => assertAggregate3CodecParity(workload)).not.toThrow();
  });

  it('rejects an aggregate3 response whose result count differs', () => {
    const workload = createAggregate3BenchmarkWorkload(30);
    const codec = getAggregate3Codec('handrolled');

    expect(() => codec.decodeAggregate3Response(workload.response, 29)).toThrow(
      'Expected 29 results, got 30',
    );
  });

  it('returns a median sample for ethers, viem, and handrolled', () => {
    const result = runAggregate3CodecBenchmark({
      batchSize: 300,
      reps: 1,
      minSampleMs: 0,
      maxIterations: 1,
    });

    expect(result.parityOk).toBe(true);
    expect(result.batchSize).toBe(300);
    for (const variant of AGGREGATE3_CODEC_VARIANTS) {
      expect(Number.isFinite(result.variants[variant].fullPathMs)).toBe(true);
      expect(Number.isFinite(result.variants[variant].encodeMs)).toBe(true);
      expect(Number.isFinite(result.variants[variant].decodeMs)).toBe(true);
      expect(Number.isFinite(result.variants[variant].decodeUint256Ms)).toBe(
        true,
      );
    }
  });
});
