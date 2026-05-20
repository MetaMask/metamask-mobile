import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { surfaceStatusReported } from '../../../../../reducers/engagement';
import { usePushPrePromptVariant } from '../../../../../util/notifications/hooks/usePushPrePromptVariant';

/**
 * Resolves whether the push notification pre-prompt should appear on startup
 * and dispatches the result to the engagement slice.
 *
 * The eligibility hook (`usePushPrePromptVariant`) is owned by the
 * Notifications team. This resolver translates its output into a Redux status
 * update. The element rendering and `pendingActionVariant` logic live in
 * InlineStartupSurface.
 */
export const useNotificationsPrePromptResolver = () => {
  const dispatch = useDispatch();
  const { isResolving, variant } = usePushPrePromptVariant();

  useEffect(() => {
    if (isResolving) {
      dispatch(
        surfaceStatusReported({ id: 'push-pre-prompt', status: 'resolving' }),
      );
      return;
    }

    dispatch(
      surfaceStatusReported({
        id: 'push-pre-prompt',
        status: variant ? 'eligible' : 'ineligible',
      }),
    );
  }, [dispatch, isResolving, variant]);
};
