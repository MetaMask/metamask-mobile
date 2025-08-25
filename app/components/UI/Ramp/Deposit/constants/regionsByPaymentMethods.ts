import {
  DepositPaymentMethod,
  SEPA_PAYMENT_METHOD,
  WIRE_TRANSFER_PAYMENT_METHOD,
} from './paymentMethods';
import { DEPOSIT_REGIONS, DepositRegion } from './regions';

export const REGIONS_BY_PAYMENT_METHODS: Record<
  DepositPaymentMethod['id'],
  DepositRegion['isoCode'][]
> = {
  [SEPA_PAYMENT_METHOD.id]: DEPOSIT_REGIONS.map(
    (region) => region.isoCode,
  ).filter((isoCode) => isoCode !== 'US'),

  [WIRE_TRANSFER_PAYMENT_METHOD.id]: ['US'],
};
