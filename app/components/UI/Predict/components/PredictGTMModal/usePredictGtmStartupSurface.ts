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
import type {
  StartupSurfaceDescriptor,
  StartupSurfaceStatus,
} from '../../../Engagement/StartupSurfaceCoordinator';
import {
  selectPredictEnabledFlag,
  selectPredictGtmOnboardingModalEnabledFlag,
} from '../../selectors/featureFlags';

/**
 * Resolves whether the Predict GTM modal should be presented during startup.
 */
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
      // Stay resolving internally so re-enabling the feature starts from a clean
      // async storage check; the returned descriptor still reports ineligible.
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
