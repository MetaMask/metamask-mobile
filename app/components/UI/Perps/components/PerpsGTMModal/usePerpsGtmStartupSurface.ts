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
} from '../../../../Nav/Main/StartupSurfaceCoordinator';
import {
  selectPerpsEnabledFlag,
  selectPerpsGtmOnboardingModalEnabledFlag,
} from '../../selectors/featureFlags';

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
