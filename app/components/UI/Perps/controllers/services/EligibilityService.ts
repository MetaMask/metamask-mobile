import { successfulFetch } from '@metamask/controller-utils';
import { getEnvironment } from '../utils';
import { ensureError } from '../../../../../util/errorUtils';
import type {
  PerpsPlatformDependencies,
  CheckEligibilityParams,
} from '../types';

// Geo-blocking API URLs
const ON_RAMP_GEO_BLOCKING_URLS = {
  DEV: 'https://on-ramp.uat-api.cx.metamask.io/geolocation',
  PROD: 'https://on-ramp.api.cx.metamask.io/geolocation',
} as const;

/**
 * Geo-location cache entry
 */
interface GeoLocationCache {
  location: string;
  timestamp: number;
}

/**
 * EligibilityService
 *
 * Handles geo-location fetching and eligibility checking.
 * Manages caching to minimize API calls.
 *
 * Instance-based service with constructor injection of platform dependencies.
 * Cache is instance-scoped to support multiple service instances (e.g., testing).
 */
export class EligibilityService {
  private readonly GEO_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
  private readonly deps: PerpsPlatformDependencies;

  private geoLocationCache: GeoLocationCache | null = null;
  private geoLocationFetchPromise: Promise<string> | null = null;

  /**
   * Create a new EligibilityService instance
   * @param deps - Platform dependencies for logging, metrics, etc.
   */
  constructor(deps: PerpsPlatformDependencies) {
    this.deps = deps;
  }

  /**
   * Fetch geo location with caching and deduplication
   */
  async fetchGeoLocation(): Promise<string> {
    // Check cache first
    if (this.geoLocationCache) {
      const cacheAge = Date.now() - this.geoLocationCache.timestamp;
      if (cacheAge < this.GEO_CACHE_TTL_MS) {
        this.deps.debugLogger.log(
          'EligibilityService: Using cached geo location',
          {
            location: this.geoLocationCache.location,
            cacheAge: `${(cacheAge / 1000).toFixed(1)}s`,
          },
        );
        return this.geoLocationCache.location;
      }
    }

    // If already fetching, return the existing promise
    if (this.geoLocationFetchPromise) {
      this.deps.debugLogger.log(
        'EligibilityService: Geo location fetch already in progress, waiting...',
      );
      return this.geoLocationFetchPromise;
    }

    // Start new fetch
    this.geoLocationFetchPromise = this.performGeoLocationFetch();

    try {
      const location = await this.geoLocationFetchPromise;
      return location;
    } finally {
      // Clear the promise after completion (success or failure)
      this.geoLocationFetchPromise = null;
    }
  }

  /**
   * Perform the actual geo location fetch
   * Separated to allow proper promise management
   */
  private async performGeoLocationFetch(): Promise<string> {
    let location = 'UNKNOWN';

    try {
      const environment = getEnvironment();

      this.deps.debugLogger.log(
        'EligibilityService: Fetching geo location from API',
        {
          environment,
        },
      );

      const response = await successfulFetch(
        ON_RAMP_GEO_BLOCKING_URLS[environment],
      );

      const textResult = await response?.text();
      location = textResult || 'UNKNOWN';

      // Cache the successful result
      this.geoLocationCache = {
        location,
        timestamp: Date.now(),
      };

      this.deps.debugLogger.log(
        'EligibilityService: Geo location fetched successfully',
        {
          location,
        },
      );

      return location;
    } catch (e) {
      this.deps.logger.error(ensureError(e), {
        context: {
          name: 'EligibilityService.performGeoLocationFetch',
          data: {},
        },
      });
      // Don't cache failures
      return location;
    }
  }

  /**
   * Check if user is eligible based on geo-blocked regions
   * @param options.blockedRegions - List of blocked region codes (e.g., ['US', 'CN'])
   * @returns true if eligible (not in blocked region), false otherwise
   */
  async checkEligibility(options: CheckEligibilityParams): Promise<boolean> {
    const { blockedRegions } = options;
    try {
      this.deps.debugLogger.log('EligibilityService: Checking eligibility', {
        blockedRegionsCount: blockedRegions.length,
      });

      // Returns UNKNOWN if we can't fetch the geo location
      const geoLocation = await this.fetchGeoLocation();

      // Only set to eligible if we have valid geolocation and it's not blocked
      if (geoLocation !== 'UNKNOWN') {
        const isEligible = blockedRegions.every(
          (geoBlockedRegion) =>
            !geoLocation
              .toUpperCase()
              .startsWith(geoBlockedRegion.toUpperCase()),
        );

        this.deps.debugLogger.log(
          'EligibilityService: Eligibility check completed',
          {
            geoLocation,
            isEligible,
            blockedRegions,
          },
        );

        return isEligible;
      }

      // Default to eligible if location is unknown
      return true;
    } catch (error) {
      this.deps.logger.error(ensureError(error), {
        context: {
          name: 'EligibilityService.checkEligibility',
          data: {},
        },
      });
      // Default to eligible on error
      return true;
    }
  }

  /**
   * Clear the geo-location cache
   * Useful for testing or forcing a fresh fetch
   */
  clearCache(): void {
    this.geoLocationCache = null;
    this.geoLocationFetchPromise = null;
    this.deps.debugLogger.log('EligibilityService: Cache cleared');
  }
}
