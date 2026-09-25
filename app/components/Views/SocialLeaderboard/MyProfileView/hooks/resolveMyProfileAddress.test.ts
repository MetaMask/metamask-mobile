import { resolveMyProfileAddress } from './resolveMyProfileAddress';

describe('resolveMyProfileAddress', () => {
  it('prefers the linked onboarding address over the selected account', () => {
    const result = resolveMyProfileAddress('0xlinked', '0xselected');

    expect(result).toBe('0xlinked');
  });

  it('falls back to the selected account when no address is linked', () => {
    const result = resolveMyProfileAddress(null, '0xselected');

    expect(result).toBe('0xselected');
  });

  it('returns undefined when neither address is set', () => {
    const result = resolveMyProfileAddress(undefined, undefined);

    expect(result).toBeUndefined();
  });

  it('ignores blank linked addresses', () => {
    const result = resolveMyProfileAddress('   ', '0xselected');

    expect(result).toBe('0xselected');
  });
});
