import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import useOndoGeoRestriction from './useOndoGeoRestriction';
import {
  type CampaignDto,
  CampaignType,
} from '../../../../core/Engine/controllers/rewards-controller/types';
import { getDetectedGeolocation } from '../../../../reducers/fiatOrders';
import { selectGeolocationStatus } from '../../../../selectors/geolocationController';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));
const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

let mockGeolocation: string | null = 'AU';
let mockGeoStatus: string = 'complete';

const setupSelectors = () => {
  mockUseSelector.mockImplementation((selector) => {
    if (selector === getDetectedGeolocation) return mockGeolocation;
    if (selector === selectGeolocationStatus) return mockGeoStatus;
    return undefined;
  });
};

function buildCampaign(overrides: Partial<CampaignDto> = {}): CampaignDto {
  return {
    id: 'campaign-1',
    type: CampaignType.ONDO_HOLDING,
    name: 'Test Campaign',
    startDate: '2025-06-01T00:00:00.000Z',
    endDate: '2025-12-31T23:59:59.999Z',
    termsAndConditions: null,
    excludedRegions: [],
    details: null,
    featured: true,
    ...overrides,
  };
}

describe('useOndoGeoRestriction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGeolocation = 'AU';
    mockGeoStatus = 'complete';
    setupSelectors();
  });

  describe('null campaign', () => {
    it('returns isGeoLoading=true and isGeoRestricted=false when campaign is null', () => {
      const { result } = renderHook(() => useOndoGeoRestriction(null));
      expect(result.current.isGeoLoading).toBe(true);
      expect(result.current.isGeoRestricted).toBe(false);
    });
  });

  describe('geo loading states', () => {
    it('returns isGeoLoading=true when geolocationStatus is "idle"', () => {
      mockGeoStatus = 'idle';
      setupSelectors();
      const { result } = renderHook(() =>
        useOndoGeoRestriction(buildCampaign()),
      );
      expect(result.current.isGeoLoading).toBe(true);
      expect(result.current.isGeoRestricted).toBe(false);
    });

    it('returns isGeoLoading=true when geolocationStatus is "loading"', () => {
      mockGeoStatus = 'loading';
      setupSelectors();
      const { result } = renderHook(() =>
        useOndoGeoRestriction(buildCampaign()),
      );
      expect(result.current.isGeoLoading).toBe(true);
      expect(result.current.isGeoRestricted).toBe(false);
    });

    it('returns isGeoLoading=false when geolocationStatus is "complete"', () => {
      mockGeoStatus = 'complete';
      setupSelectors();
      const { result } = renderHook(() =>
        useOndoGeoRestriction(buildCampaign()),
      );
      expect(result.current.isGeoLoading).toBe(false);
    });
  });

  describe('ONDO_HOLDING campaign type', () => {
    it('returns isGeoRestricted=false for a non-restricted country (AU)', () => {
      mockGeolocation = 'AU';
      setupSelectors();
      const { result } = renderHook(() =>
        useOndoGeoRestriction(buildCampaign()),
      );
      expect(result.current.isGeoRestricted).toBe(false);
    });

    it('returns isGeoRestricted=true for a restricted country (US)', () => {
      mockGeolocation = 'US';
      setupSelectors();
      const { result } = renderHook(() =>
        useOndoGeoRestriction(buildCampaign()),
      );
      expect(result.current.isGeoRestricted).toBe(true);
    });

    it('returns isGeoRestricted=true for a restricted country (GB)', () => {
      mockGeolocation = 'GB';
      setupSelectors();
      const { result } = renderHook(() =>
        useOndoGeoRestriction(buildCampaign()),
      );
      expect(result.current.isGeoRestricted).toBe(true);
    });

    it('returns isGeoRestricted=true when no country is detected (null geolocation)', () => {
      mockGeolocation = null;
      setupSelectors();
      const { result } = renderHook(() =>
        useOndoGeoRestriction(buildCampaign()),
      );
      expect(result.current.isGeoRestricted).toBe(true);
    });

    it('extracts the country code from a locale string (e.g. "AU-NSW")', () => {
      mockGeolocation = 'AU-NSW';
      setupSelectors();
      const { result } = renderHook(() =>
        useOndoGeoRestriction(buildCampaign()),
      );
      expect(result.current.isGeoRestricted).toBe(false);
    });

    it('is case-insensitive for the geolocation value', () => {
      mockGeolocation = 'us'; // lowercase
      setupSelectors();
      const { result } = renderHook(() =>
        useOndoGeoRestriction(buildCampaign()),
      );
      expect(result.current.isGeoRestricted).toBe(true);
    });
  });

  describe('non-ONDO_HOLDING campaign type with excludedRegions', () => {
    const genericCampaign = (excludedRegions: string[]) =>
      buildCampaign({
        type: CampaignType.ONDO_HOLDING, // keep type but test via overrides below
        // We'll use a different type to exercise the excludedRegions branch
        // Override type to something generic once other campaign types exist
        excludedRegions,
      });

    it('returns isGeoRestricted=false when excludedRegions is empty and no country detected', () => {
      mockGeolocation = null;
      setupSelectors();
      // Use a campaign type that falls into the excludedRegions branch
      const campaign = buildCampaign({
        type: 'OTHER_TYPE' as CampaignType,
        excludedRegions: [],
      });
      const { result } = renderHook(() => useOndoGeoRestriction(campaign));
      expect(result.current.isGeoRestricted).toBe(false);
    });

    it('returns isGeoRestricted=true when excludedRegions has entries and no country detected', () => {
      mockGeolocation = null;
      setupSelectors();
      const campaign = buildCampaign({
        type: 'OTHER_TYPE' as CampaignType,
        excludedRegions: ['US', 'GB'],
      });
      const { result } = renderHook(() => useOndoGeoRestriction(campaign));
      expect(result.current.isGeoRestricted).toBe(true);
    });

    it('returns isGeoRestricted=true when user country is in excludedRegions', () => {
      mockGeolocation = 'FR';
      setupSelectors();
      const campaign = buildCampaign({
        type: 'OTHER_TYPE' as CampaignType,
        excludedRegions: ['US', 'FR', 'DE'],
      });
      const { result } = renderHook(() => useOndoGeoRestriction(campaign));
      expect(result.current.isGeoRestricted).toBe(true);
    });

    it('returns isGeoRestricted=false when user country is not in excludedRegions', () => {
      mockGeolocation = 'AU';
      setupSelectors();
      const campaign = buildCampaign({
        type: 'OTHER_TYPE' as CampaignType,
        excludedRegions: ['US', 'FR', 'DE'],
      });
      const { result } = renderHook(() => useOndoGeoRestriction(campaign));
      expect(result.current.isGeoRestricted).toBe(false);
    });

    it('is case-insensitive when matching against excludedRegions', () => {
      mockGeolocation = 'fr'; // lowercase
      setupSelectors();
      const campaign = buildCampaign({
        type: 'OTHER_TYPE' as CampaignType,
        excludedRegions: ['FR'],
      });
      const { result } = renderHook(() => useOndoGeoRestriction(campaign));
      expect(result.current.isGeoRestricted).toBe(true);
    });
  });
});
