const {
  parseGithubLabelsPayload,
  hasSkipSonarCloudLabel,
  qualityGateStatus,
  parseCeTask,
  parseCeTaskUrlFromReportTask,
  decidePrLevelQualityGatePoll,
  loadReportTask,
  shouldSkipQualityGate,
  checkQualityGate,
} = require('./sonar-quality-gate-status.cjs');

describe('parseGithubLabelsPayload', () => {
  it('returns label names from an array of label objects', () => {
    const payload = [{ name: 'size-M' }, { name: 'skip-sonar-cloud' }];

    expect(parseGithubLabelsPayload(payload)).toEqual({
      ok: true,
      names: ['size-M', 'skip-sonar-cloud'],
    });
  });

  it('returns ok false for a GitHub error object', () => {
    expect(
      parseGithubLabelsPayload({
        message: 'API rate limit exceeded',
        documentation_url: 'https://docs.github.com/rest',
      }),
    ).toEqual({ ok: false, names: [] });
  });

  it('returns ok false for a JSON string payload', () => {
    expect(
      parseGithubLabelsPayload('Resource not accessible by integration'),
    ).toEqual({ ok: false, names: [] });
  });
});

describe('hasSkipSonarCloudLabel', () => {
  it('returns true when skip-sonar-cloud is present', () => {
    expect(hasSkipSonarCloudLabel(['size-S', 'skip-sonar-cloud'])).toBe(true);
  });

  it('returns false when skip-sonar-cloud is absent', () => {
    expect(hasSkipSonarCloudLabel(['size-S'])).toBe(false);
  });
});

describe('qualityGateStatus', () => {
  it('reads projectStatus.status', () => {
    expect(qualityGateStatus({ projectStatus: { status: 'ERROR' } })).toBe(
      'ERROR',
    );
  });

  it('returns empty string when status is missing', () => {
    expect(qualityGateStatus({ errors: [{ msg: 'not found' }] })).toBe('');
  });
});

describe('parseCeTask', () => {
  it('reads CE task status and analysisId', () => {
    expect(
      parseCeTask({
        task: { status: 'SUCCESS', analysisId: 'AXyz' },
      }),
    ).toEqual({ status: 'SUCCESS', analysisId: 'AXyz' });
  });

  it('returns empty fields when task is missing', () => {
    expect(parseCeTask({})).toEqual({ status: '', analysisId: '' });
  });
});

describe('parseCeTaskUrlFromReportTask', () => {
  it('extracts ceTaskUrl from report-task.txt contents', () => {
    const contents = [
      'projectKey=MetaMask_metamask-mobile',
      'serverUrl=https://sonarcloud.io',
      'ceTaskUrl=https://sonarcloud.io/api/ce/task?id=TASK1',
      'dashboardUrl=https://sonarcloud.io/dashboard',
    ].join('\n');

    expect(parseCeTaskUrlFromReportTask(contents)).toBe(
      'https://sonarcloud.io/api/ce/task?id=TASK1',
    );
  });

  it('tolerates CRLF line endings', () => {
    expect(
      parseCeTaskUrlFromReportTask('ceTaskUrl=https://example/task\r\n'),
    ).toBe('https://example/task');
  });

  it('returns empty string when ceTaskUrl is absent', () => {
    expect(parseCeTaskUrlFromReportTask('serverUrl=https://sonarcloud.io')).toBe(
      '',
    );
  });
});

describe('decidePrLevelQualityGatePoll', () => {
  it('passes immediately on OK', () => {
    expect(
      decidePrLevelQualityGatePoll({
        status: 'OK',
        errorStreak: 3,
        attempt: 1,
        maxAttempts: 20,
      }).action,
    ).toBe('pass');
  });

  it('retries early ERROR as potentially stale', () => {
    const result = decidePrLevelQualityGatePoll({
      status: 'ERROR',
      errorStreak: 0,
      attempt: 1,
      maxAttempts: 20,
      errorStreakToFail: 8,
    });

    expect(result.action).toBe('retry');
    expect(result.nextErrorStreak).toBe(1);
  });

  it('fails once ERROR is stable', () => {
    const result = decidePrLevelQualityGatePoll({
      status: 'ERROR',
      errorStreak: 7,
      attempt: 8,
      maxAttempts: 20,
      errorStreakToFail: 8,
    });

    expect(result.action).toBe('fail');
    expect(result.nextErrorStreak).toBe(8);
  });

  it('retries unsettled statuses', () => {
    expect(
      decidePrLevelQualityGatePoll({
        status: 'NONE',
        errorStreak: 2,
        attempt: 3,
        maxAttempts: 20,
      }),
    ).toEqual(
      expect.objectContaining({ action: 'retry', nextErrorStreak: 0 }),
    );
  });
});

