import { renderHook, act } from '@testing-library/react-hooks';
import type { TransakBuyQuote } from '@metamask/ramps-controller';
import { useMicaSubmit } from './useMicaSubmit';
import Logger from '../../../../util/Logger';

const mockRouteAfterAuthentication = jest.fn();
const mockUseTransakRouting = jest.fn();

jest.mock('./useTransakRouting', () => ({
  useTransakRouting: (config: unknown) => {
    mockUseTransakRouting(config);
    return { routeAfterAuthentication: mockRouteAfterAuthentication };
  },
}));

jest.mock('../../../../util/Logger', () => ({
  error: jest.fn(),
}));

describe('useMicaSubmit', () => {
  const quote = { quoteId: 'quote-1' } as unknown as TransakBuyQuote;
  const getKycRequirement = jest.fn();
  const getAdditionalRequirements = jest.fn();

  const renderSubmit = (headlessSessionId?: string) =>
    renderHook(() =>
      useMicaSubmit({
        screenLocation: 'Test Screen',
        quote,
        quoteId: 'quote-1',
        headlessSessionId,
        getKycRequirement,
        getAdditionalRequirements,
        submitError: 'submit error',
        logContext: 'TestScreen',
      }),
    );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('refreshes the KYC requirements and routes after a successful submit', async () => {
    const { result } = renderSubmit();

    await act(async () => {
      await result.current.submit(async () => ({ status: 'SUBMITTED' }));
    });

    expect(getKycRequirement).toHaveBeenCalledWith('quote-1');
    expect(getAdditionalRequirements).toHaveBeenCalledWith('quote-1');
    expect(mockRouteAfterAuthentication).toHaveBeenCalledWith(quote);
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('shows the submit error and stays on the screen when the status is FAILED', async () => {
    const { result } = renderSubmit();

    await act(async () => {
      await result.current.submit(async () => ({ status: 'FAILED' }));
    });

    expect(result.current.error).toBe('submit error');
    expect(getKycRequirement).not.toHaveBeenCalled();
    expect(mockRouteAfterAuthentication).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
  });

  it('logs with the given message and reports an error when the submit throws', async () => {
    const submitFailure = new Error('boom');
    const { result } = renderSubmit();

    await act(async () => {
      await result.current.submit(async () => {
        throw submitFailure;
      }, 'Failed to retry');
    });

    expect(Logger.error).toHaveBeenCalledWith(
      submitFailure,
      'TestScreen: Failed to retry',
    );
    expect(result.current.error).toEqual(expect.any(String));
    expect(mockRouteAfterAuthentication).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
  });

  it('routes back to the headless host when a headless session is active', () => {
    renderSubmit('headless-1');

    expect(mockUseTransakRouting).toHaveBeenCalledWith({
      screenLocation: 'Test Screen',
      baseRoute: 'RampHeadlessHost',
      baseRouteParams: { headlessSessionId: 'headless-1' },
    });
  });

  it('keeps the default base route outside headless flows', () => {
    renderSubmit();

    expect(mockUseTransakRouting).toHaveBeenCalledWith({
      screenLocation: 'Test Screen',
    });
  });
});
