import { computeAppiumInfraOverheadMs } from './PlaywrightUtilities';

describe('computeAppiumInfraOverheadMs', () => {
  it('subtracts only the probe RTT', () => {
    expect(
      computeAppiumInfraOverheadMs({
        directMs: 8000,
        sleepMs: 900,
        failedPollDurationsMs: [700, 700],
        successPollMs: 2000,
        probeMs: 204,
      }),
    ).toBe(204);
  });

  it('subtracts nothing without a probe', () => {
    expect(
      computeAppiumInfraOverheadMs({
        directMs: 8000,
        sleepMs: 0,
        failedPollDurationsMs: [],
        successPollMs: 500,
        probeMs: null,
      }),
    ).toBe(0);
  });
});
