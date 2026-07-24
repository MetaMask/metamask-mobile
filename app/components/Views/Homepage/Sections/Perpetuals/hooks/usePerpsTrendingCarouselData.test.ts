import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { usePerpsMarkets } from '../../../../../UI/Perps/hooks';
import { usePerpsTrendingCarouselData } from './usePerpsTrendingCarouselData';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../../UI/Perps/hooks', () => ({
  usePerpsMarkets: jest.fn(),
}));

describe('usePerpsTrendingCarouselData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useSelector as jest.Mock).mockReturnValue([]);
    (usePerpsMarkets as jest.Mock).mockReturnValue({
      markets: [],
      isLoading: false,
    });
  });

  it('returns the same object when its dependencies are unchanged', () => {
    const { result, rerender } = renderHook(() =>
      usePerpsTrendingCarouselData(),
    );
    const initialResult = result.current;

    rerender({});

    expect(result.current).toBe(initialResult);
  });
});
