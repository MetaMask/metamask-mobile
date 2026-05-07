import { useSelector } from 'react-redux';
import { renderHook } from '@testing-library/react-hooks';
import { useHomeGrowthBanner } from './useHomeGrowthBanner';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../UI/Carousel/selectors/featureFlags', () => ({
  selectCarouselBannersFlag: jest.fn(),
}));

jest.mock(
  '../../../../selectors/featureFlagController/brazeBannerHome',
  () => ({
    selectBrazeBannerHomeFlag: jest.fn(),
  }),
);

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

const selectCarouselBannersFlag = jest.requireMock(
  '../../../UI/Carousel/selectors/featureFlags',
).selectCarouselBannersFlag;

const selectBrazeBannerHomeFlag = jest.requireMock(
  '../../../../selectors/featureFlagController/brazeBannerHome',
).selectBrazeBannerHomeFlag;

function setupSelectors({
  braze,
  carousel,
}: {
  braze: boolean;
  carousel: boolean;
}) {
  mockUseSelector.mockImplementation((selector) => {
    if (selector === selectBrazeBannerHomeFlag) return braze;
    if (selector === selectCarouselBannersFlag) return carousel;
    return undefined;
  });
}

describe('useHomeGrowthBanner', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns null when both flags are false', () => {
    setupSelectors({ braze: false, carousel: false });
    const { result } = renderHook(() => useHomeGrowthBanner());
    expect(result.current).toBeNull();
  });

  it('returns carousel when only carousel flag is true', () => {
    setupSelectors({ braze: false, carousel: true });
    const { result } = renderHook(() => useHomeGrowthBanner());
    expect(result.current).toBe('carousel');
  });

  it('returns braze when only braze flag is true', () => {
    setupSelectors({ braze: true, carousel: false });
    const { result } = renderHook(() => useHomeGrowthBanner());
    expect(result.current).toBe('braze');
  });

  it('returns braze when both flags are true (braze takes priority)', () => {
    setupSelectors({ braze: true, carousel: true });
    const { result } = renderHook(() => useHomeGrowthBanner());
    expect(result.current).toBe('braze');
  });
});
