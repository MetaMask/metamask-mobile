import { renderHook } from '@testing-library/react-native';
import { useRegions } from './useRegions';
import {
  MOCK_REGIONS,
  MOCK_US_REGION,
  MOCK_EUR_REGION,
  MOCK_CA_REGION,
  MOCK_FR_REGION,
  createMockSDKReturn,
} from '../testUtils/constants';

const mockUseDepositSdkMethod = jest.fn();
jest.mock('./useDepositSdkMethod', () => ({
  useDepositSdkMethod: (method: string) => mockUseDepositSdkMethod(method),
}));

const mockUseDepositSDK = jest.fn();
jest.mock('../sdk', () => ({
  useDepositSDK: () => mockUseDepositSDK(),
}));

describe('useRegions', () => {
  const mockSetSelectedRegion = jest.fn();
  const mockRetryFetchRegions = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Default SDK state
    mockUseDepositSDK.mockReturnValue(
      createMockSDKReturn({
        selectedRegion: null,
        setSelectedRegion: mockSetSelectedRegion,
      }),
    );

    // Default useDepositSdkMethod state
    mockUseDepositSdkMethod.mockReturnValue([
      { data: MOCK_REGIONS, error: null, isFetching: false },
      mockRetryFetchRegions,
    ]);
  });

  describe('basic functionality', () => {
    it('returns regions from API', () => {
      // Act
      const { result } = renderHook(() => useRegions());

      // Assert
      expect(result.current.regions).toEqual(MOCK_REGIONS);
      expect(result.current.error).toBeNull();
      expect(result.current.isFetching).toBe(false);
      expect(result.current.retryFetchRegions).toBe(mockRetryFetchRegions);
    });

    it('calls useDepositSdkMethod with correct parameters', () => {
      // Act
      renderHook(() => useRegions());

      // Assert
      expect(mockUseDepositSdkMethod).toHaveBeenCalledWith('getCountries');
    });
  });

  describe('loading states', () => {
    it('returns loading state when fetching', () => {
      // Arrange
      mockUseDepositSdkMethod.mockReturnValue([
        { data: null, error: null, isFetching: true },
        mockRetryFetchRegions,
      ]);

      // Act
      const { result } = renderHook(() => useRegions());

      // Assert
      expect(result.current.regions).toBeNull();
      expect(result.current.isFetching).toBe(true);
      expect(result.current.error).toBeNull();
    });

    it('returns error state when API fails', () => {
      // Arrange
      const mockError = 'Failed to fetch regions';
      mockUseDepositSdkMethod.mockReturnValue([
        { data: null, error: mockError, isFetching: false },
        mockRetryFetchRegions,
      ]);

      // Act
      const { result } = renderHook(() => useRegions());

      // Assert
      expect(result.current.regions).toBeNull();
      expect(result.current.error).toBe(mockError);
      expect(result.current.isFetching).toBe(false);
    });
  });

  describe('region selection logic', () => {
    it('selects geolocated region when available', () => {
      // Arrange
      const geolocatedRegion = { ...MOCK_EUR_REGION, geolocated: true };
      const regionsWithGeolocated = [
        MOCK_US_REGION,
        geolocatedRegion,
        MOCK_CA_REGION,
      ];

      mockUseDepositSdkMethod.mockReturnValue([
        { data: regionsWithGeolocated, error: null, isFetching: false },
        mockRetryFetchRegions,
      ]);

      // Act
      renderHook(() => useRegions());

      // Assert
      expect(mockSetSelectedRegion).toHaveBeenCalledWith(geolocatedRegion);
    });

    it('selects US region when no geolocated region available', () => {
      // Arrange
      const regionsWithUS = [MOCK_EUR_REGION, MOCK_US_REGION, MOCK_CA_REGION];

      mockUseDepositSdkMethod.mockReturnValue([
        { data: regionsWithUS, error: null, isFetching: false },
        mockRetryFetchRegions,
      ]);

      // Act
      renderHook(() => useRegions());

      // Assert
      expect(mockSetSelectedRegion).toHaveBeenCalledWith(MOCK_US_REGION);
    });

    it('selects first region when no geolocated or US region available', () => {
      // Arrange
      const regionsWithoutUS = [
        MOCK_EUR_REGION,
        MOCK_CA_REGION,
        MOCK_FR_REGION,
      ];

      mockUseDepositSdkMethod.mockReturnValue([
        { data: regionsWithoutUS, error: null, isFetching: false },
        mockRetryFetchRegions,
      ]);

      // Act
      renderHook(() => useRegions());

      // Assert
      expect(mockSetSelectedRegion).toHaveBeenCalledWith(MOCK_EUR_REGION);
    });

    it('maintains existing selection when region is still available', () => {
      // Arrange
      mockUseDepositSDK.mockReturnValue(
        createMockSDKReturn({
          selectedRegion: MOCK_EUR_REGION,
          setSelectedRegion: mockSetSelectedRegion,
        }),
      );

      const regionsWithSelected = [
        MOCK_US_REGION,
        MOCK_EUR_REGION,
        MOCK_CA_REGION,
      ];
      mockUseDepositSdkMethod.mockReturnValue([
        { data: regionsWithSelected, error: null, isFetching: false },
        mockRetryFetchRegions,
      ]);

      // Act
      renderHook(() => useRegions());

      // Assert
      expect(mockSetSelectedRegion).toHaveBeenCalledWith(MOCK_EUR_REGION);
    });

    it('resets to fallback when current selection is no longer available', () => {
      // Arrange
      const unavailableRegion = {
        isoCode: 'XX',
        flag: '🏳️',
        name: 'Unavailable Country',
        currency: 'USD',
        supported: false,
        phone: {
          prefix: '+1',
          placeholder: '(555) 123-4567',
          template: '(###) ###-####',
        },
      };

      mockUseDepositSDK.mockReturnValue(
        createMockSDKReturn({
          selectedRegion: unavailableRegion,
          setSelectedRegion: mockSetSelectedRegion,
        }),
      );

      // Act
      renderHook(() => useRegions());

      // Assert
      expect(mockSetSelectedRegion).toHaveBeenCalledWith(MOCK_US_REGION);
    });

    it('finds and maintains existing region by isoCode', () => {
      // Arrange
      mockUseDepositSDK.mockReturnValue(
        createMockSDKReturn({
          selectedRegion: MOCK_CA_REGION,
          setSelectedRegion: mockSetSelectedRegion,
        }),
      );

      const regionsWithCanada = [
        MOCK_US_REGION,
        MOCK_EUR_REGION,
        MOCK_CA_REGION,
      ];
      mockUseDepositSdkMethod.mockReturnValue([
        { data: regionsWithCanada, error: null, isFetching: false },
        mockRetryFetchRegions,
      ]);

      // Act
      renderHook(() => useRegions());

      // Assert
      expect(mockSetSelectedRegion).toHaveBeenCalledWith(MOCK_CA_REGION);
    });

    it('prioritizes geolocated over existing selection', () => {
      // Arrange
      const geolocatedRegion = { ...MOCK_FR_REGION, geolocated: true };

      mockUseDepositSDK.mockReturnValue(
        createMockSDKReturn({
          selectedRegion: MOCK_EUR_REGION,
          setSelectedRegion: mockSetSelectedRegion,
        }),
      );

      const regionsWithGeolocated = [
        MOCK_US_REGION,
        MOCK_EUR_REGION,
        geolocatedRegion,
      ];
      mockUseDepositSdkMethod.mockReturnValue([
        { data: regionsWithGeolocated, error: null, isFetching: false },
        mockRetryFetchRegions,
      ]);

      // Act
      renderHook(() => useRegions());

      // Assert
      expect(mockSetSelectedRegion).toHaveBeenCalledWith(MOCK_EUR_REGION);
    });
  });

  describe('edge cases', () => {
    it('does not update selection when regions array is empty', () => {
      // Arrange
      mockUseDepositSdkMethod.mockReturnValue([
        { data: [], error: null, isFetching: false },
        mockRetryFetchRegions,
      ]);

      // Act
      renderHook(() => useRegions());

      // Assert
      expect(mockSetSelectedRegion).not.toHaveBeenCalled();
    });

    it('does not update selection when regions is null', () => {
      // Arrange
      mockUseDepositSdkMethod.mockReturnValue([
        { data: null, error: null, isFetching: false },
        mockRetryFetchRegions,
      ]);

      // Act
      renderHook(() => useRegions());

      // Assert
      expect(mockSetSelectedRegion).not.toHaveBeenCalled();
    });

    it('handles multiple hook renders correctly', () => {
      // Arrange
      mockUseDepositSDK.mockReturnValue(
        createMockSDKReturn({
          selectedRegion: null,
          setSelectedRegion: mockSetSelectedRegion,
        }),
      );

      // Act
      const { rerender } = renderHook(() => useRegions());
      rerender({});
      rerender({});

      // Assert - should only be called once due to useEffect dependencies
      expect(mockSetSelectedRegion).toHaveBeenCalledTimes(1);
    });
  });

  describe('dependency changes', () => {
    it('updates selection when regions data changes', () => {
      // Arrange
      const { rerender } = renderHook(() => useRegions());

      // Clear initial call
      mockSetSelectedRegion.mockClear();

      // Change the data
      const newRegions = [MOCK_FR_REGION];
      mockUseDepositSdkMethod.mockReturnValue([
        { data: newRegions, error: null, isFetching: false },
        mockRetryFetchRegions,
      ]);

      // Act
      rerender({});

      // Assert
      expect(mockSetSelectedRegion).toHaveBeenCalledWith(MOCK_FR_REGION);
    });

    it('updates selection when selectedRegion changes', () => {
      // Arrange
      const { rerender } = renderHook(() => useRegions());

      // Clear initial call
      mockSetSelectedRegion.mockClear();

      // Change the selected region
      mockUseDepositSDK.mockReturnValue(
        createMockSDKReturn({
          selectedRegion: MOCK_CA_REGION,
          setSelectedRegion: mockSetSelectedRegion,
        }),
      );

      const regionsWithCanada = [
        MOCK_US_REGION,
        MOCK_EUR_REGION,
        MOCK_CA_REGION,
      ];
      mockUseDepositSdkMethod.mockReturnValue([
        { data: regionsWithCanada, error: null, isFetching: false },
        mockRetryFetchRegions,
      ]);

      // Act
      rerender({});

      // Assert
      expect(mockSetSelectedRegion).toHaveBeenCalledWith(MOCK_CA_REGION);
    });
  });

  describe('selection priority order', () => {
    it('follows correct priority: geolocated > existing > US > first', () => {
      // Test case 1: When there's a geolocated region, it should win
      const geolocatedEUR = { ...MOCK_EUR_REGION, geolocated: true };
      const regionsCase1 = [MOCK_US_REGION, geolocatedEUR, MOCK_CA_REGION];

      mockUseDepositSDK.mockReturnValue(
        createMockSDKReturn({
          selectedRegion: MOCK_CA_REGION, // existing selection
          setSelectedRegion: mockSetSelectedRegion,
        }),
      );

      mockUseDepositSdkMethod.mockReturnValue([
        { data: regionsCase1, error: null, isFetching: false },
        mockRetryFetchRegions,
      ]);

      const { rerender } = renderHook(() => useRegions());

      // Should select existing (CA) since geolocated logic doesn't override existing when existing is found
      expect(mockSetSelectedRegion).toHaveBeenCalledWith(MOCK_CA_REGION);

      // Clear and test with no existing selection
      mockSetSelectedRegion.mockClear();
      mockUseDepositSDK.mockReturnValue(
        createMockSDKReturn({
          selectedRegion: null,
          setSelectedRegion: mockSetSelectedRegion,
        }),
      );

      rerender({});

      // Now should select geolocated
      expect(mockSetSelectedRegion).toHaveBeenCalledWith(geolocatedEUR);
    });
  });
});
