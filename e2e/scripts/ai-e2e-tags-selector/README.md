# AI E2E Tags Selector - Modular Architecture

This directory contains the refactored, modular implementation of the AI E2E Tags Selector.

## Architecture

The system has been broken down into focused, maintainable modules:

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

## Key Improvements

### 1. **Single Source of Truth in e2e/tags.js**
- All tags pulled directly from `aiE2EConfig` array in `e2e/tags.js`
- No hardcoded lists anywhere in the AI selector code
- No intermediate discovery layer - modules import directly from `e2e/tags.js`
- To add a new tag: just add it to `aiE2EConfig` with description

### 2. **Configurable Patterns**
- File patterns moved to `config/patterns.config.ts`
- Easy to modify critical file patterns
- File categorization logic is isolated and testable

### 3. **Modular Tool System**
- Each AI tool is a separate handler module
- Easy to add new tools without touching core logic
- Clear separation between tool definitions and execution

### 4. **Separation of Concerns**
- Each module has a single, well-defined responsibility
- ~100 lines per file instead of 1336 lines monolith
- Better testability and maintainability

### 5. **Type Safety**
- Shared TypeScript types in `types/index.ts`
- Type-safe interfaces throughout

## Usage

The refactored system maintains full backward compatibility:

```bash
# Using the modular entry point
node -r esbuild-register e2e/scripts/ai-e2e-tags-selector/index.ts --help

# Or via the backward compatibility wrapper
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

That's it! The AI selector will automatically pick it up.

## Migration Notes

- Original monolithic file: `e2e/scripts/ai-e2e-tags-selector.legacy.ts`
- New modular implementation: `e2e/scripts/ai-e2e-tags-selector/`
- Backward compatibility maintained via wrapper at original location

## Testing

```bash
# Check TypeScript compilation
npx tsc --noEmit e2e/scripts/ai-e2e-tags-selector/index.ts

# Run with help
E2E_CLAUDE_API_KEY=test node -r esbuild-register e2e/scripts/ai-e2e-tags-selector/index.ts --help
```
