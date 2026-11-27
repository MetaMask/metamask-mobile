import { isMpcMoneyKeyringBuildEnabled } from './featureFlags';

describe('isMpcMoneyKeyringBuildEnabled', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it.each([
    ['true', true],
    ['false', false],
    [undefined, false],
    ['', false],
  ])("is enabled only for 'true' (flag=%s, enabled=%s)", (flag, expected) => {
    const env = { ...process.env };
    if (flag === undefined) {
      delete env.MM_MONEY_MPC_KEYRING_ENABLED;
    } else {
      env.MM_MONEY_MPC_KEYRING_ENABLED = flag;
    }
    jest.replaceProperty(process, 'env', env);

    const enabled = isMpcMoneyKeyringBuildEnabled();

    expect(enabled).toBe(expected);
  });
});
