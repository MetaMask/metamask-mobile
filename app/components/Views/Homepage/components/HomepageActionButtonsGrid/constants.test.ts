import {
  ACTION_POSITION_BY_INDEX,
  getOrderedButtonRows,
  ROW1_BUTTON_IDS,
  ROW2_BUTTON_IDS,
} from './constants';
import { ActionPosition } from '../../../../../util/analytics/actionButtonTracking';

describe('HomepageActionButtonsGrid constants', () => {
  it('returns Row 1 then Row 2 for row1Top', () => {
    expect(getOrderedButtonRows('row1Top')).toEqual([
      ROW1_BUTTON_IDS,
      ROW2_BUTTON_IDS,
    ]);
  });

  it('returns Row 2 then Row 1 for row2Top', () => {
    expect(getOrderedButtonRows('row2Top')).toEqual([
      ROW2_BUTTON_IDS,
      ROW1_BUTTON_IDS,
    ]);
  });

  it('maps eight on-screen slots to ActionPosition 0–7', () => {
    expect(ACTION_POSITION_BY_INDEX).toEqual([
      ActionPosition.FIRST_POSITION,
      ActionPosition.SECOND_POSITION,
      ActionPosition.THIRD_POSITION,
      ActionPosition.FOURTH_POSITION,
      ActionPosition.FIFTH_POSITION,
      ActionPosition.SIXTH_POSITION,
      ActionPosition.SEVENTH_POSITION,
      ActionPosition.EIGHTH_POSITION,
    ]);
  });
});
