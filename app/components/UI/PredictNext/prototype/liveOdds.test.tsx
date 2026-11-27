import { stepOdds } from './simulation';

describe('stepOdds', () => {
  it('stays within 8 cents of the fixture price after 5000 upward steps', () => {
    let price = 34;
    for (let step = 0; step < 5000; step += 1) {
      price = stepOdds(price, 34, 0.5);
    }

    expect(price).toBeLessThanOrEqual(42);
    expect(price).toBeGreaterThanOrEqual(26);
  });

  it('stays within 8 cents of the fixture price after 5000 downward steps', () => {
    let price = 22;
    for (let step = 0; step < 5000; step += 1) {
      price = stepOdds(price, 22, -0.5);
    }

    expect(price).toBeLessThanOrEqual(30);
    expect(price).toBeGreaterThanOrEqual(14);
  });

  it('clamps a price near the floor to 2 cents', () => {
    expect(stepOdds(3, 4, -0.5)).toBe(2);
  });

  it('clamps a price near the ceiling to 96 cents', () => {
    expect(stepOdds(95, 94, 0.5)).toBe(96);
  });
});
