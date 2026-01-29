# Filled-In Examples

Quick reference for filling out your mode template.

---

## Example 1: suggest-selectors Mode

### prompt.ts - Role & Goal

```typescript
const role = `You are an expert in E2E test automation for MetaMask Mobile, specializing in identifying and improving brittle selectors that cause flaky tests.`;

const goal = `GOAL: Analyze E2E test files and identify selectors that are fragile, non-semantic, or prone to breaking. Suggest improvements following best practices.`;
```

### prompt.ts - Patterns

```typescript
const patterns = `PATTERNS TO IDENTIFY:
1. Positional selectors: nth-child, first-child, :eq()
2. Deep nesting: div > div > div > span (3+ levels)
3. CSS class selectors: .css-1a2b3c4, .styled-hash
4. Index-based: [0], [1] array access
5. Generic tags without qualifiers

BEST PRACTICES:
1. Use testID/data-testid attributes
2. Use accessibility labels
3. Use semantic queries: getByRole, getByLabelText
4. Keep selectors shallow`;
```

### handlers.ts - Output Interface

```typescript
export interface SuggestSelectorsAnalysis {
  suggestions: Array<{
    file: string;
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

---

## Example 2: analyze-flaky Mode

### prompt.ts - Role & Goal

```typescript
const role = `You are an expert in E2E test stability for MetaMask Mobile, specializing in identifying patterns that cause test flakiness.`;

const goal = `GOAL: Analyze E2E tests to identify anti-patterns that lead to flaky test failures. Provide actionable fixes.`;
```

### prompt.ts - Patterns

```typescript
const patterns = `FLAKINESS PATTERNS TO IDENTIFY:
1. Hardcoded waits: sleep(1000), waitFor(5000)
2. Race conditions: actions before elements ready
3. Shared state between tests
4. Network-dependent assertions
5. Time-sensitive tests (dates, timestamps)
6. Order-dependent tests

STABILITY BEST PRACTICES:
1. Use smart waits: waitFor(() => expect...)
2. Isolate test data
3. Mock external dependencies
4. Use deterministic test data`;
```

### handlers.ts - Output Interface

```typescript
export interface AnalyzeFlakyAnalysis {
  flakyPatterns: Array<{
    file: string;
    testName: string;
    pattern: string;
    fix: string;
    confidence: number;
  }>;
  totalFound: number;
  riskScore: 'low' | 'medium' | 'high';
  summary: string;
}
```

---

## Example 3: generate-test-ideas Mode

### prompt.ts - Role & Goal

```typescript
const role = `You are an expert QA engineer for MetaMask Mobile, specializing in identifying gaps in E2E test coverage.`;

const goal = `GOAL: Analyze code changes and suggest new E2E test cases that should be written to ensure adequate coverage.`;
```

### prompt.ts - Patterns

```typescript
const patterns = `COVERAGE CONSIDERATIONS:
1. Happy path: Normal user flow works
2. Error handling: Invalid inputs, network errors
3. Edge cases: Empty states, max values
4. Platform differences: iOS vs Android
5. Accessibility: Screen reader compatibility

TEST IDEA FORMAT:
- Title: Clear, descriptive name
- Scenario: What user action to test
- Expected: What should happen
- Priority: Critical/High/Medium/Low`;
```

### handlers.ts - Output Interface

```typescript
export interface GenerateTestIdeasAnalysis {
  testIdeas: Array<{
    title: string;
    scenario: string;
    expectedBehavior: string;
    priority: 'critical' | 'high' | 'medium' | 'low';
    relatedFile: string;
  }>;
  coverageGaps: string[];
  totalIdeas: number;
  summary: string;
}
```

---

## Quick Copy-Paste Snippets

### File Filter Examples

```typescript
// Only E2E specs
const relevantFiles = allFiles.filter((f) => f.includes('.spec.'));

// Only selector files
const relevantFiles = allFiles.filter((f) => f.includes('selectors/'));

// E2E folder only
const relevantFiles = allFiles.filter((f) => f.startsWith('e2e/'));

// Test files (multiple patterns)
const relevantFiles = allFiles.filter(
  (f) =>
    f.includes('.spec.') || f.includes('.test.') || f.includes('__tests__'),
);
```

### Severity Icons

```typescript
const icon = severity === 'high' ? '🔴' : severity === 'medium' ? '🟡' : '🟢';
```

### JSON Regex Patterns

```typescript
// Match object with "suggestions" array
/\{[\s\S]*"suggestions"[\s\S]*\}/

// Match object with "items" array
/\{[\s\S]*"items"[\s\S]*\}/

// Match object with "testIdeas" array
/\{[\s\S]*"testIdeas"[\s\S]*\}/
```
