import { resolveTraderAvatarSeed } from './resolveTraderAvatarSeed';

describe('resolveTraderAvatarSeed', () => {
  const address = '0x0000000000000000000000000000000000000001';

  it('uses the wallet address so the icon matches the trader profile', () => {
    expect(resolveTraderAvatarSeed(address, 'profile-1')).toBe(address);
  });

  it('falls back to the profile id when the wallet address is missing', () => {
    expect(resolveTraderAvatarSeed('', 'profile-1')).toBe('profile-1');
    expect(resolveTraderAvatarSeed('   ', 'profile-1')).toBe('profile-1');
    expect(resolveTraderAvatarSeed(null, 'profile-1')).toBe('profile-1');
    expect(resolveTraderAvatarSeed(undefined, 'profile-1')).toBe('profile-1');
  });

  it('returns an empty seed when neither identifier is present', () => {
    expect(resolveTraderAvatarSeed(undefined, undefined)).toBe('');
    expect(resolveTraderAvatarSeed('  ', '  ')).toBe('');
  });
});
