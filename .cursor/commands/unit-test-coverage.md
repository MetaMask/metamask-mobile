Run tests and generate a coverage report to see which parts of your code are tested.

Use this command when you want to check test coverage, identify untested code, or ensure you have adequate test coverage before committing.

```bash
yarn test:unit --coverage
```

This will:
- Run all unit tests
- Generate a coverage report
- Show coverage percentages for files, functions, lines, and branches
- Create an HTML coverage report in the coverage directory
