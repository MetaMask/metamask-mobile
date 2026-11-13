# E2E AI Analyzer

AI-powered analysis system for E2E tests. Uses an agentic approach to make intelligent decisions about automated testing.

> **This tool does not run Smart E2E Selection.** Smart E2E (choosing E2E smoke tags for a PR in CI) runs through the shared [`MetaMask/ai-analyzer`](https://github.com/MetaMask/ai-analyzer) with the `smart-e2e` mode in [`.ai-pr-analyzer/modes/smart-e2e/`](../../../.ai-pr-analyzer/modes/smart-e2e/README.md). To change Smart E2E's model, prompts or hard rules, edit that folder. Changes to `config.ts` or the providers here do not affect it.
>
> This tool now only backs RC test-plan generation (`generate-test-plan` mode, `.github/workflows/generate-rc-test-plan.yml`).

## Usage

It is designed to be used in different **modes**, being each mode responsible for a different aspect of the analysis.

### Running locally

You need at least one API key set (see Configuration): `E2E_CLAUDE_API_KEY`, `E2E_OPENAI_API_KEY`, or `E2E_GEMINI_API_KEY`.

#### Creating Release Test Plan

A `test:e2e:ai-test-plan` script is available in `package.json` for the `generate-test-plan` mode. Pass dynamic flags (like `--pr`) after `--`:

```bash
# Generate a test plan for a specific PR
E2E_CLAUDE_API_KEY=<your-key> yarn test:e2e:ai-test-plan --pr <PR_NUMBER>

# If E2E_CLAUDE_API_KEY is already exported in your shell, just:
yarn test:e2e:ai-test-plan --pr <PR_NUMBER>
```

#### Direct invocation

```bash
# Generate a test plan for a PR (fetches changed files via gh CLI; requires gh auth and network)
node -r esbuild-register tests/tools/e2e-ai-analyzer --mode generate-test-plan --pr <PR_NUMBER>

# Run with a specific provider
node -r esbuild-register tests/tools/e2e-ai-analyzer --mode generate-test-plan --pr <PR_NUMBER> --provider <provider-name>
```

Run `node -r esbuild-register tests/tools/e2e-ai-analyzer --help` for all options.

### Modes

- `generate-test-plan`: Analyzes the changes in a release branch (compared to `main`) and generates an exploratory test plan with high-risk areas, test scenarios and platform-specific notes. Source code in `modes/generate-test-plan/`.

### Providers

The analyzer supports multiple AI providers with automatic fallback. Available providers, models, and their environment variables are configured in `LLM_CONFIG` within `config.ts`. The first available provider with a valid API key will be used based on the configured priority order.

## Configuration

The system configuration is placed in the `config.ts` file. It is divided into the following sections:

- `LLM_CONFIG`: Configuration for AI providers (Anthropic, OpenAI, Google).
- `APP_CONFIG`: Configuration for the System Under Test (App).
- `TOOL_LIMITS`: Configuration for the AI Tools.

## Architecture

### Key Principles

- **Mode-based**: Each mode is self-contained with its own logic
- **Configurable**: Critical patterns, tool limits, AI settings in `config.ts`
- **Tool-driven**: AI calls tools to gather information and make decisions before deciding

### High-level overview

```text
e2e-ai-analyzer/
├── index.ts                    # CLI entry point
├── config.ts                   # Shared configuration
├── analysis/                   # Core AI agentic loop
├── modes/                      # Analysis modes
│   ├── shared/                 # Shared prompt components
│   └── generate-test-plan/     # Mode: generate-test-plan
│       ├── handlers.ts         # Parse, process, output
│       ├── fast-analyzer.ts    # Single-pass analysis
│       └── prompt.ts           # System & task prompts
├── ai-tools/                   # Tools AI can call during the analysis
│   ├── tool-registry.ts        # Tools definitions, i.e. what tools are available to do
│   ├── tool-executor.ts        # Tools execution, i.e. how to execute a tool
│   └── handlers/               # Tools implementations
```

### Adding a New Mode

**1. Create mode folder:**

```text
modes/my-mode/
├── handlers.ts    # Required functions
└── prompt.ts      # System & task prompts
```

**2. Implement handlers (`handlers.ts`):**

```typescript
export async function processAnalysis(
  aiResponse: string,
): Promise<MyModeAnalysis | null> {
  // Parse AI response into your mode's format
}

export function createConservativeResult(): MyModeAnalysis {
  // Fallback when AI fails
}

export function createEmptyResult(): MyModeAnalysis {
  // Default when no work needed
}

export function outputAnalysis(analysis: MyModeAnalysis): void {
  // Display results (console + optional file)
}
```

**3. Create prompts (`prompt.ts`):**

```typescript
export function buildSystemPrompt(): string {
  // AI's role and instructions
}

export function buildTaskPrompt(
  allFiles: string[],
  criticalFiles: string[],
): string {
  // Specific task for this analysis
}
```

**4. Create finalize tool (`ai-tools/handlers/finalize-my-mode.ts`):**

```typescript
export function handleFinalizeMyMode(input: ToolInput): string {
  // Process the AI analysis and return the result
}
```
