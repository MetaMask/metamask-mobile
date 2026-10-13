import { MOCK_RECURRING_OPEN_ORDER } from '../../Bridge/api/recurringOrders.mock';
import { BridgeTabKey } from '../../Bridge/Views/BridgeView/BridgeView.constants';
import { getMostRecentOrderType } from './getMostRecentOrderType';

describe('getMostRecentOrderType', () => {
  it('returns recurring when a recurring order is available', () => {
    expect(
      getMostRecentOrderType({
        recurringOrder: MOCK_RECURRING_OPEN_ORDER,
      }),
    ).toBe(BridgeTabKey.Recurring);
  });

  it('returns undefined when no order is available', () => {
    expect(getMostRecentOrderType({})).toBeUndefined();
  });
});
