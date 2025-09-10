import { getVersion } from 'react-native-device-info';
import Engine from '../../core/Engine';
import MetaMetrics from '../../core/Analytics/MetaMetrics';
import { SUPPORT_BASE_URL } from '../../constants/urls';

/**
 * Generates a support URL with optional consent parameters
 * @param withConsent - Whether to include user consent parameters
 * @returns Promise<string> - The support URL
 */
const getSupportUrl = async (withConsent: boolean = false): Promise<string> => {
  let supportUrl = SUPPORT_BASE_URL;

  if (withConsent) {
    try {
      // Get app version
      const appVersion = await getVersion();

      // Get metametrics ID
      const metametrics = MetaMetrics.getInstance();
      const metametricsId = await metametrics.getMetaMetricsId();

      // Get profile ID from authentication controller
      const { AuthenticationController } = Engine.context;
      let profileId;
      try {
        const sessionProfile =
          await AuthenticationController.getSessionProfile();
        profileId = sessionProfile?.id;
      } catch (error) {
        // Profile ID is optional, so we can continue without it
        console.warn('Could not get profile ID:', error);
      }

      // Build URL with parameters
      const params = new URLSearchParams();
      params.append('metamask_version', appVersion);

      if (metametricsId) {
        params.append('metamask_metametrics_id', metametricsId);
      }

      if (profileId) {
        params.append('metamask_profile_id', profileId);
      }

      supportUrl = `${supportUrl}?${params.toString()}`;
    } catch (error) {
      // If there's an error getting the parameters, fall back to the base URL
      console.warn('Error getting support URL parameters:', error);
    }
  }

  return supportUrl;
};

export default getSupportUrl;