describe('loadReportTask', () => {
  it('returns the first existing report with a ceTaskUrl', () => {
    const existsSyncImpl = jest.fn((filePath: string) =>
      filePath.endsWith('report-task.txt'),
    );
    const readFileSyncImpl = jest.fn(
      () => 'ceTaskUrl=https://sonarcloud.io/api/ce/task?id=ABC\n',
    );

    expect(
      loadReportTask({
        candidates: ['.scannerwork/report-task.txt'],
        existsSyncImpl,
        readFileSyncImpl,
      }),
    ).toEqual({
      path: '.scannerwork/report-task.txt',
      ceTaskUrl: 'https://sonarcloud.io/api/ce/task?id=ABC',
    });
  });

  it('returns null when no report file exists', () => {
    expect(
      loadReportTask({
        candidates: ['.scannerwork/report-task.txt'],
        existsSyncImpl: () => false,
        readFileSyncImpl: jest.fn(),
      }),
    ).toBeNull();
  });
});

describe('shouldSkipQualityGate', () => {
  it('skips when the labels array includes skip-sonar-cloud', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      status: 200,
      text: async () => JSON.stringify([{ name: 'skip-sonar-cloud' }]),
    });
    const log = jest.fn();

    const skip = await shouldSkipQualityGate({
      repo: 'MetaMask/metamask-mobile',
      issueNumber: '1',
      githubToken: 'token',
      fetchImpl,
      sleepImpl: jest.fn(),
      log,
      labelMaxAttempts: 2,
      labelRetryBaseMs: 1,
    });

    expect(skip).toBe(true);
    expect(log).toHaveBeenCalledWith(
      'skip-sonar-cloud label found. Skipping SonarCloud Quality Gate check.',
    );
  });

  it('retries a GitHub error object then proceeds without skipping', async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValueOnce({
        status: 403,
        text: async () =>
          JSON.stringify({
            message: 'API rate limit exceeded',
          }),
      })
      .mockResolvedValueOnce({
        status: 403,
        text: async () =>
          JSON.stringify({
            message: 'Cannot index string with string "name"',
          }),
      });
    const sleepImpl = jest.fn().mockResolvedValue(undefined);
    const log = jest.fn();

    const skip = await shouldSkipQualityGate({
      repo: 'MetaMask/metamask-mobile',
      issueNumber: '1',
      githubToken: 'token',
      fetchImpl,
      sleepImpl,
      log,
      labelMaxAttempts: 2,
      labelRetryBaseMs: 1,
    });

    expect(skip).toBe(false);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(sleepImpl).toHaveBeenCalledTimes(1);
    expect(
      log.mock.calls.some((call) => String(call[0]).includes('Proceeding')),
    ).toBe(true);
  });

  it('retries a thrown network error then proceeds without failing the job', async () => {
    const fetchImpl = jest
      .fn()
      .mockRejectedValueOnce(new Error('network down'))
      .mockRejectedValueOnce(new Error('network still down'));
    const sleepImpl = jest.fn().mockResolvedValue(undefined);
    const log = jest.fn();

    const skip = await shouldSkipQualityGate({
      repo: 'MetaMask/metamask-mobile',
      issueNumber: '1',
      githubToken: 'token',
      fetchImpl,
      sleepImpl,
      log,
      labelMaxAttempts: 2,
      labelRetryBaseMs: 1,
    });

    expect(skip).toBe(false);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(
      log.mock.calls.some((call) => String(call[0]).includes('network down')),
    ).toBe(true);
    expect(
      log.mock.calls.some((call) => String(call[0]).includes('Proceeding')),
    ).toBe(true);
  });
});

