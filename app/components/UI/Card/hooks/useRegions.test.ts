import { renderHook } from '@testing-library/react-hooks';
import useRegions from './useRegions';
import { useCardSDK } from '../sdk';
import useRegistrationSettings from './useRegistrationSettings';

jest.mock('../sdk', () => ({
  useCardSDK: jest.fn(),
}));

jest.mock('./useRegistrationSettings', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const mockUseCardSDK = useCardSDK as jest.MockedFunction<typeof useCardSDK>;
const mockUseRegistrationSettings =
  useRegistrationSettings as jest.MockedFunction<
    typeof useRegistrationSettings
  >;

const MOCK_COUNTRIES = [
  {
    id: '1',
    name: 'Germany',
    iso3166alpha2: 'DE',
    callingCode: '49',
    canSignUp: true,
  },
  {
    id: '2',
    name: 'United States',
    iso3166alpha2: 'US',
    callingCode: '1',
    canSignUp: true,
  },
  {
    id: '3',
    name: 'Canada',
    iso3166alpha2: 'CA',
    callingCode: '1',
    canSignUp: false,
  },
  {
    id: '4',
    name: 'Albania',
    iso3166alpha2: 'AL',
    callingCode: '355',
    canSignUp: true,
  },
];

describe('useRegions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCardSDK.mockReturnValue({
      user: {
        countryOfResidence: 'US',
        countryOfNationality: 'DE',
      },
    } as ReturnType<typeof useCardSDK>);
    mockUseRegistrationSettings.mockReturnValue({
      data: { countries: MOCK_COUNTRIES },
      isLoading: false,
    } as ReturnType<typeof useRegistrationSettings>);
  });

  describe('allRegions', () => {
    it('returns all countries sorted by name', () => {
      const { result } = renderHook(() => useRegions());

      expect(result.current.allRegions).toHaveLength(4);
      expect(result.current.allRegions.map((r) => r.name)).toEqual([
        'Albania',
        'Canada',
        'Germany',
        'United States',
      ]);
    });

    it('maps country fields to Region with key, name, emoji, areaCode, canSignUp', () => {
      const { result } = renderHook(() => useRegions());

      const us = result.current.allRegions.find((r) => r.key === 'US');
      expect(us).toBeDefined();
      expect(us?.name).toBe('United States');
      expect(us?.areaCode).toBe('1');
      expect(us?.canSignUp).toBe(true);
      expect(us?.emoji).toBeDefined();
    });

    it('returns empty array when registration settings data is null', () => {
      mockUseRegistrationSettings.mockReturnValue({
        data: null,
        isLoading: false,
      } as ReturnType<typeof useRegistrationSettings>);

      const { result } = renderHook(() => useRegions());

      expect(result.current.allRegions).toEqual([]);
    });
  });

  describe('signUpRegions', () => {
    it('filters to regions with canSignUp === true', () => {
      const { result } = renderHook(() => useRegions());

      expect(result.current.signUpRegions).toHaveLength(3);
      expect(result.current.signUpRegions.map((r) => r.key)).toEqual(
        expect.arrayContaining(['AL', 'DE', 'US']),
      );
      expect(
        result.current.signUpRegions.find((r) => r.key === 'CA'),
      ).toBeUndefined();
    });
  });

  describe('getRegionByCode', () => {
    it('returns region for valid code', () => {
      const { result } = renderHook(() => useRegions());

      expect(result.current.getRegionByCode('US')).toEqual(
        expect.objectContaining({ key: 'US', name: 'United States' }),
      );
      expect(result.current.getRegionByCode('DE')).toEqual(
        expect.objectContaining({ key: 'DE', name: 'Germany' }),
      );
    });

    it('returns null for unknown code', () => {
      const { result } = renderHook(() => useRegions());

      expect(result.current.getRegionByCode('XX')).toBeNull();
    });

    it('returns null for null or undefined code', () => {
      const { result } = renderHook(() => useRegions());

      expect(result.current.getRegionByCode(null)).toBeNull();
      expect(result.current.getRegionByCode(undefined)).toBeNull();
    });
  });

  describe('userCountry', () => {
    it('resolves from user.countryOfResidence', () => {
      const { result } = renderHook(() => useRegions());

      expect(result.current.userCountry).toEqual(
        expect.objectContaining({ key: 'US', name: 'United States' }),
      );
    });

    it('returns null when user has no countryOfResidence', () => {
      mockUseCardSDK.mockReturnValue({
        user: { countryOfNationality: 'DE' },
      } as ReturnType<typeof useCardSDK>);

      const { result } = renderHook(() => useRegions());

      expect(result.current.userCountry).toBeNull();
    });

    it('returns null when user is null', () => {
      mockUseCardSDK.mockReturnValue({ user: null } as ReturnType<
        typeof useCardSDK
      >);

      const { result } = renderHook(() => useRegions());

      expect(result.current.userCountry).toBeNull();
    });
  });

  describe('userNationality', () => {
    it('resolves from user.countryOfNationality', () => {
      const { result } = renderHook(() => useRegions());

      expect(result.current.userNationality).toEqual(
        expect.objectContaining({ key: 'DE', name: 'Germany' }),
      );
    });

    it('returns null when user has no countryOfNationality', () => {
      mockUseCardSDK.mockReturnValue({
        user: { countryOfResidence: 'US' },
      } as ReturnType<typeof useCardSDK>);

      const { result } = renderHook(() => useRegions());

      expect(result.current.userNationality).toBeNull();
    });
  });

  describe('isLoading', () => {
    it('returns isLoading from useRegistrationSettings', () => {
      mockUseRegistrationSettings.mockReturnValue({
        data: { countries: MOCK_COUNTRIES },
        isLoading: true,
      } as ReturnType<typeof useRegistrationSettings>);

      const { result } = renderHook(() => useRegions());

      expect(result.current.isLoading).toBe(true);
    });
  });

  describe('regionsByCode', () => {
    it('provides Map for O(1) lookup', () => {
      const { result } = renderHook(() => useRegions());

      expect(result.current.regionsByCode.get('US')).toEqual(
        expect.objectContaining({ key: 'US' }),
      );
      expect(result.current.regionsByCode.size).toBe(4);
    });
  });
});
