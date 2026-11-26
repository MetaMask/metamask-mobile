import { CardType } from '../types';

/**
 * Cashback rate (percent) for the card, as shown on the mUSD Back row and the
 * Card home cashback panel: 3% for Immersve and metal (premium) cards, 1%
 * otherwise. There is no separate membership tier signal in the Card API.
 */
export const getCashbackPercentage = (
  providerId: string | null | undefined,
  cardType: CardType | undefined,
): string => {
  if (providerId === 'immersve' || cardType === CardType.METAL) {
    return '3';
  }
  return '1';
};
