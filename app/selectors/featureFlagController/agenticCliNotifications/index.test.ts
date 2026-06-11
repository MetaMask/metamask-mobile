import {
  AGENTIC_CLI_NOTIFICATIONS_FLAG_KEY,
  selectAgenticCliNotificationsEnabled,
} from '.';

describe('selectAgenticCliNotificationsEnabled', () => {
  const originalBuildFlag = process.env.MM_AGENTIC_CLI_NOTIFICATIONS_UI_ENABLED;

  beforeEach(() => {
    process.env.MM_AGENTIC_CLI_NOTIFICATIONS_UI_ENABLED = 'true';
  });

  afterEach(() => {
    process.env.MM_AGENTIC_CLI_NOTIFICATIONS_UI_ENABLED = originalBuildFlag;
  });

  it('uses the snake_case LaunchDarkly key', () => {
    expect(AGENTIC_CLI_NOTIFICATIONS_FLAG_KEY).toBe(
      'agentic_cli_notifications_enabled',
    );
  });

  it('returns true when build and remote flags are enabled', () => {
    const result = selectAgenticCliNotificationsEnabled.resultFunc({
      [AGENTIC_CLI_NOTIFICATIONS_FLAG_KEY]: true,
    });

    expect(result).toBe(true);
  });

  it('returns false when remote flag is disabled', () => {
    const result = selectAgenticCliNotificationsEnabled.resultFunc({
      [AGENTIC_CLI_NOTIFICATIONS_FLAG_KEY]: false,
    });

    expect(result).toBe(false);
  });

  it('returns false when build flag is disabled', () => {
    process.env.MM_AGENTIC_CLI_NOTIFICATIONS_UI_ENABLED = 'false';

    const result = selectAgenticCliNotificationsEnabled.resultFunc({
      [AGENTIC_CLI_NOTIFICATIONS_FLAG_KEY]: true,
    });

    expect(result).toBe(false);
  });

  it('returns false when remote flag is absent and build flag is enabled', () => {
    const result = selectAgenticCliNotificationsEnabled.resultFunc({});

    expect(result).toBe(false);
  });
});