describe('checkQualityGate', () => {
  const sleepImpl = jest.fn().mockResolvedValue(undefined);
  const log = jest.fn();

  const jsonResponse = (status: number, body: unknown) => ({
    status,
    text: async () => JSON.stringify(body),
  });

  beforeEach(() => {
    sleepImpl.mockClear();
    log.mockClear();
  });

  it('exits 0 for non-pull_request events', async () => {
    const exitCode = await checkQualityGate({
      eventName: 'push',
      repo: 'MetaMask/metamask-mobile',
      issueNumber: '',
      prNumber: '',
      githubToken: 'g',
      sonarToken: 's',
      fetchImpl: jest.fn(),
      sleepImpl,
      log,
    });

    expect(exitCode).toBe(0);
  });

  it('passes via CE task analysisId when report-task.txt is present', async () => {
    const fetchImpl = jest.fn().mockImplementation(async (url: string) => {
      if (String(url).includes('api.github.com')) {
        return jsonResponse(200, [{ name: 'size-M' }]);
      }
      if (String(url).includes('/api/ce/task')) {
        return jsonResponse(200, {
          task: { status: 'SUCCESS', analysisId: 'ANALYSIS1' },
        });
      }
      if (String(url).includes('analysisId=ANALYSIS1')) {
        return jsonResponse(200, { projectStatus: { status: 'OK' } });
      }
      throw new Error(`Unexpected URL: ${url}`);
    });

    const exitCode = await checkQualityGate({
      eventName: 'pull_request',
      repo: 'MetaMask/metamask-mobile',
      issueNumber: '34875',
      prNumber: '34875',
      githubToken: 'g',
      sonarToken: 's',
      fetchImpl,
      sleepImpl,
      log,
      maxAttempts: 5,
      sleepMs: 1,
      labelMaxAttempts: 1,
      labelRetryBaseMs: 1,
      existsSyncImpl: (filePath: string) =>
        filePath === '.scannerwork/report-task.txt',
      readFileSyncImpl: () =>
        'ceTaskUrl=https://sonarcloud.io/api/ce/task?id=TASK1\n',
    });

    expect(exitCode).toBe(0);
    expect(
      log.mock.calls.some((call) =>
        String(call[0]).includes('Waiting for SonarCloud CE task'),
      ),
    ).toBe(true);
  });

  it('fails via CE task when quality gate is ERROR for this analysis', async () => {
    const fetchImpl = jest.fn().mockImplementation(async (url: string) => {
      if (String(url).includes('api.github.com')) {
        return jsonResponse(200, [{ name: 'size-M' }]);
      }
      if (String(url).includes('/api/ce/task')) {
        return jsonResponse(200, {
          task: { status: 'SUCCESS', analysisId: 'ANALYSIS1' },
        });
      }
      return jsonResponse(200, { projectStatus: { status: 'ERROR' } });
    });

    const exitCode = await checkQualityGate({
      eventName: 'pull_request',
      repo: 'MetaMask/metamask-mobile',
      issueNumber: '1',
      prNumber: '1',
      githubToken: 'g',
      sonarToken: 's',
      fetchImpl,
      sleepImpl,
      log,
      maxAttempts: 3,
      sleepMs: 1,
      labelMaxAttempts: 1,
      labelRetryBaseMs: 1,
      existsSyncImpl: () => true,
      readFileSyncImpl: () =>
        'ceTaskUrl=https://sonarcloud.io/api/ce/task?id=TASK1\n',
    });

    expect(exitCode).toBe(1);
  });

  it('falls back to PR-level polling and waits out a stale ERROR', async () => {
    let qualityGateCalls = 0;
    const fetchImpl = jest.fn().mockImplementation(async (url: string) => {
      if (String(url).includes('api.github.com')) {
        return jsonResponse(200, [{ name: 'size-M' }]);
      }
      qualityGateCalls += 1;
      const status = qualityGateCalls < 3 ? 'ERROR' : 'OK';
      return jsonResponse(200, { projectStatus: { status } });
    });

    const exitCode = await checkQualityGate({
      eventName: 'pull_request',
      repo: 'MetaMask/metamask-mobile',
      issueNumber: '34606',
      prNumber: '34606',
      githubToken: 'g',
      sonarToken: 's',
      fetchImpl,
      sleepImpl,
      log,
      maxAttempts: 5,
      sleepMs: 1,
      labelMaxAttempts: 1,
      labelRetryBaseMs: 1,
      existsSyncImpl: () => false,
      readFileSyncImpl: jest.fn(),
    });

    expect(exitCode).toBe(0);
    expect(sleepImpl).toHaveBeenCalled();
    expect(
      log.mock.calls.some((call) =>
        String(call[0]).includes('falling back to PR-level'),
      ),
    ).toBe(true);
  });
});
