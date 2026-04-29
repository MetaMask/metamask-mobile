import { renderHook, act } from '@testing-library/react-hooks';
import { useTrackClaimBonusClicked } from './useTrackClaimBonusClicked';
import { MetaMetricsEvents } from '../../../../../../core/Analytics';

const mockBuild = jest.fn().mockReturnValue({ name: 'event' });
const mockAddProperties = jest.fn().mockReturnValue({ build: mockBuild });
const mockCreateEventBuilder = jest
  .fn()
  .mockReturnValue({ addProperties: mockAddProperties });
const mockTrackEvent = jest.fn();

jest.mock('../../../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

describe('useTrackClaimBonusClicked', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fires MUSD_CLAIM_BONUS_BUTTON_CLICKED with the supplied location and Linea-mUSD asset metadata', () => {
    const { result } = renderHook(() => useTrackClaimBonusClicked());

    act(() => {
      result.current('home_section');
    });

    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.MUSD_CLAIM_BONUS_BUTTON_CLICKED,
    );
    expect(mockAddProperties).toHaveBeenCalledWith(
      expect.objectContaining({
        location: 'home_section',
        action_type: 'claim_bonus',
        asset_symbol: expect.any(String),
        network_chain_id: expect.any(String),
      }),
    );
    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
  });
});
