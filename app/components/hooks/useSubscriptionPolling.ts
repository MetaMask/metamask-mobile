import { useSelector } from 'react-redux';
import type { Json } from '@metamask/utils';
import Engine from '../../core/Engine';
import { RootState } from '../../reducers';
import { selectIsSignedIn } from '../../selectors/identity';
import { selectIsUnlocked } from '../../selectors/keyringController';
import usePolling from './usePolling';

/**
 * Stable polling-controller input. The polling interval key is derived from
 * this value, so it must stay referentially and structurally constant.
 */
const SUBSCRIPTION_POLLING_INPUT: Json = Object.freeze({});

const selectIsUiOpen = (state: RootState): boolean =>
  state.engine?.backgroundState?.ClientController?.isUiOpen === true;

/**
 * Starts exactly one SubscriptionController poll while the caller enables it
 * and the user is signed in, unlocked, and in the foreground.
 *
 * Mounted by the Money home view so Plus entitlements stay current while the
 * user is on a surface that reacts to them.
 *
 * @param options - Polling options.
 * @param options.enabled - Caller gate for starting subscription polling.
 */
const useSubscriptionPolling = ({ enabled }: { enabled: boolean }): void => {
  const isSignedIn = useSelector(selectIsSignedIn);
  const isUnlocked = Boolean(useSelector(selectIsUnlocked));
  const isUiOpen = useSelector(selectIsUiOpen);
  const { SubscriptionController } = Engine.context;
  const shouldPoll = enabled && isSignedIn && isUnlocked && isUiOpen;

  usePolling({
    startPolling: SubscriptionController.startPolling.bind(
      SubscriptionController,
    ),
    stopPollingByPollingToken:
      SubscriptionController.stopPollingByPollingToken.bind(
        SubscriptionController,
      ),
    input: shouldPoll ? [SUBSCRIPTION_POLLING_INPUT] : [],
  });
};

export default useSubscriptionPolling;
