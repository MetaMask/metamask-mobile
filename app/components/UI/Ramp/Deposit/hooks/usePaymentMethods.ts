import Device from '../../../../../util/device';
import {
  APPLE_PAY_PAYMENT_METHOD,
  SUPPORTED_PAYMENT_METHODS,
} from '../constants';

function usePaymentMethods() {
  let paymentMethods = SUPPORTED_PAYMENT_METHODS;

  if (!Device.isIos()) {
    paymentMethods = paymentMethods.filter(
      (paymentMethod) => paymentMethod.id !== APPLE_PAY_PAYMENT_METHOD.id,
    );
  }
  return paymentMethods;
}

export default usePaymentMethods;
