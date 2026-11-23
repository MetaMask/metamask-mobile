import { renderHook, act } from '@testing-library/react-hooks';
import type { TransakBuyQuote } from '@metamask/ramps-controller';
import { useMicaFormRetry, type MicaFormType } from './useMicaFormRetry';
import Logger from '../../../../util/Logger';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('../../../../util/Logger', () => ({
  error: jest.fn(),
}));

describe('useMicaFormRetry', () => {
  const quote = { quoteId: 'quote-1' } as unknown as TransakBuyQuote;
  const getAdditionalRequirements = jest.fn();
  const setError = jest.fn();

  const renderRetry = (
    formType: MicaFormType = 'SOURCE_OF_INCOME',
    headlessSessionId?: string,
  ) =>
    renderHook(() =>
      useMicaFormRetry({
        formType,
        quote,
        quoteId: 'quote-1',
        headlessSessionId,
        getAdditionalRequirements,
        setError,
        fallbackError: 'fallback error',
        logContext: 'TestScreen',
      }),
    );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reopens the source of income form with the fresh metadata', async () => {
    const metadata = { options: [{ name: 'Savings', value: 'savings' }] };
    getAdditionalRequirements.mockResolvedValue({
      formsRequired: [
        { type: 'ADDITIONAL_DETAILS_NATIONALITY', metadata: {} },
        { type: 'SOURCE_OF_INCOME', metadata },
      ],
    });
    const { result } = renderRetry();

    await act(async () => {
      await result.current.retry();
    });

    expect(getAdditionalRequirements).toHaveBeenCalledWith('quote-1');
    expect(setError).toHaveBeenCalledWith(null);
    expect(mockNavigate).toHaveBeenCalledWith('RampSourceOfIncome', {
      quote,
      quoteId: 'quote-1',
      metadata,
    });
    expect(result.current.retrying).toBe(false);
  });

  it('keeps the headless session when reopening the nationality form', async () => {
    const metadata = { employmentStatusOptions: [] };
    getAdditionalRequirements.mockResolvedValue({
      formsRequired: [{ type: 'ADDITIONAL_DETAILS_NATIONALITY', metadata }],
    });
    const { result } = renderRetry(
      'ADDITIONAL_DETAILS_NATIONALITY',
      'headless-1',
    );

    await act(async () => {
      await result.current.retry();
    });

    expect(mockNavigate).toHaveBeenCalledWith(
      'RampAdditionalDetailsNationality',
      {
        quote,
        quoteId: 'quote-1',
        metadata,
        headlessSessionId: 'headless-1',
      },
    );
  });

  it('does nothing when the form is no longer required', async () => {
    getAdditionalRequirements.mockResolvedValue({ formsRequired: [] });
    const { result } = renderRetry();

    await act(async () => {
      await result.current.retry();
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('logs and reports an error when the refetch fails', async () => {
    const fetchError = new Error('network down');
    getAdditionalRequirements.mockRejectedValue(fetchError);
    const { result } = renderRetry();

    await act(async () => {
      await result.current.retry();
    });

    expect(Logger.error).toHaveBeenCalledWith(
      fetchError,
      'TestScreen: Failed to retry fetch requirements',
    );
    expect(setError).toHaveBeenLastCalledWith(expect.any(String));
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(result.current.retrying).toBe(false);
  });
});
