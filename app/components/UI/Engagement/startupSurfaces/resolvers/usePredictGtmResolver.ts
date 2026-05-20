import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { PREDICT_GTM_MODAL_SHOWN } from '../../../../../constants/storage';
import StorageWrapper from '../../../../../store/storage-wrapper';
import { surfaceStatusReported } from '../../../../../reducers/engagement';
import {
  selectPredictEnabledFlag,
  selectPredictGtmOnboardingModalEnabledFlag,
} from '../../../Predict/selectors/featureFlags';

/**
 * Resolves whether the Predict GTM modal should appear on startup and
 * dispatches the result to the engagement slice.
 *
 * Eligibility primitives (feature flag selectors, storage key) are owned by
 * the Predict team. This resolver wires those signals into a Redux status update.
 */
export const usePredictGtmResolver = () => {
  const dispatch = useDispatch();
  const isPredictEnabled = useSelector(selectPredictEnabledFlag);
  const isPredictGtmEnabled = useSelector(
    selectPredictGtmOnboardingModalEnabledFlag,
  );
  const isEnabled = isPredictEnabled && isPredictGtmEnabled;

  useEffect(() => {
    let cancelled = false;

    if (!isEnabled) {
      dispatch(
        surfaceStatusReported({ id: 'predict-gtm', status: 'ineligible' }),
      );
      return undefined;
    }

    dispatch(surfaceStatusReported({ id: 'predict-gtm', status: 'resolving' }));

    StorageWrapper.getItem(PREDICT_GTM_MODAL_SHOWN)
      .then((hasSeenModal) => {
        if (cancelled) return;
        dispatch(
          surfaceStatusReported({
            id: 'predict-gtm',
            status: hasSeenModal === 'true' ? 'ineligible' : 'eligible',
          }),
        );
      })
      .catch(() => {
        if (cancelled) return;
        dispatch(
          surfaceStatusReported({ id: 'predict-gtm', status: 'ineligible' }),
        );
      });

    return () => {
      cancelled = true;
    };
  }, [dispatch, isEnabled]);
};
