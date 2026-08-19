import NavigationService from '../../../NavigationService';
import Routes from '../../../../constants/navigation/Routes';
import type { SecuritySettingsScrollSection } from '../../../../components/Views/Settings/SecuritySettings/SecuritySettings.types';

/**
 * Handles the /privacy universal link by navigating to the Security & Privacy
 * settings screen, scrolled to the requested section.
 *
 * Supported URL formats:
 * - https://link.metamask.io/privacy
 * - https://link.metamask.io/privacy?setting=metametrics
 * - https://link.metamask.io/privacy?setting=data-collection
 *
 * Unknown or missing `setting` values fall back to the MetaMetrics section so
 * stale links still land on the privacy settings.
 *
 * @param params - The params object
 * @param params.privacyPath - The remainder of the URL after the action (e.g.
 * '?setting=data-collection')
 */
export function handlePrivacyUrl({ privacyPath }: { privacyPath: string }) {
  const urlParams = new URLSearchParams(
    privacyPath?.includes('?') ? privacyPath.split('?')[1] : '',
  );
  const setting = urlParams.get('setting');
  const scrollToSection: SecuritySettingsScrollSection =
    setting === 'data-collection' ? 'data-collection' : 'metametrics';

  NavigationService.navigation.navigate(Routes.SETTINGS_VIEW, {
    screen: Routes.SETTINGS.SECURITY_SETTINGS,
    params: { scrollToSection },
  });
}
