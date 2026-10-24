import { hkdf } from '@noble/hashes/hkdf';
import { sha256 } from '@noble/hashes/sha2';
import { applyEmptyIkmHkdfWorkaround } from './empty-ikm-hkdf-workaround';

const createSubtle = () => {
  const importKey = jest.fn().mockResolvedValue('native-key');
  const deriveBits = jest.fn().mockResolvedValue(new ArrayBuffer(8));
  return {
    subtle: { importKey, deriveBits } as unknown as SubtleCrypto,
    importKey,
    deriveBits,
  };
};

describe('applyEmptyIkmHkdfWorkaround', () => {
  it('derives HKDF with an empty IKM using noble', async () => {
    const { subtle, importKey, deriveBits } = createSubtle();
    applyEmptyIkmHkdfWorkaround(subtle);
    const salt = new Uint8Array(32).fill(1);

    const key = await subtle.importKey(
      'raw',
      new Uint8Array(0),
      { name: 'HKDF' },
      false,
      ['deriveBits'],
    );
    const bits = await subtle.deriveBits(
      { name: 'HKDF', hash: 'SHA-256', salt, info: new Uint8Array(0) },
      key,
      512,
    );

    expect(new Uint8Array(bits)).toStrictEqual(
      hkdf(sha256, new Uint8Array(0), salt, new Uint8Array(0), 64),
    );
    expect(importKey).not.toHaveBeenCalled();
    expect(deriveBits).not.toHaveBeenCalled();
  });

  it('passes every other key to the native implementation', async () => {
    const { subtle, importKey, deriveBits } = createSubtle();
    applyEmptyIkmHkdfWorkaround(subtle);
    const algorithm = {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: new Uint8Array(32),
      info: new Uint8Array(0),
    };

    const key = await subtle.importKey(
      'raw',
      new Uint8Array(32),
      { name: 'HKDF' },
      false,
      ['deriveBits'],
    );
    await subtle.deriveBits(algorithm, key, 256);

    expect(importKey).toHaveBeenCalledTimes(1);
    expect(deriveBits).toHaveBeenCalledWith(algorithm, 'native-key', 256);
  });

  it('patches the same instance only once', () => {
    const { subtle } = createSubtle();
    applyEmptyIkmHkdfWorkaround(subtle);
    const patchedImportKey = subtle.importKey;

    applyEmptyIkmHkdfWorkaround(subtle);

    expect(subtle.importKey).toBe(patchedImportKey);
  });
});
