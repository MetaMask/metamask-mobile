var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _EligibilityService_deps;
import { PERPS_CONSTANTS } from "../constants/perpsConfig.mjs";
import { ensureError } from "../utils/errorUtils.mjs";
/**
 * EligibilityService
 *
 * Handles eligibility checking based on geolocation and blocked regions.
 * Geolocation is sourced externally from the GeolocationController.
 *
 * Instance-based service with constructor injection of platform dependencies.
 */
export class EligibilityService {
    /**
     * Create a new EligibilityService instance
     *
     * @param deps - Platform dependencies for logging, metrics, etc.
     */
    constructor(deps) {
        _EligibilityService_deps.set(this, void 0);
        __classPrivateFieldSet(this, _EligibilityService_deps, deps, "f");
    }
    /**
     * Check if user is eligible based on geo-blocked regions.
     *
     * @param options - The eligibility check parameters.
     * @param options.blockedRegions - List of blocked region codes (e.g., ['US', 'CN']).
     * @param options.geoLocation - The user's geolocation string from GeolocationController.
     * @returns True if eligible (not in blocked region), false otherwise.
     */
    async checkEligibility(options) {
        const { blockedRegions, geoLocation } = options;
        try {
            __classPrivateFieldGet(this, _EligibilityService_deps, "f").debugLogger.log('EligibilityService: Checking eligibility', {
                blockedRegionsCount: blockedRegions.length,
                geoLocation,
            });
            if (geoLocation !== 'UNKNOWN') {
                const isEligible = blockedRegions.every((geoBlockedRegion) => !geoLocation
                    .toUpperCase()
                    .startsWith(geoBlockedRegion.toUpperCase()));
                __classPrivateFieldGet(this, _EligibilityService_deps, "f").debugLogger.log('EligibilityService: Eligibility check completed', {
                    geoLocation,
                    isEligible,
                    blockedRegions,
                });
                return isEligible;
            }
            return true;
        }
        catch (error) {
            __classPrivateFieldGet(this, _EligibilityService_deps, "f").logger.error(ensureError(error, 'EligibilityService.checkEligibility'), {
                tags: { feature: PERPS_CONSTANTS.FeatureName },
                context: {
                    name: 'EligibilityService.checkEligibility',
                    data: {},
                },
            });
            return true;
        }
    }
}
_EligibilityService_deps = new WeakMap();
//# sourceMappingURL=EligibilityService.mjs.map