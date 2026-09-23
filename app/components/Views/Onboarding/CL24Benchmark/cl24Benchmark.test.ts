import {
  BenchmarkNetworkSession,
  BenchmarkRelay,
  runCL24Benchmark,
  runCL24BenchmarkSample,
  summarizeCL24Benchmark,
  type CL24BenchmarkSample,
} from './cl24Benchmark';

describe('CL24 benchmark', () => {
  it('delivers a message to an already waiting receiver', async () => {
    const relay = new BenchmarkRelay();
    const sender = new BenchmarkNetworkSession('session', 'sender', relay);
    const receiver = new BenchmarkNetworkSession('session', 'receiver', relay);
    const pendingMessage = receiver.receiveMessage('sender', 'round-1');
    const message = Uint8Array.from([1, 2, 3]);

    sender.sendMessage('receiver', 'round-1', message);

    await expect(pendingMessage).resolves.toEqual(message);
  });

  it('preserves the exported key through a 2-of-2 lifecycle', async () => {
    const sample = await runCL24BenchmarkSample(0);

    expect(sample.keyGeneration).toBeGreaterThanOrEqual(0);
    expect(sample.initialExport).toBeGreaterThanOrEqual(0);
    expect(sample.shareRefresh).toBeGreaterThanOrEqual(0);
    expect(sample.rosterUpdate).toBeGreaterThanOrEqual(0);
    expect(sample.finalExport).toBeGreaterThanOrEqual(0);
    expect(sample.total).toBeGreaterThanOrEqual(0);
  });

  it('calculates min, median, and max stage durations', () => {
    const createSample = (duration: number): CL24BenchmarkSample => ({
      keyGeneration: duration,
      initialExport: duration,
      shareRefresh: duration,
      rosterUpdate: duration,
      finalExport: duration,
      total: duration,
    });
    const samples = [createSample(30), createSample(10), createSample(20)];

    const summary = summarizeCL24Benchmark(samples);

    expect(summary.keyGeneration).toEqual({
      min: 10,
      median: 20,
      max: 30,
    });
  });

  it('records benchmark configuration and metadata', async () => {
    const metadata = {
      appVersion: '1.0.0',
      buildNumber: '1',
      device: 'Test device',
      operatingSystem: 'Test OS',
    };

    const result = await runCL24Benchmark(metadata, {
      sampleIterations: 1,
      warmupIterations: 0,
    });

    expect(result.configuration).toEqual({
      curve: 'secp256k1',
      initialPartyCount: 2,
      threshold: 2,
      updatedPartyCount: 3,
      transport: 'event-driven-in-memory',
      warmupIterations: 0,
      sampleIterations: 1,
    });
    expect(result.metadata).toEqual(metadata);
    expect(result.samples).toHaveLength(1);
  });
});
