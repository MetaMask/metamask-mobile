import stateHasOrder from './stateHasOrder';
import { getOrders } from '../../../../reducers/fiatOrders';
import type { RootState } from '../../../../reducers';
import { FiatOrder } from '../../../../reducers/fiatOrders/types';

jest.mock('../../../../reducers/fiatOrders', () => ({
  getOrders: jest.fn(),
}));

describe('stateHasOrder', () => {
  it('should return true if state has order', () => {
    (getOrders as jest.MockedFunction<typeof getOrders>).mockReturnValueOnce([
      { id: '1' },
      { id: '2' },
      { id: '3' },
    ] as FiatOrder[]);
    expect(stateHasOrder({} as RootState, { id: '1' } as FiatOrder)).toBe(true);
  });

  it('should return false if state does not have the order', () => {
    (getOrders as jest.MockedFunction<typeof getOrders>).mockReturnValueOnce([
      { id: '1' },
      { id: '2' },
      { id: '3' },
    ] as FiatOrder[]);
    expect(stateHasOrder({} as RootState, { id: '4' } as FiatOrder)).toBe(
      false,
    );
  });
});
