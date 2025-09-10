import handleRampUrl from './handleRampUrl';
import actualHandleRampUrl from '../../../components/UI/Ramp/Aggregator/deeplink/handleRampUrl';
import { RampType } from '../../../reducers/fiatOrders/types';

jest.mock('../../../components/UI/Ramp/Aggregator/deeplink/handleRampUrl', () =>
  jest.fn(),
);

describe('handleRampUrl re-export', () => {
  const mockActualHandleRampUrl = actualHandleRampUrl as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should re-export the actual handleRampUrl function', () => {
    expect(handleRampUrl).toBe(actualHandleRampUrl);
  });

  it('should call the actual implementation when invoked', () => {
    const testOptions = {
      rampPath: '/test/path',
      rampType: RampType.BUY,
    };

    handleRampUrl(testOptions);

    expect(mockActualHandleRampUrl).toHaveBeenCalledWith(testOptions);
    expect(mockActualHandleRampUrl).toHaveBeenCalledTimes(1);
  });

  it('should pass through sell ramp type correctly', () => {
    const sellOptions = {
      rampPath: '/sell/ethereum',
      rampType: RampType.SELL,
    };

    handleRampUrl(sellOptions);

    expect(mockActualHandleRampUrl).toHaveBeenCalledWith(sellOptions);
  });

  it('should handle complex ramp paths', () => {
    const complexOptions = {
      rampPath: '/buy/ethereum?amount=1.5&currency=USD&provider=moonpay',
      rampType: RampType.BUY,
    };

    handleRampUrl(complexOptions);

    expect(mockActualHandleRampUrl).toHaveBeenCalledWith(complexOptions);
  });
});
