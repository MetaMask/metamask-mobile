import Engine from '../../core/Engine';
import { BFT_CHILD_PREFERENCES } from './bftChildPreferences';

/**
 * Aligns mobile-available Basic Functionality child preferences with the
 * consolidated Basic Functionality toggle.
 *
 * IPFS gateway stays a separate Settings toggle (same as extension).
 *
 * Not exposed as PreferencesController toggles on mobile:
 * phishing detection, 4byte.directory, proposed nicknames, authentication API.
 */
export function syncConsolidatedBasicFunctionalityPreferences(
  enabled: boolean,
): void {
  const { PreferencesController } = Engine.context;

  for (const preference of BFT_CHILD_PREFERENCES) {
    switch (preference) {
      case 'useTransactionSimulations':
        PreferencesController.setUseTransactionSimulations(enabled);
        break;
      case 'securityAlertsEnabled':
        PreferencesController.setSecurityAlertsEnabled(enabled);
        break;
      case 'isMultiAccountBalancesEnabled':
        PreferencesController.setIsMultiAccountBalancesEnabled(enabled);
        break;
      case 'useSafeChainsListValidation':
        PreferencesController.setUseSafeChainsListValidation(enabled);
        break;
      case 'useTokenDetection':
        PreferencesController.setUseTokenDetection(enabled);
        break;
      case 'displayNftMedia':
        PreferencesController.setDisplayNftMedia(enabled);
        break;
      case 'useNftDetection':
        PreferencesController.setUseNftDetection(enabled);
        break;
      default: {
        const exhaustiveCheck: never = preference;
        throw new Error(
          `Unhandled BFT child preference: ${String(exhaustiveCheck)}`,
        );
      }
    }
  }
}
