export const NUMPAD_QUICK_ACTIONS_AB_KEY =
  'swapsSWAPS4135AbtestNumpadQuickAmounts';

export type NumpadQuickActionsVariant = 'control' | 'treatment';
export type NumpadQuickAction = number | 'MAX';

export const NUMPAD_QUICK_ACTIONS_VARIANTS: Record<
  NumpadQuickActionsVariant,
  readonly NumpadQuickAction[]
> = {
  control: [25, 50, 75, 'MAX'],
  treatment: [50, 75, 90, 'MAX'],
};

export const NUMPAD_QUICK_ACTIONS_NO_MAX_VARIANTS: Record<
  NumpadQuickActionsVariant,
  readonly number[]
> = {
  control: [25, 50, 75, 90],
  treatment: [50, 75, 85, 95],
};
