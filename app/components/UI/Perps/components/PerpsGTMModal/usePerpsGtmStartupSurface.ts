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
import { markPushPrePromptPerformance } from '../../../../../util/notifications/utils/push-pre-prompt-performance';
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
      markPushPrePromptPerformance('startup_surface.candidate.resolved', {
        isPerpsEnabled,
        isPerpsGtmEnabled,
        reason: 'feature_disabled',
        status: 'ineligible',
        surfaceId: 'perps-gtm',
      });
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
        markPushPrePromptPerformance('startup_surface.candidate.resolved', {
          hasSeenModal,
          reason: hasSeenModal === 'true' ? 'already_seen' : 'not_seen',
          status: nextStatus,
          surfaceId: 'perps-gtm',
        });
        setStatus(nextStatus);
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }

        markPushPrePromptPerformance('startup_surface.candidate.error', {
          error: error instanceof Error ? error.message : String(error),
          surfaceId: 'perps-gtm',
        });
        markPushPrePromptPerformance('startup_surface.candidate.resolved', {
          reason: 'storage_error',
          status: 'ineligible',
          surfaceId: 'perps-gtm',
        });
        setStatus('ineligible');
      });

    return () => {
      cancelled = true;
    };
  }, [isEnabled, isPerpsEnabled, isPerpsGtmEnabled]);

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
