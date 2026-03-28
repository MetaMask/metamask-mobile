import { LaunchArguments } from 'react-native-launch-arguments';
import {
  E2E_MOCK_OAUTH_EXISTING_USER_LAUNCH_ARG,
  isE2EMockOAuthExistingUserScenario,
  resetE2EMockOAuthExistingUserRuntimeOverride,
  setE2EMockOAuthExistingUserRuntimeOverride,
} from './e2eMockOAuthExistingUserScenario';

jest.mock('react-native-launch-arguments', () => ({
  LaunchArguments: {
    value: jest.fn(),
  },
}));

const launchValue = LaunchArguments.value as jest.Mock;

describe('isE2EMockOAuthExistingUserScenario', () => {
  const originalExisting = process.env.E2E_MOCK_OAUTH_EXISTING_USER;
  const originalMockOAuth = process.env.E2E_MOCK_OAUTH;

  beforeEach(() => {
    delete process.env.E2E_MOCK_OAUTH_EXISTING_USER;
    delete process.env.E2E_MOCK_OAUTH;
    resetE2EMockOAuthExistingUserRuntimeOverride();
    launchValue.mockReturnValue({});
  });

  afterAll(() => {
    if (originalExisting === undefined) {
      delete process.env.E2E_MOCK_OAUTH_EXISTING_USER;
    } else {
      process.env.E2E_MOCK_OAUTH_EXISTING_USER = originalExisting;
    }
    if (originalMockOAuth === undefined) {
      delete process.env.E2E_MOCK_OAUTH;
    } else {
      process.env.E2E_MOCK_OAUTH = originalMockOAuth;
    }
  });

  it('returns true when E2E_MOCK_OAUTH_EXISTING_USER is true', () => {
    process.env.E2E_MOCK_OAUTH_EXISTING_USER = 'true';
    expect(isE2EMockOAuthExistingUserScenario('plain@example.com')).toBe(true);
  });

  it('returns true when email heuristic matches', () => {
    expect(
      isE2EMockOAuthExistingUserScenario('google.existinguser+e2e@web3auth.io'),
    ).toBe(true);
  });

  it('returns false when no signal', () => {
    expect(isE2EMockOAuthExistingUserScenario('user@example.com')).toBe(false);
  });

  it('returns true from launch arg when E2E_MOCK_OAUTH is true', () => {
    process.env.E2E_MOCK_OAUTH = 'true';
    launchValue.mockReturnValue({
      [E2E_MOCK_OAUTH_EXISTING_USER_LAUNCH_ARG]: 'true',
    });
    expect(isE2EMockOAuthExistingUserScenario('plain@example.com')).toBe(true);
  });

  it('returns true from runtime setter when E2E_MOCK_OAUTH is true', () => {
    process.env.E2E_MOCK_OAUTH = 'true';
    setE2EMockOAuthExistingUserRuntimeOverride(true);
    expect(isE2EMockOAuthExistingUserScenario('plain@example.com')).toBe(true);
  });

  it('returns false from runtime setter false when E2E_MOCK_OAUTH is true', () => {
    process.env.E2E_MOCK_OAUTH = 'true';
    setE2EMockOAuthExistingUserRuntimeOverride(false);
    expect(isE2EMockOAuthExistingUserScenario('plain@example.com')).toBe(false);
  });

  it('ignores runtime setter when E2E_MOCK_OAUTH is not true', () => {
    setE2EMockOAuthExistingUserRuntimeOverride(true);
    expect(isE2EMockOAuthExistingUserScenario('plain@example.com')).toBe(false);
  });
});
