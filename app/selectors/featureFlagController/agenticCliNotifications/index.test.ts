import { selectAgenticCliNotificationsEnabled } from '.';

describe('selectAgenticCliNotificationsEnabled', () => {
  const originalBuildFlag = process.env.MM_AGENTIC_CLI_NOTIFICATIONS_UI_ENABLED;

  beforeEach(() => {
    process.env.MM_AGENTIC_CLI_NOTIFICATIONS_UI_ENABLED = 'true';
  });

  afterEach(() => {
    process.env.MM_AGENTIC_CLI_NOTIFICATIONS_UI_ENABLED = originalBuildFlag;
  });

  it('returns true when build and remote flags are enabled', () => {
    const result = selectAgenticCliNotificationsEnabled.resultFunc({
      agenticCliNotificationsEnabled: true,
    });

    expect(result).toBe(true);
  });

  it('returns false when remote flag is disabled', () => {
    const result = selectAgenticCliNotificationsEnabled.resultFunc({
      agenticCliNotificationsEnabled: false,
    });

    expect(result).toBe(false);
  });

  it('returns false when build flag is disabled', () => {
    process.env.MM_AGENTIC_CLI_NOTIFICATIONS_UI_ENABLED = 'false';

    const result = selectAgenticCliNotificationsEnabled.resultFunc({
      agenticCliNotificationsEnabled: true,
    });

    expect(result).toBe(false);
  });

  it('returns true in dev when remote flag is absent and build flag is enabled', () => {
    const originalDev = global.__DEV__;
    global.__DEV__ = true;

    try {
      const result = selectAgenticCliNotificationsEnabled.resultFunc({});

      expect(result).toBe(true);
    } finally {
      global.__DEV__ = originalDev;
    }
  });

  it('returns false outside dev when remote flag is absent and build flag is enabled', () => {
    const originalDev = global.__DEV__;
    global.__DEV__ = false;

    try {
      const result = selectAgenticCliNotificationsEnabled.resultFunc({});

      expect(result).toBe(false);
    } finally {
      global.__DEV__ = originalDev;
    }
  });
});
