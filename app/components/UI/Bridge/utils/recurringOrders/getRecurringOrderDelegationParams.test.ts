import type { Hex } from '@metamask/utils';
import { getDelegatorAccountId } from '../../api/limitOrders/getDelegations/utils';
import { getRecurringOrderDelegationParams } from './getRecurringOrderDelegationParams';

jest.mock('../../api/limitOrders/getDelegations/utils', () => ({
  getDelegatorAccountId: jest.fn(),
}));

const accountAddress = 'eip155:1:0x1234567890123456789012345678901234567890';
const sourceToken = {
  address: '0x0000000000000000000000000000000000000000',
  chainId: '0x1' as Hex,
  decimals: 18,
  image: '',
  name: 'Ether',
  symbol: 'ETH',
};
const destToken = {
  address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  chainId: '0x1' as Hex,
  decimals: 6,
  image: '',
  name: 'USD Coin',
  symbol: 'USDC',
};

describe('getRecurringOrderDelegationParams', () => {
  beforeEach(() => {
    jest.mocked(getDelegatorAccountId).mockReturnValue(accountAddress);
  });

  it('builds the documented delegation query from the recurring draft', () => {
    expect(
      getRecurringOrderDelegationParams({
        clientOrderId: 'client-order-id',
        sourceToken,
        destToken,
        sourceAmount: '1.25',
        recurring: {
          everyValue: '2',
          everyUnit: 'day',
          repeatCount: '4',
        },
        getSelectedAccountByScope: jest.fn(),
      }),
    ).toStrictEqual({
      clientOrderId: 'client-order-id',
      accountAddress,
      srcAssetId: 'eip155:1/slip44:60',
      srcAmount: '1250000000000000000',
      destAssetId: 'eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      every: 2,
      unit: 'day',
      repeatCount: 4,
    });
  });

  it('rejects an invalid schedule before making a request', () => {
    expect(() =>
      getRecurringOrderDelegationParams({
        clientOrderId: 'client-order-id',
        sourceToken,
        destToken,
        sourceAmount: '1',
        recurring: {
          everyValue: '0',
          everyUnit: 'day',
          repeatCount: '4',
        },
        getSelectedAccountByScope: jest.fn(),
      }),
    ).toThrow('Invalid recurring order input');
  });
});
