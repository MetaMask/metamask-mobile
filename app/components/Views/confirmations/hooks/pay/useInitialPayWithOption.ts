import { useRef } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../../reducers';
import { selectPaymentOverrideByTransactionId } from '../../../../../selectors/transactionPayController';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useParams } from '../../../../../util/navigation/navUtils';
import {
  ConfirmationParams,
  PayWithOption,
} from '../../components/confirm/confirm-component';

/**
 * Returns the `payWithOption` nav param only until the controller has
 * processed the payment override. After that, returns `undefined` so
 * the nav param cannot re-select a payment method the user cleared.
 */
export function useInitialPayWithOption(): PayWithOption | undefined {
  const transactionId = useTransactionMetadataRequest()?.id ?? '';
  const paymentOverride = useSelector((state: RootState) =>
    selectPaymentOverrideByTransactionId(state, transactionId),
  );
  const { payWithOption } = useParams<ConfirmationParams>({});
  const consumedRef = useRef(false);

  if (paymentOverride !== undefined) {
    consumedRef.current = true;
  }

  if (consumedRef.current) {
    return undefined;
  }

  return payWithOption;
}
