// mock-prefixed variables are allowed in jest.mock factories by babel-jest's
// hoisting transform. All other variables would be undefined at factory evaluation time.
const mockContextPayload: Record<string, unknown> = {};
const mockGetOctokit = jest.fn();
const mockRetrievePullRequest = jest.fn();
const mockRemoveLabelFromLabelableIfPresent = jest.fn();
const mockAddLabelToLabelable = jest.fn();
const mockUpsertStickyComment = jest.fn();
const mockRunAllChecks = jest.fn();
const mockSetFailed = jest.fn();
const mockCoreWarning = jest.fn();

const mockOctokit = {
  graphql: jest.fn(),
};

jest.mock('@actions/core', () => ({
  setFailed: mockSetFailed,
  warning: mockCoreWarning,
}), { virtual: true });

jest.mock('@actions/github', () => ({
  context: {
    repo: { owner: 'MetaMask', repo: 'metamask-mobile' },
    payload: mockContextPayload,
  },
  getOctokit: mockGetOctokit,
}), { virtual: true });

// Type-only import in orchestrator; virtual mock prevents a missing-module error
// when babel emits the require() for the TypeScript type reference.
jest.mock('@actions/github/lib/utils', () => ({}), { virtual: true });

jest.mock('./shared/pull-request', () => ({
  retrievePullRequest: mockRetrievePullRequest,
}));

jest.mock('./shared/issue', () => ({
  retrieveIssue: jest.fn(),
}));

jest.mock('./shared/labelable', () => ({
  LabelableType: { Issue: 0, PullRequest: 1 },
  addLabelToLabelable: mockAddLabelToLabelable,
  removeLabelFromLabelable: jest.fn(),
  removeLabelFromLabelableIfPresent: mockRemoveLabelFromLabelableIfPresent,
}));

jest.mock('./shared/label', () => ({
  invalidPullRequestTemplateLabel: { name: 'INVALID-PR-TEMPLATE', color: 'EDEDED', description: '' },
  invalidIssueTemplateLabel: { name: 'INVALID-ISSUE-TEMPLATE', color: 'EDEDED', description: '' },
  externalContributorLabel: { name: 'external-contributor', color: 'EDEDED', description: '' },
  needsTriageLabel: { name: 'needs-triage', color: 'EDEDED', description: '' },
  areaSentryLabel: { name: 'area-Sentry', color: 'EDEDED', description: '' },
  craftRegressionLabel: jest.fn(),
  RegressionStage: {},
}));

// PR template with no required section titles — any body matches TemplateType.PullRequest (3).
// This lets the main-branch test reach runAllChecks without body-parsing complexity.
jest.mock('./shared/template', () => ({
  TemplateType: { None: 0, GeneralIssue: 1, BugReportIssue: 2, PullRequest: 3 },
  templates: new Map([[3, { titles: [] }]]),
}));

jest.mock('./shared/pr-template-checks', () => ({
  runAllChecks: mockRunAllChecks,
}));

jest.mock('./shared/pr-template-comment', () => ({
  renderFailureComment: jest.fn().mockReturnValue('failure comment'),
  upsertStickyComment: mockUpsertStickyComment,
}));

const buildMockPr = (overrides: Record<string, unknown> = {}) => ({
  id: 'PR_id',
  type: 1, // LabelableType.PullRequest
  number: 42,
  repoOwner: 'MetaMask',
  repoName: 'metamask-mobile',
  createdAt: '2024-01-01',
  body: 'some PR body',
  author: 'test-user',
  labels: [],
  ...overrides,
});

/**
 * Requiring the orchestrator triggers main() at module load time. After the
 * require, we flush the microtask/macrotask queue so all awaited calls inside
 * main() settle before we assert.
 */
const loadModule = async () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('./check-template-and-add-labels');
  await new Promise<void>(resolve => setImmediate(resolve));
};

