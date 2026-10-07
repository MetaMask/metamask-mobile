import { hasProperty, isPlainObject, type Json } from '@metamask/utils';
import { Encryptor } from '../../../core/Encryptor';
import {
  KDF_ALGORITHM,
  KeyDerivationIteration,
} from '../../../core/Encryptor/constants';
import type { KeyDerivationOptions } from '../../../core/Encryptor/types';

export const VAULT_KDF_BENCH_PREFIX = 'VAULT_KDF_BENCH';

const BENCHMARK_PASSWORD = 'vault-kdf-bench';
const SAMPLE_COUNT = 10;
const BENCHMARK_PAYLOAD: Json = { benchmark: 'vault-kdf' };

const ITERATION_COUNTS = [
  KeyDerivationIteration.Legacy5000,
  KeyDerivationIteration.OWASP2023Minimum,
  KeyDerivationIteration.OWASP2023Default,
] as const;

type NativeLoggingHook = (message: string, level: number) => void;

/**
 * Minimal encryptor surface the benchmark times.
 * Production uses {@link Encryptor}; tests pass a fake.
 */
export interface VaultKdfBenchmarkEncryptor {
  generateSalt: (size?: number) => string;
  keyFromPassword: (password: string, salt: string) => Promise<unknown>;
  encrypt: (password: string, data: Json) => Promise<string>;
  decrypt: (password: string, text: string) => Promise<unknown>;
}

interface RunVaultKdfBenchmarkOptions {
  createEncryptor?: (iterations: number) => VaultKdfBenchmarkEncryptor;
  iterations?: readonly number[];
  log?: (message: string) => void;
  now?: () => number;
  sampleCount?: number;
}

/**
 * Reads the PBKDF2 iteration count stored on a vault, when the vault has
 * key-derivation metadata. Legacy vaults without that metadata return null.
 *
 * @param vault - Serialized vault JSON, or undefined when no vault exists.
 * @returns The iteration count, or null when it cannot be read.
 */
export const readVaultIterationCount = (
  vault: string | undefined,
): number | null => {
  if (!vault) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(vault);
    if (
      !isPlainObject(parsed) ||
      !hasProperty(parsed, 'keyMetadata') ||
      !isPlainObject(parsed.keyMetadata) ||
      !hasProperty(parsed.keyMetadata, 'params') ||
      !isPlainObject(parsed.keyMetadata.params) ||
      typeof parsed.keyMetadata.params.iterations !== 'number'
    ) {
      return null;
    }

    return parsed.keyMetadata.params.iterations;
  } catch {
    return null;
  }
};

const createProductionEncryptor = (
  iterations: number,
): VaultKdfBenchmarkEncryptor =>
  new Encryptor({
    keyDerivationOptions: {
      algorithm: KDF_ALGORITHM,
      params: { iterations },
    } satisfies KeyDerivationOptions,
  });

const logBenchLine = (
  line: string,
  log: ((message: string) => void) | undefined,
): string => {
  const message = `${VAULT_KDF_BENCH_PREFIX} ${line}`;
  if (log) {
    log(message);
    return message;
  }

  const hook = (global as { nativeLoggingHook?: NativeLoggingHook })
    .nativeLoggingHook;
  hook?.(message, 1);
  return message;
};

const median = (values: number[]): number => {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }
  return sorted[middle];
};

const formatMs = (value: number): string => value.toFixed(1);

const timeSamples = async (
  sampleCount: number,
  now: () => number,
  operation: () => Promise<void>,
): Promise<number[]> => {
  const samples: number[] = [];
  for (let index = 0; index < sampleCount; index++) {
    const startedAt = now();
    await operation();
    samples.push(now() - startedAt);
  }
  return samples;
};

const summarize = (
  iterations: number,
  operationName: string,
  samples: number[],
  log: ((message: string) => void) | undefined,
): string => {
  const slowest = Math.max(...samples);
  return logBenchLine(
    `iterations=${iterations} op=${operationName} medianMs=${formatMs(median(samples))} slowestMs=${formatMs(slowest)} samples=${samples.map(formatMs).join(',')}`,
    log,
  );
};

/**
 * Times password key derivation and a full encrypt/decrypt round trip at each
 * iteration count. The first call of each operation is an untimed warmup.
 * Summary lines go to `global.nativeLoggingHook` unless a logger is injected.
 *
 * @param options - Optional fakes for tests and the iteration counts to run.
 * @returns The logged summary lines, including the vault iteration line when logged separately.
 */
export const runVaultKdfBenchmark = async ({
  createEncryptor = createProductionEncryptor,
  iterations = ITERATION_COUNTS,
  log,
  now = () => performance.now(),
  sampleCount = SAMPLE_COUNT,
}: RunVaultKdfBenchmarkOptions = {}): Promise<string[]> => {
  const lines: string[] = [];

  for (const iterationCount of iterations) {
    const encryptor = createEncryptor(iterationCount);
    const salt = encryptor.generateSalt();

    await encryptor.keyFromPassword(BENCHMARK_PASSWORD, salt);
    const keySamples = await timeSamples(sampleCount, now, () =>
      encryptor.keyFromPassword(BENCHMARK_PASSWORD, salt).then(() => undefined),
    );
    lines.push(summarize(iterationCount, 'keyFromPassword', keySamples, log));

    await encryptor.encrypt(BENCHMARK_PASSWORD, BENCHMARK_PAYLOAD);
    const roundTripSamples = await timeSamples(sampleCount, now, async () => {
      const encrypted = await encryptor.encrypt(
        BENCHMARK_PASSWORD,
        BENCHMARK_PAYLOAD,
      );
      await encryptor.decrypt(BENCHMARK_PASSWORD, encrypted);
    });
    lines.push(
      summarize(iterationCount, 'encryptDecrypt', roundTripSamples, log),
    );
  }

  return lines;
};

/**
 * Logs the iteration count of the on-device wallet vault.
 *
 * @param vault - Serialized KeyringController vault.
 * @param log - Optional logger. Defaults to `global.nativeLoggingHook`.
 * @returns The logged line.
 */
export const logStoredVaultIterations = (
  vault: string | undefined,
  log?: (message: string) => void,
): string => {
  const iterations = readVaultIterationCount(vault);
  return logBenchLine(
    `vaultIterations=${iterations === null ? 'missing' : iterations}`,
    log,
  );
};
