import { resolveMyProfileAddress } from './resolveMyProfileAddress';

describe('resolveMyProfileAddress', () => {
  it('prefers the session profileId over wallet addresses', () => {
    const result = resolveMyProfileAddress(
      'session-profile-id',
      '0xlinked',
      '0xselected',
    );

    expect(result).toBe('session-profile-id');
  });

  it('prefers the linked onboarding address over the selected account', () => {
    const result = resolveMyProfileAddress(undefined, '0xlinked', '0xselected');

    expect(result).toBe('0xlinked');
  });

  it('falls back to the selected account when no session or linked address exists', () => {
    const result = resolveMyProfileAddress(null, null, '0xselected');

    expect(result).toBe('0xselected');
  });

  it('returns undefined when no identifier is set', () => {
    const result = resolveMyProfileAddress(undefined, undefined, undefined);

    expect(result).toBeUndefined();
  });

  it('ignores blank session and linked values', () => {
    const result = resolveMyProfileAddress('   ', '   ', '0xselected');

    expect(result).toBe('0xselected');
  });
});
