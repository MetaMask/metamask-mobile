import { ActionPosition } from '../../../../../util/analytics/actionButtonTracking';
import type { HomepageActionButtonsGridRowOrder } from '../../abTestConfig';

/**
 * Row 1 (Figma Treatment 4): Buy, Sell, Send, Receive
 * Row 2: Swap, Perps, Predict, Traders
 */
export const HOMEPAGE_ACTION_BUTTON_IDS = [
  'buy',
  'sell',
  'send',
  'receive',
  'swap',
  'perps',
  'predict',
  'traders',
] as const;

export type HomepageActionButtonId =
  (typeof HOMEPAGE_ACTION_BUTTON_IDS)[number];

export const ROW1_BUTTON_IDS: HomepageActionButtonId[] = [
  'buy',
  'sell',
  'send',
  'receive',
];

export const ROW2_BUTTON_IDS: HomepageActionButtonId[] = [
  'swap',
  'perps',
  'predict',
  'traders',
];

export const ACTION_POSITION_BY_INDEX: ActionPosition[] = [
  ActionPosition.FIRST_POSITION,
  ActionPosition.SECOND_POSITION,
  ActionPosition.THIRD_POSITION,
  ActionPosition.FOURTH_POSITION,
  ActionPosition.FIFTH_POSITION,
  ActionPosition.SIXTH_POSITION,
  ActionPosition.SEVENTH_POSITION,
  ActionPosition.EIGHTH_POSITION,
];

export const getOrderedButtonRows = (
  rowOrder: HomepageActionButtonsGridRowOrder,
): HomepageActionButtonId[][] =>
  rowOrder === 'row1Top'
    ? [ROW1_BUTTON_IDS, ROW2_BUTTON_IDS]
    : [ROW2_BUTTON_IDS, ROW1_BUTTON_IDS];
