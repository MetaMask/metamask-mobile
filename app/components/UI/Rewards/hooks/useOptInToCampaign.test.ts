import { renderHook, act } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { useOptInToCampaign } from './useOptInToCampaign';
import Engine from '../../../../core/Engine';
import { selectRewardsSubscriptionId } from '../../../../selectors/rewards';
import { selectCampaignsRewardsEnabledFlag } from '../../../../selectors/featureFlagController/rewards';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../core/Engine', () => ({
  controllerMessenger: { call: jest.fn() },
}));

jest.mock('../../../../selectors/rewards', () => ({
  selectRewardsSubscriptionId: jest.fn(),
}));

jest.mock('../../../../selectors/featureFlagController/rewards', () => ({
  selectCampaignsRewardsEnabledFlag: jest.fn(),
}));

const mockCall = Engine.controllerMessenger.call as jest.MockedFunction<
  typeof Engine.controllerMessenger.call
>;
const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

const SUB_ID = 'sub-123';
const CAMPAIGN_ID = 'camp-456';
const STATUS = { optedIn: true };

function setupSelectors(
  subscriptionId: string | null,
  campaignsEnabled: boolean,
) {
  mockUseSelector.mockImplementation((selector) => {
    if (selector === selectRewardsSubscriptionId) return subscriptionId;
    if (selector === selectCampaignsRewardsEnabledFlag) return campaignsEnabled;
    return undefined;
  });
}

describe('useOptInToCampaign', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null when feature flag is disabled', async () => {
    setupSelectors(SUB_ID, false);
    const { result } = renderHook(() => useOptInToCampaign());
    let returnValue;
    await act(async () => {
      returnValue = await result.current.optInToCampaign(CAMPAIGN_ID);
    });
    expect(returnValue).toBeNull();
    expect(mockCall).not.toHaveBeenCalled();
  });

  it('returns null when subscriptionId is missing', async () => {
    setupSelectors(null, true);
    const { result } = renderHook(() => useOptInToCampaign());
    let returnValue;
    await act(async () => {
      returnValue = await result.current.optInToCampaign(CAMPAIGN_ID);
    });
    expect(returnValue).toBeNull();
    expect(mockCall).not.toHaveBeenCalled();
  });

  it('calls the controller and returns status on success', async () => {
    setupSelectors(SUB_ID, true);
    mockCall.mockResolvedValueOnce(STATUS as never);

    const { result } = renderHook(() => useOptInToCampaign());
    let returnValue;
    await act(async () => {
      returnValue = await result.current.optInToCampaign(CAMPAIGN_ID);
    });

    expect(mockCall).toHaveBeenCalledWith(
      'RewardsController:optInToCampaign',
      CAMPAIGN_ID,
      SUB_ID,
    );
    expect(returnValue).toEqual(STATUS);
    expect(result.current.isOptingIn).toBe(false);
    expect(result.current.optInError).toBeUndefined();
  });

  it('sets optInError and rethrows on failure', async () => {
    setupSelectors(SUB_ID, true);
    mockCall.mockRejectedValueOnce(new Error('Network error') as never);

    const { result } = renderHook(() => useOptInToCampaign());
    await act(async () => {
      await expect(result.current.optInToCampaign(CAMPAIGN_ID)).rejects.toThrow(
        'Network error',
      );
    });

    expect(result.current.optInError).toBe('Network error');
    expect(result.current.isOptingIn).toBe(false);
  });

  it('clears optInError when clearOptInError is called', async () => {
    setupSelectors(SUB_ID, true);
    mockCall.mockRejectedValueOnce(new Error('err') as never);

    const { result } = renderHook(() => useOptInToCampaign());
    await act(async () => {
      await expect(
        result.current.optInToCampaign(CAMPAIGN_ID),
      ).rejects.toThrow();
    });
    expect(result.current.optInError).toBeDefined();

    act(() => result.current.clearOptInError());
    expect(result.current.optInError).toBeUndefined();
  });
});
