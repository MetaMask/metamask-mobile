import Logger from '../../../../util/Logger';
import { reportRampsError } from './reportRampsError';

jest.mock('../../../../util/Logger', () => ({
  error: jest.fn(),
}));

jest.mock('./parseUserFacingError', () => ({
  parseUserFacingError: (_err: unknown, fallback: string) => fallback,
}));

describe('reportRampsError', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls Logger.error with error and context', () => {
    const err = new Error('Test error');
    reportRampsError(
      err,
      { provider: 'paypal', message: 'Widget failed' },
      'Fallback',
    );
    expect(Logger.error).toHaveBeenCalledWith(err, {
      provider: 'paypal',
      message: 'Widget failed',
    });
  });

  it('passes empty object when context is undefined', () => {
    reportRampsError(new Error('x'), undefined, 'Fallback');
    expect(Logger.error).toHaveBeenCalledWith(expect.any(Error), {});
  });

  it('returns result of parseUserFacingError', () => {
    const fallback = 'Something went wrong';
    const result = reportRampsError(new Error('x'), {}, fallback);
    expect(result).toBe(fallback);
  });
});
