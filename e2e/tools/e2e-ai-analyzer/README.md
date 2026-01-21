# E2E AI Analyzer

AI-powered analysis system for E2E tests. Uses an agentic approach to make intelligent decisions about automated testing.

## Usage

It is designed to be used with different **skills**, each skill responsible for a different aspect of the analysis.

```bash
# Run with default skill and provider (uses priority order from config)
node -r esbuild-register e2e/tools/e2e-ai-analyzer --pr 12345

# Run with a specific skill
node -r esbuild-register e2e/tools/e2e-ai-analyzer --skill select-tags --pr 12345

# Run with a specific provider
node -r esbuild-register e2e/tools/e2e-ai-analyzer --pr 12345 --provider <provider-name>
```

### Available Skills

- `select-tags`: Analyzes PR code changes and selects which E2E smoke test tags to run in CI. Output Example:

```json
{
  "selectedTags": ["SmokeAccounts", "SmokeCore"],
  "riskLevel": "medium",
  "confidence": 80,
  "reasoning": "The PR touches the accounts screen, so we need to run the accounts smoke test."
}
```

Source code in `skills/select-tags/`.

### Providers

The analyzer supports multiple AI providers with automatic fallback. Available providers, models, and their environment variables are configured in `LLM_CONFIG` within `config.ts`. The first available provider with a valid API key will be used based on the configured priority order.

## Configuration

The system configuration is placed in the `config.ts` file. It is divided into the following sections:

- `LLM_CONFIG`: Configuration for AI providers (Anthropic, OpenAI, Google).
- `APP_CONFIG`: Configuration for the System Under Test (App).
- `TOOL_LIMITS`: Configuration for the AI Tools.

## Architecture

### Key Principles

- **Skills-based**: Each skill is self-contained with its own logic
- **Configurable**: Critical patterns, tool limits, AI settings in `config.ts`
- **Tool-driven**: AI calls tools to gather information and make decisions before deciding

### High-level overview

```text
e2e-ai-analyzer/
├── index.ts                    # CLI entry point
├── config.ts                   # Shared configuration
├── analysis/                   # Core AI agentic loop
├── skills/                     # Analysis skills
│   ├── base/                   # Base classes & infrastructure
│   │   ├── Skill.ts            # Abstract base class
│   │   ├── SkillRegistry.ts    # Skill registration
│   │   └── SkillExecutor.ts    # Skill execution engine
│   ├── shared/                 # Shared prompt components
│   └── select-tags/            # Skill: select-tags
│       ├── SelectTagsSkill.ts  # Skill implementation
│       ├── handlers.ts         # Parse, process, output
│       ├── prompt.ts           # System & task prompts
│       └── skill.md            # Documentation
├── ai-tools/                   # Tools AI can call during the analysis
│   ├── tool-registry.ts        # Tools definitions, i.e. what tools are available to do
│   ├── tool-executor.ts        # Tools execution, i.e. how to execute a tool
│   └── handlers/               # Tools implementations
```

### Adding a New Skill

**1. Create skill folder:**

```text
skills/my-skill/
├── MySkill.ts     # Skill class implementation
├── handlers.ts    # Helper functions (optional)
├── prompt.ts      # System & task prompts
└── skill.md       # Documentation (optional)
```

**2. Implement skill class (`MySkill.ts`):**

```typescript
import { Skill } from '../base/Skill';
import { SkillContext, MySkillAnalysis } from '../../types';

export class MySkill extends Skill<void, MySkillAnalysis> {
  readonly name = 'my-skill';
  readonly version = '1.0.0';
  readonly description = 'What this skill does';

  getTools() { return [...]; }
  getFinalizeToolName() { return 'finalize_my_skill'; }
  buildSystemPrompt(context: SkillContext) { return '...'; }
  buildTaskPrompt(context: SkillContext) { return '...'; }
  async processResult(raw: string) { return {...}; }
  createConservativeResult(context: SkillContext) { return {...}; }
  createEmptyResult() { return {...}; }
  outputResult(result: MySkillAnalysis) { console.log(...); }
}
```

**3. Register skill (`skills/index.ts`):**

```typescript
import { MySkill } from './my-skill/MySkill';

export function registerAllSkills(): void {
  SkillRegistry.register(new SelectTagsSkill());
  SkillRegistry.register(new MySkill()); // Add here
}
```

**4. Create prompts (`skills/my-skill/prompt.ts`):**

System prompts define the AI's role and behavior, while task prompts provide the specific analysis task.

```typescript
import { SkillContext } from '../../types';

/**
 * System prompt - sent once at the start
 * Defines: WHO the AI is, WHAT it knows, HOW it should behave
 */
export function buildSystemPrompt(context: SkillContext): string {
  // Define the AI's role
  const role = `You are an expert in [domain] responsible for [responsibility].`;

  // Define the goal
  const goal = `GOAL: [What you want the AI to achieve].`;

  // Provide guidance
  const guidance = `GUIDANCE:
  - [Guideline 1]
  - [Guideline 2]
  - Maximum iterations: 20
  - Be conservative when uncertain`;

  return [role, goal, guidance].join('\n\n');
}

/**
 * Task prompt - sent with each specific task
 * Provides: WHAT changed, WHAT to analyze, HOW to output
 */
export function buildTaskPrompt(context: SkillContext): string {
  const { changedFiles, criticalFiles } = context;

  // Build file list
  const fileList = changedFiles.map((f) => `  ${f}`).join('\n');

  // Instruction
  const instruction = `Analyze the changed files and [what to do with them].`;

  // Available options
  const options = `AVAILABLE OPTIONS:\n- Option A: [description]\n- Option B: [description]`;

  // Files to analyze
  const files = `CHANGED FILES (${changedFiles.length} total):\n${fileList}`;

  // Closing instruction
  const closing = `Investigate using tools, then call finalize_my_skill when ready.`;

  return [instruction, options, files, closing].join('\n\n');
}
```

**Key principles:**

1. **System prompt** (defines behavior):
   - Role definition (who is the AI)
   - Goal statement (what to achieve)
   - Guidance (how to behave, what to prefer)
   - Constraints (iteration limits, token awareness)
   - Use shared components from `skills/shared/base-system-prompt.ts`

2. **Task prompt** (specific work):
   - Clear instruction
   - Available options/choices
   - Input data (changed files, PR context)
   - Output expectations
   - Tool usage guidance

**5. Use skill:**

```bash
node -r esbuild-register e2e/tools/e2e-ai-analyzer --skill my-skill
```

**Reference implementation:**

See `skills/select-tags/` for a complete working example:

- `SelectTagsSkill.ts` - Full skill implementation
- `prompt.ts` - System and task prompt examples
- `handlers.ts` - Result processing helpers
