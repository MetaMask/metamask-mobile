export const NUMPAD_QUICK_ACTIONS_AB_KEY =
  'swapsSWAPS4135AbtestNumpadQuickAmounts';

export enum NumpadQuickActionsVariant {
  Control = 'control',
  Treatment = 'treatment',
}
export type NumpadQuickAction = number | 'MAX';

export const NUMPAD_QUICK_ACTIONS_VARIANTS: Record<
  NumpadQuickActionsVariant,
  readonly NumpadQuickAction[]
> = {
  [NumpadQuickActionsVariant.Control]: [25, 50, 75, 'MAX'],
  [NumpadQuickActionsVariant.Treatment]: [50, 75, 90, 'MAX'],
};

export const NUMPAD_QUICK_ACTIONS_NO_MAX_VARIANTS: Record<
  NumpadQuickActionsVariant,
  readonly number[]
> = {
  [NumpadQuickActionsVariant.Control]: [25, 50, 75, 90],
  [NumpadQuickActionsVariant.Treatment]: [50, 75, 85, 95],
};
