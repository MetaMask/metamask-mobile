import {
  clampInfraSubtractionMs,
  computeAppiumInfraOverheadMs,
  nextMeasuringPollIntervalMs,
} from './PlaywrightUtilities';

describe('computeAppiumInfraOverheadMs', () => {
  it('subtracts probe plus failed/success polls capped at probe RTT', () => {
    // Failed polls often include implicit-wait time (~300ms+). Cap each at
    // probe RTT so we only remove network/infra, not app wait inside the command.
    expect(
      computeAppiumInfraOverheadMs({
        directMs: 8000,
        sleepMs: 900,
        failedPollDurationsMs: [700, 700],
        successPollMs: 2000,
        probeMs: 204,
      }),
    ).toBe(204 + 204 + 204 + 204);
  });

  it('does not subtract directMs or sleepMs', () => {
    expect(
      computeAppiumInfraOverheadMs({
        directMs: 8000,
        sleepMs: 900,
        failedPollDurationsMs: [],
        successPollMs: null,
        probeMs: 150,
      }),
    ).toBe(150);
  });

  it('caps a fast failed poll at its own duration when below probe RTT', () => {
    expect(
      computeAppiumInfraOverheadMs({
        directMs: 0,
        sleepMs: 0,
        failedPollDurationsMs: [80, 90],
        successPollMs: 100,
        probeMs: 200,
      }),
    ).toBe(200 + 80 + 90 + 100);
  });

  it('subtracts nothing without a probe', () => {
    expect(
      computeAppiumInfraOverheadMs({
        directMs: 8000,
        sleepMs: 0,
        failedPollDurationsMs: [700],
        successPollMs: 500,
        probeMs: null,
      }),
    ).toBe(0);
  });
});

describe('clampInfraSubtractionMs', () => {
  it('preserves poll sleep time so long waits cannot collapse to 0ms', () => {
    expect(clampInfraSubtractionMs(5_000, 4_800, 900)).toBe(4_100);
  });

  it('keeps a 1ms app floor when wall-clock is positive but sleep is 0', () => {
    expect(clampInfraSubtractionMs(400, 400, 0)).toBe(399);
  });

  it('returns 0 infra when wall-clock is 0', () => {
    expect(clampInfraSubtractionMs(0, 200, 0)).toBe(0);
  });
});

describe('nextMeasuringPollIntervalMs', () => {
  it('does not poll faster than the last command RTT', () => {
    expect(nextMeasuringPollIntervalMs(200)).toBe(200);
  });

  it('respects the minimum interval for instant commands', () => {
    expect(nextMeasuringPollIntervalMs(10)).toBe(50);
  });

  it('caps at the non-measuring poll interval', () => {
    expect(nextMeasuringPollIntervalMs(800)).toBe(300);
  });

  it('falls back to the minimum when last duration is unknown', () => {
    expect(nextMeasuringPollIntervalMs(0)).toBe(50);
    expect(nextMeasuringPollIntervalMs(Number.NaN)).toBe(50);
  });
});
