# Design system evals

Non-required PR check (`.github/workflows/design-system-evals.yml`) that lints the
lines a PR adds under `app/` against declarative design-system rules. Findings are
GitHub **warning** annotations and never fail the job while the system is refined.
A crash (broken JSON, lint parse error) prints an `::error` annotation and fails.

## How it works

1. `git diff -U0 HEAD^1 HEAD` → `changed-lines.ts` parses the added line numbers per file.
2. Scope filter (`run-design-system-evals.ts`): `app/**/*.{ts,tsx,js,jsx}` minus
   `*.test.*`, `*.spec.*`, `*.stories.*`.
3. Each file is linted with the rules built from `eval-rules.json`
   (`eval-rules.ts` validates, `rule-interpreter.ts` builds ESLint rules).
4. Only findings on added lines become annotations. A same-line
   `// ds-exception: <reason>` (non-empty reason, line comment only) suppresses a finding.

Run locally: `yarn design-system:evals` (lints the diff `HEAD^1..HEAD`).

## Rule source: `eval-rules.json`

The JSON is the source of truth. Rules that fit the interpreter mechanics need
**no engine code** — add a JSON entry and the check adapts.

```json
{
  "rules": [
    {
      "id": "design-system/no-hardcoded-spacing",
      "message": "Hard-coded spacing value \"{{value}}\" on \"{{key}}\". ...",
      "match": {
        "node": "Property",
        "key": { "oneOf": ["margin", "gap"] },
        "value": { "type": "number", "except": [0] }
      }
    }
  ]
}
```

### Schema

| Field | Accepted | Notes |
| ----- | -------- | ----- |
| `id` | non-empty string, unique across `rules` | convention: `design-system/<name>` |
| `message` | non-empty string | may interpolate `{{key}}` and `{{value}}` |
| `match.node` | `"Property"` | the only node the interpreter knows (v1): an object-literal property. JSX attributes never match |
| `match.key` | exactly one of `oneOf: string[]` or `pattern: regex` | matched against the property name |
| `match.value` | `{ "type": "number", "except?": number[] }` or `{ "type": "string", "pattern": regex }` | |

Semantics the interpreter applies to every rule:

- Numeric literals include unary `+`/`-`; `-0` equals `0`. `except` uses numeric equality.
- TS wrappers (`as const`, `satisfies`) are unwrapped before matching the value.
- JSX attributes are not object properties — `<Box marginRight={8} />` never matches
  a `Property` rule.
- Regexes must compile; an invalid one fails validation.

Invalid JSON or schema violations fail the check loudly with an `::error` annotation.

## What needs engine code (and what doesn't)

**JSON only** — no engine change: new key lists, new value patterns, whole new rules
using the `Property`-with-literal mechanics. Example — flag hex colors:

```json
{
  "id": "design-system/no-hex-color",
  "message": "Hard-coded color \"{{value}}\" on \"{{key}}\". Use a theme token.",
  "match": {
    "node": "Property",
    "key": { "pattern": "[Cc]olor$" },
    "value": { "type": "string", "pattern": "^#" }
  }
}
```

**Engine change** — extend the schema (`eval-rules.ts`) and the interpreter
(`rule-interpreter.ts`) together: new node types (`JSXAttribute`, call arguments),
template-literal values, cross-file analysis, autofix. These extend the *language*,
not a rule; they are rare compared to adding rules.

## Planned extensions

- **Wrong-package imports** (RN `View`/`Text` instead of MMDS components) and
  **JSX composition** rules are structural matches, not literal-value matches.
  For those, the schema grows a `selector` branch (exactly one of `match` or
  `selector`) holding an [esquery](https://github.com/estools/esquery) selector —
  esquery ships with ESLint, so no new dependency. The interpreter keeps the
  `match` branch for literal semantics (unary numbers, TS unwrapping, `except`),
  which esquery cannot express, and runs esquery for the structural branch.
  `{{value}}` in a selector rule interpolates the matched node's source text.
- **Component manifest** (Storybook-generated JSON): a rule may reference an
  external JSON data file. The engine loads it like `eval-rules.json`; it is
  data, not code. How the manifest is generated is out of scope for the check.

## Files

| File | Role |
| ---- | ---- |
| `eval-rules.json` | rule source (this is what rule authors edit) |
| `eval-rules.ts` | schema: types + load + validation |
| `rule-interpreter.ts` | generic engine: JSON config → ESLint rule |
| `run-design-system-evals.ts` | orchestration: diff scope, lint, annotations |
| `changed-lines.ts` | added-line parser for `git diff -U0` |
| `ds-exception.ts` | `// ds-exception: <reason>` handling |
