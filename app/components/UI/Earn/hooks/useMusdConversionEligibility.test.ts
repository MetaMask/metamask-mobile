import { renderHook } from '@testing-library/react-hooks';
import { useMusdConversionEligibility } from './useMusdConversionEligibility';

// Mock the selectors
const mockSelectGeolocation = jest.fn();
const mockSelectMusdConversionBlockedCountries = jest.fn();

jest.mock('../../../../selectors/rampsController', () => ({
  selectGeolocation: (state: unknown) => mockSelectGeolocation(state),
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
    mockSelectGeolocation.mockReturnValue(null);
    mockSelectMusdConversionBlockedCountries.mockReturnValue([]);
  });

  describe('isEligible', () => {
    it('returns false when geolocation is null (blocks by default for compliance)', () => {
      mockSelectGeolocation.mockReturnValue(null);
      mockSelectMusdConversionBlockedCountries.mockReturnValue(['GB']);

      const { result } = renderHook(() => useMusdConversionEligibility());

      expect(result.current.isEligible).toBe(false);
    });

    it('returns false when geolocation is null even with empty blocked list', () => {
      mockSelectGeolocation.mockReturnValue(null);
      mockSelectMusdConversionBlockedCountries.mockReturnValue([]);

      const { result } = renderHook(() => useMusdConversionEligibility());

      expect(result.current.isEligible).toBe(false);
    });

    it('returns true when blockedCountries is empty and geolocation is known', () => {
      mockSelectGeolocation.mockReturnValue('GB');
      mockSelectMusdConversionBlockedCountries.mockReturnValue([]);

      const { result } = renderHook(() => useMusdConversionEligibility());

      expect(result.current.isEligible).toBe(true);
    });

    it('returns false when user is in a blocked country', () => {
      mockSelectGeolocation.mockReturnValue('GB');
      mockSelectMusdConversionBlockedCountries.mockReturnValue(['GB', 'US']);

      const { result } = renderHook(() => useMusdConversionEligibility());

      expect(result.current.isEligible).toBe(false);
    });

    it('returns false when user country starts with blocked country code', () => {
      mockSelectGeolocation.mockReturnValue('GB-ENG');
      mockSelectMusdConversionBlockedCountries.mockReturnValue(['GB']);

      const { result } = renderHook(() => useMusdConversionEligibility());

      expect(result.current.isEligible).toBe(false);
    });

    it('returns true when user is not in any blocked country', () => {
      mockSelectGeolocation.mockReturnValue('FR');
      mockSelectMusdConversionBlockedCountries.mockReturnValue(['GB', 'US']);

      const { result } = renderHook(() => useMusdConversionEligibility());

      expect(result.current.isEligible).toBe(true);
    });

    it('performs case-insensitive comparison for country codes', () => {
      mockSelectGeolocation.mockReturnValue('gb');
      mockSelectMusdConversionBlockedCountries.mockReturnValue(['GB']);

      const { result } = renderHook(() => useMusdConversionEligibility());

      expect(result.current.isEligible).toBe(false);
    });

    it('handles US state codes correctly when US is blocked', () => {
      mockSelectGeolocation.mockReturnValue('US-CA');
      mockSelectMusdConversionBlockedCountries.mockReturnValue(['US']);

      const { result } = renderHook(() => useMusdConversionEligibility());

      expect(result.current.isEligible).toBe(false);
    });

    it('returns true for US user when only UK is blocked', () => {
      mockSelectGeolocation.mockReturnValue('US-CA');
      mockSelectMusdConversionBlockedCountries.mockReturnValue(['GB']);

      const { result } = renderHook(() => useMusdConversionEligibility());

      expect(result.current.isEligible).toBe(true);
    });
  });

  describe('return values', () => {
    it('returns geolocation from selector', () => {
      mockSelectGeolocation.mockReturnValue('FR');
      mockSelectMusdConversionBlockedCountries.mockReturnValue([]);

      const { result } = renderHook(() => useMusdConversionEligibility());

      expect(result.current.geolocation).toBe('FR');
    });

    it('returns blockedCountries from selector', () => {
      const blockedCountries = ['GB', 'US'];
      mockSelectGeolocation.mockReturnValue('FR');
      mockSelectMusdConversionBlockedCountries.mockReturnValue(
        blockedCountries,
      );

      const { result } = renderHook(() => useMusdConversionEligibility());

      expect(result.current.blockedCountries).toEqual(blockedCountries);
    });
  });

  describe('isLoading', () => {
    it('returns true when geolocation is null', () => {
      mockSelectGeolocation.mockReturnValue(null);
      mockSelectMusdConversionBlockedCountries.mockReturnValue([]);

      const { result } = renderHook(() => useMusdConversionEligibility());

      expect(result.current.isLoading).toBe(true);
    });

    it('returns false when geolocation is available', () => {
      mockSelectGeolocation.mockReturnValue('US');
      mockSelectMusdConversionBlockedCountries.mockReturnValue([]);

      const { result } = renderHook(() => useMusdConversionEligibility());

      expect(result.current.isLoading).toBe(false);
    });
  });
});
