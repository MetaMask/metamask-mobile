export const NUMPAD_QUICK_ACTIONS_AB_KEY =
  'swapsSWAPS4135AbtestNumpadQuickAmounts';

export const NUMPAD_QUICK_ACTIONS_VARIANTS = {
  control: [25, 50, 75, 'MAX'],
  treatment: [50, 75, 90, 'MAX'],
} as const;

export type NumpadQuickActionsVariant =
  keyof typeof NUMPAD_QUICK_ACTIONS_VARIANTS;

export type NumpadQuickAction =
  (typeof NUMPAD_QUICK_ACTIONS_VARIANTS)[NumpadQuickActionsVariant][number];
