import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { PERPS_GTM_MODAL_SHOWN } from '../../../../../constants/storage';
import StorageWrapper from '../../../../../store/storage-wrapper';
import { surfaceStatusReported } from '../../../../../reducers/engagement';
import {
  selectPerpsEnabledFlag,
  selectPerpsGtmOnboardingModalEnabledFlag,
} from '../../../Perps/selectors/featureFlags';

/**
 * Resolves whether the Perps GTM modal should appear on startup and dispatches
 * the result to the engagement slice.
 *
 * Eligibility primitives (feature flag selectors, storage key) are owned by
 * the Perps team. This resolver wires those signals into a Redux status update.
 */
export const usePerpsGtmResolver = () => {
  const dispatch = useDispatch();
  const isPerpsEnabled = useSelector(selectPerpsEnabledFlag);
  const isPerpsGtmEnabled = useSelector(
    selectPerpsGtmOnboardingModalEnabledFlag,
  );
  const isEnabled = isPerpsEnabled && isPerpsGtmEnabled;

  useEffect(() => {
    let cancelled = false;

    if (!isEnabled) {
      dispatch(
        surfaceStatusReported({ id: 'perps-gtm', status: 'ineligible' }),
      );
      return undefined;
    }

    dispatch(surfaceStatusReported({ id: 'perps-gtm', status: 'resolving' }));

    StorageWrapper.getItem(PERPS_GTM_MODAL_SHOWN)
      .then((hasSeenModal) => {
        if (cancelled) return;
        dispatch(
          surfaceStatusReported({
            id: 'perps-gtm',
            status: hasSeenModal === 'true' ? 'ineligible' : 'eligible',
          }),
        );
      })
      .catch(() => {
        if (cancelled) return;
        dispatch(
          surfaceStatusReported({ id: 'perps-gtm', status: 'ineligible' }),
        );
      });

    return () => {
      cancelled = true;
    };
  }, [dispatch, isEnabled]);
};
