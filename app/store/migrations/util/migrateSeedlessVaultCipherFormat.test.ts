import { migrateSeedlessVaultCipherFormat } from './migrateSeedlessVaultCipherFormat';

describe('migrateSeedlessVaultCipherFormat', () => {
  it('adds cipher from data when vault uses data-only format', () => {
    const vault = JSON.stringify({
      data: 'encrypted-payload',
      iv: 'mock-iv',
      salt: 'mock-salt',
      lib: 'original',
    });

    const result = migrateSeedlessVaultCipherFormat(vault);

    expect(result.migrated).toBe(true);
    const parsed = JSON.parse(result.vault as string);
    expect(parsed.cipher).toBe('encrypted-payload');
    expect(parsed.data).toBe('encrypted-payload');
    expect(parsed.iv).toBe('mock-iv');
    expect(parsed.salt).toBe('mock-salt');
  });

  it('returns vault unchanged when cipher is already present', () => {
    const vault = JSON.stringify({
      cipher: 'encrypted-payload',
      iv: 'mock-iv',
    });

    const result = migrateSeedlessVaultCipherFormat(vault);

    expect(result.migrated).toBe(false);
    expect(result.vault).toBe(vault);
  });

  it('returns vault unchanged when both cipher and data are present', () => {
    const vault = JSON.stringify({
      cipher: 'cipher-value',
      data: 'data-value',
      iv: 'mock-iv',
    });

    const result = migrateSeedlessVaultCipherFormat(vault);

    expect(result.migrated).toBe(false);
    expect(result.vault).toBe(vault);
  });

  it('returns invalid JSON vault unchanged', () => {
    const vault = '{not-valid-json';

    const result = migrateSeedlessVaultCipherFormat(vault);

    expect(result.migrated).toBe(false);
    expect(result.vault).toBe(vault);
  });

  it('returns non-object string vault unchanged', () => {
    const vault = 'plain-text-vault';

    const result = migrateSeedlessVaultCipherFormat(vault);

    expect(result.migrated).toBe(false);
    expect(result.vault).toBe(vault);
  });

  it('returns undefined vault for non-string input', () => {
    const result = migrateSeedlessVaultCipherFormat(undefined);

    expect(result.migrated).toBe(false);
    expect(result.vault).toBeUndefined();
  });
});
