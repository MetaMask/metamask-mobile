import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { selectRewardsSubscriptionId } from '../../../../selectors/rewards';
import { useOndoCampaignWinnerCode } from './useOndoCampaignWinnerCode';

jest.mock('./__devWinnerMock', () => ({
  DEV_WINNER_MOCK_ENABLED: true,
  DEV_MOCK_WINNER_CODE: 'DEV-MOCK-CODE-42',
}));

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

describe('useOndoCampaignWinnerCode (dev winner mock enabled)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectRewardsSubscriptionId) {
        return 'subscription-dev';
      }
      return null;
    });
  });

  it('returns the dev mock code and stable flags regardless of fetch outcome', async () => {
    mockCall.mockResolvedValue('FROM_CONTROLLER');
    const { result } = renderHook(() =>
      useOndoCampaignWinnerCode('campaign-dev'),
    );

    await waitFor(() => expect(result.current.hasFetched).toBe(true));
    expect(result.current.code).toBe('DEV-MOCK-CODE-42');
    expect(result.current.isLoading).toBe(false);
    expect(result.current.hasError).toBe(false);
  });

  it('exposes retry that still invokes the controller when ids are present', async () => {
    mockCall.mockResolvedValue('IGNORED');
    const { result } = renderHook(() =>
      useOndoCampaignWinnerCode('campaign-dev'),
    );

    await waitFor(() => expect(result.current.hasFetched).toBe(true));
    await act(async () => {
      await result.current.retry();
    });
    await waitFor(() => expect(mockCall).toHaveBeenCalledTimes(2));
  });
});
