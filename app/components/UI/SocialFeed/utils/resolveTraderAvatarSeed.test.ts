import { resolveTraderAvatarSeed } from './resolveTraderAvatarSeed';

describe('resolveTraderAvatarSeed', () => {
  const address = '0x0000000000000000000000000000000000000001';

  it('uses the profile id even when a wallet address is present', () => {
    expect(resolveTraderAvatarSeed('profile-1', address)).toBe('profile-1');
  });

  it('falls back to the wallet address when the profile id is missing', () => {
    expect(resolveTraderAvatarSeed('', address)).toBe(address);
    expect(resolveTraderAvatarSeed('   ', address)).toBe(address);
    expect(resolveTraderAvatarSeed(null, address)).toBe(address);
    expect(resolveTraderAvatarSeed(undefined, address)).toBe(address);
  });

  it('returns an empty seed when neither identifier is present', () => {
    expect(resolveTraderAvatarSeed(undefined, undefined)).toBe('');
    expect(resolveTraderAvatarSeed('  ', '  ')).toBe('');
  });
});
