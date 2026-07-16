import { computeAppiumInfraOverheadMs } from './PlaywrightUtilities';

describe('computeAppiumInfraOverheadMs', () => {
  it('sums direct overhead and sleeps', () => {
    expect(
      computeAppiumInfraOverheadMs({
        directMs: 200,
        sleepMs: 300,
        failedPollDurationsMs: [],
        successPollMs: null,
        probeMs: null,
      }),
    ).toBe(500);
  });

  it('attributes failed polls as min(duration, rtt + implicitWait) and success in full', () => {
    expect(
      computeAppiumInfraOverheadMs({
        directMs: 100,
        sleepMs: 600,
        failedPollDurationsMs: [800, 750],
        successPollMs: 900,
        probeMs: 200,
      }),
    ).toBe(
      100 + // resolution
        600 + // sleeps
        500 + // failed 1: min(800, 200+300)
        500 + // failed 2: min(750, 200+300)
        900 + // success full
        200, // probe
    );
  });

  it('uses full success poll duration (visible confirm is infra)', () => {
    expect(
      computeAppiumInfraOverheadMs({
        directMs: 50,
        sleepMs: 0,
        failedPollDurationsMs: [],
        successPollMs: 500,
        probeMs: 120,
      }),
    ).toBe(50 + 500 + 120);
  });

  it('without probe still subtracts implicit-wait-sized cost from failed polls', () => {
    expect(
      computeAppiumInfraOverheadMs({
        directMs: 0,
        sleepMs: 300,
        failedPollDurationsMs: [700, 700],
        successPollMs: null,
        probeMs: null,
      }),
    ).toBe(300 + 300 + 300);
  });
});
