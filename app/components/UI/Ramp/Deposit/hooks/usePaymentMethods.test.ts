import { renderHook } from '@testing-library/react-native';
import usePaymentMethods from './usePaymentMethods';
import {
  APPLE_PAY_PAYMENT_METHOD,
  SUPPORTED_PAYMENT_METHODS,
  SEPA_PAYMENT_METHOD,
  WIRE_TRANSFER_PAYMENT_METHOD,
} from '../constants';
import Device from '../../../../../util/device';
import { useDepositSDK } from '../sdk';

jest.mock('../../../../../util/device', () => ({
  isIos: jest.fn(),
}));

type DeepPartial<BaseType> = {
  [key in keyof BaseType]?: DeepPartial<BaseType[key]>;
};

const mockUseDepositSDKValue: DeepPartial<ReturnType<typeof useDepositSDK>> = {
  selectedRegion: null,
};

jest.mock('../sdk', () => ({
  useDepositSDK: () => mockUseDepositSDKValue,
}));

describe('usePaymentMethods', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (Device.isIos as jest.Mock).mockReturnValue(true);
  });

  it('return the supported method constant', () => {
    const { result } = renderHook(usePaymentMethods);
    expect(result.current).toEqual(SUPPORTED_PAYMENT_METHODS);
  });

  it('excludes Apple Pay on non-iOS devices', () => {
    (Device.isIos as jest.Mock).mockReturnValue(false);
    const { result } = renderHook(usePaymentMethods);
    expect(result.current).not.toContainEqual(APPLE_PAY_PAYMENT_METHOD);
  });

  it('excludes wire for EU selected region', () => {
    mockUseDepositSDKValue.selectedRegion = { isoCode: 'DE' };
    const { result } = renderHook(usePaymentMethods);

    const expectedMethods = SUPPORTED_PAYMENT_METHODS.filter(
      (method) => method.id !== WIRE_TRANSFER_PAYMENT_METHOD.id,
    );

    expect(result.current).toEqual(expectedMethods);
  });

  it('excludes sepa for US selected region', () => {
    mockUseDepositSDKValue.selectedRegion = { isoCode: 'US' };
    const { result } = renderHook(usePaymentMethods);

    const expectedMethods = SUPPORTED_PAYMENT_METHODS.filter(
      (method) => method.id !== SEPA_PAYMENT_METHOD.id,
    );

    expect(result.current).toEqual(expectedMethods);
  });
});
