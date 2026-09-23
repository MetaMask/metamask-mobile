import {
  CL24DKM,
  type CL24ThresholdKey,
  dealersFromCL24Key,
  secp256k1,
} from '@metamask/mfa-wallet-cl24';
import type {
  AccessStructure,
  NetworkSession,
  RandomNumberGenerator,
  RootNetworkSession,
  ShareBinding,
} from '@metamask/mfa-wallet-interface';

export const CL24_BENCHMARK_WARMUP_ITERATIONS = 1;
export const CL24_BENCHMARK_SAMPLE_ITERATIONS = 5;

const INITIAL_CUSTODIANS = ['party-1', 'party-2'];
const UPDATED_CUSTODIANS = [...INITIAL_CUSTODIANS, 'party-3'];
const THRESHOLD = 2;

export type CL24BenchmarkStage =
  | 'keyGeneration'
  | 'initialExport'
  | 'shareRefresh'
  | 'rosterUpdate'
  | 'finalExport'
  | 'total';

export type CL24BenchmarkSample = Record<CL24BenchmarkStage, number>;

export interface CL24BenchmarkStatistics {
  min: number;
  median: number;
  max: number;
}

export type CL24BenchmarkSummary = Record<
  CL24BenchmarkStage,
  CL24BenchmarkStatistics
>;

export interface CL24BenchmarkMetadata {
  appVersion: string;
  buildNumber: string;
  device: string;
  operatingSystem: string;
}

export interface CL24BenchmarkResult {
  configuration: {
    curve: 'secp256k1';
    initialPartyCount: 2;
    threshold: 2;
    updatedPartyCount: 3;
    transport: 'event-driven-in-memory';
    warmupIterations: number;
    sampleIterations: number;
  };
  metadata: CL24BenchmarkMetadata;
  samples: CL24BenchmarkSample[];
  summary: CL24BenchmarkSummary;
  timestamp: string;
}

interface CustodianKey {
  id: string;
  key: CL24ThresholdKey;
}

type WaitingReceiver = (message: Uint8Array) => void;

/**
 * Deterministic RNG used to make benchmark runs comparable across devices.
 *
 * This is intentionally not suitable for production key material.
 */
export class BenchmarkRandomNumberGenerator implements RandomNumberGenerator {
  #state: number;

  constructor(seed: number) {
    // eslint-disable-next-line no-bitwise
    this.#state = seed >>> 0;
  }

  generateRandomBytes(size: number): Uint8Array {
    const bytes = new Uint8Array(size);
    for (let index = 0; index < size; index++) {
      // Numerical Recipes LCG. Math.imul keeps multiplication in 32 bits.
      // eslint-disable-next-line no-bitwise
      this.#state = (Math.imul(1664525, this.#state) + 1013904223) >>> 0;
      // eslint-disable-next-line no-bitwise
      bytes[index] = (this.#state >>> 24) & 0xff;
    }
    return bytes;
  }
}

/**
 * In-process protocol relay with immediate waiter delivery.
 *
 * Unlike the SDK test relay, this has no polling interval, timeout, socket, or
 * simulated latency in the measured path.
 */
export class BenchmarkRelay {
  readonly #messages = new Map<string, Uint8Array[]>();
  readonly #receivers = new Map<string, WaitingReceiver[]>();

  static messageKey(
    sessionId: string,
    sender: string,
    receiver: string,
    messageType: string,
  ): string {
    return `${sessionId}:${sender}:${receiver}:${messageType}`;
  }

  push(
    sessionId: string,
    sender: string,
    receiver: string,
    messageType: string,
    message: Uint8Array,
  ): void {
    const key = BenchmarkRelay.messageKey(
      sessionId,
      sender,
      receiver,
      messageType,
    );
    const waitingReceivers = this.#receivers.get(key);
    const waitingReceiver = waitingReceivers?.shift();

    if (waitingReceiver) {
      if (waitingReceivers?.length === 0) {
        this.#receivers.delete(key);
      }
      waitingReceiver(message);
      return;
    }

    const messages = this.#messages.get(key) ?? [];
    messages.push(message);
    this.#messages.set(key, messages);
  }

  pop(
    sessionId: string,
    sender: string,
    receiver: string,
    messageType: string,
  ): Promise<Uint8Array> {
    const key = BenchmarkRelay.messageKey(
      sessionId,
      sender,
      receiver,
      messageType,
    );
    const messages = this.#messages.get(key);
    const message = messages?.shift();

    if (message) {
      if (messages?.length === 0) {
        this.#messages.delete(key);
      }
      return Promise.resolve(message);
    }

    return new Promise((resolve) => {
      const waitingReceivers = this.#receivers.get(key) ?? [];
      waitingReceivers.push(resolve);
      this.#receivers.set(key, waitingReceivers);
    });
  }
}

export class BenchmarkNetworkSession implements RootNetworkSession {
  readonly sessionId: string;

