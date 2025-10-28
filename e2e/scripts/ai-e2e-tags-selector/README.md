# AI E2E Tags Selector

## Architecture

```
ai-e2e-tags-selector/
├── index.ts                      # Main entry point (CLI)
├── selector.ts                   # Core orchestrator class
├── types/
│   └── index.ts                  # Shared TypeScript types
├── config/
│   └── patterns.config.ts        # File patterns (critical files, categories)
├── tools/
│   ├── tool-registry.ts          # AI tool schemas
│   ├── tool-executor.ts          # Tool execution dispatcher
│   └── handlers/                 # Individual tool handlers
│       ├── read-file.ts
│       ├── git-diff.ts
│       ├── pr-diff.ts
│       ├── related-files.ts
│       └── finalize-decision.ts
├── prompts/
│   ├── system-prompt-builder.ts  # Builds AI system prompt
│   └── agent-prompt-builder.ts   # Builds initial agent prompt
├── analysis/
│   ├── file-categorizer.ts       # Categorizes changed files
│   ├── tag-analyzer.ts           # Analyzes test files per tag
│   └── decision-parser.ts        # Parses AI decisions
└── utils/
    ├── git-utils.ts               # Git operations
    ├── validation.ts              # Input validation
    └── output-formatter.ts        # Result formatting
```

## Usage

```bash
node -r esbuild-register e2e/scripts/ai-e2e-tags-selector.ts --help
```

## Adding New Features

### Adding a New AI Tool

1. Create handler in `tools/handlers/your-tool.ts`:
```typescript
export function handleYourTool(input: ToolInput, context: any): string {
  // Implementation
}
```

2. Add schema in `tools/tool-registry.ts`
3. Add case in `tools/tool-executor.ts`

### Adding New File Patterns

Edit `config/patterns.config.ts`:
```typescript
export const FILE_CATEGORY_PATTERNS: Record<string, (file: string) => boolean> = {
  newCategory: (file: string) => file.includes('your-pattern'),
  // ...
};
```

### Adding a New Tag

Edit `e2e/tags.js` and add to `aiE2EConfig`:
```javascript
const aiE2EConfig = [
  { tag: 'SmokeAccounts', description: 'Multi-account, account management' },
  // ... existing tags
  { tag: 'YourNewTag', description: 'Description of what this tag covers' },
];
```

## Testing

```bash
# Check TypeScript compilation
npx tsc --noEmit e2e/scripts/ai-e2e-tags-selector/index.ts

# Run with help
E2E_CLAUDE_API_KEY=test node -r esbuild-register e2e/scripts/ai-e2e-tags-selector/index.ts --help
```
