import Logger from '../../../../util/Logger';
import {
  clearReportedMoneyInterestError,
  getMoneyApiErrorDetails,
  reportMoneyInterestError,
  resetReportedMoneyInterestErrorsForTests,
} from './reportMoneyInterestError';

jest.mock('../../../../util/Logger', () => ({
  __esModule: true,
  default: { error: jest.fn() },
}));

const mockLoggerError = jest.mocked(Logger.error);

const createApiError = () =>
  Object.assign(
    new Error("Money Account API interest request failed with status '502'"),
    {
      name: 'MoneyAccountApiHttpError',
      httpStatus: 502,
      responseBody: '<html>Bad Gateway</html>',
      responseHeaders: { 'x-amzn-trace-id': 'Root=1-abc' },
    },
  );

describe('getMoneyApiErrorDetails', () => {
  it('reads the API diagnostics from the error', () => {
    expect(getMoneyApiErrorDetails(createApiError())).toStrictEqual({
      errorName: 'MoneyAccountApiHttpError',
      httpStatus: 502,
      responseBody: '<html>Bad Gateway</html>',
      responseHeaders: { 'x-amzn-trace-id': 'Root=1-abc' },
    });
  });

  it('keeps a null response body', () => {
    const error = Object.assign(new Error('failed'), {
      httpStatus: 500,
      responseBody: null,
    });

    expect(getMoneyApiErrorDetails(error)).toStrictEqual({
      errorName: 'Error',
      httpStatus: 500,
      responseBody: null,
    });
  });

  it('returns no diagnostics for non-object errors', () => {
    expect(getMoneyApiErrorDetails('boom')).toStrictEqual({});
  });
});

describe('reportMoneyInterestError', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetReportedMoneyInterestErrorsForTests();
  });

  it('reports a lifetime failure under its own feature tag with diagnostics', () => {
    const error = createApiError();

    reportMoneyInterestError('since_inception', error);

    expect(mockLoggerError).toHaveBeenCalledTimes(1);
    const [sentryError, options] = mockLoggerError.mock.calls[0];
    expect(sentryError.message).toBe(
      '[Money Account] Lifetime earnings fetch failed',
    );
    expect((sentryError as Error & { cause: unknown }).cause).toBe(error);
    expect(options).toStrictEqual({
      tags: { feature: 'money-lifetime-earnings', httpStatus: '502' },
      context: { name: 'money_interest', data: { window: 'since_inception' } },
      extras: {
        errorName: 'MoneyAccountApiHttpError',
        httpStatus: 502,
        responseBody: '<html>Bad Gateway</html>',
        responseHeaders: { 'x-amzn-trace-id': 'Root=1-abc' },
      },
    });
  });

  it('reports a 30-day failure under the money feature tag', () => {
    reportMoneyInterestError('30d', new Error('network down'));

    const [sentryError, options] = mockLoggerError.mock.calls[0];
    expect(sentryError.message).toBe('[Money Account] Interest fetch failed');
    expect(options).toStrictEqual({
      tags: { feature: 'money' },
      context: { name: 'money_interest', data: { window: '30d' } },
      extras: { errorName: 'Error' },
    });
  });

  it('does not re-report the same failure for a window', () => {
    reportMoneyInterestError('since_inception', createApiError());
    reportMoneyInterestError('since_inception', createApiError());

    expect(mockLoggerError).toHaveBeenCalledTimes(1);
  });

  it('reports each window independently', () => {
    reportMoneyInterestError('30d', createApiError());
    reportMoneyInterestError('since_inception', createApiError());

    expect(mockLoggerError).toHaveBeenCalledTimes(2);
  });

  it('reports again when the failure message changes', () => {
    reportMoneyInterestError('since_inception', new Error('timeout'));
    reportMoneyInterestError('since_inception', new Error('network'));

    expect(mockLoggerError).toHaveBeenCalledTimes(2);
  });

  it('reports again after the window recovers', () => {
    reportMoneyInterestError('since_inception', createApiError());
    clearReportedMoneyInterestError('since_inception');
    reportMoneyInterestError('since_inception', createApiError());

    expect(mockLoggerError).toHaveBeenCalledTimes(2);
  });
});
