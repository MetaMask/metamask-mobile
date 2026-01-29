# QA AI Agent Workshop: Build Your Own Mode

## Overview

In this workshop, you'll create a new AI agent mode for the E2E analyzer. The system already has a `select-tags` mode that analyzes PRs and picks which tests to run. You'll build something new!

**Time:** 15 minutes
**Team Size:** 3-4 people
**Goal:** Design and implement a new AI analysis mode

---

## Mode Ideas (Pick One!)

| Mode Name             | Description                                 | Fun Factor |
| --------------------- | ------------------------------------------- | ---------- |
| `suggest-selectors`   | Find brittle selectors and suggest fixes    | ⭐⭐       |
| `analyze-flaky`       | Identify patterns causing flaky tests       | ⭐⭐       |
| `generate-test-ideas` | Suggest new test cases for changes          | ⭐⭐       |
| `code-smells`         | Find code smells in test files              | ⭐⭐       |
| `name-that-test`      | Suggest better names for poorly named tests | ⭐⭐⭐     |

---

## Step 1: Copy the Template (30 seconds)

```bash
cp -r tests/tools/e2e-ai-analyzer/modes/_template \
      tests/tools/e2e-ai-analyzer/modes/YOUR-MODE-NAME
```

Example:

```bash
cp -r tests/tools/e2e-ai-analyzer/modes/_template \
      tests/tools/e2e-ai-analyzer/modes/suggest-selectors
```

---

## Step 2: Edit prompt.ts - Define the AI (5 minutes)

Open `modes/YOUR-MODE-NAME/prompt.ts`

**Change the ROLE** - What is the AI expert at?
**Change the GOAL** - What should it accomplish?
**Add PATTERNS** - What should it look for?
**Add GUIDANCE** - Any special instructions?

### 2a. Set the Role

**Find:**

```typescript
const role = `You are an expert in [WHAT EXPERTISE?] for MetaMask Mobile, specializing in [WHAT SPECIFICALLY?].`;
```

**Replace with your role:**

```typescript
// Example for suggest-selectors:
const role = `You are an expert in E2E test automation for MetaMask Mobile, specializing in identifying brittle selectors that cause flaky tests.`;
```

### 2b. Set the Goal

**Find:**

```typescript
const goal = `GOAL: [WHAT SHOULD THE AI ACCOMPLISH?]`;
```

**Replace with your goal:**

```typescript
// Example for suggest-selectors:
const goal = `GOAL: Analyze E2E test files and identify selectors that are fragile or prone to breaking. Suggest stable replacements.`;
```

### 2c. Define Patterns to Look For

**Find:**

```typescript
const patterns = `PATTERNS TO IDENTIFY:
1. [PATTERN 1]
2. [PATTERN 2]
...
```

**Replace with your patterns:**

```typescript
// Example for suggest-selectors:
const patterns = `SELECTOR ANTI-PATTERNS TO IDENTIFY:
1. Positional selectors: nth-child, first-child, :eq(), [0], [1]
2. Deep nesting: div > div > div (3+ levels deep)
3. CSS hash classes: .css-1a2b3c4, .styled-xyz123
4. Generic tags alone: just "div" or "span" without qualifiers
5. Ambiguous text: getByText('OK'), getByText('Submit')

BEST PRACTICES:
1. Use testID/data-testid (most stable)
2. Use accessibility labels
3. Keep selectors shallow (1-2 levels max)`;
```

---

## Step 3: Edit handlers.ts - Define Output (3 minutes)

Open `modes/YOUR-MODE-NAME/handlers.ts`

### 3a. Define Your Output Interface

**Find:**

```typescript
export interface YourModeAnalysis {
  items: Array<{...}>;
  ...
}
```

**Replace with your structure:**

```typescript
// Example for suggest-selectors:
export interface SuggestSelectorsAnalysis {
  suggestions: Array<{
    file: string;
    line: number;
    currentSelector: string;
    suggestedSelector: string;
    reason: string;
    severity: 'low' | 'medium' | 'high';
  }>;
  totalFound: number;
  confidence: number;
  summary: string;
}
```

### 3b. Update the JSON Parser

**Find:**

```typescript
const jsonMatch = aiResponse.match(/\{[\s\S]*"items"[\s\S]*\}/);
```

**Replace `"items"` with your main array field:**

```typescript
// For suggest-selectors:
const jsonMatch = aiResponse.match(/\{[\s\S]*"suggestions"[\s\S]*\}/);
```

### 3c. Customize Console Output

**Update `outputAnalysis()` function:**

```typescript
// Example:
export function outputAnalysis(analysis: SuggestSelectorsAnalysis): void {
  console.log('\nRESULTS');
  console.log('=====================================\n');

  // Log output
}
```

---

## Step 4: Register the Mode (4 minutes)

### 4a. Add Types

Edit `types/index.ts`:

```typescript
// Import your analysis type
import { YourModeAnalysis } from '../modes/YOUR-MODE-NAME/handlers';

