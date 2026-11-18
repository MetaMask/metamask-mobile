# MiCA/EEA Integration Guide

## Switching to Core Preview

This PR uses local type shims for MiCA/EEA types until the core PR is published.

**Core PR**: https://github.com/MetaMask/core/pull/11636  
**Branch**: cursor/mica-eea-kyc-support-7ad1  
**Package**: `@metamask/ramps-controller`

### To Switch to Core Preview

1. Add to `package.json` resolutions:
```json
"resolutions": {
  "@metamask/ramps-controller": "npm:@metamask-previews/ramps-controller@<VERSION>"
}
```

2. Run:
```bash
yarn install
```

3. Remove the local shim file:
```bash
rm app/components/UI/Ramp/types/micaTypes.ts
```

4. Update imports to use `@metamask/ramps-controller` types directly:
   - Remove: `import type { ... } from '../types/micaTypes'`
   - Add: Types are now part of `@metamask/ramps-controller`

The implementation already calls the correct messenger actions (`TransakService:submitMicaConsent`, `TransakService:submitSourceOfIncome`), so no controller wiring changes are needed.

## Testing with Mock Mode

Mock mode allows testing the full EU flow on a simulator without Transak staging support.

### Enable Mock Mode

Set environment variable **before building**:
```bash
export MICA_MOCK_MODE=true
yarn setup:expo
yarn watch:clean
yarn start:ios  # or start:android
```

### What Mock Mode Does

1. Returns mock `CONSENT` and `SOURCE_OF_INCOME` forms
2. Fakes successful submission of both forms  
3. Injects `transak-native` provider for EU regions when missing
4. Bypasses server-side EU exclusion (`excludeEuTransakNative`)

### Testing Steps (Mock Mode)

1. Build with `MICA_MOCK_MODE=true`
2. Open the app on a simulator
3. Navigate to Ramps → Buy
4. Select an EEA country (e.g. Germany, France)
5. Choose Transak Native provider (should appear in mock mode)
6. Complete authentication flow
7. Enter an EEA address (triggers MiCA forms)
8. MiCA Consent screen should appear → check both consents → continue
9. Source of Income screen should appear → fill all fields → submit
10. KYC flow continues normally

### Verify Mock Mode is Active

Check console logs for:
```
[MiCA Mock] Returning mock CONSENT form
[MiCA Mock] MicaConsent screen rendered in mock mode
[MiCA Mock] Faking consent submission
[MiCA Mock] SourceOfIncome screen rendered in mock mode
[MiCA Mock] Injecting transak-native provider for EU region
```

## MiCA Disclaimer Display

The `MicaDisclaimer` component should be integrated on:

1. **Quote screens** (`BuildQuote`, payment selection): above the CTA button
2. **Order confirmation screens**: above the final confirmation button

Usage:
```tsx
import MicaDisclaimer from '../../components/MicaDisclaimer';

<MicaDisclaimer termsIds={quote.termsIds} />
```

The disclaimer automatically shows when `quote.termsIds` includes `MICA_EEA_BUY` or `MICA_EEA_SELL`.

## Files Changed

### New Files
- `app/components/UI/Ramp/types/micaTypes.ts` — Type shims (remove after core integration)
- `app/components/UI/Ramp/utils/micaMockMode.ts` — Mock mode utilities
- `app/components/UI/Ramp/Views/NativeFlow/MicaConsent.tsx` — Consent screen
- `app/components/UI/Ramp/Views/NativeFlow/MicaConsent.styles.ts`
- `app/components/UI/Ramp/Views/NativeFlow/SourceOfIncome.tsx` — Source of income screen  
- `app/components/UI/Ramp/Views/NativeFlow/SourceOfIncome.styles.ts`
- `app/components/UI/Ramp/components/DepositSelectField/DepositSelectField.tsx` — Dropdown component
- `app/components/UI/Ramp/components/MicaDisclaimer/MicaDisclaimer.tsx` — Disclaimer component

### Modified Files
- `app/components/UI/Ramp/hooks/useTransakRouting.ts` — CONSENT & SOURCE_OF_INCOME routing
- `app/components/UI/Ramp/hooks/useTransakController.ts` — Added submitMicaConsent / submitSourceOfIncome
- `app/components/UI/Ramp/queries/providers.ts` — Mock mode provider injection
- `app/constants/navigation/Routes.ts` — Added MICA_CONSENT & SOURCE_OF_INCOME routes
- `locales/languages/en.json` — MiCA strings

## Navigation Wiring

To complete navigation, register the routes in your navigator:

```tsx
<Stack.Screen name={Routes.RAMP.MICA_CONSENT} component={MicaConsent} />
<Stack.Screen name={Routes.RAMP.SOURCE_OF_INCOME} component={SourceOfIncome} />
```

## Core API Alignment

The implementation matches core exactly:

**Controller methods**:
- `transakSubmitMicaConsent(consentedAt: string): Promise<void>`
- `transakSubmitSourceOfIncome(monthlyVolume, sourceOfFundsType, employmentStatus?, countryOfCitizenship?): Promise<void>`

**Types** (from core):
- `TransakAdditionalRequirementOption { name, value }`
- `TransakAdditionalRequirement.metadata` with optional `sourceOfFundsTypeOptions`, `employmentStatusOptions`, `countryOfCitizenshipOptions`
- `TransakBuyQuote.termsIds?: string[]`

Switching to the core preview is a one-line package.json change.