describe('check-template-and-add-labels — base-branch guard', () => {
  let processExitSpy: jest.SpyInstance;

  beforeEach(() => {
    // Prevent process.exit() from actually terminating the test runner.
    processExitSpy = jest
      .spyOn(process, 'exit')
      .mockImplementation((() => undefined) as (code?: string | number | null | undefined) => never);

    process.env.LABEL_TOKEN = 'test-token';
    mockGetOctokit.mockReturnValue(mockOctokit);

    // User is a MetaMask org member — prevents external-contributor label noise.
    mockOctokit.graphql.mockResolvedValue({
      user: { organization: { id: 'org_id' } },
    });

    mockRetrievePullRequest.mockResolvedValue(buildMockPr());
    mockRunAllChecks.mockReturnValue([]);
    mockAddLabelToLabelable.mockResolvedValue(undefined);
    mockRemoveLabelFromLabelableIfPresent.mockResolvedValue(undefined);
    mockUpsertStickyComment.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Reset module registry so each test re-executes main() with fresh mock state.
    jest.resetModules();
    delete process.env.LABEL_TOKEN;
    // Clear pull_request from shared payload object between tests.
    delete mockContextPayload.pull_request;
  });

  describe('PR targeting a non-main branch', () => {
    it('exits 0 without running template checks, and cleans up any stale label and comment', async () => {
      mockContextPayload.pull_request = {
        number: 42,
        base: { ref: 'release/7.0.0' },
        draft: false,
      };

      await loadModule();

      // Stale INVALID-PR-TEMPLATE label is removed so the PR is unblocked.
      expect(mockRemoveLabelFromLabelableIfPresent).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({ name: 'INVALID-PR-TEMPLATE' }),
      );

      // Stale bot comment is deleted (null body triggers deletion in upsertStickyComment).
      expect(mockUpsertStickyComment).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        null,
      );

      // process.exit(0) is the unique signal for the non-main guard path.
      // (The main-branch success path returns normally without calling process.exit.)
      expect(processExitSpy).toHaveBeenCalledWith(0);
    });
  });

  describe('PR targeting main branch', () => {
    it('runs template checks instead of skipping', async () => {
      mockContextPayload.pull_request = {
        number: 42,
        base: { ref: 'main' },
        draft: false,
      };

      await loadModule();

      // runAllChecks being called proves the base-branch guard did not short-circuit.
      expect(mockRunAllChecks).toHaveBeenCalled();
    });

    it('warning-only failures: exits 0, posts sticky comment, removes label, calls core.warning not setFailed', async () => {
      process.env.LABEL_TOKEN = 'test-token';
      mockContextPayload.pull_request = {
        number: 42,
        base: { ref: 'main' },
        draft: false,
      };
      mockRunAllChecks.mockReturnValue([
        { ok: false, reason: 'Description is empty.', blocking: false },
      ]);

      await loadModule();

      // With babel's transform-inline-environment-variables, process.env reads are
      // compiled as their build-time values (undefined for LABEL_TOKEN in CI). The
      // LABEL_TOKEN guard at the top of main() always calls setFailed('LABEL_TOKEN
      // not found'), but code falls through (no early return there) to the actual
      // check logic. We therefore assert that setFailed was NOT called with a blocking
      // issue reason (which is what the warning path must never produce).
      expect(mockSetFailed).not.toHaveBeenCalledWith(
        expect.stringContaining('blocking issues'),
      );
      expect(mockCoreWarning).toHaveBeenCalledWith(
        expect.stringContaining('Description is empty.'),
      );
      // Label removed because all section headings are present (template mock matches everything).
      expect(mockRemoveLabelFromLabelableIfPresent).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({ name: 'INVALID-PR-TEMPLATE' }),
      );
      // Sticky comment is posted with a non-null body (renderFailureComment is mocked).
      expect(mockUpsertStickyComment).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.any(String),
      );
      expect(processExitSpy).toHaveBeenCalledWith(0);
    });

    it('blocking failure: exits 1, posts sticky comment, removes label, calls setFailed not warning', async () => {
      process.env.LABEL_TOKEN = 'test-token';
      mockContextPayload.pull_request = {
        number: 42,
        base: { ref: 'main' },
        draft: false,
      };
      mockRunAllChecks.mockReturnValue([
        { ok: false, reason: 'Changelog section is missing.', blocking: true },
      ]);

      await loadModule();

      expect(mockSetFailed).toHaveBeenCalledWith(
        expect.stringContaining('Changelog section is missing.'),
      );
      expect(mockCoreWarning).not.toHaveBeenCalled();
      // Label removed because all section headings are present.
      expect(mockRemoveLabelFromLabelableIfPresent).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({ name: 'INVALID-PR-TEMPLATE' }),
      );
      // Sticky comment is posted with a non-null body.
      expect(mockUpsertStickyComment).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.any(String),
      );
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('mixed blocking+warning failures: exits 1 driven by the blocking failure', async () => {
      process.env.LABEL_TOKEN = 'test-token';
      mockContextPayload.pull_request = {
        number: 42,
        base: { ref: 'main' },
        draft: false,
      };
      mockRunAllChecks.mockReturnValue([
        { ok: false, reason: 'Changelog missing.', blocking: true },
        { ok: false, reason: 'Description empty.', blocking: false },
      ]);

      await loadModule();

      expect(mockSetFailed).toHaveBeenCalledWith(
        expect.stringContaining('Changelog missing.'),
      );
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('draft PR with blocking failure: exits 1 (same rules as ready-for-review)', async () => {
      process.env.LABEL_TOKEN = 'test-token';
      mockContextPayload.pull_request = {
        number: 42,
        base: { ref: 'main' },
        draft: true,
      };
      mockRunAllChecks.mockReturnValue([
        { ok: false, reason: 'Changelog missing.', blocking: true },
      ]);

      await loadModule();

      expect(mockSetFailed).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('draft PR with warning-only failures: exits 0 (informational, same as ready-for-review)', async () => {
      process.env.LABEL_TOKEN = 'test-token';
      mockContextPayload.pull_request = {
        number: 42,
        base: { ref: 'main' },
        draft: true,
      };
      mockRunAllChecks.mockReturnValue([
        { ok: false, reason: 'Description empty.', blocking: false },
      ]);

      await loadModule();

      // Same comment as warning-only test above: LABEL_TOKEN is inlined as undefined
      // so setFailed('LABEL_TOKEN not found') fires first, but code falls through.
      // Assert the workflow-blocking path is NOT triggered.
      expect(mockSetFailed).not.toHaveBeenCalledWith(
        expect.stringContaining('blocking issues'),
      );
      expect(mockCoreWarning).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(0);
    });
  });
});
