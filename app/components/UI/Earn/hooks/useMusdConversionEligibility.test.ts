import { renderHook } from '@testing-library/react-hooks';
import { useMusdConversionEligibility } from './useMusdConversionEligibility';

// Mock the selectors
const mockGetDetectedGeolocation = jest.fn();
const mockSelectMusdConversionBlockedCountries = jest.fn();

jest.mock('../../../../reducers/fiatOrders', () => ({
  getDetectedGeolocation: (state: unknown) => mockGetDetectedGeolocation(state),
}));

jest.mock('../selectors/featureFlags', () => ({
  selectMusdConversionBlockedCountries: (state: unknown) =>
    mockSelectMusdConversionBlockedCountries(state),
}));

jest.mock('react-redux', () => ({
  useSelector: (selector: (state: unknown) => unknown) => selector({}),
}));

describe('useMusdConversionEligibility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetDetectedGeolocation.mockReturnValue(null);
    mockSelectMusdConversionBlockedCountries.mockReturnValue([]);
  });

  describe('isEligible', () => {
    it('returns false when geolocation is null (blocks by default for compliance)', () => {
      mockGetDetectedGeolocation.mockReturnValue(null);
      mockSelectMusdConversionBlockedCountries.mockReturnValue(['GB']);

      const { result } = renderHook(() => useMusdConversionEligibility());

      expect(result.current.isEligible).toBe(false);
    });

    it('returns false when geolocation is null even with empty blocked list', () => {
      mockGetDetectedGeolocation.mockReturnValue(null);
      mockSelectMusdConversionBlockedCountries.mockReturnValue([]);

      const { result } = renderHook(() => useMusdConversionEligibility());

      expect(result.current.isEligible).toBe(false);
    });

    it('returns true when blockedCountries is empty and geolocation is known', () => {
      mockGetDetectedGeolocation.mockReturnValue('GB');
      mockSelectMusdConversionBlockedCountries.mockReturnValue([]);

      const { result } = renderHook(() => useMusdConversionEligibility());

      expect(result.current.isEligible).toBe(true);
    });

    it('returns false when user is in a blocked country', () => {
      mockGetDetectedGeolocation.mockReturnValue('GB');
      mockSelectMusdConversionBlockedCountries.mockReturnValue(['GB', 'US']);

      const { result } = renderHook(() => useMusdConversionEligibility());

      expect(result.current.isEligible).toBe(false);
    });

    it('returns false when user country starts with blocked country code', () => {
      mockGetDetectedGeolocation.mockReturnValue('GB-ENG');
      mockSelectMusdConversionBlockedCountries.mockReturnValue(['GB']);

      const { result } = renderHook(() => useMusdConversionEligibility());

      expect(result.current.isEligible).toBe(false);
    });

    it('returns true when user is not in any blocked country', () => {
      mockGetDetectedGeolocation.mockReturnValue('FR');
      mockSelectMusdConversionBlockedCountries.mockReturnValue(['GB', 'US']);

      const { result } = renderHook(() => useMusdConversionEligibility());

      expect(result.current.isEligible).toBe(true);
    });

    it('performs case-insensitive comparison for country codes', () => {
      mockGetDetectedGeolocation.mockReturnValue('gb');
      mockSelectMusdConversionBlockedCountries.mockReturnValue(['GB']);

      const { result } = renderHook(() => useMusdConversionEligibility());

      expect(result.current.isEligible).toBe(false);
    });

    it('handles US state codes correctly when US is blocked', () => {
      mockGetDetectedGeolocation.mockReturnValue('US-CA');
      mockSelectMusdConversionBlockedCountries.mockReturnValue(['US']);

      const { result } = renderHook(() => useMusdConversionEligibility());

      expect(result.current.isEligible).toBe(false);
    });

    it('returns true for US user when only UK is blocked', () => {
      mockGetDetectedGeolocation.mockReturnValue('US-CA');
      mockSelectMusdConversionBlockedCountries.mockReturnValue(['GB']);

      const { result } = renderHook(() => useMusdConversionEligibility());

      expect(result.current.isEligible).toBe(true);
    });
  });

  describe('return values', () => {
    it('returns geolocation from selector', () => {
      mockGetDetectedGeolocation.mockReturnValue('FR');
      mockSelectMusdConversionBlockedCountries.mockReturnValue([]);

      const { result } = renderHook(() => useMusdConversionEligibility());

      expect(result.current.geolocation).toBe('FR');
    });

    it('returns blockedCountries from selector', () => {
      const blockedCountries = ['GB', 'US'];
      mockGetDetectedGeolocation.mockReturnValue('FR');
      mockSelectMusdConversionBlockedCountries.mockReturnValue(
        blockedCountries,
      );

      const { result } = renderHook(() => useMusdConversionEligibility());

      expect(result.current.blockedCountries).toEqual(blockedCountries);
    });
  });

  describe('isLoading', () => {
    it('returns true when geolocation is null', () => {
      mockGetDetectedGeolocation.mockReturnValue(null);
      mockSelectMusdConversionBlockedCountries.mockReturnValue([]);

      const { result } = renderHook(() => useMusdConversionEligibility());

      expect(result.current.isLoading).toBe(true);
    });

    it('returns false when geolocation is available', () => {
      mockGetDetectedGeolocation.mockReturnValue('US');
      mockSelectMusdConversionBlockedCountries.mockReturnValue([]);

      const { result } = renderHook(() => useMusdConversionEligibility());

      expect(result.current.isLoading).toBe(false);
    });
  });
});
