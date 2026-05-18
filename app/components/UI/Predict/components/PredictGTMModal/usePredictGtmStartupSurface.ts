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
