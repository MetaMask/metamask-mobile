import { handleProviderEventMessage } from './providerEventBridge';
import Logger from '../../../../util/Logger';

jest.mock('../../../../util/Logger', () => ({
  log: jest.fn(),
}));

const originalDev = globalThis.__DEV__;

describe('handleProviderEventMessage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (globalThis as Record<string, unknown>).__DEV__ = true;
  });

  afterAll(() => {
    (globalThis as Record<string, unknown>).__DEV__ = originalDev;
  });

  it('logs a SENT provider event in __DEV__ mode', () => {
    const message = JSON.stringify({
      type: '__PROVIDER_EVENT__',
      payload: JSON.stringify({
        event: 'TRANSAK_ORDER_CREATED',
        data: { orderId: '123' },
      }),
      origin: 'https://global.transak.com',
    });

    const result = handleProviderEventMessage(message, 'Transak');

    expect(result).toBe(true);
    expect(Logger.log).toHaveBeenCalledWith(
      expect.stringContaining('[Ramp Provider Event] [SENT] provider=Transak'),
    );
    expect(Logger.log).toHaveBeenCalledWith(
      expect.stringContaining('TRANSAK_ORDER_CREATED'),
    );
  });

  it('logs a RECEIVED provider event', () => {
    const message = JSON.stringify({
      type: '__PROVIDER_EVENT_RECEIVED__',
      payload: JSON.stringify({ step: 'payment' }),
      origin: 'https://buy.moonpay.com',
    });

    const result = handleProviderEventMessage(message, 'MoonPay');

    expect(result).toBe(true);
    expect(Logger.log).toHaveBeenCalledWith(
      expect.stringContaining('[RECEIVED] provider=MoonPay'),
    );
  });

  it('returns false for non-provider messages', () => {
    const message = JSON.stringify({
      type: 'SOME_OTHER_MESSAGE',
      data: 'test',
    });

    const result = handleProviderEventMessage(message);

    expect(result).toBe(false);
    expect(Logger.log).not.toHaveBeenCalled();
  });

  it('returns false for unparseable messages', () => {
    const result = handleProviderEventMessage('not json');

    expect(result).toBe(false);
    expect(Logger.log).not.toHaveBeenCalled();
  });

  it('handles string payloads that are not valid JSON', () => {
    const message = JSON.stringify({
      type: '__PROVIDER_EVENT__',
      payload: 'just a plain string',
      origin: '*',
    });

    const result = handleProviderEventMessage(message);

    expect(result).toBe(true);
    expect(Logger.log).toHaveBeenCalledWith(
      expect.stringContaining('just a plain string'),
    );
  });

  it('defaults provider to unknown when not provided', () => {
    const message = JSON.stringify({
      type: '__PROVIDER_EVENT__',
      payload: '{}',
      origin: '*',
    });

    const result = handleProviderEventMessage(message);

    expect(result).toBe(true);
    expect(Logger.log).toHaveBeenCalledWith(
      expect.stringContaining('provider=unknown'),
    );
  });

  it('returns false when __DEV__ is false', () => {
    (globalThis as Record<string, unknown>).__DEV__ = false;

    const message = JSON.stringify({
      type: '__PROVIDER_EVENT__',
      payload: '{}',
      origin: '*',
    });

    const result = handleProviderEventMessage(message);

    expect(result).toBe(false);
    expect(Logger.log).not.toHaveBeenCalled();
  });
});
