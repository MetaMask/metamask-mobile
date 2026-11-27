import { isRealMpcMoneyKeyringBuildEnabled } from './featureFlags';

describe('isRealMpcMoneyKeyringBuildEnabled', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it.each([
    ['true', 'true', true],
    ['true', 'false', false],
    ['false', 'true', false],
    ['false', 'false', false],
    [undefined, 'true', false],
    ['true', undefined, false],
    [undefined, undefined, false],
    ['', 'true', false],
    ['true', '', false],
  ])(
    'requires both flags (parent=%s, real=%s, enabled=%s)',
    (parentFlag, realFlag, expected) => {
      const env = { ...process.env };
      if (parentFlag === undefined) {
        delete env.MM_MONEY_MPC_KEYRING_ENABLED;
      } else {
        env.MM_MONEY_MPC_KEYRING_ENABLED = parentFlag;
      }
      if (realFlag === undefined) {
        delete env.MM_MONEY_MPC_REAL_KEYRING;
      } else {
        env.MM_MONEY_MPC_REAL_KEYRING = realFlag;
      }
      jest.replaceProperty(process, 'env', env);

      const enabled = isRealMpcMoneyKeyringBuildEnabled();

      expect(enabled).toBe(expected);
    },
  );
});
