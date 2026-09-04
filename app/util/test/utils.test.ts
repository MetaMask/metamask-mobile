import { isRcEnvironment } from './utils';

describe('isRcEnvironment', () => {
  it.each(['rc', 'rc-nightly'])('returns true for %s', (env) => {
    const result = isRcEnvironment(env);

    expect(result).toBe(true);
  });

  it.each(['production', 'exp', 'dev', 'test', 'e2e', '', undefined])(
    'returns false for %s',
    (env) => {
      const result = isRcEnvironment(env);

      expect(result).toBe(false);
    },
  );
});
