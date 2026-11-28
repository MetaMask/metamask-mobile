import type { PackPartnerRarity } from '../providers/pack-partner/types/packPartner';

export const rarityDotClassNames: Record<PackPartnerRarity, string> = {
  epic: 'bg-accent03-normal',
  rare: 'bg-accent01-normal',
  uncommon: 'bg-accent02-normal',
  common: 'bg-icon-alternative',
};

export const rarityBorderClassNames: Record<PackPartnerRarity, string> = {
  epic: 'border-accent03-normal',
  rare: 'border-accent01-normal',
  uncommon: 'border-accent02-normal',
  common: 'border-muted',
};
