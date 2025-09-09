import { useSendMetricsContext } from './send-metrics-context';

describe('useSendMetricsContext', () => {
  it('should throw error is not wrapped in SendMetricsContext', () => {
    expect(() => {
      useSendMetricsContext();
    }).toThrow();
  });
});
