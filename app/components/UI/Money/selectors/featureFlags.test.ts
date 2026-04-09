// eslint-disable-next-line import-x/no-namespace
import * as remoteFeatureFlagModule from '../../../../util/remoteFeatureFlag';
import { selectMoneyHomeScreenEnabledFlag } from './featureFlags';

jest.mock('../../../../core/Engine', () => ({
  context: {},
}));

jest.mock('../../../../util/remoteFeatureFlag', () => ({
  ...jest.requireActual('../../../../util/remoteFeatureFlag'),
  validatedVersionGatedFeatureFlag: jest.fn(),
}));

const mockedValidate =
  remoteFeatureFlagModule.validatedVersionGatedFeatureFlag as jest.MockedFunction<
    typeof remoteFeatureFlagModule.validatedVersionGatedFeatureFlag
  >;

const createState = (remoteFeatureFlags: Record<string, unknown> = {}) => ({
  engine: {
    backgroundState: {
      RemoteFeatureFlagController: {
        remoteFeatureFlags,
      },
    },
  },
});

describe('selectMoneyHomeScreenEnabledFlag', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns true when remote flag is enabled and version requirement is met', () => {
    mockedValidate.mockReturnValue(true);

    const state = createState({
      moneyHomeScreenEnabled: { enabled: true, minimumVersion: '1.0.0' },
    });

    const result = selectMoneyHomeScreenEnabledFlag(state as never);

    expect(result).toBe(true);
  });

  it('returns false when remote flag is disabled', () => {
    mockedValidate.mockReturnValue(false);

    const state = createState({
      moneyHomeScreenEnabled: { enabled: false, minimumVersion: '1.0.0' },
    });

    const result = selectMoneyHomeScreenEnabledFlag(state as never);

    expect(result).toBe(false);
  });

  it('falls back to local env var when remote flag returns undefined', () => {
    mockedValidate.mockReturnValue(undefined);
    process.env.MM_MONEY_HOME_SCREEN_ENABLED = 'true';

    const state = createState({ _unique: 'fallback-true' });

    const result = selectMoneyHomeScreenEnabledFlag(state as never);

    expect(result).toBe(true);
  });

  it('returns false when both remote and local flags are unavailable', () => {
    mockedValidate.mockReturnValue(undefined);
    delete process.env.MM_MONEY_HOME_SCREEN_ENABLED;

    const state = createState({ _unique: 'fallback-false' });

    const result = selectMoneyHomeScreenEnabledFlag(state as never);

    expect(result).toBe(false);
  });
});
