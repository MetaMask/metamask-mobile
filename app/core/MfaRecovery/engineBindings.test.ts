jest.mock('../Engine', () => ({ context: {} }));
jest.mock('react-native-quick-crypto', () => ({ randomBytes: jest.fn() }));

import { canProveSocialIdentifier } from './engineBindings';

describe('canProveSocialIdentifier', () => {
  it('allows Google on iOS and Android', () => {
    expect(canProveSocialIdentifier('ios', 'google')).toBe(true);
    expect(canProveSocialIdentifier('android', 'google')).toBe(true);
  });

  it('allows Apple on iOS only', () => {
    expect(canProveSocialIdentifier('ios', 'apple')).toBe(true);
    expect(canProveSocialIdentifier('android', 'apple')).toBe(false);
  });

  it('rejects Telegram and a missing provider', () => {
    expect(canProveSocialIdentifier('ios', 'telegram')).toBe(false);
    expect(canProveSocialIdentifier('ios', undefined)).toBe(false);
  });
});
