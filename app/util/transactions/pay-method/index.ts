import { PayMethod, PayMethodType, RelayPayMethod } from './relay';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const PAY_METHODS: Record<PayMethodType, PayMethod<any>> = {
  [PayMethodType.Bridge]: new RelayPayMethod(),
  [PayMethodType.Relay]: new RelayPayMethod(),
};
