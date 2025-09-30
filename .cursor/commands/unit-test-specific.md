Run a single test by providing the test name pattern.

Use this command when you want to run only one specific test within a file, useful for debugging or focusing on a particular test case.

```bash
yarn jest <filename> -t "<test-name-pattern>"
```

Examples:
- `yarn jest MyComponent.test.tsx -t "displays error message"`
- `yarn jest utils/helpers.test.ts -t "validates email format"`
- `yarn jest Button.test.tsx -t "renders primary button"`
