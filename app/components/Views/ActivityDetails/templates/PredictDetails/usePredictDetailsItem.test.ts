import { renderHook } from '@testing-library/react-hooks';
import {
  mapPredictActivity,
  type ActivityListItem,
} from '#app/util/activity-adapters';
import { usePredictActivity } from '#app/components/UI/Predict/hooks/usePredictActivity';
import { usePredictDetailsItem } from './usePredictDetailsItem';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(() => true),
}));

jest.mock('#app/components/UI/Predict/hooks/usePredictActivity', () => ({
  usePredictActivity: jest.fn(),
}));

jest.mock('#app/util/activity-adapters', () => ({
  mapPredictActivity: jest.fn(),
}));

const usePredictActivityMock = jest.mocked(usePredictActivity);
const mapPredictActivityMock = jest.mocked(mapPredictActivity);
const activity = { id: 'p1' };
const mappedActivity = {
  type: 'predictionPlaced',
  hash: 'p1',
} as ActivityListItem;

describe('usePredictDetailsItem', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    usePredictActivityMock.mockReturnValue({
      activity: [activity],
      isLoading: false,
      isFetching: false,
    } as ReturnType<typeof usePredictActivity>);
    mapPredictActivityMock.mockReturnValue(mappedActivity);
  });

  it('returns the activity matching the identifier', () => {
    const { result } = renderHook(() => usePredictDetailsItem('P1'));

    expect(result.current.activity).toBe(activity);
    expect(result.current.item).toBe(mappedActivity);
  });

  it('returns undefined when nothing matches', () => {
    const { result } = renderHook(() => usePredictDetailsItem('missing'));

    expect(result.current.activity).toBeUndefined();
    expect(result.current.item).toBeUndefined();
  });

  it('returns the mapped activity item for the matching activity', () => {
    const { result } = renderHook(() => usePredictDetailsItem('P1'));

    expect(result.current.item).toBe(mappedActivity);
    expect(result.current.isLoading).toBe(false);
    expect(mapPredictActivityMock).toHaveBeenCalledWith({
      activity,
      chainId: 'eip155:137',
      quoteAsset: { symbol: 'USDC' },
    });
  });
});
