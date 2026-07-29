import assert from 'node:assert/strict';
import test from 'node:test';
import {
  resolveProvider,
  truncateApiCalls,
  buildPromptPayload,
  extractJsonObject,
  normalizeReasoning,
  formatReasoningMarkdown,
  generateAppProfilingAiReasoning,
} from './app-profiling-ai.mjs';

test('resolveProvider prefers Anthropic when E2E_CLAUDE_API_KEY is set', () => {
  const provider = resolveProvider({
    E2E_CLAUDE_API_KEY: 'claude-key',
    E2E_OPENAI_API_KEY: 'openai-key',
  });
  assert.equal(provider?.id, 'anthropic');
  assert.equal(provider?.apiKey, 'claude-key');
});

test('resolveProvider falls back to OpenAI then Google', () => {
  assert.equal(
    resolveProvider({ E2E_OPENAI_API_KEY: 'oai' })?.id,
    'openai',
  );
  assert.equal(
    resolveProvider({ E2E_GEMINI_API_KEY: 'gem' })?.id,
    'google',
  );
  assert.equal(resolveProvider({}), null);
});

test('truncateApiCalls keeps only safe fields and caps length', () => {
  const sample = truncateApiCalls(
    Array.from({ length: 20 }, (_, i) => ({
      method: 'GET',
      url: `https://example.com/${i}`,
      status: 200,
      durationMs: i,
      authorization: 'secret',
      body: 'do-not-send',
    })),
    3,
  );
  assert.equal(sample.length, 3);
  assert.deepEqual(sample[0], {
    method: 'GET',
    url: 'https://example.com/0',
    status: 200,
    durationMs: 0,
  });
  assert.equal('authorization' in sample[0], false);
});

test('buildPromptPayload includes failure + warned metrics', () => {
  const payload = buildPromptPayload({
    testName: 'Cross-chain swap',
    platform: 'Android',
    deviceLabel: 'Pixel 8 (v14.0)',
    failureContext: {
      failureReason: 'quality_gates_exceeded',
      qualityGates: { passed: false },
      qualityGatesViolations: [{ step: 'swap', metric: 'duration', actual: 12 }],
      recordingLink: 'https://example.com/rec',
    },
    metricRows: [
      {
        label: 'Slow frames',
        baselineText: '7%',
        currentText: '**15%**',
        deltaText: '+8 (**+107%**) ⚠️',
        warn: true,
      },
      {
        label: 'CPU avg',
        baselineText: '8%',
        currentText: '8%',
        deltaText: '0 (0%)',
        warn: false,
      },
    ],
    baselineSummary: { cpu: { avg: 8 } },
    currentSummary: { cpu: { avg: 8 }, uiRendering: { slowFrames: 15 } },
    apiCalls: [{ url: 'https://api.example/x', status: 500, durationMs: 900 }],
    apiCallsError: null,
    hasBaseline: true,
  });

  assert.equal(payload.scenario.testName, 'Cross-chain swap');
  assert.equal(payload.failure.reason, 'quality_gates_exceeded');
  assert.equal(payload.comparison.warnedMetrics.length, 1);
  assert.equal(payload.comparison.warnedMetrics[0].metric, 'Slow frames');
  assert.equal(payload.comparison.warnedMetrics[0].current, '15%');
  assert.equal(payload.network.apiCallsSample.length, 1);
});

test('extractJsonObject and normalizeReasoning handle fenced JSON', () => {
  const parsed = extractJsonObject(`\`\`\`json
{"likelyCause":"ui_regression","confidence":"high","triageSummary":"Slow frames doubled.","failureCorrelation":"QG duration exceeded matches UI jank.","nextStep":"Inspect swap confirmation recording."}
\`\`\``);
  const normalized = normalizeReasoning(parsed);
  assert.equal(normalized?.likelyCause, 'ui_regression');
  assert.match(normalized?.failureCorrelation ?? '', /QG duration/);
});

test('formatReasoningMarkdown renders triage sections', () => {
  const md = formatReasoningMarkdown(
    {
      likelyCause: 'ui_regression',
      confidence: 'medium',
      triageSummary: 'Slow frames regressed beyond +10%.',
      failureCorrelation: 'Quality gates failed on swap duration.',
      nextStep: 'Review BrowserStack recording around confirmation.',
    },
    { providerId: 'anthropic', model: 'claude-sonnet-4-6' },
  );

  assert.match(md, /AI triage & failure correlation/);
  assert.match(md, /Likely cause/);
  assert.match(md, /ui_regression/);
  assert.match(md, /Correlation with scenario failure/);
  assert.match(md, /Next step/);
  assert.match(md, /claude-sonnet-4-6/);
});

test('generateAppProfilingAiReasoning skips without keys', async () => {
  const md = await generateAppProfilingAiReasoning(
    {
      testName: 'x',
      metricRows: [],
      hasBaseline: false,
    },
    { env: {} },
  );
  assert.equal(md, '');
});

test('generateAppProfilingAiReasoning formats a successful Anthropic response', async () => {
  const fetchImpl = async () => ({
    ok: true,
    async json() {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              likelyCause: 'ui_regression',
              confidence: 'high',
              triageSummary: 'Slow frames above margin.',
              failureCorrelation: 'QG exceeded aligns with UI jank.',
              nextStep: 'Check recording.',
            }),
          },
        ],
      };
    },
  });

  const md = await generateAppProfilingAiReasoning(
    {
      testName: 'Cross-chain swap',
      platform: 'Android',
      deviceLabel: 'Pixel 8',
      failureContext: { failureReason: 'quality_gates_exceeded' },
      metricRows: [{ label: 'Slow frames', warn: true, baselineText: '7%', currentText: '15%', deltaText: '+8' }],
      baselineSummary: { uiRendering: { slowFrames: 7 } },
      currentSummary: { uiRendering: { slowFrames: 15 } },
      hasBaseline: true,
    },
    {
      env: { E2E_CLAUDE_API_KEY: 'test-key' },
      fetchImpl,
    },
  );

  assert.match(md, /Slow frames above margin/);
  assert.match(md, /QG exceeded aligns with UI jank/);
});
