import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import useCampaignGeoRestriction from './useCampaignGeoRestriction';
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

const CUSTOM_RESTRICTED = new Set(['US', 'GB', 'FR']);

describe('useCampaignGeoRestriction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGeolocation = 'AU';
    mockGeoStatus = 'complete';
    setupSelectors();
  });

  describe('null campaign', () => {
    it('returns isGeoLoading=true and isGeoRestricted=true when campaign is null', () => {
      const { result } = renderHook(() => useCampaignGeoRestriction(null));
      expect(result.current.isGeoLoading).toBe(true);
      expect(result.current.isGeoRestricted).toBe(true);
    });
  });

  describe('geo loading states', () => {
    it('returns isGeoLoading=true and isGeoRestricted=true when geolocationStatus is "idle"', () => {
      mockGeoStatus = 'idle';
      setupSelectors();
      const { result } = renderHook(() =>
        useCampaignGeoRestriction(buildCampaign()),
      );
      expect(result.current.isGeoLoading).toBe(true);
      expect(result.current.isGeoRestricted).toBe(true);
    });

    it('returns isGeoLoading=true and isGeoRestricted=true when geolocationStatus is "loading"', () => {
      mockGeoStatus = 'loading';
      setupSelectors();
      const { result } = renderHook(() =>
        useCampaignGeoRestriction(buildCampaign()),
      );
      expect(result.current.isGeoLoading).toBe(true);
      expect(result.current.isGeoRestricted).toBe(true);
    });

    it('returns isGeoLoading=false when geolocationStatus is "complete"', () => {
      const { result } = renderHook(() =>
        useCampaignGeoRestriction(buildCampaign()),
      );
      expect(result.current.isGeoLoading).toBe(false);
    });
  });

  describe('without customRestrictedCountries (excludedRegions only)', () => {
    it('returns isGeoRestricted=false when excludedRegions is empty', () => {
      const { result } = renderHook(() =>
        useCampaignGeoRestriction(buildCampaign({ excludedRegions: [] })),
      );
      expect(result.current.isGeoRestricted).toBe(false);
    });

    it('returns isGeoRestricted=true when user country is in excludedRegions', () => {
      mockGeolocation = 'FR';
      setupSelectors();
      const { result } = renderHook(() =>
        useCampaignGeoRestriction(
          buildCampaign({ excludedRegions: ['US', 'FR', 'DE'] }),
        ),
      );
      expect(result.current.isGeoRestricted).toBe(true);
    });

    it('returns isGeoRestricted=false when user country is not in excludedRegions', () => {
      mockGeolocation = 'AU';
      setupSelectors();
      const { result } = renderHook(() =>
        useCampaignGeoRestriction(
          buildCampaign({ excludedRegions: ['US', 'FR', 'DE'] }),
        ),
      );
      expect(result.current.isGeoRestricted).toBe(false);
    });

    it('returns isGeoRestricted=true when no country detected and excludedRegions has entries', () => {
      mockGeolocation = null;
      setupSelectors();
      const { result } = renderHook(() =>
        useCampaignGeoRestriction(buildCampaign({ excludedRegions: ['US'] })),
      );
      expect(result.current.isGeoRestricted).toBe(true);
    });

    it('returns isGeoRestricted=false when no country detected and excludedRegions is empty', () => {
      mockGeolocation = null;
      setupSelectors();
      const { result } = renderHook(() =>
        useCampaignGeoRestriction(buildCampaign({ excludedRegions: [] })),
      );
      expect(result.current.isGeoRestricted).toBe(false);
    });

    it('is case-insensitive when matching against excludedRegions', () => {
      mockGeolocation = 'fr';
      setupSelectors();
      const { result } = renderHook(() =>
        useCampaignGeoRestriction(buildCampaign({ excludedRegions: ['FR'] })),
      );
      expect(result.current.isGeoRestricted).toBe(true);
    });
  });

  describe('with customRestrictedCountries (checked before excludedRegions)', () => {
    it('returns isGeoRestricted=true when country is in the custom list', () => {
      mockGeolocation = 'US';
      setupSelectors();
      const { result } = renderHook(() =>
        useCampaignGeoRestriction(buildCampaign(), CUSTOM_RESTRICTED),
      );
      expect(result.current.isGeoRestricted).toBe(true);
    });

    it('returns isGeoRestricted=false when country is in neither list', () => {
      mockGeolocation = 'AU';
      setupSelectors();
      const { result } = renderHook(() =>
        useCampaignGeoRestriction(
          buildCampaign({ excludedRegions: [] }),
          CUSTOM_RESTRICTED,
        ),
      );
      expect(result.current.isGeoRestricted).toBe(false);
    });

    it('custom list check takes precedence: restricted even if not in excludedRegions', () => {
      mockGeolocation = 'US';
      setupSelectors();
      const { result } = renderHook(() =>
        useCampaignGeoRestriction(
          buildCampaign({ excludedRegions: [] }),
          CUSTOM_RESTRICTED,
        ),
      );
      expect(result.current.isGeoRestricted).toBe(true);
    });

    it('still checks excludedRegions when country is not in the custom list', () => {
      mockGeolocation = 'DE'; // not in CUSTOM_RESTRICTED, but in excludedRegions
      setupSelectors();
      const { result } = renderHook(() =>
        useCampaignGeoRestriction(
          buildCampaign({ excludedRegions: ['DE'] }),
          CUSTOM_RESTRICTED,
        ),
      );
      expect(result.current.isGeoRestricted).toBe(true);
    });

    it('returns isGeoRestricted=true when no country detected and custom list is provided', () => {
      mockGeolocation = null;
      setupSelectors();
      const { result } = renderHook(() =>
        useCampaignGeoRestriction(buildCampaign(), CUSTOM_RESTRICTED),
      );
      expect(result.current.isGeoRestricted).toBe(true);
    });

    it('is case-insensitive for the custom list', () => {
      mockGeolocation = 'us'; // lowercase
      setupSelectors();
      const { result } = renderHook(() =>
        useCampaignGeoRestriction(buildCampaign(), CUSTOM_RESTRICTED),
      );
      expect(result.current.isGeoRestricted).toBe(true);
    });

    it('extracts the country code from a locale string (e.g. "AU-NSW")', () => {
      mockGeolocation = 'AU-NSW';
      setupSelectors();
      const { result } = renderHook(() =>
        useCampaignGeoRestriction(buildCampaign(), CUSTOM_RESTRICTED),
      );
      expect(result.current.isGeoRestricted).toBe(false);
    });
  });
});
