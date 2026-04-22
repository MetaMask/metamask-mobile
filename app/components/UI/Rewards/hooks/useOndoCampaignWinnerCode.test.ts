import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { selectRewardsSubscriptionId } from '../../../../selectors/rewards';
import { useOndoCampaignWinnerCode } from './useOndoCampaignWinnerCode';

jest.mock('../../../../core/Engine', () => ({
  controllerMessenger: {
    call: jest.fn(),
  },
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockCall = Engine.controllerMessenger.call as jest.MockedFunction<
  typeof Engine.controllerMessenger.call
>;

describe('useOndoCampaignWinnerCode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectRewardsSubscriptionId) {
        return 'subscription-1';
      }
      return null;
    });
  });

  it('returns fetched code after a successful controller call', async () => {
    mockCall.mockResolvedValue('PRIZE-99');
    const { result } = renderHook(() =>
      useOndoCampaignWinnerCode('campaign-abc'),
    );

    await waitFor(() => expect(result.current.hasFetched).toBe(true));
    expect(result.current.code).toBe('PRIZE-99');
    expect(result.current.hasError).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(mockCall).toHaveBeenCalledWith(
      'RewardsController:getOndoCampaignWinnerCode',
      'campaign-abc',
      'subscription-1',
    );
  });

  it('does not call the controller when subscription id is missing', async () => {
    mockUseSelector.mockReturnValue(null);
    const { result } = renderHook(() =>
      useOndoCampaignWinnerCode('campaign-abc'),
    );

    await act(async () => {
      await Promise.resolve();
    });
    expect(mockCall).not.toHaveBeenCalled();
    expect(result.current.hasFetched).toBe(false);
  });

  it('does not call the controller when campaign id is empty', async () => {
    const { result } = renderHook(() => useOndoCampaignWinnerCode(''));

    await act(async () => {
      await Promise.resolve();
    });
    expect(mockCall).not.toHaveBeenCalled();
    expect(result.current.hasFetched).toBe(false);
  });

  it('sets hasError and null code when the controller throws', async () => {
    mockCall.mockRejectedValue(new Error('network'));
    const { result } = renderHook(() =>
      useOndoCampaignWinnerCode('campaign-abc'),
    );

    await waitFor(() => expect(result.current.hasFetched).toBe(true));
    expect(result.current.hasError).toBe(true);
    expect(result.current.code).toBeNull();
  });

  it('retry re-invokes the controller', async () => {
    mockCall.mockResolvedValueOnce('FIRST').mockResolvedValueOnce('SECOND');
    const { result } = renderHook(() =>
      useOndoCampaignWinnerCode('campaign-abc'),
    );

    await waitFor(() => expect(result.current.code).toBe('FIRST'));
    await act(async () => {
      await result.current.retry();
    });
    await waitFor(() => expect(result.current.code).toBe('SECOND'));
    expect(mockCall).toHaveBeenCalledTimes(2);
  });

  it('sets isLoading true while the controller promise is pending', async () => {
    let resolvePromise: (value: string) => void = () => undefined;
    const pending = new Promise<string>((resolve) => {
      resolvePromise = resolve;
    });
    mockCall.mockReturnValueOnce(pending);

    const { result } = renderHook(() =>
      useOndoCampaignWinnerCode('campaign-abc'),
    );

    await waitFor(() => expect(result.current.isLoading).toBe(true));
    await act(async () => {
      resolvePromise('LATE');
    });
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.code).toBe('LATE');
    });
  });
});
