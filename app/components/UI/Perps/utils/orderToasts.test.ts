import { getStandardOrderManagementToastKey } from './orderToasts';

describe('getStandardOrderManagementToastKey', () => {
  it.each([
    [undefined, 'market'],
    ['market', 'market'],
    ['limit', 'limit'],
    ['stop_market', 'limit'],
    ['stop_limit', 'limit'],
    ['take_profit_market', 'limit'],
    ['take_profit_limit', 'limit'],
  ] as const)('maps %s to %s toast copy', (orderType, expected) => {
    const toastKey = getStandardOrderManagementToastKey(orderType);

    expect(toastKey).toBe(expected);
  });
});
