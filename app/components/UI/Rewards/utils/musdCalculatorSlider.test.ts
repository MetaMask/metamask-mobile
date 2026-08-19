import { MUSD_CONVERSION_APY } from '../../Earn/constants/musd';
import {
  amountToPercent,
  clampAmount,
  MUSD_CALCULATOR_APY,
  percentToAmount,
} from './musdCalculatorSlider';

describe('musdCalculatorSlider', () => {
  it('maps amount to percent and back for mid-range values', () => {
    const pct = amountToPercent(5000);
    expect(pct).toBeCloseTo(72.222222, 5);
    expect(clampAmount(percentToAmount(pct))).toBe(5000);
  });

  it('snaps to anchor amounts near snap points', () => {
    expect(clampAmount(percentToAmount(amountToPercent(1000)))).toBe(1000);
    expect(clampAmount(percentToAmount(amountToPercent(10000)))).toBe(10000);
  });

  it('derives calculator APY from Earn MUSD_CONVERSION_APY', () => {
    expect(MUSD_CALCULATOR_APY).toBe(MUSD_CONVERSION_APY / 100);
  });
});
