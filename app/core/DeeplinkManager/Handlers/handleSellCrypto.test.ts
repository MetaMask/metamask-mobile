import { handleSellCrypto } from './handleSellCrypto';
import { RampType } from '../../../reducers/fiatOrders/types';
import handleRampUrl from './handleRampUrl';

jest.mock('./handleRampUrl', () => jest.fn());

describe('handleSellCrypto', () => {
  const mockHandleRampUrl = handleRampUrl as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call handleRampUrl with sell ramp type and provided path', () => {
    const testRampPath = '/sell/test-path';

    handleSellCrypto(testRampPath);

    expect(mockHandleRampUrl).toHaveBeenCalledWith({
      rampPath: testRampPath,
      rampType: RampType.SELL,
    });
    expect(mockHandleRampUrl).toHaveBeenCalledTimes(1);
  });

  it('should handle empty ramp path', () => {
    const emptyRampPath = '';

    handleSellCrypto(emptyRampPath);

    expect(mockHandleRampUrl).toHaveBeenCalledWith({
      rampPath: emptyRampPath,
      rampType: RampType.SELL,
    });
  });

  it('should handle complex ramp path with parameters', () => {
    const complexRampPath =
      '/sell/crypto?token=ETH&amount=1.5&fiatCurrency=USD';

    handleSellCrypto(complexRampPath);

    expect(mockHandleRampUrl).toHaveBeenCalledWith({
      rampPath: complexRampPath,
      rampType: RampType.SELL,
    });
  });
});
