#!/usr/bin/env node

/**
 * AI triage + failure-correlation for app profiling checks.
 *
 * Single LLM call (no agentic loop). Uses the same E2E_* env keys as
 * Smart E2E selection. Never throws to callers — returns null on skip/error.
 *
 * Env (first available wins):
 *   E2E_CLAUDE_API_KEY  → Anthropic claude-sonnet-4-6
 *   E2E_OPENAI_API_KEY  → OpenAI gpt-5.2-chat-latest
 *   E2E_GEMINI_API_KEY  → Google gemini-2.5-flash
 */

const PROVIDERS = [
  {
    id: 'anthropic',
    envKey: 'E2E_CLAUDE_API_KEY',
    model: 'claude-sonnet-4-6',
  },
  {
    id: 'openai',
    envKey: 'E2E_OPENAI_API_KEY',
    model: 'gpt-5.2-chat-latest',
  },
  {
    id: 'google',
    envKey: 'E2E_GEMINI_API_KEY',
    model: 'gemini-2.5-flash',
  },
];

const MAX_OUTPUT_TOKENS = 1200;
const MAX_API_CALLS = 12;

const SYSTEM_PROMPT = `You are a MetaMask Mobile performance QA assistant.
You analyze BrowserStack app profiling diffs for a single failed (or borderline) performance scenario.

Goals:
1) Triage: decide the most likely explanation for metric changes vs baseline.
   Prefer one of: device_noise | ui_regression | test_or_setup | network | unclear
2) Correlate: relate the scenario failure reason / quality-gate violations to the profiling metrics.

Rules:
- Be concise and concrete. No marketing language.
- Do not invent metrics that are not in the input.
- If there is no baseline, triage from current metrics + failure context only.
- Treat Current <= Baseline + 10% as acceptable noise (do not call that a regression).
- Highlight only metrics marked as warned (over +10%).
- If apiCalls are missing/errored, say so; do not invent network evidence.
- Output MUST be a single JSON object matching the schema. No markdown fences.`;

function resolveProvider(env = process.env) {
  for (const provider of PROVIDERS) {
    const apiKey = env[provider.envKey];
    if (apiKey && String(apiKey).trim()) {
      return { ...provider, apiKey: String(apiKey).trim() };
    }
  }
  return null;
}

function truncateApiCalls(apiCalls, limit = MAX_API_CALLS) {
  if (!Array.isArray(apiCalls) || apiCalls.length === 0) {
    return [];
  }

  return apiCalls.slice(0, limit).map((call) => {
    if (!call || typeof call !== 'object') {
      return call;
    }
    return {
      method: call.method ?? call.requestMethod ?? null,
      url: call.url ?? call.requestUrl ?? null,
      status: call.status ?? call.statusCode ?? null,
      durationMs: call.durationMs ?? call.duration ?? call.time ?? null,
    };
  });
}

function buildPromptPayload({
  testName,
  platform,
  deviceLabel,
  failureContext,
  metricRows,
  baselineSummary,
  currentSummary,
  apiCalls,
  apiCallsError,
  hasBaseline,
}) {
  const warnedMetrics = (metricRows ?? [])
    .filter((row) => row.warn)
    .map((row) => ({
      metric: row.label,
      baseline: row.baselineText,
      current: row.currentText?.replace(/\*\*/g, ''),
      delta: row.deltaText?.replace(/\*\*/g, ''),
    }));

  return {
    scenario: {
      testName,
      platform: platform ?? null,
      device: deviceLabel ?? null,
    },
    failure: failureContext
      ? {
          reason: failureContext.failureReason ?? null,
          qualityGatesPassed: failureContext.qualityGates?.passed ?? null,
          qualityGatesViolations: failureContext.qualityGatesViolations ?? null,
          recordingLink: failureContext.recordingLink ?? null,
        }
      : null,
    comparison: {
      hasBaseline: Boolean(hasBaseline),
      warnedMetrics,
      baselineSummary: baselineSummary ?? null,
      currentSummary: currentSummary ?? null,
    },
    network: {
      apiCallsError: apiCallsError ?? null,
      apiCallsSample: truncateApiCalls(apiCalls),
    },
    responseSchema: {
      likelyCause:
        'device_noise | ui_regression | test_or_setup | network | unclear',
      confidence: 'high | medium | low',
      triageSummary: '2-4 sentences explaining the metric triage',
      failureCorrelation:
        '2-4 sentences linking failureReason/QG violations to profiling signals',
      nextStep: 'one concrete next action for the owning team',
    },
  };
}

function buildUserPrompt(payload) {
  return [
    'Analyze this app profiling case and return JSON only.',
    '',
    JSON.stringify(payload, null, 2),
  ].join('\n');
}

function extractJsonObject(text) {
  if (!text || typeof text !== 'string') {
    return null;
  }
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    // fall through
  }

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    try {
      return JSON.parse(fenced[1].trim());
    } catch {
      // fall through
    }
  }

  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(trimmed.slice(start, end + 1));
    } catch {
      return null;
    }
  }
  return null;
}

