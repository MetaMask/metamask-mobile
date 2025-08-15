import Device from '../../../../../util/device';
import {
  APPLE_PAY_PAYMENT_METHOD,
  SUPPORTED_PAYMENT_METHODS,
  REGIONS_BY_PAYMENT_METHODS,
} from '../constants';
import { useDepositSDK } from '../sdk';

function usePaymentMethods() {
  const { selectedRegion } = useDepositSDK();

  let paymentMethods = SUPPORTED_PAYMENT_METHODS;

  if (!Device.isIos()) {
    paymentMethods = paymentMethods.filter(
      (paymentMethod) => paymentMethod.id !== APPLE_PAY_PAYMENT_METHOD.id,
    );
  }

  if (selectedRegion) {
    paymentMethods = paymentMethods.filter((paymentMethod) => {
      if (REGIONS_BY_PAYMENT_METHODS[paymentMethod.id]) {
        return REGIONS_BY_PAYMENT_METHODS[paymentMethod.id].includes(
          selectedRegion?.isoCode,
        );
      }
      return true;
    });
  }

  return paymentMethods;
}

export default usePaymentMethods;
