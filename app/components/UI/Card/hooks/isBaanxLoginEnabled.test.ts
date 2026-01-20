import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import useIsBaanxLoginEnabled from './isBaanxLoginEnabled';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

interface MockSelectorsParams {
  displayCardButtonFeatureFlag: boolean | null | undefined;
  alwaysShowCardButton: boolean | null | undefined;
  cardGeoLocation: string;
  cardSupportedCountries: Record<string, boolean> | null | undefined;
}

const mockSelectors = ({
  displayCardButtonFeatureFlag,
  alwaysShowCardButton,
  cardGeoLocation,
  cardSupportedCountries,
}: MockSelectorsParams) => {
  mockUseSelector
    .mockReturnValueOnce(displayCardButtonFeatureFlag)
    .mockReturnValueOnce(alwaysShowCardButton)
    .mockReturnValueOnce(cardGeoLocation)
    .mockReturnValueOnce(cardSupportedCountries);
};

describe('useIsBaanxLoginEnabled', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when alwaysShowCardButton is enabled', () => {
    it('returns true regardless of other flag states', () => {
      mockSelectors({
        displayCardButtonFeatureFlag: false,
        alwaysShowCardButton: true,
        cardGeoLocation: 'US',
        cardSupportedCountries: { US: false },
      });

      const { result } = renderHook(() => useIsBaanxLoginEnabled());

      expect(result.current).toBe(true);
    });

    it('returns true even when country is not supported', () => {
      mockSelectors({
        displayCardButtonFeatureFlag: true,
        alwaysShowCardButton: true,
        cardGeoLocation: 'XX',
        cardSupportedCountries: {},
      });

      const { result } = renderHook(() => useIsBaanxLoginEnabled());

      expect(result.current).toBe(true);
    });
  });

  describe('when alwaysShowCardButton is disabled', () => {
    it('returns true when country is supported and feature flag is enabled', () => {
      mockSelectors({
        displayCardButtonFeatureFlag: true,
        alwaysShowCardButton: false,
        cardGeoLocation: 'US',
        cardSupportedCountries: { US: true },
      });

      const { result } = renderHook(() => useIsBaanxLoginEnabled());

      expect(result.current).toBe(true);
    });

    it('returns false when country is supported but feature flag is disabled', () => {
      mockSelectors({
        displayCardButtonFeatureFlag: false,
        alwaysShowCardButton: false,
        cardGeoLocation: 'US',
        cardSupportedCountries: { US: true },
      });

      const { result } = renderHook(() => useIsBaanxLoginEnabled());

      expect(result.current).toBe(false);
    });

    it('returns false when feature flag is enabled but country is not supported', () => {
      mockSelectors({
        displayCardButtonFeatureFlag: true,
        alwaysShowCardButton: false,
        cardGeoLocation: 'XX',
        cardSupportedCountries: { US: true, GB: true },
      });

      const { result } = renderHook(() => useIsBaanxLoginEnabled());

      expect(result.current).toBe(false);
    });

    it('returns false when country is explicitly set to false in supported countries', () => {
      mockSelectors({
        displayCardButtonFeatureFlag: true,
        alwaysShowCardButton: false,
        cardGeoLocation: 'US',
        cardSupportedCountries: { US: false },
      });

      const { result } = renderHook(() => useIsBaanxLoginEnabled());

      expect(result.current).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('returns false when all flags are null', () => {
      mockSelectors({
        displayCardButtonFeatureFlag: null,
        alwaysShowCardButton: null,
        cardGeoLocation: 'US',
        cardSupportedCountries: null,
      });

      const { result } = renderHook(() => useIsBaanxLoginEnabled());

      expect(result.current).toBe(false);
    });

    it('returns false when all flags are undefined', () => {
      mockSelectors({
        displayCardButtonFeatureFlag: undefined,
        alwaysShowCardButton: undefined,
        cardGeoLocation: 'US',
        cardSupportedCountries: undefined,
      });

      const { result } = renderHook(() => useIsBaanxLoginEnabled());

      expect(result.current).toBe(false);
    });

    it('returns false when cardSupportedCountries is empty object', () => {
      mockSelectors({
        displayCardButtonFeatureFlag: true,
        alwaysShowCardButton: false,
        cardGeoLocation: 'US',
        cardSupportedCountries: {},
      });

      const { result } = renderHook(() => useIsBaanxLoginEnabled());

      expect(result.current).toBe(false);
    });

    it('returns false when cardGeoLocation is empty string', () => {
      mockSelectors({
        displayCardButtonFeatureFlag: true,
        alwaysShowCardButton: false,
        cardGeoLocation: '',
        cardSupportedCountries: { US: true },
      });

      const { result } = renderHook(() => useIsBaanxLoginEnabled());

      expect(result.current).toBe(false);
    });
  });

  describe('multiple supported countries', () => {
    it('returns true when user is in one of multiple supported countries', () => {
      mockSelectors({
        displayCardButtonFeatureFlag: true,
        alwaysShowCardButton: false,
        cardGeoLocation: 'GB',
        cardSupportedCountries: { US: true, GB: true, CA: true },
      });

      const { result } = renderHook(() => useIsBaanxLoginEnabled());

      expect(result.current).toBe(true);
    });

    it('returns false when user is not in any supported country', () => {
      mockSelectors({
        displayCardButtonFeatureFlag: true,
        alwaysShowCardButton: false,
        cardGeoLocation: 'DE',
        cardSupportedCountries: { US: true, GB: true, CA: true },
      });

      const { result } = renderHook(() => useIsBaanxLoginEnabled());

      expect(result.current).toBe(false);
    });
  });

  it('updates when flag values change', () => {
    mockSelectors({
      displayCardButtonFeatureFlag: false,
      alwaysShowCardButton: false,
      cardGeoLocation: 'US',
      cardSupportedCountries: { US: true },
    });
    const { result, rerender } = renderHook(() => useIsBaanxLoginEnabled());

    expect(result.current).toBe(false);

    mockSelectors({
      displayCardButtonFeatureFlag: false,
      alwaysShowCardButton: true,
      cardGeoLocation: 'US',
      cardSupportedCountries: { US: true },
    });
    rerender();

    expect(result.current).toBe(true);
  });
});
