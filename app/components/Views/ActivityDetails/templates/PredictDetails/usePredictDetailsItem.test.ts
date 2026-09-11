import { renderHook } from '@testing-library/react-hooks';
import { mapPredictActivity } from '#app/util/activity-adapters';
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
describe('usePredictDetailsItem', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    usePredictActivityMock.mockReturnValue({
      activity: [activity],
      isLoading: false,
      isFetching: false,
    } as ReturnType<typeof usePredictActivity>);
    mapPredictActivityMock.mockReturnValue(undefined);
  });

  it('returns the activity matching the identifier', () => {
    const { result } = renderHook(() => usePredictDetailsItem('P1'));

    expect(result.current.activity).toBe(activity);
  });

  it('returns undefined when nothing matches', () => {
    const { result } = renderHook(() => usePredictDetailsItem('missing'));

    expect(result.current.activity).toBeUndefined();
  });
});
