import {
  useNavigation,
  type NavigationProp,
  type ParamListBase,
} from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { PREDICT_GTM_MODAL_SHOWN } from '../../../../../constants/storage';
import Routes from '../../../../../constants/navigation/Routes';
import StorageWrapper from '../../../../../store/storage-wrapper';
import { markPushPrePromptPerformance } from '../../../../../util/notifications/utils/push-pre-prompt-performance';
import type {
  StartupSurfaceDescriptor,
  StartupSurfaceStatus,
} from '../../../../Nav/Main/StartupSurfaceCoordinator';
import {
  selectPredictEnabledFlag,
  selectPredictGtmOnboardingModalEnabledFlag,
} from '../../selectors/featureFlags';

export const usePredictGtmStartupSurface = (): StartupSurfaceDescriptor => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const isPredictEnabled = useSelector(selectPredictEnabledFlag);
  const isPredictGtmEnabled = useSelector(
    selectPredictGtmOnboardingModalEnabledFlag,
  );
  const isEnabled = isPredictEnabled && isPredictGtmEnabled;
  const [status, setStatus] = useState<StartupSurfaceStatus>('resolving');

  useEffect(() => {
    let cancelled = false;

    if (!isEnabled) {
      markPushPrePromptPerformance('startup_surface.candidate.resolved', {
        isPredictEnabled,
        isPredictGtmEnabled,
        reason: 'feature_disabled',
        status: 'ineligible',
        surfaceId: 'predict-gtm',
      });
      setStatus('resolving');
      return undefined;
    }

    setStatus('resolving');

    StorageWrapper.getItem(PREDICT_GTM_MODAL_SHOWN)
      .then((hasSeenModal) => {
        if (cancelled) {
          return;
        }

        const nextStatus = hasSeenModal === 'true' ? 'ineligible' : 'eligible';
        markPushPrePromptPerformance('startup_surface.candidate.resolved', {
          hasSeenModal,
          reason: hasSeenModal === 'true' ? 'already_seen' : 'not_seen',
          status: nextStatus,
          surfaceId: 'predict-gtm',
        });
        setStatus(nextStatus);
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }

        markPushPrePromptPerformance('startup_surface.candidate.error', {
          error: error instanceof Error ? error.message : String(error),
          surfaceId: 'predict-gtm',
        });
        markPushPrePromptPerformance('startup_surface.candidate.resolved', {
          reason: 'storage_error',
          status: 'ineligible',
          surfaceId: 'predict-gtm',
        });
        setStatus('ineligible');
      });

    return () => {
      cancelled = true;
    };
  }, [isEnabled, isPredictEnabled, isPredictGtmEnabled]);

  const present = useCallback(() => {
    navigation.navigate(Routes.PREDICT.MODALS.ROOT, {
      screen: Routes.PREDICT.MODALS.GTM_MODAL,
    });
  }, [navigation]);

  return useMemo(
    () => ({
      id: 'predict-gtm',
      present,
      status: isEnabled ? status : 'ineligible',
    }),
    [isEnabled, present, status],
  );
};
