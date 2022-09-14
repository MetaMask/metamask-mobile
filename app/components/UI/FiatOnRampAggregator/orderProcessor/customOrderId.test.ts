import { SDK } from '../sdk';
import processCustomOrderId, {
  INITIAL_DELAY,
  EXPIRATION_TIME,
  SECOND,
} from './customOrderId';

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
            .mockResolvedValue({ status: 'NOT_CUSTOM_ID_REGISTERED' }),
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
      { status: 'NOT_CUSTOM_ID_REGISTERED' },
    ]);
  });

  it('should update custom order object when state is CUSTOM_ID_REGISTERED', async () => {
    jest.spyOn(SDK, 'orders').mockImplementation(
      () =>
        ({
          getOrder: jest
            .fn()
            .mockResolvedValue({ status: 'CUSTOM_ID_REGISTERED' }),
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

  it('should update custom order object when error is 4xx and within expiration time', async () => {
    jest.spyOn(SDK, 'orders').mockImplementation(
      () =>
        ({
          getOrder: jest.fn().mockImplementation(() => {
            // eslint-disable-next-line no-throw-literal
            throw { response: { status: 404 } };
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
      lastTimeFetched: now - 1.5 * EXPIRATION_TIME,
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

  it('should expire custom order object when error is 4xx and is over expiration time', async () => {
    jest.spyOn(SDK, 'orders').mockImplementation(
      () =>
        ({
          getOrder: jest.fn().mockImplementation(() => {
            // eslint-disable-next-line no-throw-literal
            throw { response: { status: 404 } };
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
      lastTimeFetched: now + EXPIRATION_TIME,
      errorCount: 0,
    };

    expect(await processCustomOrderId(dummmyCustomOrderIdData)).toEqual([
      {
        ...dummmyCustomOrderIdData,
        expired: true,
      },
      null,
    ]);
  });

  it('should update custom order object when error is 5xx', async () => {
    jest.spyOn(SDK, 'orders').mockImplementation(
      () =>
        ({
          getOrder: jest.fn().mockImplementation(() => {
            // eslint-disable-next-line no-throw-literal
            throw { response: { status: 503 } };
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
      lastTimeFetched: now - 1.5 * EXPIRATION_TIME,
      errorCount: 0,
    };

    expect(await processCustomOrderId(dummmyCustomOrderIdData)).toEqual([
      {
        ...dummmyCustomOrderIdData,
        lastTimeFetched: now,
        errorCount: 1,
      },
      null,
    ]);
  });
});
