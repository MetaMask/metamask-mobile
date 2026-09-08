import Logger from '../../../util/Logger';
import { resolvePredictApiBaseUrl } from './predict-next-config';

jest.mock('../../../util/Logger');

describe('resolvePredictApiBaseUrl', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns a well-formed base URL unchanged', () => {
    const baseUrl = resolvePredictApiBaseUrl('https://predict.example/');

    expect(baseUrl).toBe('https://predict.example/');
    expect(Logger.error).not.toHaveBeenCalled();
  });

  it('treats an absent URL as unconfigured rather than an error', () => {
    const baseUrl = resolvePredictApiBaseUrl(undefined);

    expect(baseUrl).toBeUndefined();
    expect(Logger.error).not.toHaveBeenCalled();
  });

  it('reports a malformed URL as an error', () => {
    const baseUrl = resolvePredictApiBaseUrl('not a URL');

    expect(baseUrl).toBeUndefined();
    expect(Logger.error).toHaveBeenCalledWith(expect.any(Error));
  });
});
