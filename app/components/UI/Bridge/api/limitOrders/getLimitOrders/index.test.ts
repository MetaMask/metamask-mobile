import {
  MOCK_LIMIT_CANCELLED_ORDER,
  MOCK_LIMIT_EXPIRED_ORDER,
  MOCK_LIMIT_FAILED_ORDER,
  MOCK_LIMIT_FILLED_ORDER,
  MOCK_LIMIT_OPEN_ORDER,
} from './mock';
import { getLimitOrders } from '.';
import { LimitOrderStatus } from './types';

const WALLET_ADDRESS = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';

describe('getLimitOrders', () => {
  it('returns orders matching the requested status, newest first', async () => {
    const result = await getLimitOrders({
      walletAddress: WALLET_ADDRESS,
      status: [LimitOrderStatus.Filled, LimitOrderStatus.Cancelled],
    });

    expect(result.orders.map(({ orderId }) => orderId)).toStrictEqual([
      MOCK_LIMIT_FILLED_ORDER.orderId,
      MOCK_LIMIT_CANCELLED_ORDER.orderId,
    ]);
  });

  it('returns every order when no status filter is given', async () => {
    const result = await getLimitOrders({ walletAddress: WALLET_ADDRESS });

    expect(result.orders).toHaveLength(5);
  });

  it('filters by chain id derived from the source asset', async () => {
    const result = await getLimitOrders({
      walletAddress: WALLET_ADDRESS,
      chainId: 'eip155:1',
    });

    expect(result.orders).toHaveLength(5);

    const noMatches = await getLimitOrders({
      walletAddress: WALLET_ADDRESS,
      chainId: 'eip155:56',
    });

    expect(noMatches.orders).toHaveLength(0);
  });

  it('paginates with an opaque cursor and omits it on the final page', async () => {
    const firstPage = await getLimitOrders({
      walletAddress: WALLET_ADDRESS,
      limit: 2,
    });

    expect(firstPage.orders.map(({ orderId }) => orderId)).toStrictEqual([
      MOCK_LIMIT_OPEN_ORDER.orderId,
      MOCK_LIMIT_FILLED_ORDER.orderId,
    ]);
    expect(firstPage.nextCursor).toEqual(expect.any(String));

    const secondPage = await getLimitOrders({
      walletAddress: WALLET_ADDRESS,
      limit: 2,
      cursor: firstPage.nextCursor,
    });

    expect(secondPage.orders.map(({ orderId }) => orderId)).toStrictEqual([
      MOCK_LIMIT_EXPIRED_ORDER.orderId,
      MOCK_LIMIT_CANCELLED_ORDER.orderId,
    ]);
    expect(secondPage.nextCursor).toEqual(expect.any(String));

    const thirdPage = await getLimitOrders({
      walletAddress: WALLET_ADDRESS,
      limit: 2,
      cursor: secondPage.nextCursor,
    });

    expect(thirdPage.orders.map(({ orderId }) => orderId)).toStrictEqual([
      MOCK_LIMIT_FAILED_ORDER.orderId,
    ]);
    expect(thirdPage.nextCursor).toBeUndefined();
  });

  it('stamps the requested wallet address onto both legs of every order', async () => {
    const result = await getLimitOrders({
      walletAddress: WALLET_ADDRESS,
      status: [LimitOrderStatus.Open],
    });

    expect(result.orders).toHaveLength(1);
    expect(result.orders[0].src.walletAddress).toBe(WALLET_ADDRESS);
    expect(result.orders[0].dest.walletAddress).toBe(WALLET_ADDRESS);
  });
});
