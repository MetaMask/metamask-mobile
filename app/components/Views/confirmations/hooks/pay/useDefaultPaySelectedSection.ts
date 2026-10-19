import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { selectPrimaryMoneyAccount } from '../../../../../selectors/moneyAccountController';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useParams } from '../../../../../util/navigation/navUtils';
import {
  ConfirmationParams,
  PayWithOption,
} from '../../components/confirm/confirm-component';
import { useIsMoneyAccountFlagDefault } from './useIsMoneyAccountFlagDefault';
import { applyMoneyAccountOverride } from '../../utils/transaction-pay';

/**
 * @param options - Hook options.
 * @param options.disable - Set `true` when the caller has a better default of
 * its own. Only suppresses the flag preference; an explicit `payWithOption`
 * nav-param still wins, since that is the user's own choice.
 */
export function useDefaultPaySelectedSection({
  disable = false,
}: { disable?: boolean } = {}) {
  const { payWithOption } = useParams<ConfirmationParams>({});
  const transactionMeta = useTransactionMetadataRequest();
  const moneyAccount = useSelector(selectPrimaryMoneyAccount);
  const isDefaultMoneyAccount = useIsMoneyAccountFlagDefault();
  const appliedRef = useRef<string | undefined>(undefined);

  const isMoneyAccount =
    payWithOption === PayWithOption.MoneyAccount ||
    (isDefaultMoneyAccount && !disable);
  const transactionId = transactionMeta?.id;

  useEffect(() => {
    if (
      !isMoneyAccount ||
      !transactionId ||
      appliedRef.current === transactionId
    ) {
      return;
    }

    appliedRef.current = transactionId;

    applyMoneyAccountOverride(
      transactionId,
      moneyAccount?.address,
      transactionMeta,
    );
  }, [isMoneyAccount, transactionId, transactionMeta, moneyAccount?.address]);
}
