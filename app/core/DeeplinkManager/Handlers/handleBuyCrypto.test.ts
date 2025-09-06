import { handleBuyCrypto } from './handleBuyCrypto';
import { RampType } from '../../../reducers/fiatOrders/types';
import handleRampUrl from './handleRampUrl';

jest.mock('./handleRampUrl', () => jest.fn());

describe('handleBuyCrypto', () => {
  const mockHandleRampUrl = handleRampUrl as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call handleRampUrl with buy ramp type and provided path', () => {
    const testRampPath = '/buy/test-path';

    handleBuyCrypto(testRampPath);

    expect(mockHandleRampUrl).toHaveBeenCalledWith({
      rampPath: testRampPath,
      rampType: RampType.BUY,
    });
    expect(mockHandleRampUrl).toHaveBeenCalledTimes(1);
  });

  it('should handle empty ramp path', () => {
    const emptyRampPath = '';

    handleBuyCrypto(emptyRampPath);

    expect(mockHandleRampUrl).toHaveBeenCalledWith({
      rampPath: emptyRampPath,
      rampType: RampType.BUY,
    });
  });

  it('should handle complex ramp path with parameters', () => {
    const complexRampPath =
      '/buy/crypto?token=ETH&amount=1.0&fiatCurrency=USD&provider=moonpay';

    handleBuyCrypto(complexRampPath);

    expect(mockHandleRampUrl).toHaveBeenCalledWith({
      rampPath: complexRampPath,
      rampType: RampType.BUY,
    });
  });
});
