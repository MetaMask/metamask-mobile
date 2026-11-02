import { hkdf } from '@noble/hashes/hkdf';
import { sha256, sha384, sha512 } from '@noble/hashes/sha2';

const EMPTY_IKM_KEY = Symbol('emptyIkmHkdfKey');

const HASHES = { 'SHA-256': sha256, 'SHA-384': sha384, 'SHA-512': sha512 };

interface EmptyIkmKey {
  [EMPTY_IKM_KEY]: true;
}

const isEmptyIkmKey = (key: unknown): key is EmptyIkmKey =>
  typeof key === 'object' && key !== null && EMPTY_IKM_KEY in key;

const toBytes = (source: BufferSource): Uint8Array =>
  source instanceof ArrayBuffer
    ? new Uint8Array(source)
    : new Uint8Array(source.buffer, source.byteOffset, source.byteLength);

/**
 * Lets `crypto.subtle` run HKDF with an empty IKM, which the Noise `Split` in
 * `@metamask/mfa-wallet-network` needs and `react-native-quick-crypto`
 * rejects. Only that case is handled here, with noble; everything else goes to
 * the native implementation.
 *
 * Temporary: remove once MetaMask/core#11024 and MetaMask/mfa-wallet-sdk#68
 * are released.
 *
 * @param subtle - The SubtleCrypto instance to patch.
 */
export function applyEmptyIkmHkdfWorkaround(
  subtle: SubtleCrypto | undefined = globalThis.crypto?.subtle,
): void {
  if (
    !subtle ||
    (subtle as unknown as Record<symbol, boolean>)[EMPTY_IKM_KEY]
  ) {
    return;
  }
  const importKey = subtle.importKey.bind(subtle);
  const deriveBits = subtle.deriveBits.bind(subtle);

  Object.assign(subtle, {
    [EMPTY_IKM_KEY]: true,
    importKey: (...args: Parameters<SubtleCrypto['importKey']>) => {
      const [format, keyData, algorithm] = args;
      const name = typeof algorithm === 'string' ? algorithm : algorithm.name;
      if (
        format === 'raw' &&
        name === 'HKDF' &&
        (keyData as BufferSource).byteLength === 0
      ) {
        return Promise.resolve({
          [EMPTY_IKM_KEY]: true,
        } as unknown as CryptoKey);
      }
      return importKey(...args);
    },
    deriveBits: (
      algorithm: HkdfParams,
      key: CryptoKey,
      length: number,
    ): Promise<ArrayBuffer> => {
      if (!isEmptyIkmKey(key)) {
        return deriveBits(algorithm, key, length);
      }
      const hash =
        typeof algorithm.hash === 'string'
          ? algorithm.hash
          : algorithm.hash.name;
      const output = hkdf(
        HASHES[hash as keyof typeof HASHES],
        new Uint8Array(0),
        toBytes(algorithm.salt),
        toBytes(algorithm.info),
        length / 8,
      );
      return Promise.resolve(
        output.buffer.slice(
          output.byteOffset,
          output.byteOffset + output.byteLength,
        ) as ArrayBuffer,
      );
    },
  });
}
