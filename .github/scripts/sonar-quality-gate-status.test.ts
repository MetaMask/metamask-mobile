const {
  parseGithubLabelsPayload,
  hasSkipSonarCloudLabel,
  latestAnalysisRevision,
  qualityGateStatus,
  decideQualityGatePoll,
  shouldSkipQualityGate,
  checkQualityGate,
  uniqueRevisions,
} = require('./sonar-quality-gate-status.cjs');

describe('parseGithubLabelsPayload', () => {
  it('returns label names from an array of label objects', () => {
    const payload = [{ name: 'size-M' }, { name: 'skip-sonar-cloud' }];

    const result = parseGithubLabelsPayload(payload);

    expect(result).toEqual({
      ok: true,
      names: ['size-M', 'skip-sonar-cloud'],
    });
  });

  it('returns ok false for a GitHub error object', () => {
    const payload = {
      message: 'API rate limit exceeded',
      documentation_url: 'https://docs.github.com/rest',
    };

    const result = parseGithubLabelsPayload(payload);

    expect(result).toEqual({ ok: false, names: [] });
  });

  it('returns ok false for a JSON string payload', () => {
    const result = parseGithubLabelsPayload('Resource not accessible by integration');

    expect(result).toEqual({ ok: false, names: [] });
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

describe('latestAnalysisRevision', () => {
  it('returns the first analysis revision', () => {
    const payload = {
      analyses: [{ revision: 'abc123' }, { revision: 'def456' }],
    };

    expect(latestAnalysisRevision(payload)).toBe('abc123');
  });

  it('returns empty string when analyses are missing', () => {
    expect(latestAnalysisRevision({})).toBe('');
    expect(latestAnalysisRevision(null)).toBe('');
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

describe('decideQualityGatePoll', () => {
  const expectedRevisions = ['headsha', 'mergesha'];

  it('retries ERROR from a different commit instead of failing immediately', () => {
    const result = decideQualityGatePoll({
      status: 'ERROR',
      analysisRevision: 'oldsha',
      expectedRevisions,
      attempt: 1,
      maxAttempts: 20,
    });

    expect(result.action).toBe('retry');
  });

  it('fails when ERROR belongs to this commit', () => {
    const result = decideQualityGatePoll({
      status: 'ERROR',
      analysisRevision: 'headsha',
      expectedRevisions,
      attempt: 1,
      maxAttempts: 20,
    });

    expect(result).toEqual({
      action: 'fail',
      reason: 'quality gate failed for this commit',
    });
  });

  it('passes when OK belongs to this commit', () => {
    const result = decideQualityGatePoll({
      status: 'OK',
      analysisRevision: 'mergesha',
      expectedRevisions,
      attempt: 1,
      maxAttempts: 20,
    });

    expect(result.action).toBe('pass');
  });

  it('retries stale OK from a previous commit', () => {
    const result = decideQualityGatePoll({
      status: 'OK',
      analysisRevision: 'oldsha',
      expectedRevisions,
      attempt: 2,
      maxAttempts: 20,
    });

    expect(result.action).toBe('retry');
  });

  it('retries NONE while waiting for ingestion', () => {
    const result = decideQualityGatePoll({
      status: 'NONE',
      analysisRevision: '',
      expectedRevisions,
      attempt: 3,
      maxAttempts: 20,
    });

    expect(result.action).toBe('retry');
  });

  it('fails after timeout when this commit was never ingested', () => {
    const result = decideQualityGatePoll({
      status: 'ERROR',
      analysisRevision: 'oldsha',
      expectedRevisions,
      attempt: 20,
      maxAttempts: 20,
    });

    expect(result.action).toBe('fail');
    expect(result.reason).toContain('ingested analysis for this commit');
  });
});

describe('uniqueRevisions', () => {
  it('drops blanks and duplicates', () => {
    expect(uniqueRevisions(['abc', '', 'abc', 'def'])).toEqual(['abc', 'def']);
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
      labelRetryMs: 1,
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
            documentation_url: 'https://docs.github.com/rest',
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
      labelRetryMs: 1,
    });

    expect(skip).toBe(false);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(sleepImpl).toHaveBeenCalledTimes(1);
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

  it('exits 0 for non-pull_request events', async () => {
    const exitCode = await checkQualityGate({
      eventName: 'push',
      repo: 'MetaMask/metamask-mobile',
      issueNumber: '',
      prNumber: '',
      githubToken: 'g',
      sonarToken: 's',
      expectedRevisions: ['sha'],
      fetchImpl: jest.fn(),
      sleepImpl,
      log,
    });

    expect(exitCode).toBe(0);
  });

  it('polls past a stale ERROR then passes when this commit is OK', async () => {
    let qualityGateCalls = 0;
    let analysisCalls = 0;
    const fetchImpl = jest.fn().mockImplementation(async (url: string) => {
      if (String(url).includes('api.github.com')) {
        return jsonResponse(200, [{ name: 'size-M' }]);
      }
      if (String(url).includes('project_analyses')) {
        analysisCalls += 1;
        const revision = analysisCalls === 1 ? 'oldsha' : 'headsha';
        return jsonResponse(200, { analyses: [{ revision }] });
      }
      qualityGateCalls += 1;
      const status = qualityGateCalls === 1 ? 'ERROR' : 'OK';
      return jsonResponse(200, { projectStatus: { status } });
    });

    const exitCode = await checkQualityGate({
      eventName: 'pull_request',
      repo: 'MetaMask/metamask-mobile',
      issueNumber: '34875',
      prNumber: '34875',
      githubToken: 'g',
      sonarToken: 's',
      expectedRevisions: ['headsha'],
      fetchImpl,
      sleepImpl,
      log,
      maxAttempts: 5,
      sleepMs: 1,
      labelMaxAttempts: 1,
      labelRetryMs: 1,
    });

    expect(exitCode).toBe(0);
    expect(sleepImpl).toHaveBeenCalled();
  });

  it('fails the job when labels jq would have crashed but Sonar reports ERROR for this SHA', async () => {
    const fetchImpl = jest.fn().mockImplementation(async (url: string) => {
      if (String(url).includes('api.github.com')) {
        return jsonResponse(403, { message: 'API rate limit exceeded' });
      }
      if (String(url).includes('project_analyses')) {
        return jsonResponse(200, { analyses: [{ revision: 'headsha' }] });
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
      expectedRevisions: ['headsha'],
      fetchImpl,
      sleepImpl,
      log,
      maxAttempts: 3,
      sleepMs: 1,
      labelMaxAttempts: 1,
      labelRetryMs: 1,
    });

    expect(exitCode).toBe(1);
  });
});