// Add to ModeAnalysisTypes
export interface ModeAnalysisTypes {
  'select-tags': SelectTagsAnalysis;
  'YOUR-MODE-NAME': YourModeAnalysis; // Add this line
}
```

### 4b. Import in Analyzer

Edit `analysis/analyzer.ts`:

```typescript
// Add imports at the top
import {
  buildSystemPrompt as buildYourModeSystemPrompt,
  buildTaskPrompt as buildYourModeTaskPrompt,
} from '../modes/YOUR-MODE-NAME/prompt';
import {
  processAnalysis as processYourModeAnalysis,
  createConservativeResult as createYourModeConservativeResult,
  createEmptyResult as createYourModeEmptyResult,
  outputAnalysis as outputYourModeAnalysis,
} from '../modes/YOUR-MODE-NAME/handlers';
```

### 4c. Register in MODES Object

In `analysis/analyzer.ts`, add to the MODES object:

```typescript
export const MODES = {
  'select-tags': { ... },
  'YOUR-MODE-NAME': {
    description: 'Your mode description here',
    finalizeToolName: 'finalize_your_mode',
    systemPromptBuilder: buildYourModeSystemPrompt,
    taskPromptBuilder: buildYourModeTaskPrompt,
    processAnalysis: processYourModeAnalysis,
    createConservativeResult: createYourModeConservativeResult,
    createEmptyResult: createYourModeEmptyResult,
    outputAnalysis: outputYourModeAnalysis,
  },
};
```

### 4d. Add Finalize Tool

Edit `ai-tools/tool-registry.ts`, add a new tool:

```typescript
{
  name: 'finalize_your_mode',
  description: 'Submit your mode analysis results',
  input_schema: {
    type: 'object',
    properties: {
      // Add your output fields here
      suggestions: {
        type: 'array',
        items: { type: 'object' },
        description: 'List of suggestions',
      },
      confidence: {
        type: 'number',
        description: 'Confidence 0-100',
      },
      summary: {
        type: 'string',
        description: 'Summary of findings',
      },
    },
    required: ['suggestions', 'summary'],
  },
},
```

---

## Step 5: Test It! (2 minutes)

```bash
# Set your API key
export E2E_CLAUDE_API_KEY=sk_ce0bd9cd_563b76719ae045ccfc6984a6847aa7daafd5

# Run your mode against a PR
node -r esbuild-register tests/tools/e2e-ai-analyzer \
  --mode YOUR-MODE-NAME \
  --pr 12345
```

---

## Quick Reference: File Locations

| What to Edit      | Location                           |
| ----------------- | ---------------------------------- |
| AI prompts        | `modes/YOUR-MODE-NAME/prompt.ts`   |
| Output handling   | `modes/YOUR-MODE-NAME/handlers.ts` |
| TypeScript types  | `types/index.ts`                   |
| Mode registration | `analysis/analyzer.ts`             |
| Finalize tool     | `ai-tools/tool-registry.ts`        |

---

## Troubleshooting

**"Module not found" error**
→ Check your import paths match the file locations

**"finalize tool not found" error**
→ Make sure `finalizeToolName` in MODES matches the tool name in `tool-registry.ts`

**AI returns empty results**
→ Check your JSON regex pattern matches your output field name

**TypeScript errors**
→ Make sure your interface is exported and imported correctly in `types/index.ts`

---

## Presentation (1 minute per team)

Share with the group:

1. **Mode name** - What did you build?
2. **What it does** - One sentence explanation
3. **Best pattern** - Show your favorite pattern the AI looks for
4. **Sample output** - What would the results look like?

---

## Voting Categories

- 🏆 **Most Useful** - Would actually help our workflow
- 🎨 **Most Creative** - Novel/interesting approach
- 😂 **Most Fun** - Made us laugh

Good luck and have fun! 🚀
