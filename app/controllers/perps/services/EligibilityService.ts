import { PERPS_CONSTANTS } from '../constants/perpsConfig';
import type {
  PerpsPlatformDependencies,
  CheckEligibilityParams,
} from '../types';
import { ensureError } from '../utils/errorUtils';

/**
 * EligibilityService
 *
 * Handles eligibility checking based on geolocation and blocked regions.
 * Geolocation is sourced externally from the GeolocationController.
 *
 * Instance-based service with constructor injection of platform dependencies.
 */
export class EligibilityService {
  readonly #deps: PerpsPlatformDependencies;

  /**
   * Create a new EligibilityService instance
   *
   * @param deps - Platform dependencies for logging, metrics, etc.
   */
  constructor(deps: PerpsPlatformDependencies) {
    this.#deps = deps;
  }

  /**
   * Check if user is eligible based on geo-blocked regions.
   *
   * @param options - The eligibility check parameters.
   * @param options.blockedRegions - List of blocked region codes (e.g., ['US', 'CN']).
   * @param options.geoLocation - The user's geolocation string from GeolocationController.
   * @returns True if eligible (not in blocked region), false otherwise.
   */
  async checkEligibility(options: CheckEligibilityParams): Promise<boolean> {
    const { blockedRegions, geoLocation } = options;
    try {
      this.#deps.debugLogger.log('EligibilityService: Checking eligibility', {
        blockedRegionsCount: blockedRegions.length,
        geoLocation,
      });

      if (geoLocation !== 'UNKNOWN') {
        const isEligible = blockedRegions.every(
          (geoBlockedRegion) =>
            !geoLocation
              .toUpperCase()
              .startsWith(geoBlockedRegion.toUpperCase()),
        );

        this.#deps.debugLogger.log(
          'EligibilityService: Eligibility check completed',
          {
            geoLocation,
            isEligible,
            blockedRegions,
          },
        );

        return isEligible;
      }

      return true;
    } catch (error) {
      this.#deps.logger.error(
        ensureError(error, 'EligibilityService.checkEligibility'),
        {
          tags: { feature: PERPS_CONSTANTS.FeatureName },
          context: {
            name: 'EligibilityService.checkEligibility',
            data: {},
          },
        },
      );
      return true;
    }
  }
}
