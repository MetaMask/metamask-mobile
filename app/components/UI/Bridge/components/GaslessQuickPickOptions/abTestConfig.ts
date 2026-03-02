export const NUMPAD_QUICK_ACTIONS_AB_KEY =
  'swapsSWAPS4135AbtestNumpadQuickAmounts';

export const NUMPAD_QUICK_ACTIONS_VARIANTS = {
  control: [25, 50, 75, 'MAX'],
  treatment: [50, 75, 90, 'MAX'],
} as const;

export const NUMPAD_QUICK_ACTIONS_NO_MAX_VARIANTS = {
  control: [25, 50, 75, 90],
  treatment: [50, 75, 85, 95],
} as const;

export type NumpadQuickActionsVariant =
  keyof typeof NUMPAD_QUICK_ACTIONS_VARIANTS;

export type NumpadQuickAction =
  (typeof NUMPAD_QUICK_ACTIONS_VARIANTS)[NumpadQuickActionsVariant][number];

export type NumpadQuickActionNoMax =
  (typeof NUMPAD_QUICK_ACTIONS_NO_MAX_VARIANTS)[NumpadQuickActionsVariant][number];
