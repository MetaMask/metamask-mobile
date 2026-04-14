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
  geolocationLocation: string;
  cardSupportedCountries: Record<string, boolean> | null | undefined;
}

const mockSelectors = ({
  displayCardButtonFeatureFlag,
  alwaysShowCardButton,
  geolocationLocation,
  cardSupportedCountries,
}: MockSelectorsParams) => {
  mockUseSelector
    .mockReturnValueOnce(displayCardButtonFeatureFlag)
    .mockReturnValueOnce(alwaysShowCardButton)
    .mockReturnValueOnce(geolocationLocation)
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
        geolocationLocation: 'US',
        cardSupportedCountries: { US: false },
      });

      const { result } = renderHook(() => useIsBaanxLoginEnabled());

      expect(result.current).toBe(true);
    });

    it('returns true even when country is not supported', () => {
      mockSelectors({
        displayCardButtonFeatureFlag: true,
        alwaysShowCardButton: true,
        geolocationLocation: 'XX',
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
        geolocationLocation: 'US',
        cardSupportedCountries: { US: true },
      });

      const { result } = renderHook(() => useIsBaanxLoginEnabled());

      expect(result.current).toBe(true);
    });

    it('returns false when country is supported but feature flag is disabled', () => {
      mockSelectors({
        displayCardButtonFeatureFlag: false,
        alwaysShowCardButton: false,
        geolocationLocation: 'US',
        cardSupportedCountries: { US: true },
      });

      const { result } = renderHook(() => useIsBaanxLoginEnabled());

      expect(result.current).toBe(false);
    });

    it('returns false when feature flag is enabled but country is not supported', () => {
      mockSelectors({
        displayCardButtonFeatureFlag: true,
        alwaysShowCardButton: false,
        geolocationLocation: 'XX',
        cardSupportedCountries: { US: true, GB: true },
      });

      const { result } = renderHook(() => useIsBaanxLoginEnabled());

      expect(result.current).toBe(false);
    });

    it('returns false when country is explicitly set to false in supported countries', () => {
      mockSelectors({
        displayCardButtonFeatureFlag: true,
        alwaysShowCardButton: false,
        geolocationLocation: 'US',
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
        geolocationLocation: 'US',
        cardSupportedCountries: null,
      });

      const { result } = renderHook(() => useIsBaanxLoginEnabled());

      expect(result.current).toBe(false);
    });

    it('returns false when all flags are undefined', () => {
      mockSelectors({
        displayCardButtonFeatureFlag: undefined,
        alwaysShowCardButton: undefined,
        geolocationLocation: 'US',
        cardSupportedCountries: undefined,
      });

      const { result } = renderHook(() => useIsBaanxLoginEnabled());

      expect(result.current).toBe(false);
    });

    it('returns false when cardSupportedCountries is empty object', () => {
      mockSelectors({
        displayCardButtonFeatureFlag: true,
        alwaysShowCardButton: false,
        geolocationLocation: 'US',
        cardSupportedCountries: {},
      });

      const { result } = renderHook(() => useIsBaanxLoginEnabled());

      expect(result.current).toBe(false);
    });

    it('returns false when geolocationLocation is empty string', () => {
      mockSelectors({
        displayCardButtonFeatureFlag: true,
        alwaysShowCardButton: false,
        geolocationLocation: '',
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
        geolocationLocation: 'GB',
        cardSupportedCountries: { US: true, GB: true, CA: true },
      });

      const { result } = renderHook(() => useIsBaanxLoginEnabled());

      expect(result.current).toBe(true);
    });

    it('returns false when user is not in any supported country', () => {
      mockSelectors({
        displayCardButtonFeatureFlag: true,
        alwaysShowCardButton: false,
        geolocationLocation: 'DE',
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
      geolocationLocation: 'US',
      cardSupportedCountries: { US: true },
    });
    const { result, rerender } = renderHook(() => useIsBaanxLoginEnabled());

    expect(result.current).toBe(false);

    mockSelectors({
      displayCardButtonFeatureFlag: false,
      alwaysShowCardButton: true,
      geolocationLocation: 'US',
      cardSupportedCountries: { US: true },
    });
    rerender();

    expect(result.current).toBe(true);
  });
});
