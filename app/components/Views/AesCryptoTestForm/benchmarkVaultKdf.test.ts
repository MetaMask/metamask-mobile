import {
  logStoredVaultIterations,
  readVaultIterationCount,
  runVaultKdfBenchmark,
  VAULT_KDF_BENCH_PREFIX,
  type VaultKdfBenchmarkEncryptor,
} from './benchmarkVaultKdf';

const createFakeEncryptor = (
  advance: (milliseconds: number) => void,
  keyDurations: number[],
  roundTripDurations: number[],
): VaultKdfBenchmarkEncryptor => {
  let keyIndex = 0;
  let roundTripIndex = 0;

  return {
    generateSalt: () => 'salt',
    keyFromPassword: async () => {
      advance(keyDurations[keyIndex] ?? 0);
      keyIndex += 1;
    },
    encrypt: async () => {
      advance(roundTripDurations[roundTripIndex] ?? 0);
      roundTripIndex += 1;
      return 'vault';
    },
    decrypt: async () => ({ benchmark: 'vault-kdf' }),
  };
};

describe('readVaultIterationCount', () => {
  it('returns the iteration count stored on the vault', () => {
    const vault = JSON.stringify({
      cipher: 'cipher',
      keyMetadata: { algorithm: 'PBKDF2', params: { iterations: 5000 } },
    });

    const iterations = readVaultIterationCount(vault);

    expect(iterations).toBe(5000);
  });

  it('returns null when the vault has no key metadata', () => {
    const iterations = readVaultIterationCount(
      JSON.stringify({ cipher: 'cipher' }),
    );

    expect(iterations).toBeNull();
  });

  it('returns null when the vault is not JSON', () => {
    const iterations = readVaultIterationCount('not-json');

    expect(iterations).toBeNull();
  });
});

describe('runVaultKdfBenchmark', () => {
  it('drops the warmup sample and logs median and slowest', async () => {
    let clock = 0;
    const lines: string[] = [];
    const keyDurations = [999, 10, 30];
    const roundTripDurations = [999, 20, 40];

    const result = await runVaultKdfBenchmark({
      iterations: [5000],
      sampleCount: 2,
      now: () => clock,
      log: (message) => {
        lines.push(message);
      },
      createEncryptor: () =>
        createFakeEncryptor(
          (milliseconds) => {
            clock += milliseconds;
          },
          keyDurations,
          roundTripDurations,
        ),
    });

    expect(result).toEqual([
      `${VAULT_KDF_BENCH_PREFIX} iterations=5000 op=keyFromPassword medianMs=20.0 slowestMs=30.0 samples=10.0,30.0`,
      `${VAULT_KDF_BENCH_PREFIX} iterations=5000 op=encryptDecrypt medianMs=30.0 slowestMs=40.0 samples=20.0,40.0`,
    ]);
    expect(lines).toEqual(result);
  });
});

describe('logStoredVaultIterations', () => {
  it('logs a missing vault iteration count', () => {
    const lines: string[] = [];

    const line = logStoredVaultIterations(undefined, (message) => {
      lines.push(message);
    });

    expect(line).toBe(`${VAULT_KDF_BENCH_PREFIX} vaultIterations=missing`);
    expect(lines).toEqual([line]);
  });
});
