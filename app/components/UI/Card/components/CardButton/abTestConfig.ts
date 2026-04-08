export const CARD_BUTTON_BADGE_AB_KEY = 'cardCARD338AbtestAttentionBadge';

export enum CardButtonBadgeVariant {
  Control = 'control',
  WithBadge = 'withBadge',
}

export const CARD_BUTTON_BADGE_VARIANTS: Record<
  CardButtonBadgeVariant,
  { showBadge: boolean }
> = {
  [CardButtonBadgeVariant.Control]: { showBadge: false },
  [CardButtonBadgeVariant.WithBadge]: { showBadge: true },
};
