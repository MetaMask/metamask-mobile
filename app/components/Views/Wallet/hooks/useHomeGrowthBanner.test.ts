import { useSelector } from 'react-redux';
import { renderHook } from '@testing-library/react-native';
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

jest.mock('../../../../selectors/identity', () => ({
  selectCanonicalProfileId: jest.fn(),
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

const selectCarouselBannersFlag = jest.requireMock(
  '../../../UI/Carousel/selectors/featureFlags',
).selectCarouselBannersFlag;

const selectBrazeBannerHomeFlag = jest.requireMock(
  '../../../../selectors/featureFlagController/brazeBannerHome',
).selectBrazeBannerHomeFlag;

const selectCanonicalProfileId = jest.requireMock(
  '../../../../selectors/identity',
).selectCanonicalProfileId;

function setupSelectors({
  braze,
  carousel,
  canonicalProfileId = 'canonical-1',
}: {
  braze: boolean;
  carousel: boolean;
  canonicalProfileId?: string | null;
}) {
  mockUseSelector.mockImplementation((selector) => {
    if (selector === selectBrazeBannerHomeFlag) return braze;
    if (selector === selectCarouselBannersFlag) return carousel;
    if (selector === selectCanonicalProfileId) return canonicalProfileId;
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

  it('returns null when the braze flag is true but the canonical profile ID is missing', () => {
    setupSelectors({
      braze: true,
      carousel: false,
      canonicalProfileId: null,
    });
    const { result } = renderHook(() => useHomeGrowthBanner());
    expect(result.current).toBeNull();
  });

  it('does not fall back to carousel while waiting for a canonical profile ID', () => {
    setupSelectors({
      braze: true,
      carousel: true,
      canonicalProfileId: null,
    });
    const { result } = renderHook(() => useHomeGrowthBanner());
    expect(result.current).toBeNull();
  });
});