function normalizeReasoning(raw) {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const likelyCause = String(raw.likelyCause || 'unclear').trim();
  const confidence = String(raw.confidence || 'low').trim();
  const triageSummary = String(raw.triageSummary || '').trim();
  const failureCorrelation = String(raw.failureCorrelation || '').trim();
  const nextStep = String(raw.nextStep || '').trim();

  if (!triageSummary && !failureCorrelation) {
    return null;
  }

  return {
    likelyCause,
    confidence,
    triageSummary,
    failureCorrelation,
    nextStep,
  };
}

function formatReasoningMarkdown(reasoning, { providerId, model } = {}) {
  if (!reasoning) {
    return '';
  }

  let md = `<details>\n<summary>🤖 AI triage & failure correlation`;
  if (reasoning.confidence) {
    md += ` (confidence: ${reasoning.confidence})`;
  }
  md += `</summary>\n\n`;
  md += `**Likely cause:** \`${reasoning.likelyCause}\`\n\n`;
  if (reasoning.triageSummary) {
    md += `### Triage\n\n${reasoning.triageSummary}\n\n`;
  }
  if (reasoning.failureCorrelation) {
    md += `### Correlation with scenario failure\n\n${reasoning.failureCorrelation}\n\n`;
  }
  if (reasoning.nextStep) {
    md += `### Next step\n\n${reasoning.nextStep}\n\n`;
  }
  if (providerId || model) {
    md += `> Model: \`${providerId ?? 'unknown'}${model ? ` / ${model}` : ''}\`\n\n`;
  }
  md += `</details>\n`;
  return md;
}

async function callAnthropic({ apiKey, model, system, user }) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: MAX_OUTPUT_TOKENS,
      temperature: 0,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Anthropic HTTP ${response.status}: ${body.slice(0, 300)}`);
  }

  const data = await response.json();
  const text = (data.content ?? [])
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('\n');
  return text;
}

async function callOpenAI({ apiKey, model, system, user }) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      max_completion_tokens: MAX_OUTPUT_TOKENS,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI HTTP ${response.status}: ${body.slice(0, 300)}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? '';
}

async function callGoogle({ apiKey, model, system, user }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: user }] }],
      generationConfig: {
        temperature: 0,
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Google HTTP ${response.status}: ${body.slice(0, 300)}`);
  }

  const data = await response.json();
  return (data.candidates?.[0]?.content?.parts ?? [])
    .map((part) => part.text ?? '')
    .join('\n');
}

async function callProvider(provider, { system, user }) {
  switch (provider.id) {
    case 'anthropic':
      return callAnthropic({
        apiKey: provider.apiKey,
        model: provider.model,
        system,
        user,
      });
    case 'openai':
      return callOpenAI({
        apiKey: provider.apiKey,
        model: provider.model,
        system,
        user,
      });
    case 'google':
      return callGoogle({
        apiKey: provider.apiKey,
        model: provider.model,
        system,
        user,
      });
    default:
      throw new Error(`Unknown provider ${provider.id}`);
  }
}

/**
 * Generate AI triage markdown for one scenario.
 * Returns empty string when skipped or on failure.
 */
async function generateAppProfilingAiReasoning(input, options = {}) {
  const { skipAi = false, env = process.env, fetchImpl } = options;
  if (skipAi) {
    return '';
  }

  const provider = resolveProvider(env);
  if (!provider) {
    console.warn(
      '⚠️  Skipping AI triage: no E2E_CLAUDE_API_KEY / E2E_OPENAI_API_KEY / E2E_GEMINI_API_KEY',
    );
    return '';
  }

  const payload = buildPromptPayload(input);
  const user = buildUserPrompt(payload);

  try {
    // Allow tests to inject fetch without hitting the network.
    if (fetchImpl) {
      globalThis.fetch = fetchImpl;
    }

    console.log(`🤖 AI triage via ${provider.id} (${provider.model})...`);
    const rawText = await callProvider(provider, {
      system: SYSTEM_PROMPT,
      user,
    });
    const parsed = normalizeReasoning(extractJsonObject(rawText));
    if (!parsed) {
      console.warn('⚠️  AI triage returned unparseable output; skipping section');
      return '';
    }
    return formatReasoningMarkdown(parsed, {
      providerId: provider.id,
      model: provider.model,
    });
  } catch (error) {
    console.warn(
      `⚠️  AI triage failed (${error instanceof Error ? error.message : String(error)}); continuing without it`,
    );
    return '';
  }
}

export {
  PROVIDERS,
  SYSTEM_PROMPT,
  resolveProvider,
  truncateApiCalls,
  buildPromptPayload,
  buildUserPrompt,
  extractJsonObject,
  normalizeReasoning,
  formatReasoningMarkdown,
  generateAppProfilingAiReasoning,
};