  readonly selfId: string;

  private readonly relay: BenchmarkRelay;

  constructor(sessionId: string, selfId: string, relay: BenchmarkRelay) {
    this.sessionId = sessionId;
    this.selfId = selfId;
    this.relay = relay;
  }

  sendMessage(
    receiver: string,
    messageType: string,
    message: Uint8Array,
  ): void {
    this.relay.push(
      this.sessionId,
      this.selfId,
      receiver,
      messageType,
      message,
    );
  }

  receiveMessage(sender: string, messageType: string): Promise<Uint8Array> {
    return this.relay.pop(this.sessionId, sender, this.selfId, messageType);
  }

  createSubsession(sessionId: string): NetworkSession {
    return new BenchmarkNetworkSession(
      `${this.sessionId}:${sessionId}`,
      this.selfId,
      this.relay,
    );
  }

  async disconnect(): Promise<void> {
    // The in-memory transport owns no external resources.
  }
}

function createSessionFactory(iteration: number) {
  const relay = new BenchmarkRelay();
  return (stage: string, partyId: string): RootNetworkSession =>
    new BenchmarkNetworkSession(
      `cl24-benchmark-${iteration}-${stage}`,
      partyId,
      relay,
    );
}

async function measure<T>(
  operation: () => Promise<T>,
): Promise<{ duration: number; value: T }> {
  const start = performance.now();
  const value = await operation();
  return { duration: performance.now() - start, value };
}

function bytesEqual(left: Uint8Array, right: Uint8Array): boolean {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

function assertEqualExports(exportedKeys: Uint8Array[]): Uint8Array {
  const firstExport = exportedKeys[0];
  if (
    !firstExport ||
    !exportedKeys.every((exportedKey) => bytesEqual(exportedKey, firstExport))
  ) {
    throw new Error('CL24 custodians exported different keys');
  }
  return firstExport;
}

async function exportKeys(
  dkm: CL24DKM,
  custodiansWithKeys: CustodianKey[],
  onlineCustodians: ShareBinding[],
  createSession: (stage: string, partyId: string) => RootNetworkSession,
  stage: string,
): Promise<Uint8Array[]> {
  return Promise.all(
    custodiansWithKeys.map(({ id, key }) =>
      dkm.exportKey({
        key,
        onlineCustodians,
        networkSession: createSession(stage, id),
      }),
    ),
  );
}

/**
 * Executes one complete CL24 DKM lifecycle.
 *
 * A third custodian is added during rotation because replacing one member of
 * the initial 2-of-2 set would leave only one dealer, below the threshold.
 */
export async function runCL24BenchmarkSample(
  iteration: number,
): Promise<CL24BenchmarkSample> {
  const dkm = new CL24DKM(
    secp256k1,
    new BenchmarkRandomNumberGenerator(iteration + 1),
  );
  const createSession = createSessionFactory(iteration);

  const keyGeneration = await measure(() =>
    Promise.all(
      INITIAL_CUSTODIANS.map(
        async (id): Promise<CustodianKey> => ({
          id,
          key: await dkm.createKey({
            custodians: INITIAL_CUSTODIANS,
            threshold: THRESHOLD,
            networkSession: createSession('key-generation', id),
          }),
        }),
      ),
    ),
  );

  const initialBindings = dealersFromCL24Key(
    keyGeneration.value[0].key,
    INITIAL_CUSTODIANS,
  );
  const initialExport = await measure(() =>
    exportKeys(
      dkm,
      keyGeneration.value,
      initialBindings,
      createSession,
      'initial-export',
    ),
  );
  const originalSecret = assertEqualExports(initialExport.value);

  const shareRefresh = await measure(() =>
    Promise.all(
      keyGeneration.value.map(
        async ({ id, key }): Promise<CustodianKey> => ({
          id,
          key: await dkm.rotateKeyShares({
            key,
            dealers: initialBindings,
            custodians: INITIAL_CUSTODIANS,
            networkSession: createSession('share-refresh', id),
          }),
        }),
      ),
    ),
  );

  const refreshedPublicKey = shareRefresh.value[0].key.publicKey;
  if (
    !shareRefresh.value.every(({ key }) =>
      bytesEqual(key.publicKey, refreshedPublicKey),
    ) ||
    !bytesEqual(refreshedPublicKey, keyGeneration.value[0].key.publicKey)
  ) {
    throw new Error('CL24 share refresh changed the public key');
  }

  const accessStructure: AccessStructure = dkm.accessStructureFromKey(
    shareRefresh.value[0].key,
  );
  const updateInputs: {
    id: string;
    key: CL24ThresholdKey | AccessStructure;
  }[] = [...shareRefresh.value, { id: 'party-3', key: accessStructure }];

  const rosterUpdate = await measure(() =>
    Promise.all(
      updateInputs.map(
        async ({ id, key }): Promise<CustodianKey> => ({
          id,
          key: await dkm.rotateKeyShares({
            key,
            dealers: initialBindings,
            custodians: UPDATED_CUSTODIANS,
            networkSession: createSession('roster-update', id),
          }),
        }),
      ),
    ),
  );

  const updatedBindings = dealersFromCL24Key(
    rosterUpdate.value[0].key,
    UPDATED_CUSTODIANS,
  ).slice(0, THRESHOLD);
  const finalExporters = rosterUpdate.value.slice(0, THRESHOLD);
  const finalExport = await measure(() =>
    exportKeys(
      dkm,
      finalExporters,
      updatedBindings,
      createSession,
      'final-export',
    ),
  );
  const finalSecret = assertEqualExports(finalExport.value);
  if (!bytesEqual(originalSecret, finalSecret)) {
    throw new Error('CL24 lifecycle changed the exported key');
  }

  const total =
    keyGeneration.duration +
    initialExport.duration +
    shareRefresh.duration +
    rosterUpdate.duration +
    finalExport.duration;

  return {
    keyGeneration: keyGeneration.duration,
    initialExport: initialExport.duration,
    shareRefresh: shareRefresh.duration,
    rosterUpdate: rosterUpdate.duration,
    finalExport: finalExport.duration,
    total,
  };
}

function calculateStatistics(values: number[]): CL24BenchmarkStatistics {
  const sortedValues = [...values].sort((left, right) => left - right);
  const middleIndex = Math.floor(sortedValues.length / 2);
  const median =
    sortedValues.length % 2 === 0
      ? (sortedValues[middleIndex - 1] + sortedValues[middleIndex]) / 2
      : sortedValues[middleIndex];

  return {
    min: sortedValues[0],
    median,
    max: sortedValues[sortedValues.length - 1],
  };
}

export function summarizeCL24Benchmark(
  samples: CL24BenchmarkSample[],
): CL24BenchmarkSummary {
  if (samples.length === 0) {
    throw new Error('At least one CL24 benchmark sample is required');
  }

  const stages: CL24BenchmarkStage[] = [
    'keyGeneration',
    'initialExport',
    'shareRefresh',
    'rosterUpdate',
    'finalExport',
    'total',
  ];

  return Object.fromEntries(
    stages.map((stage) => [
      stage,
      calculateStatistics(samples.map((sample) => sample[stage])),
    ]),
  ) as CL24BenchmarkSummary;
}

function yieldToReactNative(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

export async function runCL24Benchmark(
  metadata: CL24BenchmarkMetadata,
  options: {
    sampleIterations?: number;
    warmupIterations?: number;
  } = {},
): Promise<CL24BenchmarkResult> {
  const warmupIterations =
    options.warmupIterations ?? CL24_BENCHMARK_WARMUP_ITERATIONS;
  const sampleIterations =
    options.sampleIterations ?? CL24_BENCHMARK_SAMPLE_ITERATIONS;

  if (warmupIterations < 0 || sampleIterations < 1) {
    throw new Error('CL24 benchmark iteration counts are invalid');
  }

  for (let index = 0; index < warmupIterations; index++) {
    await runCL24BenchmarkSample(index);
    await yieldToReactNative();
  }

  const samples: CL24BenchmarkSample[] = [];
  for (let index = 0; index < sampleIterations; index++) {
    samples.push(await runCL24BenchmarkSample(warmupIterations + index));
    await yieldToReactNative();
  }

  return {
    configuration: {
      curve: 'secp256k1',
      initialPartyCount: 2,
      threshold: THRESHOLD,
      updatedPartyCount: 3,
      transport: 'event-driven-in-memory',
      warmupIterations,
      sampleIterations,
    },
    metadata,
    samples,
    summary: summarizeCL24Benchmark(samples),
    timestamp: new Date().toISOString(),
  };
}
