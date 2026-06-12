import { useSelector } from 'react-redux';
import { selectPrimaryMoneyAccount } from '../../../../../selectors/moneyAccountController';
import { selectMetaMaskPayFlags } from '../../../../../selectors/featureFlagController/confirmations';
import { useParams } from '../../../../../util/navigation/navUtils';
import { ConfirmationParams } from '../../components/confirm/confirm-component';

/**
 * Returns `true` when the `defaultPaySelectedSection` feature flag is
 * `"money-account"` and the user has a money account, while no explicit
 * `payWithOption` nav-param overrides the selection.
 *
 * This value is derived synchronously at render time so consumers can
 * use it on the very first render — no effect delay, no flash.
 */
export function useIsDefaultMoneyAccountSection(): boolean {
  const { payWithOption } = useParams<ConfirmationParams>({});
  const moneyAccount = useSelector(selectPrimaryMoneyAccount);
  const { defaultPaySelectedSection } = useSelector(selectMetaMaskPayFlags);

  return (
    !payWithOption &&
    defaultPaySelectedSection === 'money-account' &&
    !!moneyAccount
  );
}
