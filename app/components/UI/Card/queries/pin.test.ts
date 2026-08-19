import { pinKeys } from './pin';

describe('pinKeys', () => {
  it('returns the base key for all pin queries', () => {
    expect(pinKeys.all()).toEqual(['card', 'pin']);
  });

  it('returns the token mutation key', () => {
    expect(pinKeys.token()).toEqual(['card', 'pin', 'token']);
  });
});
