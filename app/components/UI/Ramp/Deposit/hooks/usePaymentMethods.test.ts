import usePaymentMethods from './usePaymentMethods';
import {
  APPLE_PAY_PAYMENT_METHOD,
  SUPPORTED_PAYMENT_METHODS,
} from '../constants';
import Device from '../../../../../util/device';

jest.mock('../../../../../util/device', () => ({
  isIos: jest.fn(),
}));

describe('usePaymentMethods', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (Device.isIos as jest.Mock).mockReturnValue(true);
  });

  it('return the supported method constant', () => {
    const result = usePaymentMethods();
    expect(result).toEqual(SUPPORTED_PAYMENT_METHODS);
  });

  it('excludes Apple Pay on non-iOS devices', () => {
    (Device.isIos as jest.Mock).mockReturnValue(false);
    const result = usePaymentMethods();
    expect(result).not.toContainEqual(APPLE_PAY_PAYMENT_METHOD);
  });
});
