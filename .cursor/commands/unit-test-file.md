Run tests for a specific file by providing the filename.

Use this command when you want to test only a specific component or utility file after making changes to it. This is faster than running the entire test suite.

```bash
yarn jest <filename>
```

Examples:
- `yarn jest MyComponent.test.tsx`
- `yarn jest utils/helpers.test.ts`
- `yarn jest app/components/Button.test.tsx`
