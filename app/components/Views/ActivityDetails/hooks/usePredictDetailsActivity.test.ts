import { renderHook } from '@testing-library/react-hooks';
import { usePredictActivity } from '../../../UI/Predict/hooks/usePredictActivity';
import { usePredictDetailsActivity } from './usePredictDetailsActivity';

jest.mock('../../../UI/Predict/hooks/usePredictActivity', () => ({
  usePredictActivity: jest.fn(),
}));

const usePredictActivityMock = jest.mocked(usePredictActivity);
const activity = { id: 'p1' };

describe('usePredictDetailsActivity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    usePredictActivityMock.mockReturnValue({
      activity: [activity],
    } as ReturnType<typeof usePredictActivity>);
  });

  it('returns the activity matching the identifier', () => {
    const { result } = renderHook(() => usePredictDetailsActivity('P1'));

    expect(result.current).toBe(activity);
  });

  it('returns undefined when nothing matches', () => {
    const { result } = renderHook(() => usePredictDetailsActivity('missing'));

    expect(result.current).toBeUndefined();
  });
});
