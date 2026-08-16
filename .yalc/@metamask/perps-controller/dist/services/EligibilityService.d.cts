import type { PerpsPlatformDependencies, CheckEligibilityParams } from "../types/index.cjs";
/**
 * EligibilityService
 *
 * Handles eligibility checking based on geolocation and blocked regions.
 * Geolocation is sourced externally from the GeolocationController.
 *
 * Instance-based service with constructor injection of platform dependencies.
 */
export declare class EligibilityService {
    #private;
    /**
     * Create a new EligibilityService instance
     *
     * @param deps - Platform dependencies for logging, metrics, etc.
     */
    constructor(deps: PerpsPlatformDependencies);
    /**
     * Check if user is eligible based on geo-blocked regions.
     *
     * @param options - The eligibility check parameters.
     * @param options.blockedRegions - List of blocked region codes (e.g., ['US', 'CN']).
     * @param options.geoLocation - The user's geolocation string from GeolocationController.
     * @returns True if eligible (not in blocked region), false otherwise.
     */
    checkEligibility(options: CheckEligibilityParams): Promise<boolean>;
}
//# sourceMappingURL=EligibilityService.d.cts.map