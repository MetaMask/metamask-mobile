import { OrderStatusEnum } from '@consensys/on-ramp-sdk';
import { SDK } from '../sdk';
import processCustomOrderId, {
  createCustomOrderIdData,
  MAX_ERROR_COUNT,
  POLLING_FRECUENCY_IN_SECONDS,
} from './customOrderId';

describe('createCustomOrderIdData', () => {
  it('should return a custom order id data object', () => {
    jest.spyOn(Date, 'now').mockImplementationOnce(() => 123123);

    const customIdData = createCustomOrderIdData('test-id', '1', '0x123');
    expect(customIdData).toEqual({
      id: 'test-id',
      chainId: '1',
      account: '0x123',
      createdAt: 123123,
      lastTimeFetched: 0,
      errorCount: 0,
    });
  });
});

describe('CustomOrderId processor', () => {
  afterEach(() => {
    jest.spyOn(Date, 'now').mockClear();
    jest.spyOn(SDK, 'orders').mockClear();
  });

  it('should return the same custom order object if the error backoff has not passed', async () => {
    const createdAt = 0;
    const lastTimeFetched = 1000;
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
          Math.pow(POLLING_FRECUENCY_IN_SECONDS, errorCount + 1) * 1000 -
          1,
      );

    jest.spyOn(SDK, 'orders').mockImplementation(
      () =>
        ({
          getOrder: jest.fn().mockResolvedValue({
            status: OrderStatusEnum.Precreated,
            lastTimeFetched: 1000 + 1,
          }),
        } as any),
    );

    expect(await processCustomOrderId(dummmyCustomOrderIdData)).toEqual([
      dummmyCustomOrderIdData,
      null,
    ]);
  });

  it('should return an updated object if the error backoff has passed', async () => {
    const createdAt = 0;
    const lastTimeFetched = 1000;
    const errorCount = 3;

    const dummmyCustomOrderIdData = {
      id: '1',
      chainId: '1',
      account: '0x123',
      createdAt,
      lastTimeFetched,
      errorCount,
    };

    const now =
      lastTimeFetched +
      Math.pow(POLLING_FRECUENCY_IN_SECONDS, errorCount + 1) * 1000 +
      1;

    jest.spyOn(Date, 'now').mockImplementation(() => now);
    jest.spyOn(SDK, 'orders').mockImplementation(
      () =>
        ({
          getOrder: jest.fn().mockResolvedValue({
            status: OrderStatusEnum.Precreated,
          }),
        } as any),
    );

    expect(await processCustomOrderId(dummmyCustomOrderIdData)).toEqual([
      { ...dummmyCustomOrderIdData, errorCount: 0, lastTimeFetched: now },
      null,
    ]);
  });

  it('should return a fiat order object when state is not Precreated', async () => {
    jest.spyOn(SDK, 'orders').mockImplementation(
      () =>
        ({
          getOrder: jest
            .fn()
            .mockResolvedValue({ status: OrderStatusEnum.Pending }),
        } as any),
    );

    jest.spyOn(Date, 'now').mockImplementation(() => 1000);

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

    jest.spyOn(Date, 'now').mockImplementation(() => 12345689);

    const dummmyCustomOrderIdData = {
      id: '1',
      chainId: '1',
      account: '0x123',
      createdAt: 0,
      lastTimeFetched: 0,
      errorCount: 0,
    };

    expect(await processCustomOrderId(dummmyCustomOrderIdData)).toEqual([
      { ...dummmyCustomOrderIdData, lastTimeFetched: 12345689 },
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

    jest.spyOn(Date, 'now').mockImplementation(() => 1000);

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

    const now = 123123123;

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

  it('should expire custom order object when it reaches MAX_ERROR_COUNT', async () => {
    jest.spyOn(SDK, 'orders').mockImplementation(
      () =>
        ({
          getOrder: jest.fn().mockResolvedValue({
            status: OrderStatusEnum.Unknown,
          }),
        } as any),
    );

    const errorCount = MAX_ERROR_COUNT;

    const now = Math.pow(POLLING_FRECUENCY_IN_SECONDS, errorCount + 1) * 1000;

    jest.spyOn(Date, 'now').mockImplementation(() => now);

    const dummmyCustomOrderIdData = {
      id: '1',
      chainId: '1',
      account: '0x123',
      createdAt: 0,
      lastTimeFetched: 0,
      errorCount,
    };

    expect(await processCustomOrderId(dummmyCustomOrderIdData)).toEqual([
      {
        ...dummmyCustomOrderIdData,
        expired: true,
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

    const now = 123123123;

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

    const now = 123123123;

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
