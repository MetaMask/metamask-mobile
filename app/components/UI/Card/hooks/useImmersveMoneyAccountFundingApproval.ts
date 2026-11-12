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
 * The pending and error toasts come from `confirmLinkInBackground`. Success
 * does not toast: the card is still being created, and Card Home shows that.
 * Pass `holdToastsUntil` to keep those toasts off screen until the promise
 * resolves. The KYC screen uses it so linking stays quiet on "You're verified".
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
    async (
      entrypoint: CardEntryPoint | string,
      options?: { holdToastsUntil?: Promise<void> },
    ): Promise<boolean> => {
      const linked = await confirmLinkInBackground({
        delegationAmountHuman: BAANX_MAX_LIMIT,
        entrypoint,
        showSuccessToast: false,
        ...(options?.holdToastsUntil
          ? { holdToastsUntil: options.holdToastsUntil }
          : {}),
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
