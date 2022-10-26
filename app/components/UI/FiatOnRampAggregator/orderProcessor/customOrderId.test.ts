import { OrderStatusEnum } from '@consensys/on-ramp-sdk';
import { SDK } from '../sdk';
import processCustomOrderId, { INITIAL_DELAY, SECOND } from './customOrderId';

describe('CustomOrderId processor', () => {
  afterEach(() => {
    jest.spyOn(Date, 'now').mockClear();
    jest.spyOn(SDK, 'orders').mockClear();
  });

  it('should return the same custom order object if the initial delay has not passed', async () => {
    const createdAt = 123;

    const dummmyCustomOrderIdData = {
      id: '1',
      chainId: '1',
      account: '0x123',
      createdAt,
      lastTimeFetched: 0,
      errorCount: 0,
    };

    jest
      .spyOn(Date, 'now')
      .mockImplementation(() => createdAt + INITIAL_DELAY - 1000);
    expect(await processCustomOrderId(dummmyCustomOrderIdData)).toEqual([
      dummmyCustomOrderIdData,
      null,
    ]);
  });

  it('should return the same custom order object if the error backoff has not passed', async () => {
    const createdAt = 0;
    const lastTimeFetched = INITIAL_DELAY + 1000;
    const errorCount = 3;

    const dummmyCustomOrderIdData = {
      id: '1',
      chainId: '1',
      account: '0x123',
      createdAt,
      lastTimeFetched,
      errorCount,
    };

    jest
      .spyOn(Date, 'now')
      .mockImplementation(
        () =>
          lastTimeFetched +
          Math.pow(INITIAL_DELAY / SECOND, errorCount + 1) * 60 * 1000 -
          1,
      );

    expect(await processCustomOrderId(dummmyCustomOrderIdData)).toEqual([
      dummmyCustomOrderIdData,
      null,
    ]);
  });

  it('should return a fiat order object when state is not CUSTOM_ID_REGISTERED', async () => {
    jest.spyOn(SDK, 'orders').mockImplementation(
      () =>
        ({
          getOrder: jest
            .fn()
            .mockResolvedValue({ status: OrderStatusEnum.Pending }),
        } as any),
    );

    jest.spyOn(Date, 'now').mockImplementation(() => INITIAL_DELAY + 1000);

    const dummmyCustomOrderIdData = {
      id: '1',
      chainId: '1',
      account: '0x123',
      createdAt: 0,
      lastTimeFetched: 0,
      errorCount: 0,
    };

    expect(await processCustomOrderId(dummmyCustomOrderIdData)).toEqual([
      dummmyCustomOrderIdData,
      { status: OrderStatusEnum.Pending },
    ]);
  });

  it('should update custom order object when state is Precreated', async () => {
    jest.spyOn(SDK, 'orders').mockImplementation(
      () =>
        ({
          getOrder: jest
            .fn()
            .mockResolvedValue({ status: OrderStatusEnum.Precreated }),
        } as any),
    );

    jest.spyOn(Date, 'now').mockImplementation(() => INITIAL_DELAY + 12345689);

    const dummmyCustomOrderIdData = {
      id: '1',
      chainId: '1',
      account: '0x123',
      createdAt: 0,
      lastTimeFetched: 0,
      errorCount: 0,
    };

    expect(await processCustomOrderId(dummmyCustomOrderIdData)).toEqual([
      { ...dummmyCustomOrderIdData, lastTimeFetched: INITIAL_DELAY + 12345689 },
      null,
    ]);
  });

  it('should return the same custom order object if the request error has no response code', async () => {
    jest.spyOn(SDK, 'orders').mockImplementation(
      () =>
        ({
          getOrder: jest.fn().mockImplementation(() => {
            throw new Error('Request error');
          }),
        } as any),
    );

    jest.spyOn(Date, 'now').mockImplementation(() => INITIAL_DELAY + 1000);

    const dummmyCustomOrderIdData = {
      id: '1',
      chainId: '1',
      account: '0x123',
      createdAt: 0,
      lastTimeFetched: 0,
      errorCount: 0,
    };

    expect(await processCustomOrderId(dummmyCustomOrderIdData)).toEqual([
      dummmyCustomOrderIdData,
      null,
    ]);
  });

  it('should update custom order object when error state is Precreated', async () => {
    jest.spyOn(SDK, 'orders').mockImplementation(
      () =>
        ({
          getOrder: jest.fn().mockResolvedValue({
            status: OrderStatusEnum.Precreated,
          }),
        } as any),
    );

    const now = INITIAL_DELAY + 123123123;

    jest.spyOn(Date, 'now').mockImplementation(() => now);

    const dummmyCustomOrderIdData = {
      id: '1',
      chainId: '1',
      account: '0x123',
      createdAt: 0,
      lastTimeFetched: now - 1,
      errorCount: 0,
    };

    expect(await processCustomOrderId(dummmyCustomOrderIdData)).toEqual([
      {
        ...dummmyCustomOrderIdData,
        lastTimeFetched: now,
      },
      null,
    ]);
  });

  it('should expire custom order object when state is IdExpired', async () => {
    jest.spyOn(SDK, 'orders').mockImplementation(
      () =>
        ({
          getOrder: jest.fn().mockResolvedValue({
            status: OrderStatusEnum.IdExpired,
          }),
        } as any),
    );

    const now = INITIAL_DELAY + 123123123;

    jest.spyOn(Date, 'now').mockImplementation(() => now);

    const dummmyCustomOrderIdData = {
      id: '1',
      chainId: '1',
      account: '0x123',
      createdAt: 0,
      errorCount: 0,
      lastTimeFetched: now - 1,
    };

    expect(await processCustomOrderId(dummmyCustomOrderIdData)).toEqual([
      {
        ...dummmyCustomOrderIdData,
        expired: true,
      },
      null,
    ]);
  });

  it('should update custom order object when state is Unknown', async () => {
    jest.spyOn(SDK, 'orders').mockImplementation(
      () =>
        ({
          getOrder: jest.fn().mockResolvedValue({
            status: OrderStatusEnum.Unknown,
          }),
        } as any),
    );

    const now = INITIAL_DELAY + 123123123;

    jest.spyOn(Date, 'now').mockImplementation(() => now);

    const dummmyCustomOrderIdData = {
      id: '1',
      chainId: '1',
      account: '0x123',
      createdAt: 0,
      lastTimeFetched: now - 1,
      errorCount: 0,
    };

    expect(await processCustomOrderId(dummmyCustomOrderIdData)).toEqual([
      {
        ...dummmyCustomOrderIdData,
        errorCount: 1,
        lastTimeFetched: now,
      },
      null,
    ]);
  });
});
