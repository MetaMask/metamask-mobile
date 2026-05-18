import {
  useNavigation,
  type NavigationProp,
  type ParamListBase,
} from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { PERPS_GTM_MODAL_SHOWN } from '../../../../../constants/storage';
import Routes from '../../../../../constants/navigation/Routes';
import StorageWrapper from '../../../../../store/storage-wrapper';
import type {
  StartupSurfaceDescriptor,
  StartupSurfaceStatus,
} from '../../../Engagement/StartupSurfaceCoordinator';
import {
  selectPerpsEnabledFlag,
  selectPerpsGtmOnboardingModalEnabledFlag,
} from '../../selectors/featureFlags';

/**
 * Resolves whether the Perps GTM modal should be presented during startup.
 */
export const usePerpsGtmStartupSurface = (): StartupSurfaceDescriptor => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const isPerpsEnabled = useSelector(selectPerpsEnabledFlag);
  const isPerpsGtmEnabled = useSelector(
    selectPerpsGtmOnboardingModalEnabledFlag,
  );
  const isEnabled = isPerpsEnabled && isPerpsGtmEnabled;
  const [status, setStatus] = useState<StartupSurfaceStatus>('resolving');

  useEffect(() => {
    let cancelled = false;

    if (!isEnabled) {
      // Stay resolving internally so re-enabling the feature starts from a clean
      // async storage check; the returned descriptor still reports ineligible.
      setStatus('resolving');
      return undefined;
    }

    setStatus('resolving');

    StorageWrapper.getItem(PERPS_GTM_MODAL_SHOWN)
      .then((hasSeenModal) => {
        if (cancelled) {
          return;
        }

        const nextStatus = hasSeenModal === 'true' ? 'ineligible' : 'eligible';
        setStatus(nextStatus);
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        setStatus('ineligible');
      });

    return () => {
      cancelled = true;
    };
  }, [isEnabled]);

  // GTM modals are navigation-backed surfaces, so the coordinator presents them
  // imperatively and the modal marks itself complete through startup context.
  const present = useCallback(() => {
    navigation.navigate(Routes.PERPS.MODALS.ROOT, {
      screen: Routes.PERPS.MODALS.GTM_MODAL,
    });
  }, [navigation]);

  return useMemo(
    () => ({
      id: 'perps-gtm',
      present,
      status: isEnabled ? status : 'ineligible',
    }),
    [isEnabled, present, status],
  );
};
