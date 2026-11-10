import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectIsMoneyAccountCardLinkInProgress } from '../../../../selectors/cardController';
import { setImmersveFundingSettling } from '../../../../core/redux/slices/card';
import { BAANX_MAX_LIMIT } from '../constants';
import { CardEntryPoint } from '../util/metrics';
import { useMoneyAccountCardLinkage } from './useMoneyAccountCardLinkage';

/**
 * Submits the Immersve Money account funding approval in the background.
 *
 * The pending, success and error toasts come from `confirmLinkInBackground`.
 * A successful submission raises `immersveFundingSettling` so Card Home can
 * wait for Immersve to observe the allowance and create the card.
 * `isApproving` follows the controller's in-progress flag, which is set
 * synchronously, so a screen mounted after the call still sees it.
 */
export function useImmersveMoneyAccountFundingApproval() {
  const dispatch = useDispatch();
  const isApproving = useSelector(selectIsMoneyAccountCardLinkInProgress);
  const { confirmLinkInBackground } = useMoneyAccountCardLinkage({
    consumesPendingLink: false,
  });

  const approveFunding = useCallback(
    async (entrypoint: CardEntryPoint | string): Promise<boolean> => {
      const linked = await confirmLinkInBackground({
        delegationAmountHuman: BAANX_MAX_LIMIT,
        entrypoint,
      });
      if (linked) {
        dispatch(setImmersveFundingSettling(true));
      }
      return linked;
    },
    [confirmLinkInBackground, dispatch],
  );

  return { approveFunding, isApproving };
}
