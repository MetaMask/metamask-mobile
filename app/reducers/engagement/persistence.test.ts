import persistConfig from '../../store/persistConfig';

describe('engagement persistence blacklist', () => {
  it('blacklists the engagement slice so completed surfaces reset on cold start', () => {
    expect(persistConfig.blacklist).toContain('engagement');
  });
});
