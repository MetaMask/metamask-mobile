# E2E AI Analyzer

AI-powered analysis system for E2E tests. Uses an agentic approach to make intelligent decisions about automated testing.

## Usage

It is designed to be used in different **modes**, being each mode responsible for a different aspect of the analysis.

```bash
# Run with default provider (uses priority order from config)
node -r esbuild-register tests/tools/e2e-ai-analyzer --pr 12345

# Run with a specific provider
node -r esbuild-register tests/tools/e2e-ai-analyzer --pr 12345 --provider <provider-name>
```

### Modes

- `select-tags`: Analyzes PR code changes and selects which E2E smoke test tags to run in CI. Output Example:

```json
{
  "selectedTags": ["SmokeAccounts", "SmokeCore"],
  "riskLevel": "medium",
  "confidence": 80,
  "reasoning": "The PR touches the accounts screen, so we need to run the accounts smoke test."
}
```

Source code in `modes/select-tags/`.

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
│   └── select-tags/            # Mode: select-tags
│       ├── handlers.ts         # Parse, process, output
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
