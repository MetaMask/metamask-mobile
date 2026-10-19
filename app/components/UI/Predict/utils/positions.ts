import { PredictPositionStatus, type PredictPosition } from '../types';

/**
 * Whether a resolved position has something for the user to claim.
 *
 * Claim CTAs key off resolution status only. `WON` and `REDEEMABLE` are the
 * statuses with value left to redeem (wins, pushes, partial payouts); `LOST`
 * is redeemable on-chain but pays nothing, and `OPEN` is not resolved yet.
 * Value and P&L gating live in the provider's status classifier so every
 * surface (positions header, cards, market details, activity) agrees.
 */
export const isActionableClaimablePosition = (
  position: Pick<PredictPosition, 'status'>,
): boolean =>
  position.status === PredictPositionStatus.WON ||
  position.status === PredictPositionStatus.REDEEMABLE;
