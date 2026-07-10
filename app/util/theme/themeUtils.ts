import { AppThemeKey, Theme } from './models';
import { isPureBlackEnabled } from './pureBlackPreview';

export { isPureBlackEnabled };

// Legacy surface helper for non-MMDS components during the MM_PURE_BLACK_PREVIEW rollout.
//
// When pure black is OFF, returns `theme.colors.background.default` (current behavior).
// When pure black is ON:
//   - dark  → `theme.colors.background.alternative` (elevated `#1c1d1f`)
//   - light → `theme.colors.background.default` (unchanged)
//
// Remaining legacy-only consumers (until migrated to MMDS surface tokens):
// - `app/component-library/components/BottomSheets/BottomSheet/foundation/BottomSheetDialog/BottomSheetDialog.styles.ts`
// - `app/component-library/components/Form/TextField/foundation/Input/Input.styles.ts`
// - `app/component-library/components/Modals/ModalConfirmation/ModalConfirmation.styles.ts`
// - `app/components/UI/ActionModal/ActionContent/index.js`
// - `app/components/UI/NetworkManager/index.styles.ts`
// - `app/components/UI/NetworkMultiSelector/NetworkMultiSelector.styles.ts`
// - `app/components/UI/Notification/TransactionNotification/index.js`
// - `app/components/UI/SelectComponent/index.js`
// - `app/components/Views/TradeWalletActions/TradeWalletActions.tsx`

export const getElevatedSurfaceColor = (theme: Theme): string => {
  if (!isPureBlackEnabled) return theme.colors.background.default;
  return theme.themeAppearance === AppThemeKey.dark
    ? theme.colors.background.alternative
    : theme.colors.background.default;
};
