## Development Commands

### TypeScript Validation
```bash
# Check all Perps-related TypeScript
yarn lint:tsc

# Check specific files
npx tsc --noEmit app/components/UI/Perps/**/*.ts app/components/UI/Perps/**/*.tsx
```

### ESLint Validation
```bash
# Lint ONLY Perps components (avoid modifying unrelated files)
yarn lint app/components/UI/Perps/ app/constants/navigation/Routes.ts

# Fix auto-fixable issues (ONLY for Perps files)
yarn lint app/components/UI/Perps/ app/constants/navigation/Routes.ts --fix

# NEVER run: yarn lint (this modifies the entire codebase)
```

### Testing
```bash
# Run Perps tests
npx jest app/components/UI/Perps/ --no-coverage
# Failing tests
npx jest app/components/UI/Perps/ --no-coverage 2>&1 | grep -A 10 "FAIL"
```

## Navigation Routes
```typescript
// app/constants/navigation/Routes.ts
PERPS: {
  ROOT: 'Perps',
  TRADING_VIEW: 'PerpsTradingView', 
  DEPOSIT: 'PerpsDeposit',
  DEPOSIT_PREVIEW: 'PerpsDepositPreview',
  DEPOSIT_PROCESSING: 'PerpsDepositProcessing',
  DEPOSIT_SUCCESS: 'PerpsDepositSuccess',
}
```
