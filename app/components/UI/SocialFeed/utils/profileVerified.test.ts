import { isProfileVerified } from './profileVerified';

describe('isProfileVerified', () => {
  it('is true only for a verified flag of true', () => {
    expect(isProfileVerified({ verified: true })).toBe(true);
  });

  it.each([
    ['false', { verified: false }],
    ['null', { verified: null }],
    ['a truthy non-boolean', { verified: 'true' }],
    ['a missing flag', {}],
    ['a null profile', null],
    ['an undefined profile', undefined],
  ])('is false for %s', (_label, profile) => {
    expect(isProfileVerified(profile)).toBe(false);
  });
});
